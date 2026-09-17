/** Progress: all seven counts, per-item stage and error, retry, and polling that stops. */

import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BatchProgressRoute } from "./BatchProgressRoute";
import { makeBatch, makeItem } from "../test/fixtures";
import { BASE, http, ok, server } from "../test/server";
import { renderWithProviders } from "../test/render";

function renderRoute() {
  return renderWithProviders(<BatchProgressRoute />, {
    route: "/batches/bat_01",
    path: "/batches/:batchId",
  });
}

describe("BatchProgressRoute", () => {
  it("publishes every count, including the zeroes", async () => {
    server.use(
      http.get(`${BASE}/api/v1/ingestion-batches/:id`, () =>
        ok(
          makeBatch({
            counts: {
              queued: 1,
              processing: 0,
              awaiting_review: 2,
              completed: 0,
              no_ads: 0,
              failed: 1,
              needs_attention: 0,
            },
          }),
        ),
      ),
    );

    renderRoute();

    // "No failures" and "the server did not mention failures" must not look the same.
    for (const label of [
      "Queued",
      "Processing",
      "Awaiting review",
      "Completed",
      "No ads found",
      "Failed",
      "Needs attention",
    ]) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
  });

  it("shows each image's stage, elapsed time and error code", async () => {
    server.use(
      http.get(`${BASE}/api/v1/ingestion-batches/:id`, () =>
        ok(
          makeBatch({
            status: "partial_failed",
            items: [
              makeItem({
                id: "itm_bad",
                original_filename: "torn.png",
                status: "failed",
                stage: "ocr",
                error_code: "OCR_TIMEOUT",
                error_message: "The engine did not answer in time.",
                candidate_count: 0,
              }),
            ],
          }),
        ),
      ),
    );

    renderRoute();

    expect(await screen.findByText("torn.png")).toBeInTheDocument();
    expect(screen.getByText("OCR_TIMEOUT")).toBeInTheDocument();
    expect(screen.getByText(/did not answer in time/)).toBeInTheDocument();
    expect(screen.getByText("stage: ocr")).toBeInTheDocument();
  });

  it("offers resume and reprocess on a failed item, because they are different decisions", async () => {
    const user = userEvent.setup();
    let mode: string | null = null;
    server.use(
      http.get(`${BASE}/api/v1/ingestion-batches/:id`, () =>
        ok(
          makeBatch({
            status: "partial_failed",
            items: [makeItem({ status: "failed", candidate_count: 0 })],
          }),
        ),
      ),
      http.post(`${BASE}/api/v1/ingestion-items/:itemId/retry`, ({ request }) => {
        mode = new URL(request.url).searchParams.get("mode");
        return ok({ mode: mode ?? "resume", items: [] });
      }),
    );

    renderRoute();
    await user.click(await screen.findByRole("button", { name: /reprocess/i }));

    await waitFor(() => expect(mode).toBe("reprocess"));
  });

  it("offers no retry on an item that succeeded", async () => {
    renderRoute();

    await screen.findByText("page-3.png");
    expect(screen.queryByRole("button", { name: /resume/i })).not.toBeInTheDocument();
  });

  it("links from an image to the candidates it produced, and from the batch to all of them", async () => {
    renderRoute();

    await screen.findByText("page-3.png");
    const links = screen.getAllByRole("link", { name: /candidate/i });
    const targets = links.map((link) => link.getAttribute("href"));

    expect(targets).toContain("/review?item_id=itm_01");
    expect(targets).toContain("/review?batch_id=bat_01");
  });

  it("stops polling once the batch can no longer change", async () => {
    vi.useFakeTimers();
    let requests = 0;
    server.use(
      http.get(`${BASE}/api/v1/ingestion-batches/:id`, () => {
        requests += 1;
        return ok(makeBatch({ status: "completed" }));
      }),
    );

    renderRoute();
    await act(async () => {
      await vi.waitFor(() => expect(requests).toBe(1));
    });

    await act(() => vi.advanceTimersByTimeAsync(30_000));

    expect(requests).toBe(1);
    vi.useRealTimers();
  });

  it("keeps polling while the batch is still running", async () => {
    vi.useFakeTimers();
    let requests = 0;
    server.use(
      http.get(`${BASE}/api/v1/ingestion-batches/:id`, () => {
        requests += 1;
        return ok(makeBatch({ status: "processing", completed_at: null }));
      }),
    );

    renderRoute();
    await act(async () => {
      await vi.waitFor(() => expect(requests).toBe(1));
    });

    await act(() => vi.advanceTimersByTimeAsync(6_000));

    expect(requests).toBeGreaterThan(1);
    vi.useRealTimers();
  });
});
