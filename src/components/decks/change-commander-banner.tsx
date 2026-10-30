"use client";
// A commander change's words on the review page and in Discard (handoff §4). The pending banner's
// own commander line retired with its card: the deck page's pending row counts the move as a change,
// and Review names it. Nothing here draws unless the draft's commander moved.

import type { DraftState } from "../../lib/decks/draft-shape";
import { changeCommanderCopy as copy } from "../../lib/copy/change-commander";
import type { CommanderPair } from "../../lib/commander-change/pending";

const ids = (p: CommanderPair) => [p.commanderOracleId, p.partnerOracleId].filter((id): id is string => id !== null);

/**
 * The hint a traded card's line carries in place of its usual one: the old commander, added to the
 * 99, came `from the command zone`; the new one, cut from it, went `to the command zone`. Null for
 * every other line, and always with no commander move.
 */
export function commanderZoneHint(state: DraftState, oracleId: string, added: boolean): string | null {
  if (!state.commander) return null;
  if (added && ids(state.commander.from).includes(oracleId)) return copy.banner.fromZone;
  if (!added && ids(state.commander.to).includes(oracleId)) return copy.banner.toZone;
  return null;
}

/** Discard's extra clause when the draft moved its commander: the old one leads again. */
export function commanderBackClause(state: DraftState): string | null {
  if (!state.commander) return null;
  const old = ids(state.commander.from).map((id) => (state.names.get(id) ?? "").split(" // ")[0].split(",")[0].trim());
  // A pair takes the plural (audit F9): two names do not share "leads".
  return old.length > 1 ? copy.discard.commanderBackPair(old[0], old[1]) : copy.discard.commanderBack(old[0]);
}
