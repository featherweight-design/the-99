import type { CardCombo } from "./near-combos";
import type { ModalComboPartner } from "./near-miss";

/**
 * The card modal's combo block: what it shows, in what order, and how much of it.
 *
 * Pure, because every rule here is a judgement about a list rather than a fact about a
 * database — and because the cap was chosen against one collection's distribution and is a
 * one-line change if another says otherwise.
 */

/*
 * THE SIX/FOUR CAP AND ITS `+N more` ARE WITHDRAWN, and the reason is the closed row above
 * them: the cap existed to stop a fourteen-line block, and a block that is closed by default
 * already does. A reader who explicitly asked for the list is not served by a second
 * disclosure inside it.
 */

const STATE_RANK = { inDeck: 0, owned: 1, notOwned: 2 } as const;

/**
 * `in this deck`, then owned, then unowned; popularity inside each band.
 *
 * SO THE CAP NEVER HIDES A PARTNER ALREADY ON THE TABLE in favour of one you would have to
 * buy — the one truncation that would actually mislead. Popularity breaks ties within a band
 * and the partner's own id breaks the rest, so the order cannot move between two reads of an
 * unchanged collection.
 */
export function orderModalPartners(
  partners: readonly ModalComboPartner[],
): ModalComboPartner[] {
  return [...partners].sort(
    (a, b) =>
      STATE_RANK[a.state] - STATE_RANK[b.state] ||
      (b.popularity ?? -1) - (a.popularity ?? -1) ||
      (a.oracleId < b.oracleId ? -1 : a.oracleId > b.oracleId ? 1 : 0),
  );
}

/**
 * The closed row's counts, in the order it draws them.
 *
 * `in this deck` LEADS AND IS THE ONLY PART IN COLOUR, because it is the only part that is
 * ever urgent — a reader deciding whether to open the block is deciding whether they care,
 * and a partner already on the table is the fact that answers that.
 *
 * A STATE WITH A COUNT OF ZERO IS NOT DRAWN. `4 you don't` alone, or
 * `1 in this deck · 4 you don't`, never `0 you own` — a zero is a state the reader does not
 * have, and printing it spends a third of the line saying so.
 */
export function summariseByState(
  partners: readonly ModalComboPartner[],
): { state: ModalComboPartner["state"]; count: number }[] {
  const order = ["inDeck", "owned", "notOwned"] as const;
  return order
    .map((state) => ({ state, count: partners.filter((p) => p.state === state).length }))
    .filter((row) => row.count > 0);
}

/*
 * COMBOS ONE PIECE AWAY, UI-3: the same block drawn from `loadCardCombos`,
 * one line per two-card combo. The closed row's counts and the open list come from the SAME list
 * (OPEN-1), so the two can never name different sets.
 */

/** The order the where-line's buckets draw in outside `Whole in this deck` (OPEN-7). */
const WHERE_RANK = { inDeck: 0, spare: 1, elsewhere: 2, buy: 3 } as const;

/** One combo line as the block reads it: a variant and its other pieces (the partner, for a two-card combo). */
type ComboLine = Pick<CardCombo, "variantId" | "others">;

/**
 * Pure: one line per PARTNER, the first-ranked variant kept. Two variants pairing the same two cards
 * (Spellbook lists one per outcome or prerequisite set) would otherwise draw the same `with X` twice.
 * The read's order is kept, so the kept variant is the one `loadCardCombos` ranked first.
 */
export function onePerPartner<C extends ComboLine>(combos: readonly C[]): C[] {
  const seen = new Set<string>();
  return combos.filter((c) => {
    const key = c.others.map((p) => p.oracleId).sort().join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const partnerOf = (c: ComboLine) => c.others[0];

/** The bucket a line ranks in, cheapest first inside `buy` and an unpriced card after every priced one. */
function bucketRank(c: ComboLine): [number, number] {
  const where = partnerOf(c)?.where;
  if (!where) return [WHERE_RANK.buy, Number.POSITIVE_INFINITY];
  if (where.kind !== "buy") return [WHERE_RANK[where.kind], 0];
  return [WHERE_RANK.buy, where.cents ?? Number.POSITIVE_INFINITY];
}

/** Pure: by bucket (in the deck, spare, elsewhere, to buy cheapest first, unpriced last), stable inside one. */
export function byWhere<C extends ComboLine>(combos: readonly C[]): C[] {
  return [...combos].sort((a, b) => {
    const [ba, ca] = bucketRank(a);
    const [bb, cb] = bucketRank(b);
    return ba - bb || ca - cb;
  });
}

/**
 * Pure: the open block's lines (OPEN-6, OPEN-7). Split into `Whole in this deck` (the partner is in
 * the deck, in the read's order) and `One piece away · you hold the rest` (every other line, by
 * where) only when the deck in scope lists the card itself (`inScope`); otherwise one flat list by
 * where, an `in this deck` partner first. Deduped to one line per partner first (OPEN-1).
 */
export function groupCardCombos<C extends ComboLine>(
  combos: readonly C[],
  inScope: boolean,
): { split: true; whole: C[]; oneAway: C[] } | { split: false; flat: C[] } {
  const lines = onePerPartner(combos);
  if (!inScope) return { split: false, flat: byWhere(lines) };
  return {
    split: true,
    whole: lines.filter((c) => partnerOf(c)?.state === "inDeck"),
    oneAway: byWhere(lines.filter((c) => partnerOf(c)?.state !== "inDeck")),
  };
}

/**
 * Pure: the closed row's counts from the same deduped lines, in the shipped words and order: in the
 * deck, then owned (a spare or a copy in another deck), then not owned; a zero is not drawn.
 */
export function summariseCardCombos(
  combos: readonly ComboLine[],
): { state: ModalComboPartner["state"]; count: number }[] {
  const lines = onePerPartner(combos);
  const stateOf = (c: ComboLine): ModalComboPartner["state"] => {
    const s = partnerOf(c)?.state;
    return s === "inDeck" ? "inDeck" : s === "spare" || s === "elsewhere" ? "owned" : "notOwned";
  };
  return (["inDeck", "owned", "notOwned"] as const)
    .map((state) => ({ state, count: lines.filter((c) => stateOf(c) === state).length }))
    .filter((row) => row.count > 0);
}
