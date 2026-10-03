/**
 * Which Commander-legal cards a labels build covers (`LABEL_SCOPE`).
 *
 * `all`, the default, is every Commander-legal card, as every build so far has run. `in-use` is the
 * cards a player's own lists reach: a commander's support list (single or partner pair), a commander or
 * partner slot (indexed or in a deck), a deck's cards, or anyone's collection. It is computed fresh on
 * every run, so a card that later enters a collection or a support list becomes eligible on the next run
 * rather than being left out for good.
 *
 * It is a TRADE, not a free saving. The swaps stand-in pool (`spellPool` in `src/lib/swaps/gather.ts`)
 * also offers any priced, unlisted Commander-legal card, and almost every card is priced, so an `in-use`
 * card set leaves those candidates unlabelled. Such a pair is compared by TEXT, since the labels path
 * needs both cards labelled: it degrades rather than breaks.
 *
 * Measured on staging (2026-10-03): 32,116 cards for `all`; 28,666 for `in-use`; 32,108 if priced cards
 * and format staples were added, which is why they are not.
 *
 * `deck:<id>` is the labels TRIAL (vocabulary plan, Task 6b): every card a cut on that deck could put
 * on the stand-ins sheet, before matching (`labelTrialPool` in `src/lib/swaps/gather.ts`). It has no
 * SQL condition of its own, because its set comes from that function; `scopeCondition` refuses it, so
 * a caller cannot forget to resolve it and label every card instead.
 */
import { sql, type SQL } from "drizzle-orm";

export const LABEL_SCOPES = ["all", "in-use"] as const;
export type LabelScope = (typeof LABEL_SCOPES)[number] | `deck:${string}`;

const DECK_SCOPE = /^deck:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** The deck a `deck:<id>` scope names, or null for any other scope. */
export function scopeDeck(scope: LabelScope): string | null {
  return DECK_SCOPE.exec(scope)?.[1] ?? null;
}

/** The scope a run asked for. Unset is `all`; anything else unrecognised refuses, never falls back. */
export function parseScope(raw: string | undefined): LabelScope {
  if (raw === undefined || raw === "") return "all";
  if ((LABEL_SCOPES as readonly string[]).includes(raw)) return raw as LabelScope;
  if (DECK_SCOPE.test(raw)) return raw as LabelScope;
  throw new Error(`LABEL_SCOPE must be one of ${LABEL_SCOPES.join(", ")} or deck:<uuid>, got ${JSON.stringify(raw)}`);
}

/**
 * The extra condition on `cards` (aliased `c`) a scope adds, or nothing for `all`. Every oracle id is
 * written out qualified, so no inner column can resolve against the outer table by accident.
 */
export function scopeCondition(scope: LabelScope): SQL {
  if (scope === "all") return sql``;
  if (scope !== "in-use") throw new Error(`${scope} has no SQL condition: resolve it with labelTrialPool first`);
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
