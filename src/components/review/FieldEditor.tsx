/**
 * One editable field with everything known about it: what the model said, how sure it was, what the
 * server refused, and whether the reviewer has changed it (FR-REV-004).
 *
 * Per-field confidence beside the input rather than one score for the whole candidate, because that
 * is the level at which a reviewer decides what to check. A candidate scoring 0.82 overall with a
 * 0.31 on `price` needs the price checked, and an overall number cannot say so.
 */

import type { ReactNode } from "react";
import { ConfidenceBadge } from "./ConfidenceBadge";

type FieldEditorProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  confidence?: number | null;
  /** The value the pipeline produced, shown when the reviewer has changed it. */
  originalValue?: string;
  error?: string;
  multiline?: boolean;
  children?: ReactNode;
};

export function FieldEditor({
  id,
  label,
  value,
  onChange,
  confidence,
  originalValue,
  error,
  multiline,
  children,
}: FieldEditorProps) {
  const isEdited = originalValue !== undefined && originalValue !== value;
  const inputClasses = `w-full rounded border bg-surface px-3 font-normal outline-none transition-colors ${
    error ? "border-danger focus:border-danger" : "border-line focus:border-emerald"
  }`;

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-bold">
          {label}
          {isEdited ? (
            <span className="ml-2 rounded bg-frame/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-frame">
              edited
            </span>
          ) : null}
        </label>
        {confidence !== undefined ? <ConfidenceBadge value={confidence} size="sm" /> : null}
      </div>

      {children ?? (
        multiline ? (
          <textarea
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`${inputClasses} min-h-28 py-2`}
          />
        ) : (
          <input
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`${inputClasses} h-11`}
          />
        )
      )}

      {error ? (
        <p id={`${id}-error`} className="text-xs font-bold text-danger">
          {error}
        </p>
      ) : null}

      {isEdited ? (
        <p className="truncate text-xs text-subtle" title={originalValue}>
          Extracted: {originalValue || <span className="italic">empty</span>}
        </p>
      ) : null}
    </div>
  );
}
