/** Drag and drop, and the click path a keyboard user gets for free from a real file input. */

import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FileDropZone } from "./FileDropZone";
import { limits } from "../../test/fixtures";
import { renderWithProviders } from "../../test/render";

function png(name: string): File {
  return new File(["x"], name, { type: "image/png" });
}

describe("FileDropZone", () => {
  it("accepts dropped files", () => {
    const onFilesSelected = vi.fn();
    renderWithProviders(<FileDropZone onFilesSelected={onFilesSelected} limits={limits} />);

    const zone = screen.getByText(/drop newspaper pages/i).closest("label") as HTMLElement;
    fireEvent.drop(zone, { dataTransfer: { files: [png("a.png"), png("b.png")] } });

    expect(onFilesSelected).toHaveBeenCalledWith([
      expect.objectContaining({ name: "a.png" }),
      expect.objectContaining({ name: "b.png" }),
    ]);
  });

  it("ignores an empty drop rather than clearing the selection", () => {
    const onFilesSelected = vi.fn();
    renderWithProviders(<FileDropZone onFilesSelected={onFilesSelected} limits={limits} />);

    const zone = screen.getByText(/drop newspaper pages/i).closest("label") as HTMLElement;
    fireEvent.drop(zone, { dataTransfer: { files: [] } });

    expect(onFilesSelected).not.toHaveBeenCalled();
  });

  it("takes nothing while an upload is in flight", () => {
    const onFilesSelected = vi.fn();
    renderWithProviders(
      <FileDropZone onFilesSelected={onFilesSelected} limits={limits} disabled />,
    );

    const zone = screen.getByText(/drop newspaper pages/i).closest("label") as HTMLElement;
    fireEvent.drop(zone, { dataTransfer: { files: [png("a.png")] } });

    expect(onFilesSelected).not.toHaveBeenCalled();
  });

  it("shows a drag state while a file is over it", () => {
    renderWithProviders(<FileDropZone onFilesSelected={vi.fn()} limits={limits} />);
    const zone = screen.getByText(/drop newspaper pages/i).closest("label") as HTMLElement;

    // The idle state carries `hover:border-emerald/60`, so match the class list exactly rather
    // than by substring.
    fireEvent.dragOver(zone);
    expect(zone.classList.contains("border-emerald")).toBe(true);

    fireEvent.dragLeave(zone);
    expect(zone.classList.contains("border-emerald")).toBe(false);
    expect(zone.classList.contains("border-line")).toBe(true);
  });

  it("restricts the browse dialog to the types the server accepts", () => {
    const { container } = renderWithProviders(
      <FileDropZone onFilesSelected={vi.fn()} limits={limits} />,
    );

    const input = container.querySelector("input[type=file]");
    expect(input).toHaveAttribute("accept", limits.supported_content_types.join(","));
    expect(input).toHaveAttribute("multiple");
  });

  it("says the limits are still loading rather than showing blanks", () => {
    renderWithProviders(<FileDropZone onFilesSelected={vi.fn()} />);

    expect(screen.getByText(/Loading limits/)).toBeInTheDocument();
  });
});
