/**
 * The review workspace (PRD 14.3): the queue on the left, one candidate under scrutiny on the right.
 *
 * Filters live in the URL rather than in component state, so a moderator can send a colleague "the
 * low-confidence vehicles from this batch" as a link, and the browser's back button does what it
 * looks like it does.
 */

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CandidateWorkspace } from "../components/review/CandidateWorkspace";
import { ReviewFilters } from "../components/review/ReviewFilters";
import { ReviewQueueList } from "../components/review/ReviewQueueList";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { listReviewQueue } from "../lib/api/review";
import { queryKeys } from "../lib/queries";
import type { ReviewQueueParams } from "../lib/api/types";

const PAGE_SIZE = 25;

/** URL → query params. Empty strings are dropped so they do not become `?category=` on the wire. */
function paramsFrom(search: URLSearchParams): ReviewQueueParams {
  const read = (key: string) => search.get(key) || undefined;
  const readNumber = (key: string) => {
    const raw = search.get(key);
    if (!raw) {
      return undefined;
    }
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };

  return {
    batch_id: read("batch_id"),
    item_id: read("item_id"),
    category: read("category"),
    warning: read("warning"),
    q: read("q"),
    min_confidence: readNumber("min_confidence"),
    max_confidence: readNumber("max_confidence"),
    limit: PAGE_SIZE,
    offset: readNumber("offset") ?? 0,
  };
}

export function ReviewRoute() {
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  // `/review/:candidateId` is the shareable form; the filters travel as query params beside it.
  const { candidateId } = useParams<{ candidateId: string }>();
  const params = paramsFrom(search);
  const selectedId = candidateId;

  const queueQuery = useQuery({
    queryKey: queryKeys.reviewQueue(params),
    queryFn: ({ signal }) => listReviewQueue(params, signal),
  });

  function updateSearch(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(search);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    // Any filter change invalidates the page position: offset 3 of the old result set means
    // nothing in the new one.
    if (!("offset" in changes)) {
      next.delete("offset");
    }
    setSearch(next, { replace: true });
  }

  function select(advertisementId: string | undefined) {
    // The filters stay in the URL across a selection, so going back to the queue keeps them.
    navigate(
      { pathname: advertisementId ? `/review/${advertisementId}` : "/review", search: search.toString() },
      { replace: true },
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Review queue</h1>
          <p className="mt-1 text-sm text-subtle">
            Least certain first. Nothing here is public until someone approves it.
          </p>
        </div>
        {queueQuery.data ? (
          <p className="text-sm text-subtle">
            <span className="font-mono text-lg font-bold tabular-nums text-text">
              {queueQuery.data.total}
            </span>{" "}
            awaiting review
          </p>
        ) : null}
      </header>

      <ReviewFilters
        params={params}
        counts={queueQuery.data?.counts ?? {}}
        knownWarnings={[
          ...new Set((queueQuery.data?.candidates ?? []).flatMap((c) => c.warning_codes)),
        ]}
        onChange={updateSearch}
      />

      {queueQuery.error ? <ErrorBanner error={queueQuery.error} /> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="rounded-lg border border-line bg-surface">
          {queueQuery.data === undefined ? (
            <p className="flex items-center gap-2 p-5 text-sm text-subtle">
              <Loader2 size={16} className="animate-spin" />
              {queueQuery.error ? "Queue unavailable." : "Loading queue…"}
            </p>
          ) : (
            <ReviewQueueList
              page={queueQuery.data}
              selectedId={selectedId}
              onSelect={select}
              onPage={(offset) => updateSearch({ offset: String(offset) })}
            />
          )}
        </div>

        <div className="min-w-0">
          {selectedId ? (
            <CandidateWorkspace
              advertisementId={selectedId}
              onNavigate={select}
              onDecided={() => select(undefined)}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-surface p-10 text-center">
              <p className="text-sm text-subtle">
                Select a candidate to see the page it came from, the text that was read, and the
                fields extracted from it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
