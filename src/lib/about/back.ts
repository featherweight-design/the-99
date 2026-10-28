// The back bar's two server decisions (About visual build, plan `2026-10-27-about-visual.md`, PR 6a; handoff call 5,
// board Ways-In "‹ Back to {screen}"). Pure.

import { ABOUT_BACK_SCREENS, ABOUT_SECTIONS } from "../copy/about-pages";
import { questionLanding } from "./question-landing";
import { screenForPath } from "./screen-for-path";

/**
 * `from` as the back bar may use it: a same-origin relative path, or null. Anything that could leave the app is
 * refused: a scheme (`https:`, `javascript:`), a protocol-relative `//host` or `/\host` (browsers read a backslash
 * as a slash), a repeated parameter, a control character.
 */
export function safeFrom(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return null;
  try {
    const base = "https://the99.invalid";
    const url = new URL(raw, base);
    return url.origin === base ? url.pathname + url.search : null;
  } catch {
    return null;
  }
}

/** The path and query `from` names. */
function split(from: string): { path: string; search: string } {
  const at = from.indexOf("?");
  return at === -1 ? { path: from, search: "" } : { path: from.slice(0, at), search: from.slice(at) };
}

/** The deck id of a deck's own page (`/decks/<id>`), or null. */
export function deckIdOf(from: string): string | null {
  const { path, search } = split(from);
  if (screenForPath(path, search) !== "deck") return null;
  return path.split("/").filter(Boolean)[1] ?? null;
}

/**
 * The screen the bar names, or null for a path the ? never lands from (no bar is drawn). A deck is named by its own
 * name (`deckName`, read for the reader's own deck), falling back to its section's; a screen with no section by
 * `ABOUT_BACK_SCREENS`; any other screen by the section it lands on.
 */
export function backScreenName(from: string, deckName: string | null = null): string | null {
  const { path, search } = split(from);
  const screen = screenForPath(path, search);
  if (screen === null) return null;
  if (screen === "deck" && deckName) return deckName;
  if (Object.hasOwn(ABOUT_BACK_SCREENS, screen)) return ABOUT_BACK_SCREENS[screen as keyof typeof ABOUT_BACK_SCREENS];
  const landing = questionLanding(path, search, { deckView: null, desktop: true });
  if (landing === null) return null;
  return ABOUT_SECTIONS.find((s) => s.area === landing.area && s.id === landing.section)?.name ?? null;
}
