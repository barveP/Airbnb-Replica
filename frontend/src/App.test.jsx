import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.jsx";

const property = {
  id: "a0d8b4ca-38a2-4f77-8ba9-57742ad58bc7",
  hostId: "70d18345-4852-45e3-b7ee-366dff916441",
  hostName: "Maya Host",
  title: "Test Cabin",
  description: "A quiet cabin used to verify the React inventory flow.",
  city: "Aspen",
  country: "United States",
  pricePerNight: 300,
  capacity: 4,
  bedrooms: 2,
  imageUrl: "https://example.com/cabin.jpg",
  availableFrom: "2026-01-01",
  availableTo: "2027-01-01",
  status: "published",
};

function response(body, headers = {}) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body), headers: { get: (name) => headers[name] ?? null } });
}

describe("StayFinder app", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn((url) => {
      if (url.includes("/api/properties")) return response([property], { "X-Cache": "MISS" });
      return response({});
    }));
  });

  it("loads inventory and displays the cache result", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Test Cabin" })).toBeInTheDocument();
    expect(screen.getByText("Redis MISS")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reserve" })).not.toBeInTheDocument();
  });

  it("uses the seeded guest login and unlocks reservations", async () => {
    fetch.mockImplementation((url) => {
      if (url.includes("/api/auth/login")) return response({ token: "guest-token", user: { id: "guest-id", name: "Noah Guest", email: "guest@stayfinder.dev", role: "guest" } });
      if (url.includes("/api/properties")) return response([property], { "X-Cache": "HIT" });
      return response({});
    });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Test Cabin" });
    await user.click(screen.getByRole("button", { name: "Demo login" }));
    await user.click(screen.getByRole("button", { name: /Continue as guest/i }));
    expect(await screen.findByRole("button", { name: "My trips" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reserve" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("stayfinder-session")).token).toBe("guest-token");
  });
});
