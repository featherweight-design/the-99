/**
 * The stand-ins for one card on one deck, read from the database and ranked by `rankStandIns`.
 *
 * GUARDS FIRST, IN SQL (brief §5): every candidate is legal in Commander, inside the commanders'
 * color identity, and not already in the draft. A basic is the exception: a deck runs many of one,
 * so a Forest already in the draft is still a Forest a take can add (and it is always free). What a candidate is FOR (its colors, the types it
 * finds, its roles) is decided in `stand-ins.ts` over its text, never here.
 *
 * THE SPELL POOL IS BOUNDED, and that is a cost decision rather than a rule. Roughly 19,000 legal
 * spells at mana value 4 or less mention a role's words, and reading them all is ~3 MB of oracle
 * text per open. What the sheet can show is smaller: the commander's own support list (ordered by
 * its figure), the player's own copies (free ones lead), and the cheapest unlisted cards. So the
 * pool is exactly those three, with the unlisted half cut to the `UNLISTED_POOL` cheapest live
 * cards whose text carries a role's words; `rankStandIns` then keeps the ones that share a role.
 * The cheapest-first order is only used to choose that pool; every figure the sheet draws comes
 * from `loadPrices`, the same read the buy tag uses.
 */
import { sql } from "drizzle-orm";

import { db } from "../../db";
import { loadAvailability } from "../decks/availability-query";
import { loadPrices } from "../decks/price-query";
import { loadUniversalStaples } from "../staples/universal";
import { jobOf, rankStandIns, type Candidate, type CardRow, type SpellRole, type StandInGroups } from "./stand-ins";

/** How many of the cheapest unlisted spells are read before roles are checked. */
export const UNLISTED_POOL = 600;

/**
 * Each role's words, for choosing the unlisted pool only: `classifyRoles` decides membership, and
 * these keep the pool's places for cards of the ORIGINAL's roles. Postgres word boundaries (`\m`,
 * `\M`), because a bare `get` is inside every "target" and a bare `counter` inside every
 * "+1/+1 counter". `stand-ins-pool.test.ts` asserts each admits every text `classifyRoles` gives
 * that role, and refuses the near misses.
 */
export const ROLE_WORDS: Record<SpellRole, string> = {
  ramp: "\\madds?\\M|search your library for [^.]*\\mland",
  draw: "\\mdraws? (a|one|two|three|four|x) cards?\\M",
  removal: "\\m(destroy|exile|counter) target\\M|damage to (any target|target creature)|\\mtarget creature gets [-−]",
  wipes: "\\m(destroy|exile) all\\M|\\mall creatures get [-−]",
};

/** The pool's words for a set of roles, as one Postgres regular expression. */
export function roleWords(roles: readonly SpellRole[]): string {
  return roles.map((r) => `(${ROLE_WORDS[r]})`).join("|");
}

type Row = {
  oracle_id: string;
  name: string;
  type_line: string;
  oracle_text: string | null;
  keywords: string[];
  cmc: number;
  image_uri: string | null;
  inclusion: number | null;
  synergy: number | null;
  listed: boolean;
  owned: number | null;
};

const toCard = (r: Row): CardRow => ({
  oracleId: r.oracle_id, name: r.name, typeLine: r.type_line, oracleText: r.oracle_text,
  keywords: r.keywords ?? [], cmc: Number(r.cmc), imageUri: r.image_uri,
});

export type StandInsRead = StandInGroups & {
  original: CardRow;
  /** The commander names the figure belongs to: one, or a pair in the deck's own order. */
  commanders: string[];
  /** The newest price run, for the sheet's foot. */
  newestAsOf: Date | null;
};

/**
 * Every creature subtype the catalog prints, off front faces (`creatureSubtypes` in SQL): the tribal
 * theme's vocabulary, read from the Commander-legal catalog so a new set's type arrives with the weekly
 * refresh. The regex escapes are doubled: a template literal cooks `\m` to `m`, and `sql` sends the cooked text.
 */
