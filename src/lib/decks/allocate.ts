// Moved to `src/lib/cards/allocate.ts` (public landing demo split 5j): the allocation arithmetic is pure, and the card detail blocks a
// signed-out visitor sees may not reach `src/lib/decks/`. This re-export keeps every caller where it is.
export * from "../cards/allocate";
