import { z } from "zod";
import { AppError } from "./errors.js";

export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(400, "Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}
