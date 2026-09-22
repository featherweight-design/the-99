"use client";
// The quick-add bar's combo map: every card that would complete a two-card combo already
// half-built in this deck, read ONCE and then consulted per keystroke.
//
// Why a map and not a per-result read: see `loadDeckComboMap`. In short, the cost of the
// question is the deck's side of the index walk, which no keystroke changes, so asking per
// keystroke pays ~305ms to answer the same question again.
//
// FOUR RULES, each one a way the clause could otherwise lie or lag.
//
// 1. IT STARTS WHEN ASKED, NOT ON MOUNT. The bar is mounted on every deck page and most visits
//    never search. `start` is called when the field is first focused, which leaves the read
//    the length of two keystrokes, the 150ms debounce and the search's own round trip to land
//    in — normally longer than the read.
// 2. IT RE-READS WHEN THE DECK CHANGES, keyed on `deckKey`. The caller passes the SERVER
//    snapshot of the deck's cards, never the optimistic list: that snapshot moves only after
//    an add has committed and the page has revalidated, so the re-read sees the new deck. Keyed
//    on the optimistic list it would fire before the write landed and read the old deck.
//    Between a change and the re-read the previous map stays up. After an ADD that is safe: the
//    only clause an add can falsify is the added card's own, and that row reads `In deck` at
//    once and carries no mark (Matrix 4, "the partner itself"). After a REMOVAL it is not quite:
//    a clause can name the card just removed until the re-read lands. That window is one round
//    trip; what must never happen is the window becoming permanent, which is why a failed
//    re-read CLEARS the map rather than leaving the old one up (rule 4).
// 3. A MAP READ FOR ANOTHER DECK IS NEVER SHOWN. A route-param change reconciles rather than
//    remounts, so the previous deck's map would otherwise decorate the next deck's results
//    until its own read lands.
// 4. A FAILED READ DRAWS NO PARTNERS — including a failed RE-read, which clears a map already
//    held. Keeping it would decorate every result with a snapshot of a deck that no longer
//    exists, with nothing ever correcting it.

import { useCallback, useEffect, useState } from "react";
import { loadDeckComboMap } from "../../app/decks/[id]/combo-map-action";

export type DeckComboMap = Awaited<ReturnType<typeof loadDeckComboMap>>;

export function useDeckComboMap(
  deckId: string,
  /** Identifies the deck's committed contents; a change re-reads. See rule 2. */
  deckKey: string,
  /**
   * The read itself. Defaults to the server action; `/about` passes a resolver so its figure
   * draws the bar without a reference page reaching a server action — the same shape and the
   * same reason as the bar's `search`.
   */
  load: (deckId: string) => Promise<DeckComboMap> = loadDeckComboMap,
) {
  const [wanted, setWanted] = useState(false);
  const [held, setHeld] = useState<{ deckId: string; map: DeckComboMap } | null>(null);

  useEffect(() => {
    if (!wanted) return;
    let cancelled = false;
    load(deckId)
      .then((map) => {
        if (!cancelled) setHeld({ deckId, map });
      })
      // Decoration, like the search's availability read: a failed read leaves rows with no
      // clause, which is exactly what a card with no combo looks like, and never breaks the bar.
      // Cleared rather than left alone: see rule 4.
      .catch(() => {
        if (!cancelled) setHeld(null);
      });
    return () => {
      cancelled = true;
    };
    // `load` is a constant at every call site, like the bar's `search`; an inline resolver
    // would otherwise re-read on every render of the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [wanted, deckId, deckKey]);

  const start = useCallback(() => setWanted(true), []);
  const map = held && held.deckId === deckId ? held.map : null;
  return { map, start };
}
