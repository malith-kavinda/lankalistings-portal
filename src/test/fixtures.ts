/** Wire-shaped fixtures. Built from the real response types, so a contract change breaks them. */

import type {
  Candidate,
  CandidateDetail,
  CandidatePage,
  IngestionBatch,
  IngestionItem,
  IngestionLimits,
} from "../lib/api/types";

export const limits: IngestionLimits = {
  max_images_per_batch: 25,
  max_image_bytes: 10 * 1024 * 1024,
  max_batch_bytes: 100 * 1024 * 1024,
  max_image_pixels: 40_000_000,
  supported_content_types: ["image/bmp", "image/jpeg", "image/png", "image/tiff", "image/webp"],
};

export function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: "adv_01",
    provenance_id: "prv_01",
    status: "pending_review",
    candidate_state: "pending_publish",
    origin: "llm_extraction",
    title: "Honda Fit 2014",
    description: "One owner, full service history.",
    category: "vehicles",
    location: "Kandy",
    price: "Rs. 5,750,000",
    phones: ["0812233445"],
    language: "en",
    confidence_overall: 0.82,
    confidence_label: "high",
    warning_codes: [],
    version: 1,
    batch_id: "bat_01",
    item_id: "itm_01",
    source_asset_id: "ast_01",
    candidate_index: 0,
    generation: 1,
    created_at: "2026-09-17T10:00:00Z",
    updated_at: "2026-09-17T10:00:00Z",
    reviewed_at: null,
    reviewer_id: null,
    ...overrides,
  };
}

export function makeDetail(overrides: Partial<CandidateDetail> = {}): CandidateDetail {
  const candidate = overrides.candidate ?? makeCandidate();
  return {
    candidate,
    evidence: {
      source_text: "Honda Fit 2014 Rs. 5,750,000 Kandy",
      ocr_text: "Honda Fit 2014\nRs. 5,750,000\nKandy\n0812233445",
      ocr_extraction_id: "ocr_01",
      llm_extraction_run_id: "llm_01",
      source_block_ids: [1, 2],
      blocks: [
        { id: 1, text: "Honda Fit 2014", confidence: 0.93, box: null },
        { id: 2, text: "Rs. 5,750,000 Kandy", confidence: 0.71, box: null },
        { id: 3, text: "Unrelated masthead", confidence: 0.4, box: null },
      ],
      field_confidence: { title: 0.9, price: 0.42 },
      warnings: [],
      extracted_values: { title: "Honda Fit 2014" },
      accepted_values: null,
      provider: "fake",
      model: "fake/rule_based",
      ocr_engine: "tesseract",
      ocr_languages: "sin+eng",
      ...overrides.evidence,
    },
    item_id: candidate.item_id,
    batch_id: candidate.batch_id,
    source_filename: "page-3.png",
    source_asset_id: candidate.source_asset_id,
    item_status: "awaiting_review",
    item_stage: "done",
    siblings: [candidate.id],
    position: 1,
    sibling_count: 1,
    ...overrides,
  };
}

export function makePage(candidates: Candidate[] = [makeCandidate()]): CandidatePage {
  return {
    candidates,
    total: candidates.length,
    limit: 25,
    offset: 0,
    counts: { pending_review: candidates.length },
  };
}

export function makeItem(overrides: Partial<IngestionItem> = {}): IngestionItem {
  return {
    id: "itm_01",
    batch_id: "bat_01",
    item_index: 0,
    status: "awaiting_review",
    stage: "done",
    original_filename: "page-3.png",
    source_asset_id: "ast_01",
    pipeline_generation: 1,
    attempt_count: 1,
    candidate_count: 1,
    warning_codes: [],
    is_duplicate_in_batch: false,
    duplicate_of_item_id: null,
    failed_stage: null,
    error_code: null,
    error_message: null,
    created_at: "2026-09-17T10:00:00Z",
    updated_at: "2026-09-17T10:00:30Z",
    completed_at: "2026-09-17T10:00:30Z",
    ...overrides,
  };
}

export function makeBatch(overrides: Partial<IngestionBatch> = {}): IngestionBatch {
  const items = overrides.items ?? [makeItem()];
  return {
    id: "bat_01",
    status: "completed",
    created_by: "portal-operator",
    total_items: items.length,
    counts: {
      queued: 0,
      processing: 0,
      awaiting_review: items.length,
      completed: 0,
      no_ad_found: 0,
      failed: 0,
      needs_attention: 0,
    },
    correlation_id: "cor_01",
    created_at: "2026-09-17T10:00:00Z",
    updated_at: "2026-09-17T10:00:30Z",
    completed_at: "2026-09-17T10:00:30Z",
    ...overrides,
    items,
  };
}
