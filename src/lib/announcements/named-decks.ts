/**
 * The decks a set's Collecting post names (addendum A2, #2981), set beside its posted early lists. The pure half, safe in a
 * client bundle: `loadAnnouncedDeckNames` (`collecting-read.ts`) reads the names, `filterAnnounced` hands them here.
 *
 * A name stands for a deck, never for a revealed commander: nothing says which commander is which box. A posted list takes
 * the slot of the name it matches (folded, as the precon list folds names); a list matching no name is a tile of its own,
 * after the names, so the count never falls short of what is drawn.
 */
import { fold } from "../precons/list";
import { earlyPosted, type EarlySet, type EarlyTile } from "./early-tiles";

/** One deck tile in a set's block: a posted list, or a deck whose list is still to come. */
export type DeckSlot = { kind: "list"; tile: EarlyTile } | { kind: "name"; name: string };

export type NamedDecks = {
  /** Every tile, in the Collecting post's order. Unfiltered. */
  slots: DeckSlot[];
  /** The decks the set is known to have: the names, or the posted lists when more. */
  decks: number;
};

/**
 * The set's deck tiles. A name whose list gave way to its release list (`releasedNames`) draws nothing: its list is on the
 * precon list now. Each posted list stands for one name at most.
 */
export function deckSlots(names: readonly string[], early: EarlySet | undefined): NamedDecks {
  const lists = early?.lists ?? [];
  const gone = [...(early?.releasedNames ?? [])].map(fold);
  const used = new Set<number>();
  const slots: DeckSlot[] = [];
  for (const name of names) {
    const key = fold(name);
    const at = lists.findIndex((l, i) => !used.has(i) && fold(l.name) === key);
    if (at >= 0) {
      used.add(at);
      slots.push({ kind: "list", tile: lists[at] });
      continue;
    }
    const left = gone.indexOf(key);
    if (left >= 0) gone.splice(left, 1);
    else slots.push({ kind: "name", name });
  }
  lists.forEach((tile, i) => {
    if (!used.has(i)) slots.push({ kind: "list", tile });
  });
  return { slots, decks: Math.max(names.length, earlyPosted(early)) };
}

/**
 * The slots the list's filters keep (`filterAnnounced`): a posted list as `filterEarly` kept it (`kept`), a named deck by
 * its name, and no named deck under a color filter, since it has no colors yet.
 */
export function filterSlots(
  slots: readonly DeckSlot[],
  kept: ReadonlySet<EarlyTile>,
  { q, colours }: { q: string; colours: readonly string[] },
  setMatches: boolean,
): DeckSlot[] {
  const needle = fold(q.trim());
  return slots.filter((s) => (s.kind === "list" ? kept.has(s.tile) : colours.length === 0 && (needle === "" || setMatches || fold(s.name).includes(needle))));
}
