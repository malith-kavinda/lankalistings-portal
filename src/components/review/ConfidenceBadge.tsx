/**
 * Confidence, shown as a number and a word — never as colour alone (PRD 14.4).
 *
 * A numeric score with no band is hard to act on; a band with no number hides the difference
 * between 0.51 and 0.79. Both, plus the distinction that matters most: `null` means the pipeline
 * never measured this, which is not the same as measuring it as low.
 */

import { formatConfidence } from "../../lib/format";

type ConfidenceBadgeProps = {
  value: number | null;
  label?: string;
  size?: "sm" | "md";
};

const LOW = 0.5;
const HIGH = 0.8;

function band(value: number | null): { text: string; classes: string } {
  if (value === null) {
    return { text: "unmeasured", classes: "bg-muted text-subtle" };
  }
  if (value < LOW) {
    return { text: "low", classes: "bg-danger/10 text-danger" };
  }
  if (value < HIGH) {
    return { text: "medium", classes: "bg-amber/10 text-amber" };
  }
  return { text: "high", classes: "bg-emerald/10 text-emerald" };
}

export function ConfidenceBadge({ value, label, size = "md" }: ConfidenceBadgeProps) {
  const tone = band(value);
  const padding = size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-bold ${padding} ${tone.classes}`}
      title={
        value === null
          ? "The pipeline produced no confidence score for this"
          : `Confidence ${formatConfidence(value)} (${tone.text})`
      }
    >
      {label ? <span className="font-medium opacity-80">{label}</span> : null}
      {value === null ? "—" : formatConfidence(value)}
      <span className="font-medium uppercase opacity-70">{tone.text}</span>
    </span>
  );
}
