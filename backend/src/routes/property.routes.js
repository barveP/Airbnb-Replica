import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../lib/errors.js";
import { parse } from "../lib/validation.js";
import { propertySchema, searchSchema } from "../schemas.js";
import {
  createProperty,
  deleteProperty,
  getHostProperties,
  getProperty,
  searchProperties,
  updateProperty,
} from "../services/property.service.js";

export const propertyRouter = Router();

propertyRouter.get("/", asyncHandler(async (req, res) => {
  const filters = parse(searchSchema, req.query);
  const result = await searchProperties(filters);
  res.set("X-Cache", result.cacheStatus).json(result.items);
}));

propertyRouter.get("/mine", authenticate, requireRole("host"), asyncHandler(async (req, res) => {
  res.json(await getHostProperties(req.user.id));
}));

propertyRouter.get("/:id", asyncHandler(async (req, res) => {
  res.json(await getProperty(req.params.id));
}));

propertyRouter.post("/", authenticate, requireRole("host"), asyncHandler(async (req, res) => {
  const property = await createProperty(req.user.id, parse(propertySchema, req.body));
  res.status(201).json(property);
}));

propertyRouter.put("/:id", authenticate, requireRole("host"), asyncHandler(async (req, res) => {
  res.json(await updateProperty(req.params.id, req.user.id, parse(propertySchema, req.body)));
}));

propertyRouter.delete("/:id", authenticate, requireRole("host"), asyncHandler(async (req, res) => {
  await deleteProperty(req.params.id, req.user.id);
  res.status(204).end();
}));
