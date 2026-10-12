import { reveal } from "../../lib/ui/reveal";

// Landing on the deck's Tokens group from card details (design D1, `Tokens ›`). The press closes the sheet,
// asks the deck to show its All view (the Tokens group is drawn only there), and once that has drawn,
// scrolls to the group's heading and focuses it. The deck's builder shell listens for the request; nothing
// else here knows where the filter lives.

export const SHOW_DECK_TOKENS = "the99:show-deck-tokens";
const HEADING = "deck-tokens-heading";

export function landOnDeckTokens(): void {
  window.dispatchEvent(new Event(SHOW_DECK_TOKENS));
  // Two frames: one for the sheet to be gone and the filter to commit, one for the group to be in the page.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const target = document.getElementById(HEADING);
    if (!target) return;
    reveal(target, "start");
    target.focus({ preventScroll: true });
  }));
}
