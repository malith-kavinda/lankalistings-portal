/**
 * Drag-and-drop or click to browse (PRD 14.1).
 *
 * The drop target is a `<label>` wrapping a real file input rather than a div with a click handler,
 * so keyboard focus, Enter/Space activation and the accessible name come from the platform instead
 * of being reimplemented and half-finished.
 */

import { UploadCloud } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { formatBytes } from "../../lib/format";
import type { IngestionLimits } from "../../lib/api/types";

type FileDropZoneProps = {
  onFilesSelected: (files: File[]) => void;
  limits?: IngestionLimits;
  disabled?: boolean;
};

export function FileDropZone({ onFilesSelected, limits, disabled }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) {
      return;
    }
    const dropped = [...event.dataTransfer.files];
    if (dropped.length > 0) {
      onFilesSelected(dropped);
    }
  }

  const accept = limits?.supported_content_types.join(",") ?? "image/*";

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) {
          setIsDragging(true);
        }
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
        isDragging
          ? "border-emerald bg-emerald/5"
          : "border-line bg-muted hover:border-emerald/60 hover:bg-emerald/5"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-emerald">
        <UploadCloud size={22} />
      </span>
      <span className="text-sm font-bold">
        Drop newspaper pages here, or <span className="text-emerald underline">browse</span>
      </span>
      <span className="text-xs text-subtle">
        {limits
          ? `Up to ${limits.max_images_per_batch} images, ${formatBytes(limits.max_image_bytes)} each, ${formatBytes(limits.max_batch_bytes)} per batch`
          : "Loading limits…"}
      </span>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const chosen = [...(event.target.files ?? [])];
          if (chosen.length > 0) {
            onFilesSelected(chosen);
          }
          // Reset, so selecting the same file twice in a row still fires a change event.
          event.target.value = "";
        }}
      />
    </label>
  );
}
