import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://airbnb:airbnb@localhost:5433/airbnb",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6380",
  jwtSecret: process.env.JWT_SECRET ?? "local-development-only-secret",
  webOrigins: (process.env.WEB_ORIGIN ?? "http://localhost:5174,http://localhost:4173")
    .split(",")
    .map((origin) => origin.trim()),
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS ?? 60),
};
