/**
 * The scan, with the blocks this candidate was built from drawn on top (PRD 14.3).
 *
 * The overlay is the point. A reviewer checking an extracted price against the page needs to know
 * *which* part of the page the pipeline read it from; without that they are comparing the model's
 * answer against their own re-reading of the whole image, which is slower and no more reliable.
 *
 * Which image is shown matters. Block coordinates are pixels in the *preprocessed* page — deskewed
 * and rescaled — so drawing them over the original scan puts every box slightly off, pointing at
 * the wrong text. That is worse than no overlay. So the OCR input is what the overlay is drawn on,
 * and the original is a click away for anyone who wants the untouched scan.
 *
 * Boxes are positioned as percentages of the OCR page size, so zoom and rotation carry them along.
 */

import { Maximize2, Minus, Plus, RotateCw } from "lucide-react";
import { useMemo, useState } from "react";
import type { OcrBlock } from "../../lib/api/types";

type SourceImageViewerProps = {
  /** The preprocessed page the coordinates belong to. */
  ocrInputSrc: string;
  /** The untouched scan. */
  originalSrc: string;
  alt: string;
  blocks: OcrBlock[];
  highlightedBlockIds: number[];
  /** The OCR page size. Without it the overlay cannot be placed, so it is not drawn. */
  pageWidth: number | null;
  pageHeight: number | null;
};

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

export function SourceImageViewer({
  ocrInputSrc,
  originalSrc,
  alt,
  blocks,
  highlightedBlockIds,
  pageWidth,
  pageHeight,
}: SourceImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [failed, setFailed] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const highlighted = useMemo(() => new Set(highlightedBlockIds), [highlightedBlockIds]);
  const src = showOriginal ? originalSrc : ocrInputSrc;

  // The server's recorded page size, not the extent of the blocks: the furthest block rarely
  // reaches the page edge, and using it as the page would stretch every box.
  const extent = { width: pageWidth ?? 0, height: pageHeight ?? 0 };
  const hasBoxes = blocks.some((block) => block.box);
  // Never over the original: the coordinates do not belong to it.
  const canOverlay = extent.width > 0 && extent.height > 0 && hasBoxes && !showOriginal;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setZoom((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP))}
          aria-label="Zoom out"
          className="rounded border border-line p-1.5 hover:border-frame"
        >
          <Minus size={14} />
        </button>
        <span className="min-w-[3.5rem] text-center font-mono text-xs tabular-nums text-subtle">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP))}
          aria-label="Zoom in"
          className="rounded border border-line p-1.5 hover:border-frame"
        >
          <Plus size={14} />
        </button>
        <button
          type="button"
          onClick={() => setRotation((current) => (current + 90) % 360)}
          aria-label="Rotate 90 degrees"
          className="rounded border border-line p-1.5 hover:border-frame"
        >
          <RotateCw size={14} />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setRotation(0);
          }}
          aria-label="Reset view"
          className="rounded border border-line p-1.5 hover:border-frame"
        >
          <Maximize2 size={14} />
        </button>
        <button
          type="button"
          onClick={() => setShowOriginal((current) => !current)}
          className="ml-auto text-xs font-bold text-emerald underline underline-offset-2"
        >
          {showOriginal ? "Show OCR input" : "Show original scan"}
        </button>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-emerald underline underline-offset-2"
        >
          Full size
        </a>
      </div>

      <div className="relative max-h-[28rem] overflow-auto rounded-lg border border-line bg-muted">
        {failed ? (
          <p className="p-8 text-center text-sm text-subtle">
            The stored image is not available. Retention may have purged the bytes; the extracted
            text below is still the record of what was on the page.
          </p>
        ) : (
          <div
            className="relative origin-top-left"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          >
            <img
              src={src}
              alt={alt}
              onError={() => setFailed(true)}
              className="block w-full select-none"
            />
            {canOverlay
              ? blocks.map((block) => {
                  if (!block.box) {
                    return null;
                  }
                  const isHighlighted = highlighted.has(block.id);
                  const [left, top, boxWidth, boxHeight] = block.box;
                  return (
                    <span
                      key={block.id}
                      title={`Block ${block.id}: ${block.text.slice(0, 80)}`}
                      className={`pointer-events-none absolute border-2 ${
                        isHighlighted
                          ? "border-emerald bg-emerald/15"
                          : "border-frame/30 bg-transparent"
                      }`}
                      style={{
                        left: `${(left / extent.width) * 100}%`,
                        top: `${(top / extent.height) * 100}%`,
                        width: `${(boxWidth / extent.width) * 100}%`,
                        height: `${(boxHeight / extent.height) * 100}%`,
                      }}
                    />
                  );
                })
              : null}
          </div>
        )}
      </div>

      {showOriginal ? (
        <p className="text-xs text-subtle">
          Showing the untouched scan. Block outlines are hidden because their coordinates belong to
          the preprocessed page, not this one.
        </p>
      ) : !canOverlay && blocks.length > 0 ? (
        <p className="text-xs text-subtle">
          This extraction records no page size, so the blocks cannot be placed on the image.
        </p>
      ) : null}
    </div>
  );
}
