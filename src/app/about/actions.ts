"use server";

import { requireUserId } from "../../lib/auth";
import { ABOUT_VERSION } from "../../lib/copy/about";
import { ABOUT_AREA_IDS, type AboutArea } from "../../lib/copy/about-pages";
import { afterVisit, visibleSections } from "../../lib/about/pages-visible";
import { aboutSeen, markAboutVisited } from "../../lib/about/read";
import { switchedIds, visibleEntries } from "../../lib/about/visible";
import { howItWorksEnabled } from "../../lib/about/how-it-works-flag";
import { requestSwitchEnv } from "../../lib/switches/request";
import { HOW_IT_WORKS_ID } from "../../lib/copy/how-it-works-links";

/**
 * A visit to one of About's six pages (About visual PR 6b), recorded when the page is ACTUALLY OPEN: called from
 * `RecordPageVisit`'s effect after the page has mounted, never during render, so a prefetch records nothing.
 *
 * Decided here, never taken from the browser: the page named, the reader's own switches (`requestSwitchEnv`, env and
 * `flag_overrides`) and their seen state as it stands now. A returning reader gains that page's announce keys and
 * keeps their floor (`afterVisit`: a visit to Decks never marks Friends' new units seen); a first-run reader's first
 * visit takes everything they are drawn, on every page, as their baseline. Merged as every About write is
 * (`markAboutVisited`: a union, the floor by `greatest`). Returns the keys written, which the page acknowledges in this
 * document so Back to Home does not draw them again.
 *
 * No revalidation: the page has already drawn its New marks from the pre-visit state, and re-rendering it inside this
 * reply would take them away while the reader is reading.
 */
export async function recordAboutPageVisit(area: unknown): Promise<string[]> {
  const userId = await requireUserId();
  if (typeof area !== "string" || !(ABOUT_AREA_IDS as readonly string[]).includes(area)) return [];
  const env = await requestSwitchEnv(userId);
  const seen = await aboutSeen(userId);
  const after = afterVisit(visibleSections(env), area as AboutArea, seen);
  await markAboutVisited(userId, after.version, after.ids);
  return [...after.ids];
}

/** No page draws more than this many switched entries and appendix ids; anything longer is not one. */
const MAX_SHOWN = 200;

/**
 * The switched ids the Reference's visit records (`?tab=reference`, kept for old bookmarks until PR 7b): the ones the
 * page SHOWED (sent back by the page, so an entry an override turned on after it rendered is not marked seen unread),
 * and of those only the ones this reader's switches still draw now (decided here from the proxy's resolution, so a
 * caller can drop an id but never add one). The appendix by its id, while its switch is on.
 */
async function acknowledged(userId: string, shown: readonly unknown[]): Promise<string[]> {
  const env = await requestSwitchEnv(userId);
  const drawn = new Set([...switchedIds(visibleEntries(env)), ...(howItWorksEnabled(env) ? [HOW_IT_WORKS_ID] : [])]);
  const claimed = shown.slice(0, MAX_SHOWN).filter((id): id is string => typeof id === "string");
  return [...new Set(claimed.filter((id) => drawn.has(id)))];
}

/**
 * About R6: a visit to the Reference (`/about?tab=reference`), recorded when it is ACTUALLY OPEN (audit E2). Kept until
 * PR 7b retires the Reference, so a reader who reads it there is not told those entries again: the floor and the
 * switched entries it drew, as it has always written.
 *
 * Called from `RecordVisit`'s effect after the page has mounted in a browser, never during render: a write at render
 * would record a prefetch the reader never opened. It neither redirects nor revalidates.
 */
export async function recordAboutVisit(shown: readonly string[]) {
  const userId = await requireUserId();
  await markAboutVisited(userId, ABOUT_VERSION, await acknowledged(userId, Array.isArray(shown) ? shown : []));
}
