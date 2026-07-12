import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db/pool.js";
import { config } from "../config.js";
import { AppError } from "../lib/errors.js";
import { mapUser } from "../lib/mappers.js";

export async function login(email, password) {
  const result = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AppError(401, "Invalid email or password");
  }
  const safeUser = mapUser(user);
  const token = jwt.sign(safeUser, config.jwtSecret, { expiresIn: "8h" });
  return { token, user: safeUser };
}

export async function userFromToken(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const result = await query("SELECT * FROM users WHERE id = $1", [payload.id]);
    if (!result.rowCount) throw new Error("User no longer exists");
    return mapUser(result.rows[0]);
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
}