export async function loadCreatureTypes(): Promise<Set<string>> {
  // A subtype on an artifact, enchantment or land that is not a creature is that card type's own
  // (Equipment, Treasure, Food, Saga, Forest), even where a creature also carries it (Dryad Arbor is a
  // Land Creature — Forest Dryad). Measured on staging: nine words, none of them a creature type.
  const front = sql.raw(`split_part(type_line, ' // ', 1)`);
  const subtypes = sql.raw(`unnest(regexp_split_to_array(trim(split_part(split_part(type_line, ' // ', 1), ' — ', 2)), '\\s+'))`);
  const rows = await db.execute<{ t: string }>(sql`
    select distinct t from cards, ${subtypes} as t
    where commander_legal and ${front} ~* '\\mcreature\\M' and t <> ''
      and t not in (
        select u from cards, ${subtypes} as u
        where ${front} ~* '\\m(land|artifact|enchantment)\\M' and ${front} !~* '\\m(creature|kindred|tribal)\\M'
      )
  `);
  return new Set(rows.rows.map((r) => r.t));
}

/** Null when the deck is not this reader's, or the card is not in the catalog. */
export async function loadStandIns(deckId: string, userId: string, cutOracleId: string): Promise<StandInsRead | null> {
  const deckRows = await db.execute<{ commander: string; partner: string | null }>(sql`
    select commander_oracle_id as commander, partner_oracle_id as partner
    from decks where id = ${deckId} and user_id = ${userId}
  `);
  const deck = deckRows.rows[0];
  if (!deck) return null;
  const commanderIds = deck.partner ? [deck.commander, deck.partner] : [deck.commander];

  // Read first, because the spell pool admits every staple by id (H4): one the commander's list
  // does not carry, and the price slice does not reach, would otherwise never be ranked at all.
  const [cmdrRows, draftRows, originalRows, staples] = await Promise.all([
    db.execute<{ oracle_id: string; name: string; color_identity: string[] }>(sql`
      select oracle_id, name, color_identity from cards where oracle_id = any(${sql.param(commanderIds)}::uuid[])
    `),
    db.execute<{ oracle_id: string }>(sql`select oracle_id from deck_cards where deck_id = ${deckId}`),
    db.execute<Row>(sql`
      select oracle_id, name, type_line, oracle_text, keywords, cmc, image_uri, null::real as inclusion, null::real as synergy, false as listed, null::int as owned
      from cards where oracle_id = ${cutOracleId}
    `),
    loadUniversalStaples(),
  ]);
  const originalRow = originalRows.rows[0];
  if (!originalRow) return null;
  const original = toCard(originalRow);

  const names = new Map(cmdrRows.rows.map((r) => [r.oracle_id, r.name]));
  const commanders = commanderIds.map((id) => names.get(id) ?? "");
  const identity = sql.param([...new Set(cmdrRows.rows.flatMap((r) => r.color_identity))]);
  const draft = sql.param([...new Set([...draftRows.rows.map((r) => r.oracle_id), ...commanderIds])]);

  const job = jobOf(original);
  const [candidates, creatureTypes] = await Promise.all([
    job.kind === "none" ? [] : db.execute<Row>(
      job.kind === "spell"
        ? spellPool({ deck, userId, identity, draft, mv: job.mv, roles: job.roles, cut: cutOracleId, staples: sql.param([...staples]) })
        : landPool({ deck, userId, identity, draft, cut: cutOracleId }),
    ).then((r) => r.rows),
    // Only a spell is matched on themes, so only a spell needs the tribal theme's type list.
    job.kind === "spell" ? loadCreatureTypes() : new Set<string>(),
  ]);

  const ownedIds = candidates.filter((r) => (r.owned ?? 0) > 0).map((r) => r.oracle_id);
  const [availability, priced] = await Promise.all([
    ownedIds.length > 0 ? loadAvailability(userId, { oracleIds: ownedIds, excludeDeckId: deckId }) : new Map(),
    loadPrices([cutOracleId, ...candidates.map((r) => r.oracle_id)]),
  ]);

  const pool: Candidate[] = candidates.map((r) => {
    const a = availability.get(r.oracle_id);
    return {
      ...toCard(r),
      inclusion: r.inclusion === null ? null : Number(r.inclusion),
      synergy: r.synergy === null ? null : Number(r.synergy),
      listed: r.listed,
      isUniversal: staples.has(r.oracle_id),
      owned: Number(r.owned ?? 0),
      free: a ? a.free : null,
      soft: a ? a.soft : 0,
    };
  });

  return {
    ...rankStandIns(original, pool, priced, (w) => creatureTypes.has(w)),
    original,
    commanders,
    newestAsOf: priced.newestAsOf,
  };
}

