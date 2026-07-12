import { query, withTransaction } from "../db/pool.js";
import { invalidatePropertySearches } from "../cache.js";
import { AppError } from "../lib/errors.js";
import { mapReservation } from "../lib/mappers.js";

const reservationWithProperty = `
  SELECT r.*, p.*, r.id AS id, r.property_id, r.guest_id,
         r.check_in, r.check_out, r.guests, r.total_price_cents, r.status,
         p.status AS property_status,
         u.name AS host_name
  FROM reservations r
  JOIN properties p ON p.id = r.property_id
  JOIN users u ON u.id = p.host_id
`;

export async function getGuestReservations(guestId) {
  const result = await query(
    `${reservationWithProperty} WHERE r.guest_id = $1 ORDER BY r.created_at DESC`,
    [guestId],
  );
  return result.rows.map(mapReservation);
}

export async function createReservation(guestId, input) {
  const reservation = await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [input.propertyId]);
    const propertyResult = await client.query(
      "SELECT * FROM properties WHERE id = $1 AND status = 'published'",
      [input.propertyId],
    );
    const property = propertyResult.rows[0];
    if (!property) throw new AppError(404, "Property not found");
    if (property.host_id === guestId) throw new AppError(400, "You cannot reserve your own property");
    if (input.guests > property.capacity) throw new AppError(400, "Guest count exceeds property capacity");

    const checkIn = new Date(`${input.checkIn}T00:00:00Z`);
    const checkOut = new Date(`${input.checkOut}T00:00:00Z`);
    if (checkOut <= checkIn) throw new AppError(400, "Check-out must be after check-in");
    const availableFrom = property.available_from instanceof Date
      ? property.available_from.toISOString().slice(0, 10)
      : String(property.available_from).slice(0, 10);
    const availableTo = property.available_to instanceof Date
      ? property.available_to.toISOString().slice(0, 10)
      : String(property.available_to).slice(0, 10);
    if (input.checkIn < availableFrom || input.checkOut > availableTo) {
      throw new AppError(400, "Dates are outside the property's availability");
    }

    const overlap = await client.query(
      `SELECT 1 FROM reservations
       WHERE property_id = $1 AND status = 'confirmed'
         AND check_in < $3::date AND check_out > $2::date`,
      [input.propertyId, input.checkIn, input.checkOut],
    );
    if (overlap.rowCount) throw new AppError(409, "Property is already reserved for those dates");

    const nights = Math.round((checkOut - checkIn) / 86_400_000);
    const result = await client.query(
      `INSERT INTO reservations (
        property_id, guest_id, check_in, check_out, guests, total_price_cents
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [input.propertyId, guestId, input.checkIn, input.checkOut, input.guests,
        nights * property.price_per_night_cents],
    );
    return result.rows[0];
  });
  await invalidatePropertySearches();
  return mapReservation(reservation);
}

export async function cancelReservation(id, guestId) {
  const result = await query(
    `UPDATE reservations SET status = 'cancelled'
     WHERE id = $1 AND guest_id = $2 AND status = 'confirmed'
     RETURNING *`,
    [id, guestId],
  );
  if (!result.rowCount) throw new AppError(404, "Active reservation not found or not owned by you");
  await invalidatePropertySearches();
  return mapReservation(result.rows[0]);
}
