import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import bcrypt from "bcryptjs";
import { pool } from "./pool.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const directory = path.join(here, "migrations");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();

  for (const filename of files) {
    const alreadyApplied = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE filename = $1",
      [filename],
    );
    if (alreadyApplied.rowCount) continue;

    const sql = await readFile(path.join(directory, filename), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export async function seed() {
  const passwordHash = await bcrypt.hash("password123", 10);
  const people = [
    ["Maya Host", "host@stayfinder.dev", passwordHash, "host"],
    ["Noah Guest", "guest@stayfinder.dev", passwordHash, "guest"],
  ];
  for (const person of people) {
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role`,
      person,
    );
  }

  const host = await pool.query("SELECT id FROM users WHERE email = $1", ["host@stayfinder.dev"]);
  const existing = await pool.query("SELECT COUNT(*)::int AS count FROM properties");
  if (existing.rows[0].count > 0) return;

  const properties = [
    ["Cliffside Glass House", "Ocean sunsets, a quiet deck, and a short walk to Big Sur trails.", "Big Sur", "United States", 42500, 4, 2, "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80"],
    ["Desert Adobe Retreat", "A warm adobe home with a plunge pool beneath the Joshua Tree sky.", "Joshua Tree", "United States", 23800, 3, 2, "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80"],
    ["Canal Loft", "Light-filled loft in a restored canal house, close to museums and cafes.", "Amsterdam", "Netherlands", 31000, 2, 1, "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80"],
    ["Alpine Timber Cabin", "A simple timber cabin with mountain views and trails at the door.", "Aspen", "United States", 36500, 6, 3, "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1200&q=80"]
  ];

  for (const property of properties) {
    await pool.query(
      `INSERT INTO properties (
        host_id, title, description, city, country, price_per_night_cents,
        capacity, bedrooms, image_url, available_from, available_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE, CURRENT_DATE + 730)`,
      [host.rows[0].id, ...property],
    );
  }
}

export async function setupDatabase() {
  await migrate();
  await seed();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await setupDatabase();
    console.log("Database migrated and seeded.");
  } finally {
    await pool.end();
  }
}
