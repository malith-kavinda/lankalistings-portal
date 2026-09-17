/** Small shared formatters. Kept together so two screens cannot disagree about a byte count. */

const UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${UNITS[unit]}`;
}

/** "8 min" rather than "00:08:14": a moderator wants the order of magnitude, not a stopwatch. */
export function formatElapsed(fromIso: string, toIso?: string | null): string {
  const start = Date.parse(fromIso);
  const end = toIso ? Date.parse(toIso) : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return "—";
  }
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function formatConfidence(value: number | null): string {
  return value === null ? "unmeasured" : `${Math.round(value * 100)}%`;
}

/** Turns SCREAMING_SNAKE warning codes into something readable without losing the code itself. */
export function humanizeCode(code: string): string {
  return code.toLowerCase().replaceAll("_", " ");
}
