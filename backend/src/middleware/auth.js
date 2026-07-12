import { AppError } from "../lib/errors.js";
import { userFromToken } from "../services/auth.service.js";

export async function authenticate(req, _res, next) {
  try {
    const [scheme, token] = (req.headers.authorization ?? "").split(" ");
    if (scheme !== "Bearer" || !token) throw new AppError(401, "Authentication required");
    req.user = await userFromToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(role) {
  return (req, _res, next) => {
    if (req.user?.role !== role) return next(new AppError(403, `${role} account required`));
    next();
  };
}
