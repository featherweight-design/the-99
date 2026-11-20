// The write half of the flip trail (`flip.ts` reads it): the Decks list records what the reader was looking at when it
// opened a deck. sessionStorage, so it belongs to this tab and dies with it; a browser that refuses it is absence.

import { FLIP_KEY, type FlipTrail } from "./flip";

export function writeFlipTrail(shown: readonly { id: string }[], caption: string, href: string): void {
  const trail: FlipTrail = { ids: shown.map((d) => d.id), caption, href };
  try {
    window.sessionStorage.setItem(FLIP_KEY, JSON.stringify(trail));
  } catch {
    // Storage is a convenience: with none, the deck page falls back to All decks.
  }
}
