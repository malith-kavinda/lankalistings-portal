/**
 * One candidate, with everything needed to rule on it (FR-REV-003).
 *
 * The important decision is what Approve does. It sends the reviewer's edits *and* the transition
 * in one request. The old portal issued a PATCH and then a POST: a failure between them left the
 * corrections saved with the candidate still pending, and nothing on screen said which half had
 * happened — so the reviewer could not tell whether to redo the edit. One call cannot land halfway.
 *
 * Save stays available for a correction someone wants to park without deciding, which is a real
 * thing reviewers do on a long page.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../lib/api/client";
import { getCategories } from "../../lib/api/catalog";
import { assetUrl } from "../../lib/api/ingestion";
import {
  approveCandidate,
  getCandidate,
  listRejectionReasons,
  rejectCandidate,
  saveCandidate,
} from "../../lib/api/review";
import { MAX_DESCRIPTION_LENGTH, MAX_PHONES } from "../../lib/reviewRules";
import { humanizeCode } from "../../lib/format";
import { operatorId } from "../../lib/operator";
import { queryKeys } from "../../lib/queries";
import { ErrorBanner } from "../ui/ErrorBanner";
import { StatusChip } from "../ui/StatusChip";
import { CandidatePager } from "./CandidatePager";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { FieldEditor } from "./FieldEditor";
import { OcrTextPanel } from "./OcrTextPanel";
import { RejectDialog } from "./RejectDialog";
import { SourceImageViewer } from "./SourceImageViewer";
import type { CandidateDetail, CandidateEdits } from "../../lib/api/types";

type Draft = {
  title: string;
  description: string;
  category: string;
  location: string;
  price: string;
  phones: string;
};

/** Phones are one comma-separated input: a repeater for a field that usually holds one number. */
function draftFrom(detail: CandidateDetail): Draft {
  const { candidate } = detail;
  return {
    title: candidate.title,
    description: candidate.description,
    category: candidate.category,
    location: candidate.location,
    price: candidate.price,
    phones: candidate.phones.join(", "),
  };
}

function editsFrom(draft: Draft, original: Draft): CandidateEdits | undefined {
  const edits: CandidateEdits = {};
  for (const key of ["title", "description", "category", "location", "price"] as const) {
    if (draft[key] !== original[key]) {
      edits[key] = draft[key];
    }
  }
  if (draft.phones !== original.phones) {
    edits.phones = draft.phones
      .split(",")
      .map((phone) => phone.trim())
      .filter(Boolean);
  }
  return Object.keys(edits).length > 0 ? edits : undefined;
}

type CandidateWorkspaceProps = {
  advertisementId: string;
  onNavigate: (advertisementId: string) => void;
  onDecided: () => void;
};

