/**
 * The same three limits the server enforces, checked before the upload starts.
 *
 * Not a substitute for the server's check — it stays authoritative — but a 100 MB batch that is
 * going to be refused should be refused in the browser, not after four minutes of upload. The
 * limits come from `GET /api/v1/ingestion-limits` rather than from constants here, so an operator
 * who raises `MAX_IMAGES_PER_BATCH` does not have to remember to rebuild the portal.
 */

import { formatBytes } from "./format";
import type { IngestionLimits } from "./api/types";

export type UploadProblem = {
  filename: string | null;
  message: string;
};

export function validateSelection(
  files: File[],
  limits: IngestionLimits | undefined,
): UploadProblem[] {
  if (files.length === 0) {
    return [{ filename: null, message: "Select at least one image." }];
  }
  if (!limits) {
    // The limits have not loaded yet. Refusing here would block a legitimate upload for a reason
    // the person cannot act on; the server still checks.
    return [];
  }

  const problems: UploadProblem[] = [];

  if (files.length > limits.max_images_per_batch) {
    problems.push({
      filename: null,
      message: `A batch holds at most ${limits.max_images_per_batch} images; ${files.length} were selected.`,
    });
  }

  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > limits.max_batch_bytes) {
    problems.push({
      filename: null,
      message: `The batch is ${formatBytes(total)}; the limit is ${formatBytes(limits.max_batch_bytes)}.`,
    });
  }

  for (const file of files) {
    if (file.size > limits.max_image_bytes) {
      problems.push({
        filename: file.name,
        message: `${formatBytes(file.size)} exceeds the ${formatBytes(limits.max_image_bytes)} per-image limit.`,
      });
    }
    // Browsers leave `type` empty for some files; the server sniffs the bytes, so an empty type is
    // not grounds to refuse locally.
    if (file.type && !limits.supported_content_types.includes(file.type)) {
      problems.push({
        filename: file.name,
        message: `${file.type} is not a supported image type.`,
      });
    }
  }

  return problems;
}

/** Duplicate names in one selection are legal but almost always a mistake worth surfacing. */
export function duplicateNames(files: File[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const file of files) {
    if (seen.has(file.name)) {
      duplicates.add(file.name);
    }
    seen.add(file.name);
  }
  return [...duplicates];
}
