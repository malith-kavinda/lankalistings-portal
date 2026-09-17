/**
 * Rejecting with a reason (FR-REV-006).
 *
 * The reasons come from `GET /api/v1/advertisements/rejection-reasons` rather than a list in this
 * file. The server's set is closed — it has to be, or PRD 15.5 cannot group rejections by cause —
 * and a hardcoded dropdown would eventually offer one the server refuses.
 */

import { useEffect, useRef, useState } from "react";
import { MAX_NOTE_LENGTH, REASON_REQUIRING_NOTE } from "../../lib/reviewRules";
import type { RejectionReason } from "../../lib/api/types";

type RejectDialogProps = {
  reasons: RejectionReason[];
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (reasonCode: string, note: string) => void;
};

export function RejectDialog({
  reasons,
  isSubmitting,
  onCancel,
  onConfirm,
}: RejectDialogProps) {
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const noteRequired = reasonCode === REASON_REQUIRING_NOTE;
  const canSubmit = reasonCode !== "" && (!noteRequired || note.trim() !== "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-frame/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-dialog-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onCancel();
        }
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-line bg-surface p-5 shadow-lg">
        <h2 id="reject-dialog-title" className="text-lg font-bold">
          Reject this candidate
        </h2>
        <p className="mt-1 text-sm text-subtle">
          It leaves the queue and is recorded against the reason you choose.
        </p>

        <div className="mt-4 grid gap-4">
          <label className="grid gap-1.5 text-sm font-bold">
            Reason
            <select
              ref={firstFieldRef}
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value)}
              className="h-11 rounded border border-line bg-surface px-3 font-normal outline-none focus:border-danger"
            >
              <option value="">Choose a reason…</option>
              {reasons.map((reason) => (
                <option key={reason.code} value={reason.code}>
                  {reason.description}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-bold">
            Note {noteRequired ? <span className="text-danger">(required)</span> : "(optional)"}
            <textarea
              value={note}
              maxLength={MAX_NOTE_LENGTH}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                noteRequired ? "Describe what is wrong with this candidate." : "Anything useful for later."
              }
              className="min-h-24 rounded border border-line bg-surface px-3 py-2 font-normal outline-none focus:border-danger"
            />
          </label>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded border border-line text-sm font-bold hover:border-frame"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reasonCode, note)}
            disabled={!canSubmit || isSubmitting}
            className="h-11 flex-1 rounded bg-danger text-sm font-bold text-white disabled:opacity-50"
          >
            {isSubmitting ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
