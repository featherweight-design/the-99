import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, deckCards, decks } from "../../db/schema";
import type { Availability } from "../decks/availability";
import { loadAvailability } from "../decks/availability-query";
import { deckIdentity } from "../decks/format";
import { cheapestNow, loadPrices } from "../decks/price-query";
import { isMandatoryLoop } from "../spellbook/combo-features";
import {
  addableMissingPiece,
  anySizeComboQuery,
  byVariantId,
  pickTop,
  type ComboPieceRow,
} from "../synopsis/combo-facts";
import { nearCombosEnabled } from "./flag";

/**
 * SERVER-ONLY. The combos a deck is exactly one piece away from, and where that piece is (plan
 * `2026-10-22-near-combos-backend.md`, read A). Behind `NEAR_COMBOS_ENABLED`; no surface draws it
 * until Design prompt 17.
 *
 * "One piece away" is `addableMissingPiece`, the rule the Overview's facts use, over the same
 * `anySizeComboQuery`: a template-free, counted combo of 2 to 6 pieces whose one missing piece the
 * deck could add (not command-zone-only, legal, inside the commanders' identity).
 */

/** Where the missing piece is, for this reader. Exactly one per piece. */
export type MissingPieceWhere =
  /** The reader owns a copy no deck claims. */
  | { kind: "spare" }
  /** Every owned copy is claimed: these are the decks holding it. */
  | { kind: "elsewhere"; decks: { id: string; name: string }[] }
  /** Not owned. `cents` is the buy tag's figure, null when no printing is stocked. */
  | { kind: "buy"; cents: number | null };

export type NearComboPiece = { oracleId: string; name: string; held: boolean };

export type NearCombo = {
  variantId: string;
  /** Every piece, the missing one included, by name. */
  pieces: NearComboPiece[];
  missing: { oracleId: string; name: string; where: MissingPieceWhere };
  produces: string[];
  /** Spellbook's steps, newline-separated. */
  steps: string | null;
  manaNeeded: string | null;
  manaValueNeeded: number | null;
  notablePrerequisites: string | null;
  /** A held piece is one of the deck's commanders. */
  usesCommander: boolean;
};

/** The ranked top of the list, and how many there were before the cap. */
export type NearCombos = { combos: NearCombo[]; total: number };

/** The read's default cap. Staging's decks run to 54 two-piece and 182 three-piece near combos. */
export const NEAR_COMBOS_CAP = 20;

const EMPTY: NearCombos = { combos: [], total: 0 };

/** A near combo before its missing piece has been placed. */
export type NearComboCandidate = Omit<NearCombo, "missing"> & { missing: { oracleId: string; name: string } };

/** Pure: every near combo in the query's rows, full detail, unranked and unplaced. */
export function shapeNearCombos(
  rows: readonly ComboPieceRow[],
  identity: readonly string[],
  commanderIds: readonly string[],
): NearComboCandidate[] {
  const out: NearComboCandidate[] = [];
  for (const [variantId, pieces] of byVariantId(rows)) {
    const m = addableMissingPiece(pieces, identity);
    if (!m) continue;
    const first = pieces[0];
    out.push({
      variantId,
      pieces: [...pieces]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ oracleId: p.oracle_id, name: p.name, held: p.held })),
      missing: { oracleId: m.oracle_id, name: m.name },
      produces: first.produces,
      steps: first.steps ?? null,
      manaNeeded: first.mana_needed ?? null,
      manaValueNeeded: first.mana_value_needed,
      notablePrerequisites: first.notable_prerequisites ?? null,
      usesCommander: pieces.some((p) => p.held && commanderIds.includes(p.oracle_id)),
    });
  }
  return out;
}

/**
 * Pure: where one card is for this reader, from its availability (read from the deck's own
 * vantage, so the deck's draft never claims it) and its buy tag's figure. A copy no deck claims is
 * a spare however many other copies are claimed; owning every copy claimed is `elsewhere`.
 */
