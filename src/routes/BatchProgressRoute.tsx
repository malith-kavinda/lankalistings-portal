/**
 * Batch progress (PRD 14.2).
 *
 * Polls while the batch can still change and stops the moment it cannot. The alternative — a fixed
 * interval that never stops — keeps asking the server for an answer that is already final, for
 * every batch anyone has ever opened.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { BatchCountsBar } from "../components/batch/BatchCountsBar";
import { ItemStageRow } from "../components/batch/ItemStageRow";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { StatusChip } from "../components/ui/StatusChip";
import { getBatch, retryBatch, retryItem } from "../lib/api/ingestion";
import { formatElapsed } from "../lib/format";
import { operatorId } from "../lib/operator";
import { batchRefetchInterval, queryKeys } from "../lib/queries";
import { TERMINAL_BATCH_STATUSES } from "../lib/api/types";

export function BatchProgressRoute() {
  const { batchId = "" } = useParams<{ batchId: string }>();
  const queryClient = useQueryClient();

  const batchQuery = useQuery({
    queryKey: queryKeys.batch(batchId),
    queryFn: ({ signal }) => getBatch(batchId, signal),
    enabled: batchId !== "",
    refetchInterval: (query) => batchRefetchInterval(query.state.data?.status),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.batch(batchId) });
    // A retry that succeeds changes what is waiting for review, so the queue is stale too.
    void queryClient.invalidateQueries({ queryKey: ["review"] });
  };

  const itemRetry = useMutation({
    mutationFn: ({ itemId, mode }: { itemId: string; mode: "resume" | "reprocess" }) =>
      retryItem(itemId, { mode, operatorId: operatorId() }),
    onSuccess: invalidate,
  });

  const batchRetry = useMutation({
    mutationFn: () => retryBatch(batchId, operatorId()),
    onSuccess: invalidate,
  });

  if (batchQuery.isPending) {
    return (
      <p className="flex items-center gap-2 text-sm text-subtle">
        <Loader2 size={16} className="animate-spin" />
        Loading batch…
      </p>
    );
  }

  if (batchQuery.error) {
    return <ErrorBanner error={batchQuery.error} />;
  }

  const batch = batchQuery.data;
  const isLive = !TERMINAL_BATCH_STATUSES.includes(batch.status);
  const hasRetryable = batch.items.some(
    (item) => item.status === "failed" || item.status === "needs_attention",
  );
  const reviewable = batch.items.reduce((sum, item) => sum + item.candidate_count, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/intake"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-frame"
        >
          <ArrowLeft size={14} />
          New batch
        </Link>
      </div>

      <header className="rounded-lg border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold">Batch progress</h1>
              <StatusChip status={batch.status} />
              {isLive ? (
                <span className="text-xs text-subtle">updating every 2s</span>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-xs text-subtle">{batch.id}</p>
            <p className="mt-1 text-sm text-subtle">
              {batch.total_items} {batch.total_items === 1 ? "image" : "images"} ·{" "}
              {formatElapsed(batch.created_at, batch.completed_at)} · uploaded by{" "}
              {batch.created_by}
            </p>
          </div>

          <div className="flex gap-2">
            {hasRetryable ? (
              <button
                type="button"
                onClick={() => batchRetry.mutate()}
                disabled={batchRetry.isPending}
                className="inline-flex items-center gap-1.5 rounded border border-line px-3 py-2 text-sm font-bold hover:border-frame disabled:opacity-50"
              >
                <RefreshCw size={14} />
                Retry all failed
              </button>
            ) : null}
            {reviewable > 0 ? (
              <Link
                to={`/review?batch_id=${batch.id}`}
                className="inline-flex items-center rounded bg-emerald px-4 py-2 text-sm font-bold text-white"
              >
                Review {reviewable} {reviewable === 1 ? "candidate" : "candidates"}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          <BatchCountsBar counts={batch.counts} total={batch.total_items} status={batch.status} />
        </div>
      </header>

      {itemRetry.error ? (
        <ErrorBanner error={itemRetry.error} onDismiss={() => itemRetry.reset()} />
      ) : null}
      {batchRetry.error ? (
        <ErrorBanner error={batchRetry.error} onDismiss={() => batchRetry.reset()} />
      ) : null}

      <section className="rounded-lg border border-line bg-surface">
        <h2 className="px-4 py-3 text-sm font-bold uppercase tracking-wide text-subtle">
          Images
        </h2>
        <ul>
          {batch.items.map((item) => (
            <ItemStageRow
              key={item.id}
              item={item}
              onRetry={(itemId, mode) => itemRetry.mutate({ itemId, mode })}
              isRetrying={itemRetry.isPending}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
