/**
 * The wire contract, written down once.
 *
 * Statuses and stages are unions rather than `string`. The difference shows up when someone adds a
 * branch for a state that no longer exists, or forgets one that does: a union makes the compiler
 * say so, and `string` lets it ship.
 */

export type ApiEnvelope<T> = {
  data: T | null;
  error: ApiErrorBody | null;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  details: ApiErrorDetail[];
  /** The only handle for tracing a failed batch through the server's logs. Always surface it. */
  correlation_id: string;
};

export type ApiErrorDetail = {
  field: string | null;
  code: string;
  message: string;
};

export type ItemStatus =
  | "queued"
  | "preprocessing"
  | "ocr_running"
  | "llm_running"
  | "persisting"
  | "awaiting_review"
  | "no_ad_found"
  | "failed"
  | "needs_attention"
  | "completed";

export type ItemStage = "queued" | "preprocess" | "ocr" | "extract" | "persist" | "done";

export type BatchStatus =
  | "queued"
  | "processing"
  | "completed"
  | "partial_failed"
  | "failed"
  | "cancelled";

/** A batch stops changing at these, so polling stops too. */
export const TERMINAL_BATCH_STATUSES: readonly BatchStatus[] = [
  "completed",
  "partial_failed",
  "failed",
  "cancelled",
];

export type CandidateState = "pending_publish" | "linked" | "superseded" | "discarded";

/** `pending_review` is the legacy wire spelling of the stored `pending` (PRD 10.3). */
export type AdvertisementStatus =
  | "draft"
  | "pending"
  | "pending_review"
  | "active"
  | "rejected"
  | "expired"
  | "sold";

export type IngestionItem = {
  id: string;
  batch_id: string;
  item_index: number;
  status: ItemStatus;
  stage: ItemStage;
  original_filename: string;
  source_asset_id: string;
  pipeline_generation: number;
  attempt_count: number;
  candidate_count: number;
  warning_codes: string[];
  is_duplicate_in_batch: boolean;
  duplicate_of_item_id: string | null;
  failed_stage: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type IngestionBatch = {
  id: string;
  status: BatchStatus;
  created_by: string;
  total_items: number;
  counts: Record<string, number>;
  correlation_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  items: IngestionItem[];
};

export type IngestionLimits = {
  max_images_per_batch: number;
  max_image_bytes: number;
  max_batch_bytes: number;
  max_image_pixels: number;
  supported_content_types: string[];
};

export type RetryOutcome = {
  mode: string;
  items: IngestionItem[];
};

export type Candidate = {
  id: string;
  provenance_id: string;
  status: AdvertisementStatus;
  candidate_state: CandidateState;
  origin: string;
  title: string;
  description: string;
  category: string;
  location: string;
  price: string;
  phones: string[];
  language: string | null;
  confidence_overall: number | null;
  confidence_label: string;
  warning_codes: string[];
  version: number;
  batch_id: string;
  item_id: string;
  source_asset_id: string;
  candidate_index: number | null;
  generation: number;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
};

export type OcrBlock = {
  id: number;
  text: string;
  confidence?: number | null;
  box?: { x: number; y: number; width: number; height: number } | null;
  box_source?: string | null;
};

export type CandidateEvidence = {
  source_text: string;
  ocr_text: string;
  ocr_extraction_id: string | null;
  llm_extraction_run_id: string | null;
  source_block_ids: number[];
  blocks: OcrBlock[];
  field_confidence: Record<string, number>;
  warnings: string[];
  extracted_values: Record<string, unknown>;
  accepted_values: Record<string, unknown> | null;
  provider: string | null;
  model: string | null;
  ocr_engine: string | null;
  ocr_languages: string | null;
};

export type CandidateDetail = {
  candidate: Candidate;
  evidence: CandidateEvidence;
  item_id: string;
  batch_id: string;
  source_filename: string;
  source_asset_id: string;
  item_status: ItemStatus;
  item_stage: ItemStage;
  siblings: string[];
  position: number;
  sibling_count: number;
};

export type CandidatePage = {
  candidates: Candidate[];
  total: number;
  limit: number;
  offset: number;
  counts: Record<string, number>;
};

export type CandidateEdits = {
  title?: string;
  description?: string;
  category?: string;
  location?: string;
  price?: string;
  phones?: string[];
};

export type Category = {
  slug: string;
  label: string;
};

export type RejectionReason = {
  code: string;
  description: string;
};

export type ReviewQueueParams = {
  batch_id?: string;
  item_id?: string;
  status?: string;
  category?: string;
  warning?: string;
  min_confidence?: number;
  max_confidence?: number;
  q?: string;
  limit?: number;
  offset?: number;
};

/** The public feed's shape, which predates the candidate model and stays as the prototype left it. */
export type PublishedAdvertisement = {
  id: string;
  title: string;
  price: string;
  category: string;
  location: string;
  description: string;
  image_url: string;
  status: AdvertisementStatus;
  created_at: string;
  source_text: string;
  extraction_confidence: string;
};
