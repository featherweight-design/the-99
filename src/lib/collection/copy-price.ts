// Moved to `src/lib/cards/copy-price.ts` (public landing demo split 5a): the copy price rules are pure, and a surface a
// signed-out visitor sees may not reach `src/lib/decks/` or `src/lib/collection/`. This re-export keeps every caller where it is.
export * from "../cards/copy-price";
