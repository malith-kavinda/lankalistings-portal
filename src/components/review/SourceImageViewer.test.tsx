/** The viewer, and the overlay that answers "which part of the page did this come from?". */

import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SourceImageViewer } from "./SourceImageViewer";
import { renderWithProviders } from "../../test/render";
import type { OcrBox } from "../../lib/api/types";

const BLOCKS = [
  { id: 1, text: "Honda Fit 2014", box: [0, 0, 100, 20] satisfies OcrBox },
  { id: 2, text: "Rs. 5,750,000", box: [0, 30, 100, 20] satisfies OcrBox },
  { id: 3, text: "Unrelated", box: [0, 60, 200, 40] satisfies OcrBox },
];

function renderViewer(props: Partial<Parameters<typeof SourceImageViewer>[0]> = {}) {
  return renderWithProviders(
    <SourceImageViewer
      ocrInputSrc="http://localhost:8001/api/v1/media/assets/ast_1/ocr_input"
      originalSrc="http://localhost:8001/api/v1/media/assets/ast_1/original"
      alt="Scanned page page-3.png"
      blocks={BLOCKS}
      highlightedBlockIds={[1, 2]}
      pageWidth={200}
      pageHeight={100}
      {...props}
    />,
  );
}

describe("SourceImageViewer", () => {
  it("zooms in and out, and back to where it started", async () => {
    const user = userEvent.setup();
    renderViewer();
    expect(screen.getByText("100%")).toBeInTheDocument();

    await user.click(screen.getByLabelText(/zoom in/i));
    expect(screen.getByText("125%")).toBeInTheDocument();

    await user.click(screen.getByLabelText(/zoom out/i));
    await user.click(screen.getByLabelText(/zoom out/i));
    expect(screen.getByText("75%")).toBeInTheDocument();

    await user.click(screen.getByLabelText(/reset view/i));
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("rotates, for a page scanned sideways", async () => {
    const user = userEvent.setup();
    const { container } = renderViewer();

    await user.click(screen.getByLabelText(/rotate/i));

    const stage = container.querySelector<HTMLElement>("[style*='rotate']");
    expect(stage?.style.transform).toContain("rotate(90deg)");
  });

  it("draws every block but marks only this candidate's", () => {
    const { container } = renderViewer();

    const boxes = container.querySelectorAll("span[title^='Block']");
    expect(boxes).toHaveLength(3);
    // The highlighted ones carry the emerald treatment; the rest are outlines.
    expect(container.querySelectorAll("span.border-emerald")).toHaveLength(2);
  });

  it("positions a box as a fraction of the page, so zoom and rotation carry it along", () => {
    const { container } = renderViewer();

    const second = container.querySelector<HTMLElement>("span[title^='Block 2']");
    // Page extent is 200x100, derived from the blocks themselves.
    expect(second?.style.top).toBe("30%");
    expect(second?.style.width).toBe("50%");
  });

  it("explains a missing image instead of showing a broken one", () => {
    renderViewer();

    fireEvent.error(screen.getByRole("img", { name: /scanned page/i }));

    expect(screen.getByText(/stored image is not available/)).toBeInTheDocument();
    expect(screen.getByText(/extracted text below is still the record/)).toBeInTheDocument();
  });

  it("says why there is no overlay when the extraction records no page size", () => {
    renderViewer({ pageWidth: null, pageHeight: null });

    expect(screen.getByText(/records no page size/)).toBeInTheDocument();
  });

  it("hides the overlay on the original scan, whose pixels the coordinates do not describe", async () => {
    const user = userEvent.setup();
    const { container } = renderViewer();
    expect(container.querySelectorAll("span[title^='Block']")).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: /show original scan/i }));

    expect(container.querySelectorAll("span[title^='Block']")).toHaveLength(0);
    expect(screen.getByText(/coordinates belong to the preprocessed page/)).toBeInTheDocument();
  });

  it("shows the OCR input by default, because that is the space the boxes are in", () => {
    renderViewer();

    expect(screen.getByRole("img", { name: /scanned page/i })).toHaveAttribute(
      "src",
      expect.stringContaining("/ocr_input"),
    );
  });
});
