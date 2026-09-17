/**
 * Who the audit trail records for a decision taken from this browser.
 *
 * The service runs with `OPERATOR_AUTH_MODE=none` locally and trusts this header, which is honest
 * about being no authentication at all. It is still worth sending something specific: an audit
 * trail where every approval reads `local-operator` cannot answer the question it exists for.
 *
 * It is a claim, not an identity. Real per-operator credentials are an auth-mode change in the
 * service, not something a client can supply.
 */

const STORAGE_KEY = "lankalistings.operatorId";
const FALLBACK = "portal-operator";

/** The server's own rule, so a rejected header is caught before the request rather than as a 403. */
const ALLOWED = /^[A-Za-z0-9._@+-]{1,64}$/;

export function operatorId(): string {
  const configured = import.meta.env.VITE_OPERATOR_ID;
  if (typeof configured === "string" && ALLOWED.test(configured)) {
    return configured;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && ALLOWED.test(stored)) {
      return stored;
    }
  } catch {
    // Storage can be unavailable (private browsing, blocked cookies). The fallback is fine.
  }
  return FALLBACK;
}

export function setOperatorId(value: string): boolean {
  if (!ALLOWED.test(value)) {
    return false;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}
