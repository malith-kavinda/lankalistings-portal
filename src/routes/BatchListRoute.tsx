/** Recent batches, so a progress link survives a closed tab. */

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { StatusChip } from "../components/ui/StatusChip";
import { listBatches } from "../lib/api/ingestion";
import { formatElapsed } from "../lib/format";
import { queryKeys } from "../lib/queries";

export function BatchListRoute() {
  const batchesQuery = useQuery({
    queryKey: queryKeys.batches(),
    queryFn: ({ signal }) => listBatches({ limit: 50, signal }),
  });

  if (batchesQuery.isPending) {
    return (
      <p className="flex items-center gap-2 text-sm text-subtle">
        <Loader2 size={16} className="animate-spin" />
        Loading batches…
      </p>
    );
  }

  if (batchesQuery.error) {
    return <ErrorBanner error={batchesQuery.error} />;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Batches</h1>
          <p className="mt-1 text-sm text-subtle">Recent uploads and where they got to.</p>
        </div>
        <Link
          to="/intake"
          className="rounded bg-frame px-4 py-2 text-sm font-bold text-white"
        >
          New batch
        </Link>
      </header>

      {batchesQuery.data.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-surface p-10 text-center text-sm text-subtle">
          Nothing uploaded yet.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {batchesQuery.data.map((batch) => (
            <li key={batch.id}>
              <Link
                to={`/batches/${batch.id}`}
                className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted"
              >
                <StatusChip status={batch.status} size="sm" />
                <span className="font-mono text-xs text-subtle">{batch.id}</span>
                <span className="text-sm">
                  {batch.total_items} {batch.total_items === 1 ? "image" : "images"}
                </span>
                <span className="ml-auto text-xs text-subtle">
                  {formatElapsed(batch.created_at, batch.completed_at)} · {batch.created_by}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
