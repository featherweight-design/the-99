/**
 * Build skew, seen from the browser: a tab that loaded one deployment while the server now runs another.
 *
 * Vercel's Skew Protection pins a tab's asset and Server Action requests to its own deployment for
 * `skewProtectionMaxAge` (12 hours here), and Next hard-navigates on a deployment mismatch when the tab
 * navigates. What neither closes is a tab left past that window, or one that never navigates, whose next
 * Server Action or lazy chunk then fails. The guard reloads such a tab at a moment that loses nothing.
 * This file holds the decisions, with no DOM in them, so each can be pinned by a unit test.
 */

/** sessionStorage key holding the time of this tab's last skew reload (ms since epoch). */
export const SKEW_RELOAD_KEY = "the99:skew-reload-at";

/** A tab reloads for skew at most once in this long, so a mismatch that a reload does not clear cannot loop. */
export const SKEW_RELOAD_GAP_MS = 60_000;

/** The deployment check runs at most once in this long per tab: it reads `/api/health`, which reads the database. */
export const SKEW_CHECK_GAP_MS = 5 * 60_000;

/** Whether an error is the browser's or Next's report that this tab's code no longer matches the server's. */
export function isSkewError(error: unknown): boolean {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (name === "ChunkLoadError") return true;
  // Next: a Server Action id from an older build; webpack and Turbopack: a chunk the new deploy no longer serves.
  return /Failed to find Server Action|Loading chunk [^\s]+ failed|Failed to load chunk|ChunkLoadError/i.test(message);
}

/** Both ids known and different. A local server or a failed read has no id, and no id is never skew. */
export function deploymentsDiffer(local: string | null | undefined, remote: string | null | undefined): boolean {
  return Boolean(local) && Boolean(remote) && local !== remote;
}

/** Whether the loop guard lets this tab reload now. An unreadable store says no: a reload that cannot be counted could loop. */
export function mayReload(read: () => string | null, now: number): boolean {
  let last: string | null;
  try {
    last = read();
  } catch {
    return false;
  }
  const at = last === null ? Number.NaN : Number(last);
  return Number.isNaN(at) || now - at >= SKEW_RELOAD_GAP_MS;
}

/** What the tab is doing that a reload would lose. */
export type Busy = { editing: boolean; dirtyForm: boolean };

/**
 * When a pending skew reload may fire. A route change leaves the page anyway, so it always may; a blur or
 * the moment of detection may only when nothing typed would be lost: no field has focus and no form holds
 * an edit (a dirty form waits for the next route change).
 */
export function mayReloadNow(busy: Busy, trigger: "detected" | "blur" | "route"): boolean {
  if (trigger === "route") return true;
  return !busy.editing && !busy.dirtyForm;
}
