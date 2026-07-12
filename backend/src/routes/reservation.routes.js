import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../lib/errors.js";
import { parse } from "../lib/validation.js";
import { reservationSchema } from "../schemas.js";
import {
  cancelReservation,
  createReservation,
  getGuestReservations,
} from "../services/reservation.service.js";

export const reservationRouter = Router();
reservationRouter.use(authenticate, requireRole("guest"));

reservationRouter.get("/", asyncHandler(async (req, res) => {
  res.json(await getGuestReservations(req.user.id));
}));

reservationRouter.post("/", asyncHandler(async (req, res) => {
  res.status(201).json(await createReservation(req.user.id, parse(reservationSchema, req.body)));
}));

reservationRouter.delete("/:id", asyncHandler(async (req, res) => {
  res.json(await cancelReservation(req.params.id, req.user.id));
}));
