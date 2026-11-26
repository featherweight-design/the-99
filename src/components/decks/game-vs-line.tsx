// The seat's name and `sub` line, from the SNAPSHOT the game was logged with: a friend by name with their deck or commander,
// anyone by their name or commander. Nothing here reads a friend's live rows: a removed friend and a renamed deck read
// exactly as they were logged. Drawn by `seats-grid.tsx`.

import type { GameOpponent } from "../../lib/decks/game-opponents";
import type { ThirdPartyName } from "../../lib/person-name";

const shortName = (name: string) => name.split(",")[0].trim();

/** The name and the `· sub` a seat reads as: a friend by name with their deck or commander, anyone by their name or commander. */
export function vsParts(seat: GameOpponent): { name: string | ThirdPartyName; sub: string | ThirdPartyName | null } {
  // A pair keeps both names, as the Matchups rows do.
  const commander = seat.commander ? (seat.partner ? `${shortName(seat.commander.name)} + ${shortName(seat.partner.name)}` : shortName(seat.commander.name)) : null;
  if (seat.friend) return { name: seat.friend.name, sub: seat.deckName ?? commander };
  if (seat.label) return { name: seat.label, sub: commander };
  return { name: commander ?? "?", sub: null };
}
