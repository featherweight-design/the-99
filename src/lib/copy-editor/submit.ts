// The copy editor's client side of Submit: post the tray's edits, read where the branch stands, and keep the last
// submission in this browser so a reload still shows "PR #N open". Every call returns a value; none throws.
import { captureClientError } from "../sentry/capture-client";
import type { Edit } from "./edits";

export const SENT_STORAGE_KEY = "the99.copySubmitted";

export type SubmitResult =
  | { kind: "ok"; branch: string }
  /** 409: lines changed on staging since the edit was made. */
  | { kind: "stale"; keys: string[] }
  /** 422: the server's rules refused these rows (unknown key, read-only, copy rule). */
  | { kind: "rule"; keys: string[] }
  /** 400: the route's parser refused the submission; `message` is its own fixed phrase and `keys` the edit it names, if any. */
  | { kind: "invalid"; message: string; keys: string[] }
  | { kind: "limit" }
  | { kind: "unavailable" }
  | { kind: "network" };

export async function submitEdits(edits: readonly Edit[], doFetch: typeof fetch = fetch): Promise<SubmitResult> {
  try {
    const res = await doFetch("/api/copy-edit/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edits }),
    });
    const body = (await res.json().catch(() => ({}))) as { branch?: string; keys?: string[]; rows?: { key: string }[]; message?: unknown };
    if (res.status === 202 && typeof body.branch === "string") return { kind: "ok", branch: body.branch };
    if (res.status === 409) return { kind: "stale", keys: body.keys ?? [] };
    if (res.status === 422) return { kind: "rule", keys: (body.rows ?? []).map((r) => r.key) };
    if (res.status === 429) return { kind: "limit" };
    if (res.status === 400) {
      // The route already reported this 400, so the client does not.
      // Only a short plain phrase is shown: the parser's reasons are all under 80 characters.
      const message = typeof body.message === "string" && body.message.length <= 120 ? body.message : "";
      return { kind: "invalid", message, keys: Array.isArray(body.keys) ? body.keys.filter((k): k is string => typeof k === "string") : [] };
    }
    // The player sees "unavailable". Statuses the route or gate answers on purpose (gate 404, 413, 415, 502 reported by the route, 503 not built) are not reported again; anything else is unplanned and the page reports it.
    if (![404, 413, 415, 502, 503].includes(res.status)) captureClientError("copy-editor-submit-unavailable", new Error(String(res.status)));
    return { kind: "unavailable" };
  } catch (error) {
    // An offline browser is an expected outcome, the tray says so; anything else threw before a response and is reported.
    if (!(error instanceof TypeError)) captureClientError("copy-editor-submit-threw", error);
    return { kind: "network" };
  }
}

export type Progress =
  | { state: "none" | "pending" | "unknown" }
  | { state: "open" | "merged" | "closed"; number: number; url: string }
  | { state: "failed"; runUrl: string };

export async function readStatus(branch: string, doFetch: typeof fetch = fetch): Promise<Progress> {
  try {
    const res = await doFetch(`/api/copy-edit/status?branch=${encodeURIComponent(branch)}`, { cache: "no-store" });
    if (!res.ok) return { state: "unknown" };
    return (await res.json()) as Progress;
  } catch {
    return { state: "unknown" };
  }
}

/** What the tray remembers of a submission: the branch to ask about and the edits, so a failed run can give them back. */
export type Sent = { branch: string; edits: Edit[]; at: number };

export function readSent(): Sent | null {
  try {
    const v = JSON.parse(window.localStorage.getItem(SENT_STORAGE_KEY) ?? "null") as Sent | null;
    return v && typeof v.branch === "string" && Array.isArray(v.edits) && typeof v.at === "number" ? v : null;
  } catch {
    return null;
  }
}

export function writeSent(sent: Sent | null): void {
  try {
    if (sent) window.localStorage.setItem(SENT_STORAGE_KEY, JSON.stringify(sent));
    else window.localStorage.removeItem(SENT_STORAGE_KEY);
  } catch {
    // Storage blocked: the bar forgets the submission on reload.
  }
}

/** Edits given back after a failed run; an edit made since for the same line wins. */
export const restoreEdits = (current: readonly Edit[], back: readonly Edit[]): Edit[] => [...back.filter((b) => !current.some((c) => c.key === b.key)), ...current];
