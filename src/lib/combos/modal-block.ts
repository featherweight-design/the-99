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
