import { performance } from "node:perf_hooks";
import { closeRedis, getRedis } from "../src/cache.js";
import { pool } from "../src/db/pool.js";
import { setupDatabase } from "../src/db/setup.js";
import { searchProperties } from "../src/services/property.service.js";

const samples = Number(process.env.BENCHMARK_SAMPLES ?? 100);
const fixtureSize = Number(process.env.BENCHMARK_PROPERTIES ?? 25_000);
const filters = { location: "Benchmarkville", guests: 2 };

async function measure(work) {
  const timings = [];
  for (let index = 0; index < samples; index += 1) {
    const start = performance.now();
    await work();
    timings.push(performance.now() - start);
  }
  return timings.reduce((sum, value) => sum + value, 0) / timings.length;
}

try {
  await setupDatabase();
  const host = await pool.query("SELECT id FROM users WHERE email = 'host@stayfinder.dev'");
  await pool.query("DELETE FROM properties WHERE title LIKE 'Cache Benchmark Listing %'");
  await pool.query(
    `INSERT INTO properties (
      host_id, title, description, city, country, price_per_night_cents,
      capacity, bedrooms, image_url, available_from, available_to
    )
    SELECT $1, 'Cache Benchmark Listing ' || n,
      'Synthetic listing used only by the repeatable cache benchmark.',
      'Benchmarkville', 'United States', 20000 + (n % 10000),
      2 + (n % 6), 1 + (n % 4), 'https://example.com/benchmark.jpg',
      CURRENT_DATE, CURRENT_DATE + 365
    FROM generate_series(1, $2) AS n`,
    [host.rows[0].id, fixtureSize],
  );
  const redis = await getRedis();
  await redis.flushDb();
  const databaseAverage = await measure(() => searchProperties(filters, { useCache: false }));
  await searchProperties(filters);
  const redisAverage = await measure(() => searchProperties(filters));
  const improvement = ((databaseAverage - redisAverage) / databaseAverage) * 100;

  console.log("Search cache benchmark (local machine)");
  console.log(`Inventory fixture:   ${fixtureSize.toLocaleString()} properties`);
  console.log(`Samples:             ${samples}`);
  console.log(`PostgreSQL average:  ${databaseAverage.toFixed(3)} ms`);
  console.log(`Redis HIT average:   ${redisAverage.toFixed(3)} ms`);
  console.log(`Measured change:     ${improvement.toFixed(1)}%`);
  console.log("Note: local timings are evidence of the cache path, not a recreation of production latency.");
} finally {
  await pool.query("DELETE FROM properties WHERE title LIKE 'Cache Benchmark Listing %'");
  await closeRedis();
  await pool.end();
}
