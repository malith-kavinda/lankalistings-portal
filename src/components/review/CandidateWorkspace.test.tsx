/**
 * The review workspace, tested at the boundary that matters: what it sends the server.
 *
 * The headline assertion is `sends the edits with the approval, in one request`. The old portal
 * PATCHed and then POSTed, and a failure between the two left the corrections saved with the
 * candidate still pending and nothing on screen saying so. A regression to that shape would show up
 * here as two requests instead of one.
 */

import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CandidateWorkspace } from "./CandidateWorkspace";
import { makeCandidate, makeDetail } from "../../test/fixtures";
import { BASE, failure, http, ok, server } from "../../test/server";
import { renderWithProviders } from "../../test/render";

function renderWorkspace(overrides: Partial<Parameters<typeof CandidateWorkspace>[0]> = {}) {
  const onDecided = vi.fn();
  const onNavigate = vi.fn();
  const result = renderWithProviders(
    <CandidateWorkspace
      advertisementId="adv_01"
      onDecided={onDecided}
      onNavigate={onNavigate}
      {...overrides}
    />,
  );
  return { ...result, onDecided, onNavigate };
}

describe("CandidateWorkspace", () => {
  it("shows the evidence a reviewer needs to check a field against the page", async () => {
    renderWorkspace();

    expect(await screen.findByDisplayValue("Honda Fit 2014")).toBeInTheDocument();
    // The raw text, with its line breaks intact -- they are the only structural signal a reviewer
    // has for where one advertisement ends and the next begins.
    const rawText = document.querySelector("pre");
    expect(rawText?.textContent).toContain("Honda Fit 2014\nRs. 5,750,000");
    // Only the blocks this candidate came from, not all three on the page.
    expect(screen.getByText("Rs. 5,750,000 Kandy")).toBeInTheDocument();
    expect(screen.queryByText("Unrelated masthead")).not.toBeInTheDocument();
    // Per-field confidence, not one number for the whole candidate.
    expect(screen.getByTitle(/Confidence 42%/)).toBeInTheDocument();
    expect(screen.getByText(/tesseract/)).toBeInTheDocument();
  });

  it("sends the edits with the approval, in one request", async () => {
    const user = userEvent.setup();
    const calls: { method: string; path: string; body: unknown }[] = [];
    server.use(
      http.patch(`${BASE}/api/v1/advertisements/:id`, async ({ request }) => {
        calls.push({ method: "PATCH", path: "/advertisements/:id", body: await request.json() });
        return ok(makeDetail());
      }),
      http.post(`${BASE}/api/v1/advertisements/:id/approve`, async ({ request }) => {
        calls.push({ method: "POST", path: "/approve", body: await request.json() });
        return ok(makeDetail({ candidate: makeCandidate({ status: "active" }) }));
      }),
    );

    renderWorkspace();
    const title = await screen.findByLabelText(/^Title/);
    await user.clear(title);
    await user.type(title, "Honda Fit GP5 2014");
    await user.click(screen.getByRole("button", { name: /save & approve/i }));

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].method).toBe("POST");
    expect(calls[0].body).toMatchObject({
      edits: { title: "Honda Fit GP5 2014" },
      version: 1,
    });
  });

  it("sends only the fields that changed, so untouched ones are not overwritten", async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> = {};
    server.use(
      http.post(`${BASE}/api/v1/advertisements/:id/approve`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return ok(makeDetail());
      }),
    );

    renderWorkspace();
    const location = await screen.findByLabelText(/^Location/);
    await user.clear(location);
    await user.type(location, "Kandy Town");
    await user.click(screen.getByRole("button", { name: /save & approve/i }));

    await waitFor(() => expect(body.edits).toBeDefined());
    expect(body.edits).toEqual({ location: "Kandy Town" });
  });

  it("approves with no edits at all when nothing was changed", async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> = {};
    server.use(
      http.post(`${BASE}/api/v1/advertisements/:id/approve`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return ok(makeDetail());
      }),
    );

    renderWorkspace();
    await user.click(await screen.findByRole("button", { name: /^approve$/i }));

    await waitFor(() => expect(body.version).toBe(1));
    expect(body.edits).toBeUndefined();
  });

  it("puts a rejected approval's message against the field that caused it", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE}/api/v1/advertisements/:id/approve`, () =>
        failure(422, "APPROVAL_VALIDATION_FAILED", "This candidate cannot be published yet.", [
          { field: "title", code: "REQUIRED", message: "A title is required before publishing." },
        ]),
      ),
    );

    renderWorkspace();
    const title = await screen.findByLabelText(/^Title/);
    await user.clear(title);
    await user.click(screen.getByRole("button", { name: /save & approve/i }));

    expect(
      await screen.findByText("A title is required before publishing."),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText(/^Title/)).toHaveAttribute("aria-invalid", "true");
  });

  it("surfaces the correlation id on a failure, because it is the only handle for the logs", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE}/api/v1/advertisements/:id/approve`, () =>
        failure(500, "UNEXPECTED_ERROR", "Something went wrong.", [], "cor_xyz789"),
      ),
    );

    renderWorkspace();
    await user.click(await screen.findByRole("button", { name: /^approve$/i }));

    expect(await screen.findByText("cor_xyz789")).toBeInTheDocument();
  });

  it("reports a version conflict rather than silently overwriting a colleague's edit", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE}/api/v1/advertisements/:id/approve`, () =>
        failure(409, "VERSION_CONFLICT", "This candidate has changed since it was loaded."),
      ),
    );

    renderWorkspace();
    await user.click(await screen.findByRole("button", { name: /^approve$/i }));

    expect(
      await screen.findByText(/has changed since it was loaded/),
    ).toBeInTheDocument();
  });

  it("rejects with a reason code and a note", async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> = {};
    server.use(
      http.post(`${BASE}/api/v1/advertisements/:id/reject`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return ok(makeDetail());
      }),
    );

    const { onDecided } = renderWorkspace();
    await user.click(await screen.findByRole("button", { name: /reject/i }));

    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(
      within(dialog).getByLabelText(/reason/i),
      "not_an_advertisement",
    );
    await user.type(within(dialog).getByLabelText(/note/i), "Masthead, not an ad.");
    await user.click(within(dialog).getByRole("button", { name: /^reject$/i }));

    await waitFor(() => expect(body.reason_code).toBe("not_an_advertisement"));
    expect(body.note).toBe("Masthead, not an ad.");
    await waitFor(() => expect(onDecided).toHaveBeenCalled());
  });

  it("will not let `other` be submitted without a note", async () => {
    const user = userEvent.setup();

    renderWorkspace();
    await user.click(await screen.findByRole("button", { name: /reject/i }));

    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/reason/i), "other");

    expect(within(dialog).getByRole("button", { name: /^reject$/i })).toBeDisabled();
  });

  it("offers the server's categories, not a list of its own", async () => {
    renderWorkspace();

    const category = await screen.findByLabelText(/^Category/);
    const options = [...category.querySelectorAll("option")].map((option) => option.value);
    expect(options).toEqual(["vehicles", "property", "other"]);
  });

  it("keeps an unrecognised category selectable rather than switching the reviewer silently", async () => {
    server.use(
      http.get(`${BASE}/api/v1/advertisements/:id`, () =>
        ok(makeDetail({ candidate: makeCandidate({ category: "retired_slug" }) })),
      ),
    );

    renderWorkspace();

    const category = await screen.findByLabelText(/^Category/);
    expect((category as HTMLSelectElement).value).toBe("retired_slug");
    expect(screen.getByText(/retired_slug \(unrecognised\)/)).toBeInTheDocument();
  });

  it("marks a decided candidate read-only instead of offering buttons that would fail", async () => {
    server.use(
      http.get(`${BASE}/api/v1/advertisements/:id`, () =>
        ok(
          makeDetail({
            candidate: makeCandidate({
              status: "active",
              candidate_state: "linked",
              reviewer_id: "reviewer-3",
            }),
          }),
        ),
      ),
    );

    renderWorkspace();

    expect(await screen.findByText(/can no longer be changed/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reject/i })).not.toBeInTheDocument();
  });

  it("shows which candidate of the page this is", async () => {
    server.use(
      http.get(`${BASE}/api/v1/advertisements/:id`, () =>
        ok(
          makeDetail({
            siblings: ["adv_00", "adv_01", "adv_02"],
            position: 2,
            sibling_count: 3,
            source_filename: "page-3.png",
          }),
        ),
      ),
    );

    renderWorkspace();

    expect(await screen.findByText("Ad 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("page-3.png")).toBeInTheDocument();
  });

  it("warns before walking away from unsaved edits", async () => {
    const user = userEvent.setup();
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    server.use(
      http.get(`${BASE}/api/v1/advertisements/:id`, () =>
        ok(makeDetail({ siblings: ["adv_01", "adv_02"], position: 1, sibling_count: 2 })),
      ),
    );

    const { onNavigate } = renderWorkspace();
    const title = await screen.findByLabelText(/^Title/);
    await user.type(title, " edited");
    await user.click(screen.getByLabelText(/next candidate/i));

    expect(window.confirm).toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("disables Save when there is nothing to save", async () => {
    renderWorkspace();

    expect(await screen.findByRole("button", { name: /^save$/i })).toBeDisabled();
  });
});