export function CandidateWorkspace({
  advertisementId,
  onNavigate,
  onDecided,
}: CandidateWorkspaceProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const detailQuery = useQuery({
    queryKey: queryKeys.candidate(advertisementId),
    queryFn: ({ signal }) => getCandidate(advertisementId, signal),
  });

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: ({ signal }) => getCategories(signal),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const { data: reasons = [] } = useQuery({
    queryKey: queryKeys.rejectionReasons(),
    queryFn: ({ signal }) => listRejectionReasons(signal),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const detail = detailQuery.data;
  const original = useMemo(() => (detail ? draftFrom(detail) : null), [detail]);

  // Reset the form whenever a different candidate loads, or the server hands back a new version of
  // this one. Keyed on the version so a save's response replaces the draft rather than fighting it.
  useEffect(() => {
    if (detail) {
      setDraft(draftFrom(detail));
    }
  }, [detail?.candidate.id, detail?.candidate.version]);

  const edits = draft && original ? editsFrom(draft, original) : undefined;
  const hasUnsavedChanges = edits !== undefined;

  function settle(updated: CandidateDetail) {
    queryClient.setQueryData(queryKeys.candidate(updated.candidate.id), updated);
    void queryClient.invalidateQueries({ queryKey: ["review"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.published() });
    void queryClient.invalidateQueries({ queryKey: ["ingestion"] });
  }

  const save = useMutation({
    mutationFn: () =>
      saveCandidate(advertisementId, edits ?? {}, {
        version: detail?.candidate.version,
        operatorId: operatorId(),
      }),
    onSuccess: settle,
  });

  const approve = useMutation({
    mutationFn: () =>
      approveCandidate(advertisementId, {
        edits,
        version: detail?.candidate.version,
        operatorId: operatorId(),
      }),
    onSuccess: (updated) => {
      settle(updated);
      onDecided();
    },
  });

  const reject = useMutation({
    mutationFn: ({ reasonCode, note }: { reasonCode: string; note: string }) =>
      rejectCandidate(advertisementId, {
        reasonCode,
        note: note.trim() || undefined,
        version: detail?.candidate.version,
        operatorId: operatorId(),
      }),
    onSuccess: (updated) => {
      settle(updated);
      setIsRejecting(false);
      onDecided();
    },
  });

  if (detailQuery.isPending) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-line bg-surface p-6 text-sm text-subtle">
        <Loader2 size={16} className="animate-spin" />
        Loading candidate…
      </p>
    );
  }

  if (detailQuery.error || !detail || !draft || !original) {
    return <ErrorBanner error={detailQuery.error ?? new Error("Candidate unavailable.")} />;
  }

  const { candidate, evidence } = detail;
  const pending = save.isPending || approve.isPending || reject.isPending;
  // Field-level messages come from whichever call last failed; approval validation is the one that
  // produces them, so it wins when both have errors.
  const fieldErrors = approve.error instanceof ApiError ? approve.error : save.error instanceof ApiError ? save.error : null;
  const isDecided = candidate.candidate_state !== "pending_publish";

  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip status={candidate.status} />
          <ConfidenceBadge value={candidate.confidence_overall} label="overall" />
          <span className="font-mono text-xs text-subtle">{candidate.id}</span>
        </div>

        <div className="mt-3">
          <CandidatePager
            position={detail.position}
            total={detail.sibling_count}
            sourceFilename={detail.source_filename}
            hasUnsavedChanges={hasUnsavedChanges}
            onNavigate={onNavigate}
            siblings={detail.siblings}
          />
        </div>

        {candidate.warning_codes.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {candidate.warning_codes.map((code) => (
              <li
                key={code}
                title={code}
                className="rounded bg-amber/10 px-2 py-0.5 text-xs font-medium text-amber"
              >
                {humanizeCode(code)}
              </li>
            ))}
          </ul>
        ) : null}

        {isDecided ? (
          <p className="mt-3 rounded border border-line bg-muted p-2 text-xs text-subtle">
            This candidate is {candidate.candidate_state} and can no longer be changed
            {candidate.reviewer_id ? ` (decided by ${candidate.reviewer_id})` : ""}.
          </p>
        ) : null}
      </header>

      {save.error ? <ErrorBanner error={save.error} onDismiss={() => save.reset()} /> : null}
      {approve.error ? (
        <ErrorBanner error={approve.error} onDismiss={() => approve.reset()} />
      ) : null}
      {reject.error ? <ErrorBanner error={reject.error} onDismiss={() => reject.reset()} /> : null}

      <div className="grid gap-4 2xl:grid-cols-2">
        <section className="space-y-4 rounded-lg border border-line bg-surface p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-subtle">
            Source page
          </h2>
          <SourceImageViewer
            src={assetUrl(detail.source_asset_id, "original")}
            alt={`Scanned page ${detail.source_filename}`}
            blocks={evidence.blocks}
            highlightedBlockIds={evidence.source_block_ids}
          />
          <OcrTextPanel
            text={evidence.ocr_text || evidence.source_text}
            blocks={evidence.blocks}
            highlightedBlockIds={evidence.source_block_ids}
          />
          <dl className="grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs text-subtle">
            <div>
              <dt className="font-bold uppercase">OCR</dt>
              <dd>
                {evidence.ocr_engine ?? "—"}
                {evidence.ocr_languages ? ` · ${evidence.ocr_languages}` : ""}
              </dd>
            </div>
            <div>
              <dt className="font-bold uppercase">Extraction</dt>
              <dd>{evidence.provider ? `${evidence.provider} · ${evidence.model}` : candidate.origin}</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-4 rounded-lg border border-line bg-surface p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-subtle">
            Extracted fields
          </h2>

          <FieldEditor
            id="field-title"
            label="Title"
            value={draft.title}
            originalValue={original.title}
            confidence={evidence.field_confidence.title ?? null}
            error={fieldErrors?.detailFor("title")}
            onChange={(value) => setDraft({ ...draft, title: value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldEditor
              id="field-price"
              label="Price"
              value={draft.price}
              originalValue={original.price}
              confidence={evidence.field_confidence.price ?? null}
              error={fieldErrors?.detailFor("price")}
              onChange={(value) => setDraft({ ...draft, price: value })}
            />
            <FieldEditor
              id="field-category"
              label="Category"
              value={draft.category}
              originalValue={original.category}
              confidence={evidence.field_confidence.category ?? null}
              error={fieldErrors?.detailFor("category")}
              onChange={(value) => setDraft({ ...draft, category: value })}
            >
              <select
                id="field-category"
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                className="h-11 rounded border border-line bg-surface px-3 outline-none focus:border-emerald"
              >
                {/* An extraction can hold a value the catalog no longer has; keep it selectable
                    rather than silently switching the reviewer to something else. */}
                {categories.some((category) => category.slug === draft.category) ? null : (
                  <option value={draft.category}>{draft.category} (unrecognised)</option>
                )}
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.label}
                  </option>
                ))}
              </select>
            </FieldEditor>
          </div>

          <FieldEditor
            id="field-location"
            label="Location"
            value={draft.location}
            originalValue={original.location}
            confidence={evidence.field_confidence.location ?? null}
            error={fieldErrors?.detailFor("location")}
            onChange={(value) => setDraft({ ...draft, location: value })}
          />

          <FieldEditor
            id="field-phones"
            label={`Phone numbers (up to ${MAX_PHONES}, comma separated)`}
            value={draft.phones}
            originalValue={original.phones}
            confidence={evidence.field_confidence.phones ?? null}
            error={fieldErrors?.detailFor("phones")}
            onChange={(value) => setDraft({ ...draft, phones: value })}
          />

          <FieldEditor
            id="field-description"
            label="Description"
            value={draft.description}
            originalValue={original.description}
            confidence={evidence.field_confidence.description ?? null}
            error={fieldErrors?.detailFor("description")}
            multiline
            onChange={(value) =>
              setDraft({ ...draft, description: value.slice(0, MAX_DESCRIPTION_LENGTH) })
            }
          />

          {!isDecided ? (
            <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                disabled={pending}
                className="flex h-11 items-center justify-center gap-2 rounded border border-danger/40 px-4 text-sm font-bold text-danger hover:bg-danger/5 disabled:opacity-50"
              >
                <X size={16} />
                Reject
              </button>
              <button
                type="button"
                onClick={() => save.mutate()}
                disabled={pending || !hasUnsavedChanges}
                title={hasUnsavedChanges ? undefined : "No changes to save"}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded border border-line px-4 text-sm font-bold hover:border-frame disabled:opacity-50"
              >
                {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
              <button
                type="button"
                onClick={() => approve.mutate()}
                disabled={pending}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded bg-emerald px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {approve.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {hasUnsavedChanges ? "Save & approve" : "Approve"}
              </button>
            </div>
          ) : null}
        </section>
      </div>

      {isRejecting ? (
        <RejectDialog
          reasons={reasons}
          isSubmitting={reject.isPending}
          onCancel={() => setIsRejecting(false)}
          onConfirm={(reasonCode, note) => reject.mutate({ reasonCode, note })}
        />
      ) : null}
    </div>
  );
}
