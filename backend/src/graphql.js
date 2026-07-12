import { buildSchema } from "graphql";
import { AppError } from "./lib/errors.js";
import { parse } from "./lib/validation.js";
import { reservationSchema, searchSchema } from "./schemas.js";
import { getProperty, searchProperties } from "./services/property.service.js";
import {
  cancelReservation,
  createReservation,
  getGuestReservations,
} from "./services/reservation.service.js";

export const schema = buildSchema(`
  type Property {
    id: ID!
    hostId: ID!
    hostName: String!
    title: String!
    description: String!
    city: String!
    country: String!
    pricePerNight: Float!
    capacity: Int!
    bedrooms: Int!
    imageUrl: String!
    availableFrom: String!
    availableTo: String!
    status: String!
  }

  type Reservation {
    id: ID!
    propertyId: ID!
    checkIn: String!
    checkOut: String!
    guests: Int!
    totalPrice: Float!
    status: String!
    property: Property
  }

  type Query {
    properties(location: String, guests: Int, checkIn: String, checkOut: String): [Property!]!
    property(id: ID!): Property!
    myReservations: [Reservation!]!
  }

  type Mutation {
    createReservation(propertyId: ID!, checkIn: String!, checkOut: String!, guests: Int!): Reservation!
    cancelReservation(id: ID!): Reservation!
  }
`);

function requireGuest(context) {
  if (!context.user) throw new AppError(401, "Authentication required");
  if (context.user.role !== "guest") throw new AppError(403, "guest account required");
  return context.user;
}

export const rootValue = {
  properties: async (args) => (await searchProperties(parse(searchSchema, args))).items,
  property: ({ id }) => getProperty(id),
  myReservations: (_args, context) => getGuestReservations(requireGuest(context).id),
  createReservation: (args, context) =>
    createReservation(requireGuest(context).id, parse(reservationSchema, args)),
  cancelReservation: ({ id }, context) => cancelReservation(id, requireGuest(context).id),
};
