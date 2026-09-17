/** The queue itself: least certain first, with enough on each row to choose what to open. */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { humanizeCode } from "../../lib/format";
import { ConfidenceBadge } from "./ConfidenceBadge";
import type { CandidatePage } from "../../lib/api/types";

type ReviewQueueListProps = {
  page: CandidatePage;
  selectedId: string | undefined;
  onSelect: (advertisementId: string) => void;
  onPage: (offset: number) => void;
};

export function ReviewQueueList({ page, selectedId, onSelect, onPage }: ReviewQueueListProps) {
  if (page.candidates.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-subtle">
        Nothing is waiting for review here.
      </p>
    );
  }

  const first = page.offset + 1;
  const last = page.offset + page.candidates.length;

  return (
    <div>
      <ul className="divide-y divide-line">
        {page.candidates.map((candidate) => {
          const isSelected = candidate.id === selectedId;
          return (
            <li key={candidate.id}>
              <button
                type="button"
                onClick={() => onSelect(candidate.id)}
                aria-current={isSelected ? "true" : undefined}
                className={`w-full border-l-4 px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "border-emerald bg-emerald/5"
                    : "border-transparent hover:bg-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate font-bold">
                    {candidate.title || <span className="italic text-subtle">Untitled</span>}
                  </p>
                  <ConfidenceBadge value={candidate.confidence_overall} size="sm" />
                </div>

                <p className="mt-0.5 truncate text-sm text-subtle">
                  {[candidate.price, candidate.location].filter(Boolean).join(" · ") || "—"}
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-subtle">
                    {candidate.category}
                  </span>
                  {candidate.warning_codes.slice(0, 2).map((code) => (
                    <span
                      key={code}
                      title={code}
                      className="rounded bg-amber/10 px-1.5 py-0.5 text-[11px] font-medium text-amber"
                    >
                      {humanizeCode(code)}
                    </span>
                  ))}
                  {candidate.warning_codes.length > 2 ? (
                    <span className="text-[11px] text-subtle">
                      +{candidate.warning_codes.length - 2}
                    </span>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {page.total > page.limit ? (
        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <p className="text-xs text-subtle">
            {first}–{last} of {page.total}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onPage(Math.max(0, page.offset - page.limit))}
              disabled={page.offset === 0}
              aria-label="Previous page"
              className="rounded border border-line p-1.5 hover:border-frame disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => onPage(page.offset + page.limit)}
              disabled={last >= page.total}
              aria-label="Next page"
              className="rounded border border-line p-1.5 hover:border-frame disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
