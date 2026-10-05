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
 * With `STAND_IN_LABELS_ENABLED` on and the original labelled, the unlisted half gains a second slice
 * of the same size, chosen by the original's labelled jobs (the run plan's Task 5).
 * The cheapest-first order is only used to choose that pool; every figure the sheet draws comes
 * from `loadPrices`, the same read the buy tag uses.
 */
import { sql } from "drizzle-orm";

import { db } from "../../db";
import { loadAvailability } from "../decks/availability-query";
import { loadPrices } from "../decks/price-query";
import { keyCreatureType } from "../recs/themes";
import { loadUniversalStaples } from "../staples/universal";
import { heldCardTypes, labelPatterns } from "../labels/match";
import { readLabels, standInLabelsEnabled } from "../labels/read";
import type { Job as LabelJob } from "../labels/types";
import { isLandFace } from "../cards/facet";
import { heldSubtypes } from "./honest";
import { jobOf, rankStandIns, STAND_IN_GROUP_CAP, type Candidate, type CardRow, type SpellRole, type StandInGroups } from "./stand-ins";

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
export const loadCreatureTypes = hourly(readCreatureTypes);
/**
 * Every noncreature subtype the catalog prints on an artifact, enchantment or land front face (Equipment,
 * Vehicle, Aura, Gate, Treasure): the words a swap reads as limiting a line to cards the deck may not hold
 * (E1, d9's N = 1 ruling). Planeswalker subtypes are names, not a kind of card a deck collects, so not here.
 */
export const loadNoncreatureSubtypes = hourly(readNoncreatureSubtypes);

/** An hour: a type list moves only with the weekly catalog refresh, and a read costs ~200ms. */
const TYPE_LIST_TTL_MS = 60 * 60 * 1000;
function hourly(read: () => Promise<Set<string>>): () => Promise<Set<string>> {
  let memo: { at: number; types: Promise<Set<string>> } | null = null;
  return () => {
    if (memo && Date.now() - memo.at < TYPE_LIST_TTL_MS) return memo.types;
    const types = read();
    memo = { at: Date.now(), types };
    // A failed read is not kept: the next caller reads again.
    types.catch(() => { if (memo?.types === types) memo = null; });
    return types;
  };
}

