/** The queue: ordering, filters that live in the URL, and selecting a candidate. */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ReviewRoute } from "./ReviewRoute";
import { makeCandidate, makePage } from "../test/fixtures";
import { BASE, failure, http, ok, server } from "../test/server";
import { renderWithProviders } from "../test/render";

function renderQueue(route = "/review") {
  return renderWithProviders(<ReviewRoute />, { route, path: "/review/:candidateId?" });
}

describe("ReviewRoute", () => {
  it("lists candidates with what is needed to choose one to open", async () => {
    server.use(
      http.get(`${BASE}/api/v1/advertisements/review`, () =>
        ok(
          makePage([
            makeCandidate({
              id: "adv_low",
              title: "Blurred listing",
              confidence_overall: 0.21,
              warning_codes: ["LOW_OCR_CONFIDENCE"],
            }),
            makeCandidate({ id: "adv_high", title: "Honda Fit 2014" }),
          ]),
        ),
      ),
    );

    renderQueue();

    expect(await screen.findByText("Blurred listing")).toBeInTheDocument();
    expect(screen.getByText("low ocr confidence")).toBeInTheDocument();
    expect(screen.getByText("21%")).toBeInTheDocument();
  });

  it("puts every filter in the URL, so a filtered view is a link", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    server.use(
      http.get(`${BASE}/api/v1/advertisements/review`, ({ request }) => {
        seen.push(new URL(request.url).search);
        return ok(makePage());
      }),
    );

    renderQueue();
    await screen.findByText("Honda Fit 2014");

    await user.selectOptions(screen.getByLabelText(/^Category/), "property");

    await waitFor(() => expect(seen.some((search) => search.includes("category=property"))).toBe(true));
  });

  it("turns the confidence band into the range the server filters on", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    server.use(
      http.get(`${BASE}/api/v1/advertisements/review`, ({ request }) => {
        seen.push(new URL(request.url).search);
        return ok(makePage());
      }),
    );

    renderQueue();
    await screen.findByText("Honda Fit 2014");

    await user.selectOptions(screen.getByLabelText(/^Confidence/), "low");

    await waitFor(() =>
      expect(seen.some((search) => search.includes("max_confidence=0.5"))).toBe(true),
    );
  });

  it("reads filters back out of the URL when the page is opened from a link", async () => {
    let seen = "";
    server.use(
      http.get(`${BASE}/api/v1/advertisements/review`, ({ request }) => {
        seen = new URL(request.url).search;
        return ok(makePage());
      }),
    );

    renderQueue("/review?batch_id=bat_77&category=vehicles");

    await waitFor(() => expect(seen).toContain("batch_id=bat_77"));
    expect(seen).toContain("category=vehicles");
  });

  it("shows a clearable pill for a batch the queue was entered through", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    server.use(
      http.get(`${BASE}/api/v1/advertisements/review`, ({ request }) => {
        seen.push(new URL(request.url).search);
        return ok(makePage());
      }),
    );

    renderQueue("/review?batch_id=bat_77");
    await screen.findByText("bat_77");

    await user.click(screen.getByLabelText(/clear batch filter/i));

    await waitFor(() =>
      expect(seen.at(-1)).not.toContain("batch_id"),
    );
  });

  it("opens the workspace for the selected candidate", async () => {
    const user = userEvent.setup();
    renderQueue();

    await user.click(await screen.findByText("Honda Fit 2014"));

    // The workspace loads its own detail, which carries the page the candidate came from.
    expect(await screen.findByText("page-3.png")).toBeInTheDocument();
  });

  it("says so when there is nothing to review", async () => {
    server.use(http.get(`${BASE}/api/v1/advertisements/review`, () => ok(makePage([]))));

    renderQueue();

    expect(await screen.findByText(/Nothing is waiting for review here/)).toBeInTheDocument();
  });

  it("surfaces the correlation id when the queue itself fails", async () => {
    server.use(
      http.get(`${BASE}/api/v1/advertisements/review`, () =>
        failure(503, "SERVICE_UNAVAILABLE", "The database is unreachable.", [], "cor_q1"),
      ),
    );

    renderQueue();

    expect(await screen.findByText("cor_q1")).toBeInTheDocument();
  });

  it("pages through a queue larger than one page", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    server.use(
      http.get(`${BASE}/api/v1/advertisements/review`, ({ request }) => {
        seen.push(new URL(request.url).search);
        return ok({ ...makePage(), total: 60 });
      }),
    );

    renderQueue();
    await screen.findByText("Honda Fit 2014");

    await user.click(screen.getByLabelText(/next page/i));

    await waitFor(() => expect(seen.some((search) => search.includes("offset=25"))).toBe(true));
  });

  it("returns to the first page when a filter changes", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    server.use(
      http.get(`${BASE}/api/v1/advertisements/review`, ({ request }) => {
        seen.push(new URL(request.url).search);
        return ok({ ...makePage(), total: 60 });
      }),
    );

    renderQueue("/review?offset=25");
    await screen.findByText("Honda Fit 2014");

    await user.selectOptions(screen.getByLabelText(/^Category/), "property");

    // Offset 25 of the old result set means nothing in the new one.
    await waitFor(() => {
      const last = seen.at(-1) ?? "";
      expect(last).toContain("category=property");
      expect(last).toContain("offset=0");
    });
  });

  it("counts what the filters select, not the whole deployment", async () => {
    server.use(
      http.get(`${BASE}/api/v1/advertisements/review`, () =>
        ok({ ...makePage(), counts: { pending_review: 3, active: 12, rejected: 1 } }),
      ),
    );

    renderQueue("/review?batch_id=bat_77");

    await screen.findByText("bat_77");
    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText(/pending review/)).toBeInTheDocument();
  });
});
