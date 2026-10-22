import { refreshCopy } from "../copy/refresh";
import { elapsed } from "../decks/touched";

/**
 * "just now", "5h ago", "yesterday", "4d ago": the resume rows' own elapsed figure, against the page's one clock, with
 * "just now" for anything under an hour (the feed's and Waiting on you's own: Design's prompt 13 carry-over). Plain
 * data in and out, so a server component (Waiting on you) and a client one (the feed row) share the one definition.
 */
export function feedAge(at: string, now: string): string {
  const e = elapsed(new Date(at), new Date(now));
  const words = refreshCopy.home.elapsed;
  if (e.unit === "hours" && e.value === 0) return words.justNow;
  return e.unit === "yesterday" ? words.yesterday : words[e.unit](e.value);
}
