/**
 * THE STAPLES A FILL SEEDS (H25, plan `2026-10-02-fill-includes-staples.md`, Hugh's rulings of
 * 2026-10-03). "Staple" is `format_staples`, the meaning it has everywhere a reader sees the word:
 * the universal staples (`universal.ts`), then the deck's own identity condition's rows at an
 * inclusion bar. The fill places them before its role pass, so a Sol Ring the player owns is never
 * again out-ranked by a zero-inclusion card that happens to close two floors.
 *
 * Three rulings live here rather than in the fill, so every reader of the rule reads one module:
 *
 * - THE BAR is the condition's `avg_inclusion` at 50 or more.
 * - COLORLESS, FOUR- AND FIVE-COLOR DECKS take universal staples only. The `count:3` bucket serves
 *   three-color decks alone; there is no `count:4` or `count:5` row, and a colorless deck's
 *   exact `C` key never reaches the table (`build-staples.ts`).
 * - A GAME CHANGER IS NEVER SEEDED, owned or not, whatever the deck's bracket answer. The step
 *   acts on the player's behalf, and a Game Changer is a bracket decision the player makes; the
 *   role pass may still pick one exactly as it always could.
 *
 * The cap (10 nonland) is the fill's, because only the fill knows which staples are lands.
 */
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../db";
import { cards } from "../../db/schema";
import { withinColorIdentity } from "../cards/identity-where";
import { STAPLE_PROJECTION } from "../decks/suggestions-read";
import type { FillCandidate } from "../decks/fill";
import { identityCondition, countCondition } from "./condition";
import { universalStaples } from "./universal";

/** A condition's row is a fill staple at this `avg_inclusion` (0-100) or above. */
export const FILL_STAPLE_INCLUSION_BAR = 50;

export type StapleRow = {
  oracleId: string;
  condition: string;
  avgInclusion: number;
  gameChanger: boolean;
};

/**
 * The condition whose rows a deck of this identity seeds beyond the universal staples, or null
 * for universal only. The exact identity where the table carries it (every mono and two-color
 * identity), `count:3` for a three-color deck without one.
 */
export function fillStapleCondition(identity: readonly string[], conditions: ReadonlySet<string>): string | null {
  const n = new Set(identity).size;
  if (n === 0 || n >= 4) return null;
  const exact = identityCondition([...new Set(identity)]);
  if (conditions.has(exact)) return exact;
  const count = countCondition(n);
  return conditions.has(count) ? count : null;
}

/**
 * The fill's staples for one identity, in the order the step offers them: universal first, by
 * their mean inclusion across conditions, then the condition's rows at the bar, by inclusion.
 * Pure. A Game Changer is dropped wherever it appears.
 */
export function chooseFillStaples(rows: readonly StapleRow[], identity: readonly string[]): string[] {
  const gameChangers = new Set(rows.filter((r) => r.gameChanger).map((r) => r.oracleId));
  const universal = universalStaples(rows);
  const meanOf = new Map<string, { sum: number; n: number }>();
  for (const r of rows) {
    if (!universal.has(r.oracleId)) continue;
    const m = meanOf.get(r.oracleId) ?? { sum: 0, n: 0 };
    m.sum += r.avgInclusion;
    m.n += 1;
    meanOf.set(r.oracleId, m);
  }
  const mean = (id: string) => { const m = meanOf.get(id)!; return m.sum / m.n; };
  const byFigure = (a: [string, number], b: [string, number]) => b[1] - a[1] || a[0].localeCompare(b[0]);
  const first = [...universal].map((id): [string, number] => [id, mean(id)]).sort(byFigure);

  const condition = fillStapleCondition(identity, new Set(rows.map((r) => r.condition)));
  const second = condition === null ? [] : rows
    .filter((r) => r.condition === condition && r.avgInclusion >= FILL_STAPLE_INCLUSION_BAR
      && !universal.has(r.oracleId))
    .map((r): [string, number] => [r.oracleId, r.avgInclusion])
    .sort(byFigure);

  return [...first, ...second].map(([id]) => id).filter((id) => !gameChangers.has(id));
}

