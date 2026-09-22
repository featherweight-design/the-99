import type { ModalComboPartner } from "./near-miss";

/**
 * The card modal's combo block: what it shows, in what order, and how much of it.
 *
 * Pure, because every rule here is a judgement about a list rather than a fact about a
 * database — and because the cap was chosen against one collection's distribution and is a
 * one-line change if another says otherwise.
 */

/** Cap before the shipped disclosure takes over. Desktop 6, phone 4. */
export const MODAL_COMBO_CAP_DESKTOP = 6;
export const MODAL_COMBO_CAP_PHONE = 4;

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
 * How many lines to draw, and how many are left over.
 *
 * Measured on the reference collection: median 2 partners, 49% have exactly one, and 21 of
 * 249 owned pieces exceed ten. So the common case shows everything with no disclosure at all,
 * and the cap exists for the 8% that would otherwise open a modal twenty lines tall.
 *
 * `hidden` is a fact about WHAT IS NOT DRAWN, which is why `+N more` is legal where a count in
 * the heading is not: detection excludes template-gated variants by design, so
 * `Two-card combos · 14` would be a claim about what EXISTS and this is not.
 */
export function capModalPartners(
  partners: readonly ModalComboPartner[],
  args: { desktop: boolean; expanded: boolean },
): { shown: ModalComboPartner[]; hidden: number } {
  const ordered = orderModalPartners(partners);
  if (args.expanded) return { shown: ordered, hidden: 0 };
  const cap = args.desktop ? MODAL_COMBO_CAP_DESKTOP : MODAL_COMBO_CAP_PHONE;
  // A list exactly at the cap draws in full rather than showing `+0 more`, which would be a
  // disclosure that discloses nothing.
  if (ordered.length <= cap) return { shown: ordered, hidden: 0 };
  return { shown: ordered.slice(0, cap), hidden: ordered.length - cap };
}
