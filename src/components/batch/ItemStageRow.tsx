/**
 * One image's row: where it is, how long it has taken, what went wrong, and what to do about it
 * (FR-JOB-002, FR-JOB-005).
 *
 * The retry control offers both modes because they are different decisions. `resume` picks up from
 * the earliest invalid stage and keeps artifacts that are still good; `reprocess` starts a new
 * generation from the image. Which one is right depends on whether the moderator thinks the failure
 * was transient or the extraction was simply wrong, and only they know that.
 */

import { RefreshCw, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { formatElapsed, humanizeCode } from "../../lib/format";
import { StatusChip } from "../ui/StatusChip";
import type { IngestionItem } from "../../lib/api/types";

const RETRYABLE: IngestionItem["status"][] = ["failed", "needs_attention"];

type ItemStageRowProps = {
  item: IngestionItem;
  onRetry: (itemId: string, mode: "resume" | "reprocess") => void;
  isRetrying: boolean;
};

export function ItemStageRow({ item, onRetry, isRetrying }: ItemStageRowProps) {
  const canRetry = RETRYABLE.includes(item.status);

  return (
    <li className="grid gap-3 border-t border-line px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{item.original_filename}</span>
          <StatusChip status={item.status} size="sm" />
          {item.is_duplicate_in_batch ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold uppercase text-subtle">
              duplicate image
            </span>
          ) : null}
        </div>

        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
          <span>stage: {item.stage}</span>
          <span>{formatElapsed(item.created_at, item.completed_at)}</span>
          {item.attempt_count > 1 ? <span>attempt {item.attempt_count}</span> : null}
          {item.candidate_count > 0 ? (
            <Link
              to={`/review?item_id=${item.id}`}
              className="font-bold text-emerald underline underline-offset-2"
            >
              {item.candidate_count} {item.candidate_count === 1 ? "candidate" : "candidates"}
            </Link>
          ) : null}
        </p>

        {item.error_code ? (
          <p className="mt-1 text-xs text-danger">
            <span className="font-mono font-bold">{item.error_code}</span>
            {item.error_message ? <span> — {item.error_message}</span> : null}
          </p>
        ) : null}

        {item.warning_codes.length > 0 ? (
          <p className="mt-1 flex flex-wrap gap-1.5">
            {item.warning_codes.map((code) => (
              <span
                key={code}
                title={code}
                className="rounded bg-amber/10 px-1.5 py-0.5 text-[11px] font-medium text-amber"
              >
                {humanizeCode(code)}
              </span>
            ))}
          </p>
        ) : null}
      </div>

      {canRetry ? (
        <div className="flex gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => onRetry(item.id, "resume")}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 rounded border border-line px-3 py-1.5 text-xs font-bold hover:border-frame disabled:opacity-50"
          >
            <RefreshCw size={13} />
            Resume
          </button>
          <button
            type="button"
            onClick={() => onRetry(item.id, "reprocess")}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 rounded border border-line px-3 py-1.5 text-xs font-bold hover:border-frame disabled:opacity-50"
            title="Start a new generation from the image, discarding the current extraction"
          >
            <RotateCcw size={13} />
            Reprocess
          </button>
        </div>
      ) : null}
    </li>
  );
}
