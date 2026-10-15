// About's notice as a line on Home's banner (plan `2026-10-15-about-on-the-banner.md`, PR A; handoff
// `design/design_handoff_the99_upcoming_precons/`, `R2 - Home-About`, STATES A1–A3). It replaces the one-time sheet
// with `ABOUT_SHEET_ENABLED` on: the switch now means "About's notice is a line on Home".
//
// ONE RULE, the sheet's (`sheetDecision`): a first-run reader (`isFirstRun`) is introduced to the page, a reader
// behind is named what they have not seen (`unseenEntries`), and a current reader is told nothing. Two differences,
// both Hugh's (2026-10-14): the How it works appendix is never named (Q3), and a browser whose `about_sheet` cookie
// is current already showed the sheet for these entries and is not told again on Home.
//
// Pure. The seen state rides in Home's cached payload (`user_prefs` carries the stamp trigger, so a write retires
// it); the cookie is per browser and is read per request, outside it, and the page combines the two.

import { ABOUT_VERSION, type AboutEntry } from "../copy/about";
import { isFirstRun, unseenEntries, type SeenState } from "./visible";

export type AboutNotice =
  | { kind: "firstRun" }
  | { kind: "behind"; entries: AboutEntry[] };

/**
 * The notice Home draws, or null. `visible` is the reader's own visible entries (`visibleEntries` of their resolved
 * switches), which never include the appendix, and `sheetCookieCurrent` is `sheetCookieIsCurrent` of this browser's
 * `about_sheet` cookie.
 */
export function aboutNotice(
  seen: SeenState,
  visible: readonly AboutEntry[],
  sheetCookieCurrent: boolean,
): AboutNotice | null {
  if (sheetCookieCurrent) return null;
  if (isFirstRun(seen)) return { kind: "firstRun" };
  const entries = unseenEntries(visible, seen);
  return entries.length === 0 ? null : { kind: "behind", entries };
}

/**
 * What the browser is handed: the titles it draws, and `ids`, what its ✕ claims and what a `/about` visit in the
 * same document acknowledges. Behind, the unseen entries; first run, every visible entry (the line stands for the
 * whole page, and the ✕ writes what a visit writes).
 */
export type AboutLine =
  | { kind: "firstRun"; ids: string[] }
  | { kind: "behind"; titles: string[]; ids: string[] };

export function aboutLine(notice: AboutNotice | null, visible: readonly AboutEntry[]): AboutLine | null {
  if (!notice) return null;
  if (notice.kind === "firstRun") return { kind: "firstRun", ids: visible.map((e) => e.id) };
  return { kind: "behind", titles: notice.entries.map((e) => e.title), ids: notice.entries.map((e) => e.id) };
}

/** No notice names more ids than the catalog holds; a longer claim is not one a page drew. */
const MAX_CLAIMED = 200;

/**
 * What the banner's ✕ writes for About (Q2: ✕ counts as seen), re-decided on the server: `claimed` is what the
 * page drew, sent back by the browser and so not trusted. The reader's notice is read again (cookie aside: a ✕
 * only exists where the line was drawn), and only the claimed ids it still names are written. So a client can
 * drop an id but never add one, and an entry switched on after the page rendered is not marked seen unread.
 *
 * The version floor is `ABOUT_VERSION`, as a visit writes, when every unswitched entry the notice names now was
 * claimed. When one was not (a deploy added it after the render, or the client dropped it), the floor rises only to
 * the newest claimed unswitched entry and never to an unclaimed one's, so every unclaimed one stays new. The ids are the claimed switched entries; an
 * unswitched entry is seen by the floor alone. Null when there is nothing to write.
 */
export function aboutDismissal(
  claimed: unknown,
  seen: SeenState,
  visible: readonly AboutEntry[],
  version: number = ABOUT_VERSION,
): { version: number; ids: string[] } | null {
  if (!Array.isArray(claimed)) return null;
  const notice = aboutNotice(seen, visible, false);
  if (!notice) return null;
  const named = new Set(claimed.slice(0, MAX_CLAIMED).filter((id): id is string => typeof id === "string"));
  const current = notice.kind === "firstRun" ? [...visible] : notice.entries;
  const valid = current.filter((e) => named.has(e.id));
  if (valid.length === 0) return null;
  const unswitched = current.filter((e) => !e.switch);
  const unclaimed = unswitched.filter((e) => !named.has(e.id));
  // Below every unclaimed entry, so none is marked seen by the floor; a claimed entry above that stays new too,
  // which is the safe side.
  const floor = unclaimed.length === 0
    ? version
    : Math.min(
        Math.max(0, ...valid.filter((e) => !e.switch).map((e) => e.since)),
        Math.min(...unclaimed.map((e) => e.since)) - 1,
      );
  const ids = valid.filter((e) => e.switch).map((e) => e.id);
  if (ids.length === 0 && floor <= seen.version) return null;
  return { version: floor, ids };
}
