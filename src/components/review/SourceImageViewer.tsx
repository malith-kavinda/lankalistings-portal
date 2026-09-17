/**
 * The scan, with the blocks this candidate was built from drawn on top (PRD 14.3).
 *
 * The overlay is the point. A reviewer checking an extracted price against the page needs to know
 * *which* part of the page the pipeline read it from; without that they are comparing the model's
 * answer against their own re-reading of the whole image, which is slower and no more reliable.
 *
 * Boxes are drawn in percentages of the OCR's own coordinate space, so zoom and rotation move them
 * with the image rather than leaving them behind.
 */

import { Maximize2, Minus, Plus, RotateCw } from "lucide-react";
import { useMemo, useState } from "react";
import type { OcrBlock } from "../../lib/api/types";

type SourceImageViewerProps = {
  src: string;
  alt: string;
  blocks: OcrBlock[];
  highlightedBlockIds: number[];
};

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

export function SourceImageViewer({
  src,
  alt,
  blocks,
  highlightedBlockIds,
}: SourceImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [failed, setFailed] = useState(false);

  const highlighted = useMemo(() => new Set(highlightedBlockIds), [highlightedBlockIds]);

  // The OCR reports pixel boxes; the overlay needs fractions. Deriving the extent from the blocks
  // themselves avoids a second source of truth for the page size.
  const extent = useMemo(() => {
    let width = 0;
    let height = 0;
    for (const block of blocks) {
      if (block.box) {
        width = Math.max(width, block.box.x + block.box.width);
        height = Math.max(height, block.box.y + block.box.height);
      }
    }
    return { width, height };
  }, [blocks]);

  const canOverlay = extent.width > 0 && extent.height > 0;

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
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-xs font-bold text-emerald underline underline-offset-2"
        >
          Open full size
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
                        left: `${(block.box.x / extent.width) * 100}%`,
                        top: `${(block.box.y / extent.height) * 100}%`,
                        width: `${(block.box.width / extent.width) * 100}%`,
                        height: `${(block.box.height / extent.height) * 100}%`,
                      }}
                    />
                  );
                })
              : null}
          </div>
        )}
      </div>

      {!canOverlay && blocks.length > 0 ? (
        <p className="text-xs text-subtle">
          This extraction has no box coordinates, so the blocks cannot be drawn on the page.
        </p>
      ) : null}
    </div>
  );
}
