/**
 * "Ad 2 of 5 from page-3.png", and the controls to walk between them (PRD 14.3).
 *
 * Guards unsaved edits. A page holding five advertisements is reviewed by moving through all five,
 * and the fastest way to lose a correction is a Next button that discards it silently — so moving
 * away with unsaved changes asks first.
 */

import { ChevronLeft, ChevronRight } from "lucide-react";

type CandidatePagerProps = {
  position: number;
  total: number;
  sourceFilename: string;
  hasUnsavedChanges: boolean;
  onNavigate: (advertisementId: string) => void;
  siblings: string[];
};

export function CandidatePager({
  position,
  total,
  sourceFilename,
  hasUnsavedChanges,
  onNavigate,
  siblings,
}: CandidatePagerProps) {
  const previousId = position > 1 ? siblings[position - 2] : undefined;
  const nextId = position < siblings.length ? siblings[position] : undefined;

  function navigate(advertisementId: string | undefined) {
    if (!advertisementId) {
      return;
    }
    if (
      hasUnsavedChanges &&
      !window.confirm("You have unsaved changes. Leave this candidate and discard them?")
    ) {
      return;
    }
    onNavigate(advertisementId);
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm">
        <span className="font-bold">
          Ad {position} of {total}
        </span>
        <span className="text-subtle"> from </span>
        <span className="font-mono text-xs">{sourceFilename}</span>
      </p>

      {total > 1 ? (
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate(previousId)}
            disabled={!previousId}
            aria-label="Previous candidate from this image"
            className="rounded border border-line p-1.5 hover:border-frame disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => navigate(nextId)}
            disabled={!nextId}
            aria-label="Next candidate from this image"
            className="rounded border border-line p-1.5 hover:border-frame disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
