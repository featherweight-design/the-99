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
