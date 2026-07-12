import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { closeRedis, getRedis } from "../src/cache.js";
import { pool } from "../src/db/pool.js";
import { setupDatabase } from "../src/db/setup.js";

const app = createApp();
let hostToken;
let guestToken;
let propertyId;
let reservationId;

function futureDate(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

before(async () => {
  await setupDatabase();
  await pool.query("DELETE FROM reservations WHERE property_id IN (SELECT id FROM properties WHERE title LIKE 'Integration Test%')");
  await pool.query("DELETE FROM properties WHERE title LIKE 'Integration Test%'");
  await (await getRedis()).flushDb();
});

after(async () => {
  await pool.query("DELETE FROM reservations WHERE property_id IN (SELECT id FROM properties WHERE title LIKE 'Integration Test%')");
  await pool.query("DELETE FROM properties WHERE title LIKE 'Integration Test%'");
  await closeRedis();
  await pool.end();
});

test("health confirms both infrastructure dependencies", async () => {
  const response = await request(app).get("/api/health").expect(200);
  assert.deepEqual(response.body, { status: "ok", postgres: "connected", redis: "connected" });
});

test("seeded host and guest can authenticate with JWTs", async () => {
  const host = await request(app).post("/api/auth/login")
    .send({ email: "host@stayfinder.dev", password: "password123" }).expect(200);
  const guest = await request(app).post("/api/auth/login")
    .send({ email: "guest@stayfinder.dev", password: "password123" }).expect(200);
  assert.equal(host.body.user.role, "host");
  assert.equal(guest.body.user.role, "guest");
  hostToken = host.body.token;
  guestToken = guest.body.token;

  await request(app).get("/api/auth/me").set("Authorization", `Bearer ${guestToken}`).expect(200);
  await request(app).get("/api/auth/me").expect(401);
});

test("search is cached and reports MISS followed by HIT", async () => {
  const first = await request(app).get("/api/properties?location=Aspen&guests=2").expect(200);
  const second = await request(app).get("/api/properties?location=Aspen&guests=2").expect(200);
  assert.equal(first.headers["x-cache"], "MISS");
  assert.equal(second.headers["x-cache"], "HIT");
  assert.equal(first.body[0].city, "Aspen");
});

test("role and ownership rules protect property writes", async () => {
  const input = {
    title: "Integration Test Cottage",
    description: "A deliberately simple cottage created by the integration suite.",
    city: "Portland",
    country: "United States",
    pricePerNight: 199,
    capacity: 4,
    bedrooms: 2,
    imageUrl: "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8",
    availableFrom: futureDate(0),
    availableTo: futureDate(365),
    status: "published",
  };
  await request(app).post("/api/properties").send(input).expect(401);
  await request(app).post("/api/properties").set("Authorization", `Bearer ${guestToken}`).send(input).expect(403);

  const created = await request(app).post("/api/properties")
    .set("Authorization", `Bearer ${hostToken}`).send(input).expect(201);
  propertyId = created.body.id;
  assert.equal(created.body.pricePerNight, 199);

  const invalidated = await request(app).get("/api/properties?location=Portland&guests=2").expect(200);
  assert.equal(invalidated.headers["x-cache"], "MISS");
  assert.equal(invalidated.body[0].id, propertyId);

  const updated = await request(app).put(`/api/properties/${propertyId}`)
    .set("Authorization", `Bearer ${hostToken}`)
    .send({ ...input, title: "Integration Test Cottage Updated", pricePerNight: 225 })
    .expect(200);
  assert.equal(updated.body.title, "Integration Test Cottage Updated");
  assert.equal(updated.body.pricePerNight, 225);
});

test("GraphQL exposes the same property service", async () => {
  const response = await request(app).post("/graphql")
    .send({ query: `{ properties(location: "Portland", guests: 2) { id title pricePerNight } }` })
    .expect(200);
  assert.equal(response.body.data.properties[0].id, propertyId);
  assert.equal(response.body.data.properties[0].pricePerNight, 225);
});

test("guest reservation flow prevents double booking and changes availability", async () => {
  const reservation = {
    propertyId,
    checkIn: futureDate(40),
    checkOut: futureDate(43),
    guests: 2,
  };
  await request(app).post("/api/reservations").set("Authorization", `Bearer ${hostToken}`).send(reservation).expect(403);
  const created = await request(app).post("/api/reservations")
    .set("Authorization", `Bearer ${guestToken}`).send(reservation).expect(201);
  reservationId = created.body.id;
  assert.equal(created.body.totalPrice, 675);

  await request(app).post("/api/reservations")
    .set("Authorization", `Bearer ${guestToken}`).send(reservation).expect(409);

  const unavailable = await request(app).get(`/api/properties?location=Portland&guests=2&checkIn=${reservation.checkIn}&checkOut=${reservation.checkOut}`).expect(200);
  assert.equal(unavailable.body.length, 0);

  const mine = await request(app).get("/api/reservations")
    .set("Authorization", `Bearer ${guestToken}`).expect(200);
  assert.equal(mine.body[0].property.title, "Integration Test Cottage Updated");

  const graph = await request(app).post("/graphql")
    .set("Authorization", `Bearer ${guestToken}`)
    .send({ query: `{ myReservations { id status property { title } } }` }).expect(200);
  assert.equal(graph.body.data.myReservations[0].id, reservationId);
});

test("cancellation releases dates and the host can finish CRUD by deleting", async () => {
  await request(app).delete(`/api/reservations/${reservationId}`)
    .set("Authorization", `Bearer ${guestToken}`).expect(200);
  const available = await request(app).get(`/api/properties?location=Portland&guests=2&checkIn=${futureDate(40)}&checkOut=${futureDate(43)}`).expect(200);
  assert.equal(available.body[0].id, propertyId);

  await request(app).delete(`/api/properties/${propertyId}`)
    .set("Authorization", `Bearer ${hostToken}`).expect(204);
  await request(app).get(`/api/properties/${propertyId}`).expect(404);
});
