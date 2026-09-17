/**
 * What is actually public.
 *
 * The other half of the gate: this reads the same feed the web and mobile apps do, so "approved"
 * can be confirmed rather than assumed.
 */

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { StatusChip } from "../components/ui/StatusChip";
import { listPublishedAdvertisements } from "../lib/api/review";
import { queryKeys } from "../lib/queries";

export function PublishedRoute() {
  const publishedQuery = useQuery({
    queryKey: queryKeys.published(),
    queryFn: ({ signal }) => listPublishedAdvertisements(signal),
  });

  if (publishedQuery.isPending) {
    return (
      <p className="flex items-center gap-2 text-sm text-subtle">
        <Loader2 size={16} className="animate-spin" />
        Loading published advertisements…
      </p>
    );
  }

  if (publishedQuery.error) {
    return <ErrorBanner error={publishedQuery.error} />;
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Published advertisements</h1>
        <p className="mt-1 text-sm text-subtle">
          The same feed the public web and mobile apps read. Everything here was approved by a
          person.
        </p>
      </header>

      {publishedQuery.data.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-surface p-10 text-center text-sm text-subtle">
          Nothing has been approved yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-subtle">
              <tr>
                <th className="px-4 py-3">Advertisement</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {publishedQuery.data.map((advertisement) => (
                <tr key={advertisement.id} className="border-t border-line hover:bg-muted">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{advertisement.title}</div>
                    <div className="text-xs text-subtle">{advertisement.category}</div>
                  </td>
                  <td className="px-4 py-3 font-bold">{advertisement.price}</td>
                  <td className="px-4 py-3">{advertisement.location}</td>
                  <td className="px-4 py-3">
                    <StatusChip status={advertisement.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
