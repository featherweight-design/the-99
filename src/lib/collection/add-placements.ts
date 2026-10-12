// Where each copy an Add Cards save brought went (plan `plan-added-copy-2026-10-12`, PR 2). Pure,
// over the cards the write read inside its own transaction (`RaisedCard`).
import { arrivalPlacement, wentOf, type WentRow } from "./arrivals";
import { buildContestedCard } from "../decks/allocate";
import { addedCopyCopy } from "../copy/added-copy";
import { liveTook, longParts, longSentence, wentDestination, type SentencePart } from "./copy-line";
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
  /** `parts`: the sentence cut at the names it prints, which the line draws in `--fg`. */
  rows: { oracleId: string; cardName: string; sentence: string; parts: SentencePart[]; chooser: ContestedCard }[];
  /** The copies no deck needed (L9), said once under the rows; null when every copy went somewhere. */
  foot: string | null;
};

/**
 * The block, in the sheet's own order (the list as the player built it). A card a deck took or read
 * gets a row in the long form. Every COPY is accounted for: a card's copies are summed over its
 * lines, and the copies no deck took (all of a card with no row, the rest of a card whose decks
 * took fewer than were added) are free, and the foot says so: by name when they are one card's and
 * that card has no row, as `the other N` copies under rows, and as `these` when no card went
 * anywhere. A brew's row already says its card is free, so a soft card leaves nothing for the foot.
 *
 * `live` is the card a row's Change last read back (null: the copies went in another tab), so the
 * foot counts what each row's decks hold NOW: a free copy given to a brew is not free any more, and
 * a cleared pick can leave one free. The rows keep their frozen sentences; each line redraws its own.
 */
export function whereItWent(
  lines: readonly { oracleId: string; name: string; quantity: number }[], placed: readonly AddedPlacement[],
  live: Readonly<Record<string, ContestedCard | null>> = {},
): WhereItWent {
  const byCard = new Map(placed.map((p) => [p.oracleId, p]));
  const added = new Map<string, number>();
  for (const l of lines) added.set(l.oracleId, (added.get(l.oracleId) ?? 0) + Math.max(l.quantity, 0));
  const seen = new Set<string>();
  const rows: WhereItWent["rows"] = [];
  const free: { name: string; copies: number; whole: boolean }[] = [];
  for (const line of lines) {
    if (seen.has(line.oracleId)) continue;
    seen.add(line.oracleId);
    const copies = added.get(line.oracleId) ?? 0;
    const p = byCard.get(line.oracleId);
    const names = Object.fromEntries((p?.chooser.claimants ?? []).map((c) => [c.deckId, c.deckName]));
    const d = p ? wentDestination(p.went, names) : null;
    const cardName = p?.cardName || line.name;
    if (p && d) {
      rows.push({ oracleId: line.oracleId, cardName, sentence: longSentence(d, cardName), parts: longParts(d, cardName), chooser: p.chooser });
      const now = live[line.oracleId];
      const took = now === undefined ? (p.went.kind === "held" ? p.went.decks.reduce((n, x) => n + x.copies, 0) : copies)
        : now === null ? copies
          : ((t) => (t.decks.length > 0 ? t.decks.reduce((n, x) => n + x.copies, 0) : t.brews.length > 0 ? copies : 0))(liveTook(now));
      if (copies > took) free.push({ name: line.name, copies: copies - took, whole: false });
    }
    else if (copies > 0) free.push({ name: line.name, copies, whole: true });
  }
  const line = addedCopyCopy.line;
  const total = free.reduce((n, f) => n + f.copies, 0);
  // One copy left over from a card with a row has no sentence of its own (`the other 1` is not
  // English): it is named, as a lone free card is.
  const foot = total === 0 ? null
    : free.length === 1 && (free[0].whole || total === 1) ? line.nobodyOne(free[0].name)
      : rows.length > 0 ? line.nobodyRest(total) : line.nobodyMany;
  return { rows, foot };
}
