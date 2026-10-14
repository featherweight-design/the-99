import { reveal } from "../../lib/ui/reveal";

// Landing on the deck's Tokens group from card details (design D1, `Tokens ›`). The press closes the sheet,
// asks the deck to show its All view (the Tokens group is drawn only there), and once that has drawn,
// scrolls to the group's heading and focuses it. The deck's builder shell listens for the request; nothing
// else here knows where the filter lives.

export const SHOW_DECK_TOKENS = "the99:show-deck-tokens";
const HEADING = "deck-tokens-heading";

// The request outlives the event: from Shopping, Analysis or another panel the Tokens group is not mounted yet when
// the event fires (the shell answers it by switching to All), so the group, mounting afterwards, asks whether a
// request is still fresh. Long enough for the shell's switch and a render, short enough that a request never
// opens a group the reader reaches an hour later.
const FRESH_MS = 3000;
let requestedAt = Number.NEGATIVE_INFINITY;

/** True for a moment after `landOnDeckTokens`, for a Tokens group that mounted in answer to it. */
export function landingRequestedRecently(): boolean {
  return Date.now() - requestedAt < FRESH_MS;
}

export function landOnDeckTokens(): void {
  requestedAt = Date.now();
  window.dispatchEvent(new Event(SHOW_DECK_TOKENS));
  // Two frames: one for the sheet to be gone and the filter to commit, one for the group to be in the page.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const target = document.getElementById(HEADING);
    if (!target) return;
    reveal(target, "start");
    target.focus({ preventScroll: true });
  }));
}
