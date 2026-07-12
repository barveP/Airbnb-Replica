import { z } from "zod";
import { dateString } from "./lib/validation.js";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const searchSchema = z.object({
  location: z.string().max(80).optional().default(""),
  guests: z.coerce.number().int().min(1).max(20).optional().default(1),
  checkIn: z.union([dateString, z.literal("")]).optional().transform((value) => value || undefined),
  checkOut: z.union([dateString, z.literal("")]).optional().transform((value) => value || undefined),
}).refine((value) => Boolean(value.checkIn) === Boolean(value.checkOut), {
  message: "checkIn and checkOut must be supplied together",
  path: ["checkOut"],
}).refine((value) => !value.checkIn || value.checkOut > value.checkIn, {
  message: "checkOut must be after checkIn",
  path: ["checkOut"],
});

export const propertySchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(20).max(1000),
  city: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80),
  pricePerNight: z.coerce.number().positive().max(10000),
  capacity: z.coerce.number().int().min(1).max(20),
  bedrooms: z.coerce.number().int().min(1).max(20),
  imageUrl: z.string().url(),
  availableFrom: dateString,
  availableTo: dateString,
  status: z.enum(["published", "draft"]).optional().default("published"),
}).refine((value) => value.availableTo > value.availableFrom, {
  message: "availableTo must be after availableFrom",
  path: ["availableTo"],
});

export const reservationSchema = z.object({
  propertyId: z.string().uuid(),
  checkIn: dateString,
  checkOut: dateString,
  guests: z.coerce.number().int().min(1).max(20),
}).refine((value) => value.checkOut > value.checkIn, {
  message: "checkOut must be after checkIn",
  path: ["checkOut"],
});
