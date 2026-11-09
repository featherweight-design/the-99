// What the Try it start and end cards need before any data is loaded: six of the binder's cards, picture and name. The landing
// page draws the section on the server and hands the client only this, so the ~650 KB fixture stays out of the page's payload
// and loads when a visitor presses Start (`demo.tsx`).
import type { Projected } from "./projected";

export type DemoArtCard = { src: string; name: string };

/** The first six cards of the binder that have a distinct picture, in the grid's own order: the start fan takes three, the end fan the next three. */
export function demoArt(data: Pick<Projected, "collection">): DemoArtCard[] {
  // Unique pictures only: two printings of a card can share an image, and the same one drawn twice reads as a bug.
  const seen = new Set<string>();
  return data.collection.cards.flatMap((card) => {
    if (!card.imageUri || seen.has(card.imageUri)) return [];
    seen.add(card.imageUri);
    return [{ src: card.imageUri, name: card.name }];
  }).slice(0, 6);
}

/** The fan a card draws: the first three, or on the end the next three (the first three again when the binder shows fewer than six). */
export function fanOf(art: readonly DemoArtCard[], which: "start" | "end"): DemoArtCard[] {
  return which === "end" && art.length >= 6 ? art.slice(3, 6) : art.slice(0, 3);
}
