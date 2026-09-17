/** Batch intake and progress (PRD 13.1). */

import { request } from "./client";
import type { IngestionBatch, IngestionItem, IngestionLimits, RetryOutcome } from "./types";

export function getIngestionLimits(signal?: AbortSignal): Promise<IngestionLimits> {
  return request<IngestionLimits>("/api/v1/ingestion-limits", { signal });
}

export function createBatch(
  files: File[],
  options: { idempotencyKey?: string; operatorId?: string; signal?: AbortSignal } = {},
): Promise<IngestionBatch> {
  const form = new FormData();
  for (const file of files) {
    form.append("images", file, file.name);
  }
  return request<IngestionBatch>("/api/v1/ingestion-batches", {
    method: "POST",
    body: form,
    signal: options.signal,
    operatorId: options.operatorId,
  });
}

export function getBatch(batchId: string, signal?: AbortSignal): Promise<IngestionBatch> {
  return request<IngestionBatch>(`/api/v1/ingestion-batches/${batchId}`, { signal });
}

export function listBatches(
  options: { limit?: number; offset?: number; signal?: AbortSignal } = {},
): Promise<IngestionBatch[]> {
  return request<IngestionBatch[]>("/api/v1/ingestion-batches", {
    query: { limit: options.limit, offset: options.offset },
    signal: options.signal,
  });
}

export function getItem(itemId: string, signal?: AbortSignal): Promise<IngestionItem> {
  return request<IngestionItem>(`/api/v1/ingestion-items/${itemId}`, { signal });
}

/**
 * `resume` picks up from the earliest invalid stage and reuses what is still good; `reprocess`
 * starts a new generation from the image. Which one a moderator wants depends on whether they
 * think the failure was transient or the extraction was wrong, so the caller chooses.
 */
export function retryItem(
  itemId: string,
  options: { mode?: "resume" | "reprocess"; force?: boolean; operatorId?: string } = {},
): Promise<RetryOutcome> {
  return request<RetryOutcome>(`/api/v1/ingestion-items/${itemId}/retry`, {
    method: "POST",
    query: { mode: options.mode ?? "resume", force: options.force },
    operatorId: options.operatorId,
  });
}

export function retryBatch(batchId: string, operatorId?: string): Promise<RetryOutcome> {
  return request<RetryOutcome>(`/api/v1/ingestion-batches/${batchId}/retry`, {
    method: "POST",
    operatorId,
  });
}

/** Operator-only: the stored scan, not public media. */
export function assetUrl(assetId: string, purpose: "original" | "ocr_input" | "page_preview") {
  return `${import.meta.env.VITE_MEDIA_API_URL ?? "http://localhost:8001"}/api/v1/media/assets/${assetId}/${purpose}`;
}
