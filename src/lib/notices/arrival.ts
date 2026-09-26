/**
 * The URL a deck page is asked to open its Notices sheet with. The /decks tile's `!` links here,
 * so the reader lands on the notices the mark was pointing at rather than on the deck with no
 * word of them. The deck page reads it on arrival and strips it with `history.replaceState`, so a
 * refresh or a back step does not open the sheet again.
 */
export const NOTICES_PARAM = "notices";

export function noticesHref(deckId: string): string {
  return `/decks/${deckId}?${NOTICES_PARAM}=1`;
}

/** Whether a query value asks for the sheet. Only `1`: anything else is a URL nobody here writes. */
export function readNoticesArrival(value: string | string[] | undefined): boolean {
  return value === "1";
}
