/** Intake: the limits are enforced before the upload starts, and 202 hands off to progress. */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { IntakeRoute } from "./IntakeRoute";
import { makeBatch } from "../test/fixtures";
import { BASE, failure, http, ok, server } from "../test/server";
import { renderWithProviders } from "../test/render";

/**
 * A file whose reported size can be set independently of its contents, so a 50 MB rejection does
 * not need 50 MB allocated. `realFile` is for the tests that actually read the multipart body,
 * where a lied-about size makes the parse mismatch.
 */
function imageFile(name: string, size: number, type = "image/png"): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function realFile(name: string, type = "image/png"): File {
  return new File(["scan-bytes"], name, { type });
}

describe("IntakeRoute", () => {
  it("shows the server's limits rather than numbers of its own", async () => {
    renderWithProviders(<IntakeRoute />);

    expect(await screen.findByText(/Up to 25 images/)).toBeInTheDocument();
    expect(screen.getByText(/10 MB each/)).toBeInTheDocument();
  });

  it("lists what was selected with its size", async () => {
    const user = userEvent.setup();
    renderWithProviders(<IntakeRoute />);
    await screen.findByText(/Up to 25 images/);

    await user.upload(
      screen.getByLabelText(/drop newspaper pages/i),
      [imageFile("page-1.png", 2048), imageFile("page-2.png", 4096)],
    );

    expect(await screen.findByText("page-1.png")).toBeInTheDocument();
    expect(screen.getByText("2 images")).toBeInTheDocument();
  });

  it("refuses an over-sized image before anything is uploaded", async () => {
    const user = userEvent.setup();
    let uploaded = false;
    server.use(
      http.post(`${BASE}/api/v1/ingestion-batches`, () => {
        uploaded = true;
        return ok(makeBatch());
      }),
    );

    renderWithProviders(<IntakeRoute />);
    await screen.findByText(/Up to 25 images/);
    await user.upload(
      screen.getByLabelText(/drop newspaper pages/i),
      imageFile("huge.png", 50 * 1024 * 1024),
    );

    expect(await screen.findByText(/exceeds the 10 MB per-image limit/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^upload/i })).toBeDisabled();
    expect(uploaded).toBe(false);
  });

  it("warns about a repeated filename without blocking the upload", async () => {
    const user = userEvent.setup();
    renderWithProviders(<IntakeRoute />);
    await screen.findByText(/Up to 25 images/);

    await user.upload(
      screen.getByLabelText(/drop newspaper pages/i),
      [imageFile("page.png", 100), imageFile("page.png", 100)],
    );

    expect(await screen.findAllByText(/Another selected file has this name/)).toHaveLength(2);
    expect(screen.getByRole("button", { name: /^upload/i })).toBeEnabled();
  });

  it("uploads and clears the selection", async () => {
    const user = userEvent.setup();
    let uploads = 0;
    server.use(
      http.post(`${BASE}/api/v1/ingestion-batches`, () => {
        uploads += 1;
        return ok(makeBatch({ id: "bat_new" }));
      }),
    );

    renderWithProviders(<IntakeRoute />);
    await screen.findByText(/Up to 25 images/);
    await user.upload(
      screen.getByLabelText(/drop newspaper pages/i),
      [realFile("a.png"), realFile("b.png")],
    );
    await screen.findByText("b.png");
    await user.click(screen.getByRole("button", { name: /^upload/i }));

    await waitFor(() => expect(uploads).toBe(1));
    // The selection is emptied on success, so a second click cannot re-upload the same batch.
    await waitFor(() => expect(screen.queryByText("a.png")).not.toBeInTheDocument());
  });

  it("surfaces the correlation id when the server refuses the batch", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE}/api/v1/ingestion-batches`, () =>
        failure(422, "BATCH_LIMIT_EXCEEDED", "Too much.", [], "cor_batch_1"),
      ),
    );

    renderWithProviders(<IntakeRoute />);
    await screen.findByText(/Up to 25 images/);
    await user.upload(screen.getByLabelText(/drop newspaper pages/i), imageFile("a.png", 100));
    await screen.findByText("a.png");
    await user.click(screen.getByRole("button", { name: /^upload/i }));

    expect(await screen.findByText("cor_batch_1")).toBeInTheDocument();
  });

  it("lets a file be removed from the selection", async () => {
    const user = userEvent.setup();
    renderWithProviders(<IntakeRoute />);
    await screen.findByText(/Up to 25 images/);
    await user.upload(
      screen.getByLabelText(/drop newspaper pages/i),
      [imageFile("keep.png", 100), imageFile("drop.png", 100)],
    );

    await user.click(await screen.findByLabelText("Remove drop.png"));

    expect(screen.queryByText("drop.png")).not.toBeInTheDocument();
    expect(screen.getByText("keep.png")).toBeInTheDocument();
  });
});