type PoolArgs = {
  deck: { commander: string; partner: string | null };
  userId: string;
  identity: ReturnType<typeof sql.param>;
  draft: ReturnType<typeof sql.param>;
  cut: string;
};

/**
 * The commander's figure for a card: its own support list, or the PAIR's for a partner deck. The
 * pair table stores the lower id first, and a deck stores its primary first, so the key is
 * normalised here rather than trusted.
 */
function inclusionJoin(deck: PoolArgs["deck"]) {
  return deck.partner
    ? sql`left join commander_pair_support_cards s
        on s.commander_oracle_id = least(${deck.commander}::uuid, ${deck.partner}::uuid)
       and s.partner_oracle_id = greatest(${deck.commander}::uuid, ${deck.partner}::uuid)
       and s.oracle_id = c.oracle_id`
    : sql`left join commander_support_cards s
        on s.commander_oracle_id = ${deck.commander}::uuid and s.oracle_id = c.oracle_id`;
}

function ownedJoin(userId: string) {
  return sql`left join (
    select oracle_id, sum(quantity)::int as owned from collection_items where user_id = ${userId} group by oracle_id
  ) o on o.oracle_id = c.oracle_id`;
}

const COLUMNS = sql`c.oracle_id, c.name, c.type_line, c.oracle_text, c.keywords, c.cmc, c.image_uri,
  s.inclusion, s.synergy, (s.oracle_id is not null) as listed, o.owned`;

/** Every legal land inside the identity: 1,112 in the whole catalog, so no bound is needed. */
function landPool(a: PoolArgs) {
  return sql`
    select ${COLUMNS}
    from cards c
    ${inclusionJoin(a.deck)}
    ${ownedJoin(a.userId)}
    where c.commander_legal
      and c.color_identity <@ ${a.identity}::text[]
      and c.type_line ~* '^[^/]*\\mland\\M'
      and (c.oracle_id <> all(${a.draft}::uuid[]) or c.type_line ~* '\\mbasic\\M')
      and c.oracle_id <> ${a.cut}::uuid
  `;
}

/** The commander's list, the player's own copies, the cheapest unlisted cards (header), and every universal staple. */
function spellPool(a: PoolArgs & { mv: number; roles: SpellRole[]; staples: ReturnType<typeof sql.param> }) {
  const guards = (alias: string) => sql.raw(`
    ${alias}.commander_legal
    and ${alias}.type_line !~* '^[^/]*\\mland\\M'
  `);
  return sql`
    with newest as (select max(as_of) as as_of from printing_prices),
    unlisted as (
      select p.oracle_id
      from printing_prices pp
      join printings p on p.scryfall_id = pp.scryfall_id
      join cards u on u.oracle_id = p.oracle_id
      where pp.as_of = (select as_of from newest)
        and ${guards("u")}
        and u.color_identity <@ ${a.identity}::text[]
        and u.cmc <= ${a.mv}
        and u.oracle_id <> all(${a.draft}::uuid[])
        -- The FRONT face's text, as the role reader reads it: a spell whose back face is a land
        -- would otherwise spend a place on words only its back face carries.
        and split_part(u.oracle_text, E'\\n//\\n', 1) ~* ${roleWords(a.roles)}
      group by p.oracle_id
      -- Ties broken by NAME, the order the sheet draws within a price, so the pool is the first
      -- rows the sheet would show rather than a uuid-ordered slice of a large tie at the floor.
      order by min(coalesce(pp.price_cents, pp.price_cents_foil, pp.price_cents_etched)) asc, min(u.name)
      limit ${UNLISTED_POOL}
    )
    select ${COLUMNS}
    from cards c
    ${inclusionJoin(a.deck)}
    ${ownedJoin(a.userId)}
    where ${guards("c")}
      and c.color_identity <@ ${a.identity}::text[]
      and c.cmc <= ${a.mv}
      and (c.oracle_id <> all(${a.draft}::uuid[]) or c.type_line ~* '\\mbasic\\M')
      and c.oracle_id <> ${a.cut}::uuid
      -- Every universal staple is admitted by id, under the same guards: it is the one card the
      -- sheet names as a staple, so leaving it to the price slice would drop it silently (H4).
      and (s.oracle_id is not null or coalesce(o.owned, 0) > 0 or c.oracle_id in (select oracle_id from unlisted)
        or c.oracle_id = any(${a.staples}::uuid[]))
  `;
}
