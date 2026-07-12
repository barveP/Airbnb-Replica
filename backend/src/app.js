import express from "express";
import cors from "cors";
import { createHandler } from "graphql-http/lib/use/express";
import { config } from "./config.js";
import { query } from "./db/pool.js";
import { getRedis } from "./cache.js";
import { AppError, asyncHandler } from "./lib/errors.js";
import { userFromToken } from "./services/auth.service.js";
import { authRouter } from "./routes/auth.routes.js";
import { propertyRouter } from "./routes/property.routes.js";
import { reservationRouter } from "./routes/reservation.routes.js";
import { rootValue, schema } from "./graphql.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({
    origin(origin, callback) {
      callback(null, !origin || config.webOrigins.includes(origin));
    },
    exposedHeaders: ["X-Cache"],
  }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", asyncHandler(async (_req, res) => {
    await query("SELECT 1");
    const redis = await getRedis();
    await redis.ping();
    res.json({ status: "ok", postgres: "connected", redis: "connected" });
  }));

  app.use("/api/auth", authRouter);
  app.use("/api/properties", propertyRouter);
  app.use("/api/reservations", reservationRouter);

  app.use("/graphql", asyncHandler(async (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization ?? "").split(" ");
    if (scheme === "Bearer" && token) req.user = await userFromToken(token);
    next();
  }));
  app.all("/graphql", createHandler({
    schema,
    rootValue,
    context: (request) => ({ user: request.raw.user }),
  }));

  app.use((_req, _res, next) => next(new AppError(404, "Route not found")));
  app.use((error, _req, res, _next) => {
    const status = error.status ?? 500;
    if (status >= 500) console.error(error);
    res.status(status).json({
      error: error.message ?? "Internal server error",
      ...(error.details ? { details: error.details } : {}),
    });
  });
  return app;
}
