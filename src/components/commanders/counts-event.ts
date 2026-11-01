// The Commanders place head re-reads its figures when a list has just changed what it counts: a hide or an undo on
// a For you or Discover row (design_handoff_the99_hide_commander README §2, "the Hidden tab's count moves with each
// hide"). The head is mounted once by the place's layout and the lists are its pages, so the two meet through a
// window event, as Collection's head hears a settled save (`COLLECTION_SAVED_EVENT`).

export const COMMANDER_COUNTS_STALE_EVENT = "the99:commander-counts-stale";

export function announceCommanderCountsStale() {
  window.dispatchEvent(new Event(COMMANDER_COUNTS_STALE_EVENT));
}
