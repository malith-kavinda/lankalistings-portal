/**
 * The seven counts, always all seven (FR-JOB-001).
 *
 * Including the zeroes. A bar that omits empty buckets forces a reader to guess whether "no
 * failures" means none happened or the server did not mention them — and the guess is wrong exactly
 * when something has gone wrong.
 */

import type { BatchStatus } from "../../lib/api/types";

/** Ordered as the pipeline runs, so the bar reads left to right as work moving through it. */
const BUCKETS = [
  { key: "queued", label: "Queued", tone: "bg-line" },
  { key: "processing", label: "Processing", tone: "bg-frame" },
  { key: "awaiting_review", label: "Awaiting review", tone: "bg-amber" },
  { key: "completed", label: "Completed", tone: "bg-emerald" },
  { key: "no_ad_found", label: "No ad found", tone: "bg-subtle" },
  { key: "failed", label: "Failed", tone: "bg-danger" },
  { key: "needs_attention", label: "Needs attention", tone: "bg-danger/60" },
] as const;

type BatchCountsBarProps = {
  counts: Record<string, number>;
  total: number;
  status: BatchStatus;
};

export function BatchCountsBar({ counts, total, status }: BatchCountsBarProps) {
  const safeTotal = Math.max(total, 1);

  return (
    <div className="space-y-3">
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Batch ${status}: ${BUCKETS.map((bucket) => `${counts[bucket.key] ?? 0} ${bucket.label}`).join(", ")}`}
      >
        {BUCKETS.map((bucket) => {
          const value = counts[bucket.key] ?? 0;
          if (value === 0) {
            return null;
          }
          return (
            <span
              key={bucket.key}
              className={bucket.tone}
              style={{ width: `${(value / safeTotal) * 100}%` }}
            />
          );
        })}
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4 xl:grid-cols-7">
        {BUCKETS.map((bucket) => {
          const value = counts[bucket.key] ?? 0;
          return (
            <div key={bucket.key} className="flex items-baseline gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${bucket.tone}`} aria-hidden />
              <dt className="min-w-0 truncate text-xs text-subtle">{bucket.label}</dt>
              <dd
                className={`ml-auto font-mono text-sm tabular-nums ${value === 0 ? "text-subtle" : "font-bold"}`}
              >
                {value}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