export function whereIs(availability: Availability | undefined, cents: number | null): MissingPieceWhere {
  if (!availability || availability.owned <= 0) return { kind: "buy", cents };
  if (availability.free > 0) return { kind: "spare" };
  return { kind: "elsewhere", decks: availability.claims.map(({ id, name }) => ({ id, name })) };
}

/** The bucket a missing piece ranks in: spare, elsewhere, a priced buy, an unpriced buy. */
function bucketOf(w: MissingPieceWhere): number {
  if (w.kind === "spare") return 0;
  if (w.kind === "elsewhere") return 1;
  return w.cents === null ? 3 : 2;
}

const centsOf = (c: NearCombo) => (c.missing.where.kind === "buy" ? (c.missing.where.cents ?? 0) : 0);

/**
 * Pure: the top `cap`, bucket by bucket (spare, elsewhere, priced buy, unpriced buy), so a piece
 * the reader holds always outranks one to buy. Inside a bucket, one combo per distinct outcome
 * leads, as the Overview's list does, then the rest; each part cheapest first, then the Overview's
 * combo order (fewest pieces, free mana, uses the commander, lower mana).
 */
export function rankNearCombos(list: readonly NearCombo[], cap: number): NearCombos {
  const sig = (produces: readonly string[]) => [...produces].sort().join("|");
  const rank = (c: NearCombo) => ({ pieces: c.pieces.length, mana: c.manaValueNeeded, commander: c.usesCommander, id: c.variantId, sig: sig(c.produces), mandatory: isMandatoryLoop(c.produces) });
  const ranked = [0, 1, 2, 3].flatMap((bucket) =>
    pickTop(list.filter((c) => bucketOf(c.missing.where) === bucket), rank, Infinity, (a, b) => centsOf(a) - centsOf(b)),
  );
  return { combos: ranked.slice(0, cap), total: list.length };
}

/**
 * Read A. The reader's own deck only: a deck id that is not theirs reads as empty. Empty too while
 * the switch is off, without a query.
 */
export async function loadNearCombos(args: {
  userId: string;
  deckId: string;
  env: NodeJS.ProcessEnv;
  cap?: number;
}): Promise<NearCombos> {
  if (!nearCombosEnabled(args.env)) return EMPTY;
  const [deck] = await db
    .select({ commander: decks.commanderOracleId, partner: decks.partnerOracleId })
    .from(decks)
    .where(and(eq(decks.id, args.deckId), eq(decks.userId, args.userId)));
  if (!deck?.commander) return EMPTY;
  const commanders = [deck.commander, ...(deck.partner ? [deck.partner] : [])];
  const [list, identities] = await Promise.all([
    db.select({ oracleId: deckCards.oracleId }).from(deckCards).where(eq(deckCards.deckId, args.deckId)),
    db.select({ oracleId: cards.oracleId, identity: cards.colorIdentity }).from(cards).where(inArray(cards.oracleId, commanders)),
  ]);
  const identityOf = (id: string | null) => identities.find((c) => c.oracleId === id)?.identity ?? [];
  const identity = deckIdentity(identityOf(deck.commander), deck.partner ? identityOf(deck.partner) : null);
  const present = [...new Set([...list.map((c) => c.oracleId), ...commanders])];

  const rows = (await db.execute(anySizeComboQuery(present, commanders))).rows as ComboPieceRow[];
  const candidates = shapeNearCombos(rows, identity, commanders);
  if (candidates.length === 0) return EMPTY;

  const missingIds = [...new Set(candidates.map((c) => c.missing.oracleId))];
  const [availability, prices] = await Promise.all([
    loadAvailability(args.userId, { oracleIds: missingIds, excludeDeckId: args.deckId, env: args.env }),
    loadPrices(missingIds),
  ]);
  const placed: NearCombo[] = candidates.map((c) => ({
    ...c,
    missing: { ...c.missing, where: whereIs(availability.get(c.missing.oracleId), cheapestNow(prices, c.missing.oracleId)) },
  }));
  return rankNearCombos(placed, args.cap ?? NEAR_COMBOS_CAP);
}
