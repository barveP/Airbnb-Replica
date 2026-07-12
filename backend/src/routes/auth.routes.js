import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../lib/errors.js";
import { parse } from "../lib/validation.js";
import { loginSchema } from "../schemas.js";
import { login } from "../services/auth.service.js";

export const authRouter = Router();

authRouter.post("/login", asyncHandler(async (req, res) => {
  const credentials = parse(loginSchema, req.body);
  res.json(await login(credentials.email, credentials.password));
}));

authRouter.get("/me", authenticate, (req, res) => res.json(req.user));
