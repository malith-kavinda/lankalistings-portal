/**
 * The handful of server rules the UI has to know before it asks.
 *
 * Deliberately short. Everything the server can answer — the reason codes, the category catalog,
 * the upload limits — is fetched rather than duplicated here; these two are structural facts about
 * how the form behaves, not data, and fetching them would mean the note field could not know it
 * was required until after a failed submit.
 */

/** `other` carries no information without a note, so the server requires one. Mirrored here. */
export const REASON_REQUIRING_NOTE = "other";

export const MAX_NOTE_LENGTH = 2000;

export const MAX_DESCRIPTION_LENGTH = 8000;
export const MAX_PHONES = 10;
