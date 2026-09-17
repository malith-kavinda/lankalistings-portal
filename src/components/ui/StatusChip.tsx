/**
 * One status, rendered the same way everywhere.
 *
 * Colour is never the only signal (PRD 14.4): each tone carries an icon too, so the chip still
 * reads for someone who cannot distinguish amber from emerald, and still reads in a screenshot
 * pasted into a ticket.
 */

import {
  CheckCircle2,
  Clock,
  Loader2,
  MinusCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react";

type Tone = "pending" | "active" | "danger" | "neutral" | "running";

const TONE_CLASSES: Record<Tone, string> = {
  pending: "bg-amber/10 text-amber",
  active: "bg-emerald/10 text-emerald",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-muted text-subtle",
  running: "bg-frame/10 text-frame",
};

const TONE_ICONS: Record<Tone, LucideIcon> = {
  pending: Clock,
  active: CheckCircle2,
  danger: XCircle,
  neutral: MinusCircle,
  running: Loader2,
};

/**
 * Every status the two vocabularies can produce. Listed exhaustively rather than defaulted, so a
 * state nobody styled shows up as `neutral` with its raw name rather than silently as "active".
 */
const STATUS_TONES: Record<string, Tone> = {
  // advertisements
  draft: "neutral",
  pending: "pending",
  pending_review: "pending",
  active: "active",
  rejected: "danger",
  expired: "neutral",
  sold: "neutral",
  // ingestion items
  uploaded: "neutral",
  preprocessing: "running",
  ocr_processing: "running",
  llm_processing: "running",
  awaiting_review: "pending",
  no_ads: "neutral",
  failed: "danger",
  needs_attention: "danger",
  completed: "active",
  // batches
  queued: "neutral",
  processing: "running",
  partial_failed: "danger",
  // candidate states
  pending_publish: "pending",
  linked: "active",
  superseded: "neutral",
  discarded: "danger",
};

const RUNNING_TONES: Tone[] = ["running"];

type StatusChipProps = {
  status: string;
  /** A count or elapsed time rendered after the label, e.g. "OCR · 12s". */
  suffix?: string;
  size?: "sm" | "md";
};

export function StatusChip({ status, suffix, size = "md" }: StatusChipProps) {
  const tone = STATUS_TONES[status] ?? "neutral";
  const Icon = TONE_ICONS[tone];
  const padding = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide ${padding} ${TONE_CLASSES[tone]}`}
    >
      <Icon
        size={size === "sm" ? 12 : 14}
        className={RUNNING_TONES.includes(tone) ? "animate-spin" : undefined}
      />
      {status.replaceAll("_", " ")}
      {suffix ? <span className="font-medium normal-case opacity-80">· {suffix}</span> : null}
    </span>
  );
}