async function readCreatureTypes(): Promise<Set<string>> {
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

async function readNoncreatureSubtypes(): Promise<Set<string>> {
  const front = sql.raw(`split_part(type_line, ' // ', 1)`);
  const subtypes = sql.raw(`unnest(regexp_split_to_array(trim(split_part(split_part(type_line, ' // ', 1), ' — ', 2)), '\\s+'))`);
  const rows = await db.execute<{ t: string }>(sql`
    select distinct t from cards, ${subtypes} as t
    where commander_legal and ${front} ~* '\\m(land|artifact|enchantment)\\M' and ${front} !~* '\\m(creature|kindred|tribal)\\M' and t <> ''
  `);
  return new Set(rows.rows.map((r) => r.t));
}

/** Null when the deck is not this reader's, or the card is not in the catalog. */
/** `full` reads every stand-in of every group, for `Show all` on a group the first read capped. */
export async function loadStandIns(deckId: string, userId: string, cutOracleId: string, full: boolean): Promise<StandInsRead | null> {
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
    db.execute<{ oracle_id: string; name: string; color_identity: string[]; type_line: string; oracle_text: string | null }>(sql`
      select oracle_id, name, color_identity, type_line, oracle_text from cards where oracle_id = any(${sql.param(commanderIds)}::uuid[])
    `),
    // Type lines, text and copies too, for the deck's key creature type and the subtypes it holds (E1).
    db.execute<{ oracle_id: string; type_line: string; oracle_text: string | null; quantity: number }>(sql`
      select dc.oracle_id, c.type_line, c.oracle_text, dc.quantity from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
      where dc.deck_id = ${deckId}
    `),
    db.execute<Row>(sql`
      select oracle_id, name, type_line, oracle_text, keywords, cmc, image_uri, null::real as inclusion, null::real as synergy, null::int as owned
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

  // Off, no label is read and the pool and every comparison are the text path's, unchanged.
  const labelsOn = standInLabelsEnabled();
  const originalLabels: readonly LabelJob[] | undefined = labelsOn && !isLandFace(original.typeLine)
    ? (await readLabels([cutOracleId])).get(cutOracleId)
    : undefined;
  const job = jobOf(original);
  // Only a spell is matched on themes, so only a spell needs the type lists. A labelled original reads them
  // BEFORE the pool: its label slice is chosen from the jobs that count for this deck, as matching reads.
  const typeLists = () => Promise.all([loadCreatureTypes(), loadNoncreatureSubtypes()]);
  const early = originalLabels && job.kind !== "land" && job.kind !== "fetch" ? await typeLists() : null;
  const others = [...draftRows.rows, ...cmdrRows.rows].filter((r) => r.oracle_id !== cutOracleId);
  const lens = (creatureTypes: Set<string>, noncreatureSubtypes: Set<string>) => ({
    keyType: keyCreatureType(draftRows.rows.map((r) => ({ typeLine: r.type_line, quantity: Number(r.quantity) })), cmdrRows.rows.map((r) => r.type_line)),
    isSubtype: (w: string) => noncreatureSubtypes.has(w),
    // The card being replaced is leaving, so what it holds does not count (d9).
    held: heldSubtypes(others.map((r) => ({ typeLine: r.type_line, oracleText: r.oracle_text }))),
    heldTypes: heldCardTypes(others.map((r) => r.type_line)),
  });
  const patterns = originalLabels && early
    ? labelPatterns(originalLabels, lens(early[0], early[1]), (w) => early[0].has(w))
    : [];
  // A labelled spell whose text names no job still gets a spell pool, from its label slice alone;
  // whether its label does a job for this deck is `rankStandIns`'s call.
  const spell = job.kind === "spell" || (job.kind === "none" && patterns.length > 0);
  const [candidates, [creatureTypes, noncreatureSubtypes]] = await Promise.all([
    !spell && job.kind === "none" ? [] : db.execute<Row>(
      spell
        ? spellPool({
          deck, userId, identity, draft, mv: original.cmc, roles: job.kind === "spell" ? job.roles : [],
          labels: patterns, cut: cutOracleId, staples: sql.param([...staples]),
        })
        : landPool({ deck, userId, identity, draft, cut: cutOracleId }),
    ).then((r) => r.rows),
    early ?? (spell ? typeLists() : [new Set<string>(), new Set<string>()] as const),
  ]);

  const ownedIds = candidates.filter((r) => (r.owned ?? 0) > 0).map((r) => r.oracle_id);
  const [availability, priced, labels] = await Promise.all([
    ownedIds.length > 0 ? loadAvailability(userId, { oracleIds: ownedIds, excludeDeckId: deckId }) : new Map(),
    loadPrices([cutOracleId, ...candidates.map((r) => r.oracle_id)]),
    // The candidates' labels, beside the original's: a pair is compared by its labels only when both carry one.
    originalLabels
      ? readLabels(candidates.map((r) => r.oracle_id)).then((m) => m.set(cutOracleId, [...originalLabels]))
      : new Map<string, LabelJob[]>(),
  ]);

  const pool: Candidate[] = candidates.map((r) => {
    const a = availability.get(r.oracle_id);
    return {
      ...toCard(r),
      inclusion: r.inclusion === null ? null : Number(r.inclusion),
      synergy: r.synergy === null ? null : Number(r.synergy),
      isUniversal: staples.has(r.oracle_id),
      owned: Number(r.owned ?? 0),
      free: a ? a.free : null,
      soft: a ? a.soft : 0,
    };
  });

  return {
    ...rankStandIns(original, pool, priced, (w) => creatureTypes.has(w), full ? null : STAND_IN_GROUP_CAP,
      lens(creatureTypes, noncreatureSubtypes), labels),
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
  s.inclusion, s.synergy, o.owned`;

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

/**
 * The commander's list, the player's own copies, the cheapest unlisted cards (header), and every universal staple.
 * With `labels` (the switch on and the original labelled), a second unlisted slice by those labels beside the
 * text's. A label-only original has no role words, so its text slice is empty rather than everything.
 */
export function spellPool(a: PoolArgs & {
  mv: number;
  /** The original's roles, or `"any"` to drop the role-word filter (the labels trial's raw pool). */
  roles: SpellRole[] | "any";
  labels: readonly string[];
  staples: ReturnType<typeof sql.param>;
}) {
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
        and ${a.roles === "any" ? sql`true`
          : a.roles.length > 0 ? sql`split_part(u.oracle_text, E'\\n//\\n', 1) ~* ${roleWords(a.roles)}` : sql`false`}
      group by p.oracle_id
      -- Ties broken by NAME, the order the sheet draws within a price, so the pool is the first
      -- rows the sheet would show rather than a uuid-ordered slice of a large tie at the floor.
      order by min(coalesce(pp.price_cents, pp.price_cents_foil, pp.price_cents_etched)) asc, min(u.name)
      limit ${UNLISTED_POOL}
    )${a.labels.length > 0 ? sql`,
    -- The label slice (the run plan's Task 5): its own cheapest slice, by the original's labelled
    -- jobs, so a stand-in no role word finds can still reach the sheet. One containment per key.
    labelled as (
      select p.oracle_id
      from printing_prices pp
      join printings p on p.scryfall_id = pp.scryfall_id
      join cards u on u.oracle_id = p.oracle_id
      join card_labels cl on cl.oracle_id = u.oracle_id
      where pp.as_of = (select as_of from newest)
        and ${guards("u")}
        and u.color_identity <@ ${a.identity}::text[]
        and u.cmc <= ${a.mv}
        and u.oracle_id <> all(${a.draft}::uuid[])
        and (${sql.join(a.labels.map((pattern) => sql`cl.labels @> ${pattern}::jsonb`), sql` or `)})
      group by p.oracle_id
      order by min(coalesce(pp.price_cents, pp.price_cents_foil, pp.price_cents_etched)) asc, min(u.name)
      limit ${UNLISTED_POOL}
    )` : sql``}
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
        ${a.labels.length > 0 ? sql`or c.oracle_id in (select oracle_id from labelled)` : sql``}
        or c.oracle_id = any(${a.staples}::uuid[]))
  `;
}

/**
 * Every card a cut on this deck could put on the stand-ins sheet, BEFORE any card is matched: the
 * labels trial's card set (vocabulary plan, Task 6b), so the trial labels exactly what its
 * comparisons can read.
 *
 * It is built by the same `spellPool` `loadStandIns` reads, for every mana value a spell in the
 * deck has, as a union of two kinds of slice:
 *
 *   - ROLE-FREE: the cheapest unlisted spells with the role-word filter dropped. That filter runs
 *     before `jobOf` or `sameJob` see a card, so a pool chosen by it leaves out exactly the
 *     text-mismatched cards labels could newly admit, which are the cards the trial exists to judge.
 *   - ONE PER ROLE: each single role's own role-filtered slice, which is what the text path's sheet
 *     can show. The role-free slice alone is not enough: at a wide mana value the cheapest spells
 *     tie at the floor price and break by name, so a removal card inside the 600 cheapest removal
 *     cards can sit outside the 600 cheapest spells. A cut's slice filters on the UNION of its roles,
 *     and a card in the cheapest 600 of a union is in the cheapest 600 of each of its roles alone
 *     (fewer cards match one role), so the single-role slices cover every cut's.
 *
 * The commander's list, the player's own copies and the universal staples come with every slice.
 * The deck's own spells and its commanders are added, since a cut card is one side of every
 * comparison. A land cut is compared by text only (no label is read for one), so neither the land
 * pool nor the deck's lands are part of it. Nor is the label slice: it reads `card_labels`, so before a trial it is empty,
 * and after one it holds only cards this set already gave a label.
 *
 * Null when the deck does not exist.
 */
export async function labelTrialPool(deckId: string): Promise<string[] | null> {
  const deckRows = await db.execute<{ commander: string; partner: string | null; user_id: string }>(sql`
    select commander_oracle_id as commander, partner_oracle_id as partner, user_id from decks where id = ${deckId}
  `);
  const deck = deckRows.rows[0];
  if (!deck) return null;
  const commanderIds = deck.partner ? [deck.commander, deck.partner] : [deck.commander];
  const [cmdrRows, draftRows, staples] = await Promise.all([
    db.execute<{ color_identity: string[] }>(sql`
      select color_identity from cards where oracle_id = any(${sql.param(commanderIds)}::uuid[])
    `),
    db.execute<{ oracle_id: string; cmc: number; spell: boolean }>(sql`
      select dc.oracle_id, c.cmc, c.type_line !~* '^[^/]*\\mland\\M' as spell
      from deck_cards dc join cards c on c.oracle_id = dc.oracle_id where dc.deck_id = ${deckId}
    `),
    loadUniversalStaples(),
  ]);
  const identity = sql.param([...new Set(cmdrRows.rows.flatMap((r) => r.color_identity))]);
  const deckIds = draftRows.rows.map((r) => r.oracle_id);
  const draft = sql.param([...new Set([...deckIds, ...commanderIds])]);
  // The deck's SPELLS join the set; its lands do not, since no comparison reads a land's label.
  const deckSpells = draftRows.rows.filter((r) => r.spell).map((r) => r.oracle_id);
  const mvs = [...new Set(draftRows.rows.filter((r) => r.spell).map((r) => Number(r.cmc)))];
  const roleSets: (SpellRole[] | "any")[] = ["any", ...(Object.keys(ROLE_WORDS) as SpellRole[]).map((r) => [r])];
  const pools = await Promise.all(mvs.flatMap((mv) => roleSets.map((roles) => db.execute<{ oracle_id: string }>(spellPool({
    deck, userId: deck.user_id, identity, draft, mv, roles, labels: [],
    // The cut is excluded from its own pool; every deck card is added below, so any of them serves.
    cut: deck.commander, staples: sql.param([...staples]),
  })).then((r) => r.rows.map((x) => x.oracle_id)))));
  return [...new Set([...pools.flat(), ...deckSpells, ...commanderIds])].sort();
}
