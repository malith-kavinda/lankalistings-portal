/** The two list screens: recent batches, and what actually reached the public feed. */

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BatchListRoute } from "./BatchListRoute";
import { PublishedRoute } from "./PublishedRoute";
import { makeBatch } from "../test/fixtures";
import { BASE, failure, http, ok, server } from "../test/server";
import { renderWithProviders } from "../test/render";

describe("BatchListRoute", () => {
  it("links each batch to its progress", async () => {
    renderWithProviders(<BatchListRoute />);

    const link = await screen.findByRole("link", { name: /bat_01/ });
    expect(link).toHaveAttribute("href", "/batches/bat_01");
  });

  it("says so when nothing has been uploaded", async () => {
    server.use(http.get(`${BASE}/api/v1/ingestion-batches`, () => ok([])));

    renderWithProviders(<BatchListRoute />);

    expect(await screen.findByText(/Nothing uploaded yet/)).toBeInTheDocument();
  });

  it("surfaces a failure with its correlation id", async () => {
    server.use(
      http.get(`${BASE}/api/v1/ingestion-batches`, () =>
        failure(503, "UNAVAILABLE", "No database.", [], "cor_b1"),
      ),
    );

    renderWithProviders(<BatchListRoute />);

    expect(await screen.findByText("cor_b1")).toBeInTheDocument();
  });

  it("shows a partially failed batch as such rather than as done", async () => {
    server.use(
      http.get(`${BASE}/api/v1/ingestion-batches`, () =>
        ok([makeBatch({ status: "partial_failed" })]),
      ),
    );

    renderWithProviders(<BatchListRoute />);

    expect(await screen.findByText(/partial failed/)).toBeInTheDocument();
  });
});

describe("PublishedRoute", () => {
  it("lists what reached the public feed", async () => {
    server.use(
      http.get(`${BASE}/api/v1/advertisements`, () =>
        ok([
          {
            id: "adv_live",
            title: "Honda Fit 2014",
            price: "Rs. 5,750,000",
            category: "vehicles",
            location: "Kandy",
            description: "",
            image_url: "",
            status: "active",
            created_at: "2026-09-17T10:00:00Z",
            source_text: "",
            extraction_confidence: "high",
          },
        ]),
      ),
    );

    renderWithProviders(<PublishedRoute />);

    expect(await screen.findByText("Honda Fit 2014")).toBeInTheDocument();
    expect(screen.getByText("Rs. 5,750,000")).toBeInTheDocument();
  });

  it("says nothing is approved yet rather than showing an empty table", async () => {
    renderWithProviders(<PublishedRoute />);

    expect(await screen.findByText(/Nothing has been approved yet/)).toBeInTheDocument();
  });
});
