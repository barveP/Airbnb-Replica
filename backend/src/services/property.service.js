import { createHash } from "node:crypto";
import { query, withTransaction } from "../db/pool.js";
import { getRedis, invalidatePropertySearches } from "../cache.js";
import { config } from "../config.js";
import { AppError } from "../lib/errors.js";
import { mapProperty } from "../lib/mappers.js";

const selectProperty = `
  SELECT p.*, u.name AS host_name
  FROM properties p
  JOIN users u ON u.id = p.host_id
`;

export async function searchProperties(filters = {}, options = {}) {
  const normalized = {
    location: filters.location?.trim().toLowerCase() ?? "",
    guests: Number(filters.guests ?? 1),
    checkIn: filters.checkIn || null,
    checkOut: filters.checkOut || null,
  };

  let redis;
  let cacheKey;
  if (options.useCache !== false) {
    try {
      redis = await getRedis();
      const version = (await redis.get("properties:version")) ?? "0";
      const digest = createHash("sha256").update(JSON.stringify(normalized)).digest("hex").slice(0, 20);
      cacheKey = `properties:search:${version}:${digest}`;
      const cached = await redis.get(cacheKey);
      if (cached) return { items: JSON.parse(cached), cacheStatus: "HIT" };
    } catch (error) {
      if (process.env.NODE_ENV !== "test") console.warn("Cache bypassed:", error.message);
    }
  }

  const result = await query(
    `${selectProperty}
     WHERE p.status = 'published'
       AND ($1 = '' OR LOWER(p.city) LIKE '%' || $1 || '%' OR LOWER(p.country) LIKE '%' || $1 || '%')
       AND p.capacity >= $2
       AND ($3::date IS NULL OR p.available_from <= $3::date)
       AND ($4::date IS NULL OR p.available_to >= $4::date)
       AND (
         $3::date IS NULL OR $4::date IS NULL OR NOT EXISTS (
           SELECT 1 FROM reservations r
           WHERE r.property_id = p.id
             AND r.status = 'confirmed'
             AND r.check_in < $4::date
             AND r.check_out > $3::date
         )
       )
     ORDER BY p.created_at DESC
     LIMIT 50`,
    [normalized.location, normalized.guests, normalized.checkIn, normalized.checkOut],
  );
  const items = result.rows.map(mapProperty);

  if (redis && cacheKey) {
    await redis.set(cacheKey, JSON.stringify(items), { EX: config.cacheTtlSeconds });
  }
  return { items, cacheStatus: redis ? "MISS" : "BYPASS" };
}

export async function getProperty(id) {
  const result = await query(`${selectProperty} WHERE p.id = $1`, [id]);
  if (!result.rowCount) throw new AppError(404, "Property not found");
  return mapProperty(result.rows[0]);
}

export async function getHostProperties(hostId) {
  const result = await query(`${selectProperty} WHERE p.host_id = $1 ORDER BY p.created_at DESC`, [hostId]);
  return result.rows.map(mapProperty);
}

export async function createProperty(hostId, input) {
  const result = await query(
    `INSERT INTO properties (
      host_id, title, description, city, country, price_per_night_cents,
      capacity, bedrooms, image_url, available_from, available_to, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [hostId, input.title, input.description, input.city, input.country,
      Math.round(input.pricePerNight * 100), input.capacity, input.bedrooms,
      input.imageUrl, input.availableFrom, input.availableTo, input.status],
  );
  await invalidatePropertySearches();
  return getProperty(result.rows[0].id);
}

export async function updateProperty(id, hostId, input) {
  const result = await query(
    `UPDATE properties SET
      title = $3, description = $4, city = $5, country = $6,
      price_per_night_cents = $7, capacity = $8, bedrooms = $9,
      image_url = $10, available_from = $11, available_to = $12,
      status = $13, updated_at = NOW()
     WHERE id = $1 AND host_id = $2
     RETURNING id`,
    [id, hostId, input.title, input.description, input.city, input.country,
      Math.round(input.pricePerNight * 100), input.capacity, input.bedrooms,
      input.imageUrl, input.availableFrom, input.availableTo, input.status],
  );
  if (!result.rowCount) throw new AppError(404, "Property not found or not owned by you");
  await invalidatePropertySearches();
  return getProperty(id);
}

export async function deleteProperty(id, hostId) {
  await withTransaction(async (client) => {
    const owned = await client.query("SELECT 1 FROM properties WHERE id = $1 AND host_id = $2 FOR UPDATE", [id, hostId]);
    if (!owned.rowCount) throw new AppError(404, "Property not found or not owned by you");
    const active = await client.query("SELECT 1 FROM reservations WHERE property_id = $1 AND status = 'confirmed'", [id]);
    if (active.rowCount) throw new AppError(409, "Cancel this property's active reservations before deleting it");
    await client.query("DELETE FROM reservations WHERE property_id = $1", [id]);
    await client.query("DELETE FROM properties WHERE id = $1", [id]);
  });
  await invalidatePropertySearches();
}
