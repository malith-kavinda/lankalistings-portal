/**
 * The filters FR-REV-002 requires: batch, category, warning, and confidence.
 *
 * Every control writes to the URL, so the filtered view is a link. The confidence control is a
 * three-way band rather than two number inputs because "show me the ones it was unsure about" is
 * the actual question, and asking a moderator to type 0.5 is asking them to guess a threshold.
 */

import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "../../lib/api/catalog";
import { queryKeys } from "../../lib/queries";
import type { ReviewQueueParams } from "../../lib/api/types";

/** The same thresholds the confidence badge bands on, so the filter and the badge agree. */
const BANDS = [
  { key: "", label: "Any confidence", min: undefined, max: undefined },
  { key: "low", label: "Low (< 50%)", min: undefined, max: 0.5 },
  { key: "medium", label: "Medium (50–80%)", min: 0.5, max: 0.8 },
  { key: "high", label: "High (≥ 80%)", min: 0.8, max: undefined },
] as const;

type ReviewFiltersProps = {
  params: ReviewQueueParams;
  counts: Record<string, number>;
  /** Warning codes seen on the current page, offered as suggestions. */
  knownWarnings?: string[];
  onChange: (changes: Record<string, string | undefined>) => void;
};

export function ReviewFilters({
  params,
  counts,
  knownWarnings = [],
  onChange,
}: ReviewFiltersProps) {
  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: ({ signal }) => getCategories(signal),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const activeBand =
    BANDS.find(
      (band) => band.min === params.min_confidence && band.max === params.max_confidence,
    )?.key ?? "";

  const hasFilters = Boolean(
    params.batch_id ||
      params.item_id ||
      params.category ||
      params.warning ||
      params.q ||
      params.min_confidence !== undefined ||
      params.max_confidence !== undefined,
  );

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-subtle">
          Search
          <input
            value={params.q ?? ""}
            onChange={(event) => onChange({ q: event.target.value })}
            placeholder="Title, description, location"
            maxLength={120}
            className="h-10 rounded border border-line bg-surface px-3 text-sm font-normal normal-case tracking-normal text-text outline-none focus:border-emerald"
          />
        </label>

        <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-subtle">
          Category
          <select
            value={params.category ?? ""}
            onChange={(event) => onChange({ category: event.target.value })}
            className="h-10 rounded border border-line bg-surface px-3 text-sm font-normal normal-case tracking-normal text-text outline-none focus:border-emerald"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-subtle">
          Confidence
          <select
            value={activeBand}
            onChange={(event) => {
              const band = BANDS.find((entry) => entry.key === event.target.value) ?? BANDS[0];
              onChange({
                min_confidence: band.min === undefined ? undefined : String(band.min),
                max_confidence: band.max === undefined ? undefined : String(band.max),
              });
            }}
            className="h-10 rounded border border-line bg-surface px-3 text-sm font-normal normal-case tracking-normal text-text outline-none focus:border-emerald"
          >
            {BANDS.map((band) => (
              <option key={band.key} value={band.key}>
                {band.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-subtle">
          Warning code
          <input
            value={params.warning ?? ""}
            onChange={(event) => onChange({ warning: event.target.value.toUpperCase() })}
            placeholder="e.g. LOW_OCR_CONFIDENCE"
            list="warning-codes"
            className="h-10 rounded border border-line bg-surface px-3 font-mono text-xs font-normal normal-case tracking-normal text-text outline-none focus:border-emerald"
          />
          {/*
            Suggested from the codes actually present on this page rather than from a fixed list:
            warning codes are whatever the pipeline has raised, not a published catalog.
          */}
          <datalist id="warning-codes">
            {knownWarnings.map((code) => (
              <option key={code} value={code} />
            ))}
          </datalist>
        </label>
      </div>

      {(params.batch_id || params.item_id || hasFilters) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {params.batch_id ? (
            <FilterPill
              label="batch"
              value={params.batch_id}
              onClear={() => onChange({ batch_id: undefined })}
            />
          ) : null}
          {params.item_id ? (
            <FilterPill
              label="image"
              value={params.item_id}
              onClear={() => onChange({ item_id: undefined })}
            />
          ) : null}

          <div className="ml-auto flex items-center gap-3 text-xs text-subtle">
            {Object.entries(counts)
              .filter(([, count]) => count > 0)
              .map(([status, count]) => (
                <span key={status}>
                  {status.replaceAll("_", " ")}{" "}
                  <span className="font-mono font-bold tabular-nums text-text">{count}</span>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPill({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
      <span className="font-bold uppercase text-subtle">{label}</span>
      <span className="max-w-[10rem] truncate font-mono">{value}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${label} filter`}
        className="text-subtle hover:text-danger"
      >
        <X size={12} />
      </button>
    </span>
  );
}
