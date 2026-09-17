/** The banner's job is putting the correlation id where someone can copy it. */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorBanner } from "./ErrorBanner";
import { ApiError } from "../../lib/api/client";
import { renderWithProviders } from "../../test/render";

describe("ErrorBanner", () => {
  it("renders nothing when there is no error", () => {
    const { container } = renderWithProviders(<ErrorBanner error={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the message and the correlation id", () => {
    renderWithProviders(
      <ErrorBanner
        error={
          new ApiError("The batch could not be created.", {
            code: "BATCH_LIMIT_EXCEEDED",
            status: 422,
            correlationId: "cor_abc",
          })
        }
      />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("The batch could not be created.")).toBeInTheDocument();
    expect(screen.getByText("cor_abc")).toBeInTheDocument();
  });

  it("copies the id, because that is what support will ask for", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ErrorBanner
        error={new ApiError("Failed.", { code: "X", status: 500, correlationId: "cor_copy" })}
      />,
    );

    await user.click(screen.getByText("cor_copy"));

    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  it("stays usable when the clipboard is refused", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("denied"));
    renderWithProviders(
      <ErrorBanner
        error={new ApiError("Failed.", { code: "X", status: 500, correlationId: "cor_deny" })}
      />,
    );

    await user.click(screen.getByText("cor_deny"));

    // The id is on screen either way, which is the part that matters.
    expect(screen.getByText("cor_deny")).toBeInTheDocument();
  });

  it("lists details that belong to no particular field", () => {
    renderWithProviders(
      <ErrorBanner
        error={
          new ApiError("Refused.", {
            code: "VALIDATION_FAILED",
            status: 422,
            details: [
              { field: null, code: "TOO_MANY", message: "A batch holds at most 25 images." },
              { field: "title", code: "REQUIRED", message: "Shown beside the title input." },
            ],
          })
        }
      />,
    );

    expect(screen.getByText("A batch holds at most 25 images.")).toBeInTheDocument();
    expect(screen.queryByText("Shown beside the title input.")).not.toBeInTheDocument();
  });

  it("can be dismissed", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    renderWithProviders(
      <ErrorBanner error={new Error("Plain failure.")} onDismiss={onDismiss} />,
    );

    await user.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(onDismiss).toHaveBeenCalled();
  });

  it("handles a plain Error, not only an ApiError", () => {
    renderWithProviders(<ErrorBanner error={new Error("Something broke.")} />);

    expect(screen.getByText("Something broke.")).toBeInTheDocument();
  });
});
