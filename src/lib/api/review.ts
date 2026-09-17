/** The review queue and the decisions taken from it (PRD 13.2). */

import { request } from "./client";
import type {
  CandidateDetail,
  CandidateEdits,
  CandidatePage,
  PublishedAdvertisement,
  RejectionReason,
  ReviewQueueParams,
} from "./types";

export function listReviewQueue(
  params: ReviewQueueParams = {},
  signal?: AbortSignal,
): Promise<CandidatePage> {
  return request<CandidatePage>("/api/v1/advertisements/review", { query: params, signal });
}

export function getCandidate(
  advertisementId: string,
  signal?: AbortSignal,
): Promise<CandidateDetail> {
  return request<CandidateDetail>(`/api/v1/advertisements/${advertisementId}`, { signal });
}

export function saveCandidate(
  advertisementId: string,
  edits: CandidateEdits,
  options: { version?: number; operatorId?: string } = {},
): Promise<CandidateDetail> {
  return request<CandidateDetail>(`/api/v1/advertisements/${advertisementId}`, {
    method: "PATCH",
    body: { ...edits, version: options.version },
    operatorId: options.operatorId,
  });
}

/**
 * Edits and the transition in one request.
 *
 * The portal used to PATCH and then POST. A failure between the two left the corrections saved with
 * the candidate still pending and nothing on screen saying which half had happened, so the reviewer
 * had no way to tell whether to redo the edit. One call cannot land halfway.
 */
export function approveCandidate(
  advertisementId: string,
  options: { edits?: CandidateEdits; version?: number; operatorId?: string } = {},
): Promise<CandidateDetail> {
  return request<CandidateDetail>(`/api/v1/advertisements/${advertisementId}/approve`, {
    method: "POST",
    body: { edits: options.edits ? { ...options.edits } : undefined, version: options.version },
    operatorId: options.operatorId,
  });
}

export function rejectCandidate(
  advertisementId: string,
  input: { reasonCode: string; note?: string; version?: number; operatorId?: string },
): Promise<CandidateDetail> {
  return request<CandidateDetail>(`/api/v1/advertisements/${advertisementId}/reject`, {
    method: "POST",
    body: { reason_code: input.reasonCode, note: input.note, version: input.version },
    operatorId: input.operatorId,
  });
}

/** Read from the server rather than hardcoded, so the dropdown cannot offer a refused reason. */
export function listRejectionReasons(signal?: AbortSignal): Promise<RejectionReason[]> {
  return request<RejectionReason[]>("/api/v1/advertisements/rejection-reasons", { signal });
}

/** The public feed, for confirming an approved candidate actually reached it. */
export function listPublishedAdvertisements(
  signal?: AbortSignal,
): Promise<PublishedAdvertisement[]> {
  return request<PublishedAdvertisement[]>("/api/v1/advertisements", { signal });
}
