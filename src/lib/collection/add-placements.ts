// Where each copy an Add Cards save brought went (plan `plan-added-copy-2026-10-12`, PR 2). Pure,
// over the cards the write read inside its own transaction (`RaisedCard`).
import { arrivalPlacement, wentOf, type WentRow } from "./arrivals";
import { buildContestedCard } from "../decks/allocate";
import { addedCopyCopy } from "../copy/added-copy";
import { destinationDecks, longSentence, wentDestination } from "./copy-line";
import type { ContestedCard } from "./summary-read";
import type { RaisedCard } from "./write";

/**
 * One card an Add Cards save gave to a deck, or that brews read as theirs. `chooser` is the card
 * Change opens, built from the write's own read, so it opens with no fetch.
 */
export type AddedPlacement = { oracleId: string; cardName: string; went: WentRow; chooser: ContestedCard };

/** The cards a deck took or read, from the write's raised cards. A card no deck took is left out. */
export function placedOf(raised: Record<string, RaisedCard>, names: Record<string, string>): AddedPlacement[] {
  return Object.entries(raised).flatMap(([oracleId, r]) => {
    const went = wentOf(arrivalPlacement(r.after, r.brought, r.reservations), r.brought, Math.max(r.after.owned - r.brought, 0));
    if (went.kind === "none") return [];
    const cardName = names[oracleId] ?? "";
    return [{
      oracleId,
      cardName,
      went,
      chooser: buildContestedCard(oracleId, cardName, r.after, {
        arrived: r.brought, ownedBefore: went.ownedBefore, fromImport: true,
      }),
    }];
  });
}

/** One row of Add Cards' `Where it went` block, and the block's foot. */
export type WhereItWent = {
  /** `decks`: the deck names the sentence prints, which the line draws in `--fg`. */
  rows: { oracleId: string; cardName: string; sentence: string; decks: string[]; chooser: ContestedCard }[];
  /** The cards no deck needed (L9), said once under the rows; null when every card went somewhere. */
  foot: string | null;
};

/**
 * The block, in the sheet's own order (the list as the player built it). A card a deck took or read
 * gets a row in the long form; every other card is free, and the foot says so: by name when it is
 * the only one, as `the other N` under rows, and as `these` when no card went anywhere.
 */
export function whereItWent(lines: readonly { oracleId: string; name: string }[], placed: readonly AddedPlacement[]): WhereItWent {
  const byCard = new Map(placed.map((p) => [p.oracleId, p]));
  const seen = new Set<string>();
  const rows: WhereItWent["rows"] = [];
  const free: string[] = [];
  for (const line of lines) {
    if (seen.has(line.oracleId)) continue;
    seen.add(line.oracleId);
    const p = byCard.get(line.oracleId);
    const names = Object.fromEntries((p?.chooser.claimants ?? []).map((c) => [c.deckId, c.deckName]));
    const d = p ? wentDestination(p.went, names) : null;
    const cardName = p?.cardName || line.name;
    if (p && d) {
      rows.push({ oracleId: line.oracleId, cardName, sentence: longSentence(d, cardName), decks: destinationDecks(d), chooser: p.chooser });
    }
    else free.push(line.name);
  }
  const line = addedCopyCopy.line;
  const foot = free.length === 0 ? null
    : free.length === 1 ? line.nobodyOne(free[0])
      : rows.length > 0 ? line.nobodyRest(free.length) : line.nobodyMany;
  return { rows, foot };
}
