// Moved to `src/lib/cards/price-fact.ts` (public landing demo split 5a): the price on the buy tag rules are pure, and a surface a
// signed-out visitor sees may not reach `src/lib/decks/` or `src/lib/collection/`. This re-export keeps every caller where it is.
export * from "../cards/price-fact";
