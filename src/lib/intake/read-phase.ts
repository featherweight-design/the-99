import type { TheReadState } from "./run-store";

/**
 * What the results need to know of the read: how to title their order, and whether to dim. Shared by
 * the page, a Server Component, and the panel, a Client one, so it lives outside both: a server
 * module cannot call a function a "use client" module exports.
 */
export type ReadPhase = "reading" | "stopped" | "failed" | "done" | "nothing" | "unread";

/** The panel's phase for a server state; `null` (no `r`) and `none` are the unread words (7l, 7n). */
export function phaseOf(state: TheReadState | null): ReadPhase {
  switch (state?.kind) {
    case "pending": return "reading";
    case "done": return "done";
    case "nothing": return "nothing";
    case "failed": return "failed";
    case "stopped": return "stopped";
    default: return "unread";
  }
}
