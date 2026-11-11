"use server";

import { requireUserId } from "../../lib/auth";
import { ABOUT_AREA_IDS, type AboutArea } from "../../lib/copy/about-pages";
import { heldAnswer, visibleSections, visitWrite } from "../../lib/about/pages-visible";
import { aboutSeen, markAboutVisited } from "../../lib/about/read";
import { requestFlags } from "../../lib/flags/request";

/**
 * A visit to one of About's six pages (About visual PR 6b), recorded when the page is ACTUALLY OPEN: called from
 * `RecordPageVisit`'s effect after the page has mounted, never during render, so a prefetch records nothing.
 *
 * `claimed` is the keys the page RENDERED for this visit to write (`afterVisit` at render: this page's keys the reader
 * did not hold, or a first-run reader's whole baseline), sent back by the browser and so not trusted. Decided here: the
 * page named, the reader's own switches (`requestFlags`, env and `flag_overrides`) and their seen state as it
 * stands now, INTERSECTED with the claim (`visitWrite`), never widened to the current state: a unit or sentence an
 * override turned on between the render (or a prefetch) and this call was never seen, and stays new. A returning
 * reader keeps their floor (a visit to Decks never marks Friends' new units seen); a first-run reader's floor rises as
 * the ✕'s does (`claimWrite`). Merged as every About write is (`markAboutVisited`: a union, the floor by `greatest`).
 * Returns the keys the reader now holds and every launch key the resulting state answers (`answeredKeys`, so a floor or
 * legacy id another tab wrote after Home was cached is covered too, and a reader past their first run always gets a
 * non-empty answer that ends it), which the page acknowledges in this document so Back to Home does not draw them
 * again. Both paths, the write and the no-write, answer from the state the reader is left at.
 *
 * No revalidation: the page has already drawn its New marks from the pre-visit state, and re-rendering it inside this
 * reply would take them away while the reader is reading.
 */
export async function recordAboutPageVisit(area: unknown, claimed: unknown): Promise<string[]> {
  const userId = await requireUserId();
  if (typeof area !== "string" || !(ABOUT_AREA_IDS as readonly string[]).includes(area)) return [];
  const env = await requestFlags(userId);
  const seen = await aboutSeen(userId);
  const visible = visibleSections(env);
  const write = visitWrite(claimed, visible, area as AboutArea, seen);
  if (write) await markAboutVisited(userId, write.version, write.ids);
  return heldAnswer(visible, seen, write);
}