type Reader = { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: unknown[] }> };

/** The fill's staples for an identity as the table holds them now, in offer order. */
export async function loadFillStaples(
  identity: readonly string[],
  on: Reader = db as unknown as Reader,
): Promise<string[]> {
  const { rows } = await on.execute(sql`
    select fs.oracle_id as "oracleId", fs.condition, fs.avg_inclusion as "avgInclusion",
           c.game_changer as "gameChanger"
    from format_staples fs
    join cards c on c.oracle_id = fs.oracle_id
  `);
  return chooseFillStaples(rows as StapleRow[], identity);
}

/**
 * The catalog rows for staples the pool does not hold, so the fill can offer an unowned one (and
 * buy it, outside `pool: "sleeveable"`). Commander-legal and inside the deck's identity, the same
 * two tests the unowned top-cards read applies.
 */
/** What the catalog read returns for one staple. */
export type StapleCard = Pick<
  FillCandidate, "oracleId" | "name" | "typeLine" | "oracleText" | "keywords" | "manaCost" | "layout"
>;

export async function loadStapleCards(
  oracleIds: readonly string[], identity: readonly string[],
): Promise<StapleCard[]> {
  if (oracleIds.length === 0) return [];
  return db
    .select(STAPLE_PROJECTION)
    .from(cards)
    .where(and(
      inArray(cards.oracleId, [...oracleIds]),
      eq(cards.commanderLegal, true),
      withinColorIdentity([...identity]),
    ));
}

/**
 * The staples one fill offers, as candidates, under every bound the fill's own pool is under (H25
 * §4.2): never a card the deck holds or the caller places (`excludeOracleIds`), never a commander,
 * and inside the allow-list when there is one. An owned staple is the scoped pool's own candidate,
 * so it carries the collection's facts; an unowned one is read from the catalog, and only when the
 * fill may buy (`sleeveableOnly` false). Offer order is `loadFillStaples`'s.
 *
 * The reads are injected so the rules here are unit tested without a database.
 */
export async function gatherFillStaples(
  args: {
    identity: readonly string[];
    scoped: readonly FillCandidate[];
    excludeOracleIds: ReadonlySet<string>;
    commanderIds: ReadonlySet<string>;
    onlyOracleIds?: ReadonlySet<string>;
    sleeveableOnly: boolean;
    inclusionOf: (name: string) => number | null;
  },
  reads: {
    staples: (identity: readonly string[]) => Promise<string[]>;
    cards: (ids: readonly string[], identity: readonly string[]) => Promise<StapleCard[]>;
  } = { staples: loadFillStaples, cards: loadStapleCards },
): Promise<FillCandidate[]> {
  const { identity, scoped, excludeOracleIds, commanderIds, onlyOracleIds, sleeveableOnly } = args;
  const ids = (await reads.staples(identity)).filter((id) =>
    !excludeOracleIds.has(id) && !commanderIds.has(id) && (!onlyOracleIds || onlyOracleIds.has(id)));
  const inScope = new Map(scoped.map((c) => [c.oracleId, c]));
  const missing = ids.filter((id) => !inScope.has(id));
  const fromCatalog = new Map(
    (sleeveableOnly || missing.length === 0 ? [] : await reads.cards(missing, identity))
      .map((c): [string, FillCandidate] => [c.oracleId, {
        oracleId: c.oracleId, name: c.name, typeLine: c.typeLine,
        oracleText: c.oracleText, keywords: c.keywords, manaCost: c.manaCost,
        layout: c.layout, owned: false, ownedQuantity: 0,
        inclusionPct: args.inclusionOf(c.name),
      }]),
  );
  return ids.flatMap((id) => {
    const c = inScope.get(id) ?? fromCatalog.get(id);
    return c ? [c] : [];
  });
}
