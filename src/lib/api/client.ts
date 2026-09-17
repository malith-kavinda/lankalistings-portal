/**
 * One place that talks to the media service.
 *
 * Its job is mostly one thing: turn a failed response into an error the UI can actually show. The
 * server answers every failure with `{ data: null, error: { code, message, details, correlation_id } }`,
 * and the previous client threw away everything but the message. The correlation id is the only
 * handle anyone has for finding a failed batch in the server's logs, and the per-field details are
 * what let an approval failure point at the field that caused it instead of saying "invalid".
 *
 * `ApiError` carries all of it, so a toast can show the message, a form can highlight its fields,
 * and the id is on screen when someone asks what went wrong.
 */

import type { ApiEnvelope, ApiErrorBody, ApiErrorDetail } from "./types";

export const mediaApiUrl: string =
  import.meta.env.VITE_MEDIA_API_URL ?? "http://localhost:8001";

/** Identifies the reviewer in the audit trail while the service runs with OPERATOR_AUTH_MODE=none. */
const OPERATOR_HEADER = "X-Operator-Id";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: ApiErrorDetail[];
  readonly correlationId: string | null;

  constructor(
    message: string,
    options: {
      code: string;
      status: number;
      details?: ApiErrorDetail[];
      correlationId?: string | null;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details ?? [];
    this.correlationId = options.correlationId ?? null;
  }

  /** The message for a given field, so a form can render the server's own words beside the input. */
  detailFor(field: string): string | undefined {
    return this.details.find((detail) => detail.field === field)?.message;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isVersionConflict(): boolean {
    return this.code === "VERSION_CONFLICT";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  operatorId?: string;
  /** Query parameters; `undefined`, `null` and `""` are dropped rather than sent as empty. */
  query?: Record<string, string | number | boolean | undefined | null>;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal, query, operatorId } = options;

  const url = new URL(`${mediaApiUrl}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {};
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (operatorId) {
    headers[OPERATOR_HEADER] = operatorId;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      signal,
      body:
        body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch (cause) {
    // An aborted request is the caller changing their mind, not a failure to report.
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw cause;
    }
    throw new ApiError(
      `Cannot reach the media service at ${mediaApiUrl}. Is it running?`,
      { code: "NETWORK_UNAVAILABLE", status: 0 },
    );
  }

  const envelope = await readEnvelope<T>(response);

  if (!response.ok || envelope?.error) {
    const error: ApiErrorBody | null = envelope?.error ?? null;
    throw new ApiError(error?.message ?? `Request failed with status ${response.status}.`, {
      code: error?.code ?? "UNEXPECTED_ERROR",
      status: response.status,
      details: error?.details ?? [],
      correlationId: error?.correlation_id ?? null,
    });
  }

  if (envelope?.data === null || envelope?.data === undefined) {
    throw new ApiError("The server returned an empty response.", {
      code: "EMPTY_RESPONSE",
      status: response.status,
    });
  }

  return envelope.data;
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    // A proxy or a crash can answer with HTML. Saying so beats a JSON parse error in the console.
    return {
      data: null,
      error: {
        code: "MALFORMED_RESPONSE",
        message: `The server returned a non-JSON response (status ${response.status}).`,
        details: [],
        correlation_id: "",
      },
    };
  }
}

/** A human-readable line for a toast: the message, plus the id support will ask for. */
export function describeError(error: unknown): { message: string; correlationId: string | null } {
  if (error instanceof ApiError) {
    return { message: error.message, correlationId: error.correlationId };
  }
  if (error instanceof Error) {
    return { message: error.message, correlationId: null };
  }
  return { message: "Something went wrong.", correlationId: null };
}
