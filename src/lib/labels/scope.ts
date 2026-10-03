/**
 * Which Commander-legal cards a labels build covers (`LABEL_SCOPE`).
 *
 * `all`, the default, is every Commander-legal card, as every build so far has run. `in-use` is the
 * cards something in the app can ask about: a commander's support list (single or partner pair), a
 * commander or partner slot (indexed or in a deck), a deck's cards, or anyone's collection. It is computed
 * fresh on every run, so a card that later enters a collection or a support list becomes eligible on the
 * next run rather than being left out for good.
 *
 * Measured on staging (2026-10-03): 32,116 cards for `all`, 28,666 for `in-use`.
 */
import { sql, type SQL } from "drizzle-orm";

export const LABEL_SCOPES = ["all", "in-use"] as const;
export type LabelScope = (typeof LABEL_SCOPES)[number];

/** The scope a run asked for. Unset is `all`; anything else unrecognised refuses, never falls back. */
export function parseScope(raw: string | undefined): LabelScope {
  if (raw === undefined || raw === "") return "all";
  if ((LABEL_SCOPES as readonly string[]).includes(raw)) return raw as LabelScope;
  throw new Error(`LABEL_SCOPE must be one of ${LABEL_SCOPES.join(", ")}, got ${JSON.stringify(raw)}`);
}

/**
 * The extra condition on `cards` (aliased `c`) a scope adds, or nothing for `all`. Every oracle id is
 * written out qualified, so no inner column can resolve against the outer table by accident.
 */
export function scopeCondition(scope: LabelScope): SQL {
  if (scope === "all") return sql``;
  return sql`and c.oracle_id in (
    select csc.oracle_id from commander_support_cards csc
    union select csc.commander_oracle_id from commander_support_cards csc
    union select cps.oracle_id from commander_pair_support_cards cps
    union select cps.commander_oracle_id from commander_pair_support_cards cps
    union select cps.partner_oracle_id from commander_pair_support_cards cps
    union select dc.oracle_id from deck_cards dc
    union select d.commander_oracle_id from decks d
    union select d.partner_oracle_id from decks d
    union select ci.oracle_id from collection_items ci
  )`;
}
