// §Surfaces 2 §Surfaces 3 — the one live region the draft surfaces speak
// through, hoisted out of React's tree and onto the document.
//
// Both of this page's writes end by removing the thing that made them: a pull
// refreshes its row out of existence, and a commit navigates away entirely. A
// region rendered inside either control would be unmounted — possibly before a
// screen reader had read the sentence it had just been handed — so the nearest
// host that outlives the write is the document itself.
//
// Created empty on mount and filled later, never created with its text already
// in it: a region that appears in the same paint as its message is not announced
// at all.

export const DRAFT_ANNOUNCER_ID = "draft-announcer";

/**
 * The hash a successful commit lands on the deck page with, and that page's cue
 * to put focus on the version line it just created.
 *
 * A commit navigates, and a navigation leaves focus on the document body: a
 * keyboard or screen-reader user who committed from the sheet would be dropped at
 * the top of a page with no indication which of its lines is the answer. The live
 * region above says the version was cut; this says where it is. The line takes
 * focus once and the hash is cleared on the way, so a reload or a back-forward
 * return does not re-fire a receipt for a commit minutes old.
 */
export const COMMIT_RECEIPT_HASH = "#committed";

export function draftAnnouncer(): HTMLElement {
  const existing = document.getElementById(DRAFT_ANNOUNCER_ID);
  if (existing) return existing;
  const region = document.createElement("div");
  region.id = DRAFT_ANNOUNCER_ID;
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", "polite");
  region.setAttribute("aria-atomic", "true");
  region.className = "sr-only";
  document.body.appendChild(region);
  return region;
}
