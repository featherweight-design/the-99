import { holdsCopy, type Availability } from "../decks/availability";

/** A deck holding a copy. `committed` is a sleeved version; otherwise a brew given a copy. */
export type HoldingDeck = { id: string; name: string; committed: boolean };

/**
 * The decks HOLDING a copy (`holdsCopy`: committed decks and brews given one, never a draft that
 * only asks), committed first and otherwise in the query's order, so a surface naming one deck
 * names the first committed one (combos-close G4).
 */
export function holdingDecks(availability: Pick<Availability, "claims">): HoldingDeck[] {
  const held = availability.claims.filter(holdsCopy).map((c) => ({ id: c.id, name: c.name, committed: c.mature }));
  return [...held.filter((d) => d.committed), ...held.filter((d) => !d.committed)];
}
