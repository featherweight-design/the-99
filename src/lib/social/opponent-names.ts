// A saved game opponent's names, as they leave the owner's own `deck_game_opponents` rows. The rows SNAPSHOT another
// reader's name (`friendNameThen`), a friend's deck name (`deckNameThen`) and, for a non-friend seated from a Rule 0
// table, that player's display name as a plain `label` (`seatLabel` in `rule-zero-log.ts`). All three are a person's
// name, so they are minted here, in the cross-user read layer, and the decks module that assembles a seat never mints.
//
// A `label` is minted whatever put it there: the column holds both a table seat's saved name and a name the owner typed
// ("Sam"), and nothing in the row tells them apart. Marking the owner's own typed label as well is the safe side: it
// costs only an opt-out from autocapture on a line the owner reads.
import type { ThirdPartyName } from "../person-name/brand";
import { named } from "../person-name/mint";

/** The name a saved seat carries for a friend, a friend's deck or a non-friend's label; null stays null. */
export function savedName(value: string): ThirdPartyName;
export function savedName(value: string | null): ThirdPartyName | null;
export function savedName(value: string | null): ThirdPartyName | null {
  return value === null ? null : named(value);
}
