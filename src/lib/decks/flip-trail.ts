// The write half of the flip trail (`flip.ts` reads it): the Decks list records what the reader was looking at when it
// opened a deck. sessionStorage, so it belongs to this tab and dies with it; a browser that refuses it is absence.

import { FLIP_KEY, parseTrail, type FlipTrail } from "./flip";

function save(trail: FlipTrail): void {
  try {
    window.sessionStorage.setItem(FLIP_KEY, JSON.stringify(trail));
  } catch {
    // Storage is a convenience: with none, the deck page falls back to All decks.
  }
}

/** A press on a deck tile: the list as shown, and the deck it opened as the chain's first. */
export function writeFlipTrail(shown: readonly { id: string }[], caption: string, href: string, openedId: string): void {
  save({ ids: shown.map((d) => d.id), caption, href, at: Date.now(), seen: [openedId] });
}

/** The decks a flip can reach next are the chain's too: pressing a square, or Back, lands on one that is still the list's. */
export function extendFlipTrail(raw: string | null, ids: readonly string[]): void {
  const trail = parseTrail(raw);
  if (!trail || ids.every((i) => trail.seen.includes(i))) return;
  save({ ...trail, seen: [...new Set([...trail.seen, ...ids])] });
}
