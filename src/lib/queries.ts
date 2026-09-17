/**
 * Query keys and the polling rule, in one place.
 *
 * Keys are arrays built by functions rather than strings written at each call site, because
 * `invalidateQueries` matching depends on them being spelled identically — and a typo there fails
 * silently as a list that simply does not refresh.
 */

import { TERMINAL_BATCH_STATUSES } from "./api/types";
import type { BatchStatus, ReviewQueueParams } from "./api/types";

export const queryKeys = {
  limits: () => ["ingestion", "limits"] as const,
  batches: () => ["ingestion", "batches"] as const,
  batch: (batchId: string) => ["ingestion", "batch", batchId] as const,
  reviewQueue: (params: ReviewQueueParams) => ["review", "queue", params] as const,
  candidate: (advertisementId: string) => ["review", "candidate", advertisementId] as const,
  rejectionReasons: () => ["review", "rejection-reasons"] as const,
  categories: () => ["review", "categories"] as const,
  published: () => ["advertisements", "published"] as const,
};

/** How often a live batch is re-read. Fast enough to feel live, slow enough not to be a load test. */
export const BATCH_POLL_MS = 2000;

/**
 * Polling stops the moment a batch can no longer change.
 *
 * Without this the portal keeps hitting the progress endpoint for every batch anyone ever opened,
 * forever, for an answer that is already final.
 */
export function batchRefetchInterval(status: BatchStatus | undefined): number | false {
  if (!status) {
    return BATCH_POLL_MS;
  }
  return TERMINAL_BATCH_STATUSES.includes(status) ? false : BATCH_POLL_MS;
}
