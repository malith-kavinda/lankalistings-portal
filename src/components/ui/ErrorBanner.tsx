/**
 * How a failure reaches the person looking at the screen.
 *
 * The correlation id is the point. The server puts one on every error and nothing used to read it;
 * it is the only handle for finding a failed batch in the logs, so it belongs on screen and in the
 * clipboard rather than in a network tab someone has to be told to open.
 */

import { AlertTriangle, Copy } from "lucide-react";
import { useState } from "react";
import { ApiError } from "../../lib/api/client";

type ErrorBannerProps = {
  error: unknown;
  onDismiss?: () => void;
};

export function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  const [copied, setCopied] = useState(false);
  if (!error) {
    return null;
  }

  const apiError = error instanceof ApiError ? error : null;
  const message =
    error instanceof Error ? error.message : "Something went wrong. Please try again.";
  // Field-level details are shown separately beside their inputs; anything unattached belongs here.
  const loose = (apiError?.details ?? []).filter((detail) => !detail.field);

  async function copyCorrelationId() {
    if (!apiError?.correlationId) {
      return;
    }
    try {
      await navigator.clipboard.writeText(apiError.correlationId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the id is already visible, which is the important part.
    }
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/5 p-4"
    >
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-danger">{message}</p>
        {loose.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-subtle">
            {loose.map((detail, index) => (
              <li key={`${detail.code}-${index}`}>{detail.message}</li>
            ))}
          </ul>
        ) : null}
        {apiError?.correlationId ? (
          <button
            type="button"
            onClick={copyCorrelationId}
            className="mt-2 inline-flex items-center gap-1.5 rounded border border-line bg-surface px-2 py-1 font-mono text-xs text-subtle hover:border-danger/40"
            title="Copy this id — support needs it to find the request in the logs"
          >
            <Copy size={12} />
            {copied ? "Copied" : apiError.correlationId}
          </button>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-bold uppercase text-subtle hover:text-danger"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
