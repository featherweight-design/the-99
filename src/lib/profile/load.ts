import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../db";
import {
  cards,
  commanderPairSupport,
  commanderSupport,
  deckCards,
  decks,
  formatStaples,
  identityComposition,
  spellbookVariantCards,
  spellbookVariants,
} from "../../db/schema";
import { loadBracketFlags } from "../bracket/flags-read";
import { EXTRA_TURN_DETECTION, MLD_DETECTION } from "../bracket/oracle-rules";
import { classifySearches, tutorReaches } from "../bracket/tutor-targets";
import { cacheForUser } from "../cache/user-lists";
import { canonicalPair } from "../edhrec/pair";
import { COMBO_DETECTION, isInfiniteOrGameEnding } from "../spellbook/combo-features";
import { countCondition, identityCondition } from "../staples/condition";
import { buildDeckProfile, pickRoleTargets, type ProfileCardRow, type ProfileInput } from "./build";
import { roleTargetsFrom } from "./role-targets";
import { profileFingerprint } from "./fingerprint";
import type {
  BracketPopulation,
  ComboRef,
  CompositionTargets,
  DeckProfile,
  FlagSource,
  StapleRef,
  ProfileSkeleton,
} from "./types";

/**
 * SERVER-ONLY. Imports the Drizzle client and `node:crypto` through the fingerprint; nothing
 * a `"use client"` component can value-import may reach this file.
 *
 * `loadDeckProfile` is `loadProfileHead` + `loadDeckProfileFromHead`, so the probe calls the
 * uncached whole and the cached wrapper shares every line of it.
 */

/** The deck's own inputs — everything the fingerprint reads, and nothing else. */
export type ProfileHead = {
  deckId: string;
  userId: string;
  commanderOracleId: string;
  partnerOracleId: string | null;
  declaredBracket: number | null;
  cards: { oracleId: string; quantity: number }[];
};

/**
 * The deck row plus `deck_cards`, and nothing expensive.
 *
 * `deck_cards` plus the two commander columns ARE the draft — there is no separate staged
 * table — so this is the live deck rather than its last committed version.
 *
 * Returns null when the deck is not the reader's, which is the same refusal `loadDeckStats`
 * makes. Ownership is in the `where`, not a check afterwards: a row fetched and then rejected
 * has already been read.
 */
export async function loadProfileHead(
  deckId: string,
  userId: string,
): Promise<ProfileHead | null> {
  // ONE read-only `repeatable read` transaction, because these two reads ARE the fingerprint.
  // Read apart, an edit landing between them gives a head whose commander columns and card
  // list come from different instants — a deck state that never existed — and the profile is
  // then filed under a key describing it. `loadDraftState` takes the same snapshot for the
  // same reason.
  return db.transaction((tx) => readProfileHead(tx, deckId, userId), {
    isolationLevel: "repeatable read",
    accessMode: "read only",
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The head's two reads, on a transaction the CALLER holds.
 *
 * Exported so a reader that compares the head against something else can take both from one
 * snapshot: `stored.ts` checks the fingerprint against a stored row, and a head read in its own
 * transaction would let an edit commit between the two and pair the edited deck with the
 * analysis of the deck before it.
 */
export async function readProfileHead(
  tx: Tx,
  deckId: string,
  userId: string,
): Promise<ProfileHead | null> {
  const [deck] = await tx
    .select({
      commanderOracleId: decks.commanderOracleId,
      partnerOracleId: decks.partnerOracleId,
      declaredBracket: decks.declaredBracket,
    })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  if (!deck) return null;

  const rows = await tx
    .select({ oracleId: deckCards.oracleId, quantity: deckCards.quantity })
    .from(deckCards)
    .where(eq(deckCards.deckId, deckId));

  return { deckId, userId, ...deck, cards: rows };
}

/**
 * Whether the verdict COUNTS a combo, as far as the combo itself can say: two cards, no template
 * piece, two distinct pieces (§4.3b's deck-independent half), and a result `isInfiniteOrGameEnding`
 * accepts. The deck-dependent half (a `must_be_commander` piece must BE a commander, the rest must
 * be held) is `assembledCombosQuery`'s, and the deck notices apply it on read.
 *
 * ONE RULE, TWO CALLERS: the loader below filters its rows through it, and the Combo refresh diffs
 * the counted set with it (deck notices plan D7), so a notice cannot describe a combo the verdict
 * would not count. The query's SQL already enforces the first three clauses for the loader.
 */
export function isCountedCombo(v: {
  cardCount: number;
  requiresTemplateIds: readonly unknown[];
  pieces: readonly string[];
  produces: readonly string[];
}): boolean {
  return v.cardCount === 2
    && v.requiresTemplateIds.length === 0
    && new Set(v.pieces).size === 2
    && isInfiniteOrGameEnding(v.produces);
}

/**
 * The assembled-combo query, extracted so its emitted SQL can be pinned.
 *
 * All three of §4.3b's rules live in this text rather than in any TypeScript a unit test
 * could reach, and it is handwritten with manual aliases — `oracle_id` appears on three
 * relations here, which is exactly the shape AGENTS.md's correlated-subquery section warns
 * about. `load.test.ts` renders THIS function, so the assertion and the query cannot drift.
 */
export function assembledCombosQuery(ids: readonly string[], commanders: readonly string[]) {
  return sql`
      select v.variant_id, v.bracket_tag, v.produces,
             v.mana_needed, v.mana_value_needed, v.steps, v.notable_prerequisites,
             array_agg(vc.oracle_id order by vc.oracle_id) as pieces,
             bool_or(vc.oracle_id = any(${sql.param([...commanders])}::uuid[])) as uses_commander
      from ${spellbookVariants} v
      join ${spellbookVariantCards} vc on vc.variant_id = v.variant_id
      -- RULE 1: a template-gated variant names a CATEGORY of card ("a creature with
      -- flying"), not a card, so a decklist cannot be said to assemble it.
      where v.card_count = 2
        and cardinality(v.requires_template_ids) = 0
        -- Prune before the group: without this every two-card variant in the index is
        -- aggregated and then thrown away.
        and exists (select 1 from ${spellbookVariantCards} vc2
                    where vc2.variant_id = v.variant_id
                      and vc2.oracle_id = any(${sql.param([...ids])}::uuid[]))
      -- GROUPED ON THE PRIMARY KEY ALONE. Every other column of spellbook_variants is
      -- functionally dependent on it, which Postgres recognises for a grouped PK, so naming
      -- them here would only widen the aggregate key -- and steps averages 395 characters
      -- against a max of 754, so it would widen it by a lot. The same defect was fixed in
      -- completionsQuery one review round earlier and this half was missed; both reads draw
      -- into the same modal. No backticks in here: this is inside a template literal.
      group by v.variant_id
      -- TWO ROWS, not merely a card_count of 2. That column keeps UPSTREAM's own uses
      -- length while spellbook_variant_cards is deduped by oracle id, so a variant naming
      -- one card twice passes the column test, aggregates to a single piece, and a deck
      -- holding that ONE card would be reported as assembling a two-card combo — the exact
      -- over-slot to bracket 4 the §4.3b rules exist to prevent. Latent rather than live:
      -- the current bulk has no such variant. This makes it stay that way.
      having count(*) = 2
        -- RULE 2: a piece flagged must_be_commander only works from the command zone, so
        -- holding it in the 99 assembles nothing. RULE 3: the commanders count as held.
        and bool_and(case when vc.must_be_commander
                          then vc.oracle_id = any(${sql.param([...commanders])}::uuid[])
                          else vc.oracle_id = any(${sql.param([...ids])}::uuid[]) end)`;
}

/** The two-card combos this deck ASSEMBLES, by the three §4.3b rules. */
export async function loadAssembledCombos(
  deckOracleIds: readonly string[],
  commanderOracleIds: readonly string[],
): Promise<ComboRef[]> {
  const ids = [...new Set([...deckOracleIds, ...commanderOracleIds])];
  if (ids.length === 0) return [];
  const commanders = [...commanderOracleIds];

  const rows = (await db.execute(assembledCombosQuery(ids, commanders))).rows as {
    variant_id: string; bracket_tag: string | null; produces: string[];
    pieces: string[]; uses_commander: boolean;
    mana_needed: string | null; mana_value_needed: number | null;
    steps: string | null; notable_prerequisites: string | null;
  }[];


  // CARD COUNT IS NEVER THE TEST. A two-card variant producing "infinite squirrels" is not a
  // combo this system counts; `isInfiniteOrGameEnding` reads what it produces.
  // The query admitted only two-card, template-free, two-piece rows, so those are stated as such.
  const kept = rows.filter((r) =>
    isCountedCombo({ cardCount: 2, requiresTemplateIds: [], pieces: r.pieces, produces: r.produces }));
  if (kept.length === 0) return [];

  const names = await nameMap(kept.flatMap((r) => r.pieces));
  return kept.map((r) => ({
    variantId: r.variant_id,
    cards: r.pieces.map((oracleId) => ({ oracleId, name: names.get(oracleId) ?? oracleId })),
    produces: r.produces,
    bracketTag: r.bracket_tag ?? "",
    usesCommander: r.uses_commander,
    // `?? null` on each, never `|| null`: a mana value of 0 is the answer for most combos and
    // coercing it would claim the cost is unknown on the very rows where it is known to be
    // nothing.
    manaValueNeeded: r.mana_value_needed ?? null,
    manaNeeded: r.mana_needed ?? null,
    steps: r.steps ?? null,
    notablePrerequisites: r.notable_prerequisites ?? null,
  }));
}

async function nameMap(oracleIds: readonly string[]): Promise<Map<string, string>> {
  const unique = [...new Set(oracleIds)];
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({ oracleId: cards.oracleId, name: cards.name })
    .from(cards)
    .where(inArray(cards.oracleId, unique));
  return new Map(rows.map((r) => [r.oracleId, r.name]));
}

type CompositionRow = {
  avgLand: number | null; avgBasic: number | null; avgNonbasic: number | null;
  avgCreature: number | null; avgInstant: number | null; avgSorcery: number | null;
  avgArtifact: number | null; avgEnchantment: number | null;
  avgPlaneswalker: number | null; avgBattle: number | null;
  avgCurve: Record<string, number> | null;
  avgRamp: number | null; avgDraw: number | null;
  avgRemoval: number | null; avgWipes: number | null;
  /** Only `identity_composition` carries these two; the commander and pair rows omit them. */
  thin?: boolean;
  /**
   * How many commanders in this bucket carried role figures.
   *
   * REQUIRED to read that bucket's role targets, and the null check below cannot stand in for
   * it: `identity_composition.avg_ramp` and its three siblings are `NOT NULL DEFAULT 0`, where
   * the commander and pair columns are nullable. So a bucket derived before the role pass
   * existed reads back four honest-looking zeroes rather than nulls, and a check on nullity
   * alone would accept them — stopping the chain at `identity` or `count` with a measurement
   * nobody took, exactly where it should fall through to the asserted `flat` targets.
   */
  withRoles?: number;
};

/** ALL-OR-NOTHING, the same rule the parser and the pair reader apply: a 0 substituted for a
 *  null turns "we do not know" into a real count. */
function compositionFrom(row: CompositionRow | undefined) {
  if (!row) return null;
  const targets = {
    land: row.avgLand, basic: row.avgBasic, nonbasic: row.avgNonbasic,
    creature: row.avgCreature, instant: row.avgInstant, sorcery: row.avgSorcery,
    artifact: row.avgArtifact, enchantment: row.avgEnchantment,
    planeswalker: row.avgPlaneswalker, battle: row.avgBattle,
  };
  // Finite for the same reason the role figures are: a non-finite land target does not give a
  // wrong ceiling, it gives NO ceiling, and the land sweeps then run until the collection is
  // exhausted. `deck-size.ts` guards that too — both ends, because this one is the root.
  if (Object.values(targets).some((v) => typeof v !== "number" || !Number.isFinite(v))) {
    return null;
  }
  return { targets: targets as CompositionTargets, averageCurve: row.avgCurve };
}


/**
 * The expensive half. Builds FROM the head's rows and NEVER re-reads `deck_cards`.
 *
 * That is the cache wrapper's correctness, not a micro-optimisation: a re-read inside the
 * cached closure could see an edit made after the head read, and would then file a profile
 * built from the NEW contents under the OLD fingerprint — a wrong answer served until the
 * ceiling expires. The head already holds `(oracleId, quantity)`, so this joins `cards` by
 * those ids.
 */
export async function loadDeckProfileFromHead(head: ProfileHead): Promise<DeckProfile> {
  const commanderIds = [
    head.commanderOracleId,
    ...(head.partnerOracleId ? [head.partnerOracleId] : []),
  ];
  const allIds = [...new Set([...head.cards.map((c) => c.oracleId), ...commanderIds])];

  const cardRows = allIds.length
    ? await db
        .select({
          oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
          layout: cards.layout,
          oracleText: cards.oracleText, keywords: cards.keywords, cmc: cards.cmc,
          colorIdentity: cards.colorIdentity, manaCost: cards.manaCost,
          commanderLegal: cards.commanderLegal, gameChanger: cards.gameChanger,
        })
        .from(cards)
        .where(inArray(cards.oracleId, allIds))
    : [];

  const byId = new Map(cardRows.map((r) => [r.oracleId, r]));
  const quantities = new Map(head.cards.map((c) => [c.oracleId, c.quantity]));

  // THE COMMANDERS ARE APPENDED HERE, before any flag or classifier pass, so nothing
  // downstream has to remember them. A commander that is also a `deck_cards` row keeps its
  // own quantity rather than being counted twice — `uniqueRefs` dedupes the receipts, and
  // this dedupes the rows.
  const rows: ProfileCardRow[] = [];
  const seen = new Set<string>();
  for (const oracleId of [...head.cards.map((c) => c.oracleId), ...commanderIds]) {
    if (seen.has(oracleId)) continue;
    const card = byId.get(oracleId);
    if (!card) continue;
    seen.add(oracleId);
    rows.push({
      oracleId: card.oracleId,
      name: card.name,
      layout: card.layout ?? "normal",
      typeLine: card.typeLine ?? "",
      oracleText: card.oracleText,
      keywords: card.keywords ?? [],
      cmc: card.cmc ?? 0,
      colorIdentity: card.colorIdentity ?? [],
      manaCost: card.manaCost,
      quantity: quantities.get(oracleId) ?? 1,
      commanderLegal: card.commanderLegal ?? false,
    });
  }

  const identity = byId.get(head.commanderOracleId)?.colorIdentity ?? [];
  const partnerIdentity = head.partnerOracleId
    ? (byId.get(head.partnerOracleId)?.colorIdentity ?? [])
    : [];
  const combinedIdentity = [...new Set([...identity, ...partnerIdentity])];
  const exactCondition = identityCondition(combinedIdentity);

  const [flags, combos, pairRow, commanderRow] = await Promise.all([
    loadBracketFlags(allIds),
    loadAssembledCombos(
      head.cards.map((c) => c.oracleId),
      commanderIds,
    ),
    head.partnerOracleId ? loadPairRow(head.commanderOracleId, head.partnerOracleId) : null,
    loadCommanderRow(head.commanderOracleId),
  ]);
  // `population` still needs the two rows; the skeleton is assembled from its own reads.

  // THE BASIS CHAIN, as four cheap keyed reads. First hit wins, and the discriminant travels
  // with the data — see `ProfileSkeleton`.
  const { candidates, condition, staples, commanderDeckCount } =
    await loadSkeletonForCommanders(
      head.commanderOracleId, head.partnerOracleId ?? null, combinedIdentity,
      // The rows this function already read, so the skeleton and the population describe one
      // snapshot and the profile pays for two queries rather than four.
      { pairRow, commanderRow },
    );

  const mldFlags = new Map<string, FlagSource[]>();
  const extraTurnFlags = new Map<string, FlagSource[]>();
  for (const [oracleId, f] of flags) {
    if (f.massLandDenial) mldFlags.set(oracleId, f.massLandDenialSources as FlagSource[]);
    if (f.extraTurn) extraTurnFlags.set(oracleId, f.extraTurnSources as FlagSource[]);
  }

  // THE SEARCHES, classified here rather than in the builder, so the builder stays pure, and
  // split in two. A TUTOR (`isTutorTarget`) can find something other than a land; it is what
  // `comboReach.tutors` lists and what the tutors finding counts. A LAND SEARCH can find only
  // a land (Evolving Wilds, Crop Rotation): Hugh ruled on 2026-09-22 that it is ramp, not a
  // tutor, so it is never counted. It still REACHES, though, because a land can be a combo
  // piece (`Crop Rotation` finds `Dark Depths`), and reach is a question about what a search
  // can find, not about what the card is called. So both sets feed the pairing, and only the
  // first is named. The split is `classifySearches`, where it has a unit test.
  const { tutorIds, landSearchIds, targets: tutorTargets } = classifySearches(rows);

  const input: ProfileInput = {
    deckId: head.deckId,
    fingerprint: profileFingerprint(head),
    cards: rows,
    commanderOracleIds: commanderIds,
    identity: combinedIdentity,
    condition,
    // All four candidate rungs, the role rungs and the bucket caveat, from the one place that
    // reads them — so the CREATE path and this one cannot drift about what a deck is measured
    // against. The first-hit selection is still `build.ts`'s `skeleton()`.
    ...candidates,
    staples,
    commanderDeckCount,
    population: populationFrom(pairRow, commanderRow),
    mldFlags,
    extraTurnFlags,
    gameChangerIds: new Set(cardRows.filter((r) => r.gameChanger).map((r) => r.oracleId)),
    twoCardCombos: combos,
    tutorIds,
    landSearchIds,
    // The reach predicate travels with the ids, so the builder pairs a tutor with a piece
    // only where the tutor can actually find it. Without this every tutor "reaches" every
    // piece, which is a receipt nobody can check and an overstatement on every deck.
    tutorReaches: (tutorId, piece) => {
      const target = tutorTargets.get(tutorId);
      return target ? tutorReaches(target, piece) : false;
    },
    detection: {
      massLandDenial: MLD_DETECTION,
      extraTurn: EXTRA_TURN_DETECTION,
      twoCardCombos: COMBO_DETECTION,
    },
  };

  return buildDeckProfile(input);
}

function populationFrom(
  pair: PairRow | null,
  commander: CommanderRow | null,
): BracketPopulation | null {
  const source = pair ?? commander;
  if (!source) return null;
  const raw = source.bracketCounts ?? {};
  const counts = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } as Record<
    "1" | "2" | "3" | "4" | "5",
    number
  >;
  let declaredTotal = 0;
  for (const key of ["1", "2", "3", "4", "5"] as const) {
    const value = Number(raw[key] ?? 0);
    if (!Number.isFinite(value)) continue;
    counts[key] = value;
    declaredTotal += value;
  }
  // Absent, not zero. EDHREC has no counts at all for some commanders, and a zeroed histogram
  // reads as "nobody declared" rather than "we do not know".
  if (declaredTotal === 0) return null;
  return {
    counts,
    declaredTotal,
    deckCount: source.deckCount,
    of: pair ? "pair" : "commander",
  };
}

type CommanderRow = CompositionRow & {
  deckCount: number | null;
  bracketCounts: Record<string, number> | null;
};
type PairRow = CommanderRow;

const COMPOSITION_COLUMNS = {
  avgLand: commanderSupport.avgLand, avgBasic: commanderSupport.avgBasic,
  avgNonbasic: commanderSupport.avgNonbasic, avgCreature: commanderSupport.avgCreature,
  avgInstant: commanderSupport.avgInstant, avgSorcery: commanderSupport.avgSorcery,
  avgArtifact: commanderSupport.avgArtifact, avgEnchantment: commanderSupport.avgEnchantment,
  avgPlaneswalker: commanderSupport.avgPlaneswalker, avgBattle: commanderSupport.avgBattle,
  avgCurve: commanderSupport.avgCurve,
  avgRamp: commanderSupport.avgRamp, avgDraw: commanderSupport.avgDraw,
  avgRemoval: commanderSupport.avgRemoval, avgWipes: commanderSupport.avgWipes,
} as const;

async function loadCommanderRow(oracleId: string): Promise<CommanderRow | null> {
  const [row] = await db
    .select({
      ...COMPOSITION_COLUMNS,
      deckCount: commanderSupport.deckCount,
      bracketCounts: commanderSupport.bracketCounts,
    })
    .from(commanderSupport)
    .where(eq(commanderSupport.commanderOracleId, oracleId));
  return row ?? null;
}

async function loadPairRow(a: string, b: string): Promise<PairRow | null> {
  // CANONICAL ON THE READ, not only the write. `decks` stores the pair in a meaningful order
  // — the primary commander first — while the table stores it canonically, so passing the
  // deck's own column order straight through misses every row whose primary carries the
  // larger id, silently and forever.
  const pair = canonicalPair(a, b);
  const [row] = await db
    .select({
      avgLand: commanderPairSupport.avgLand, avgBasic: commanderPairSupport.avgBasic,
      avgNonbasic: commanderPairSupport.avgNonbasic,
      avgCreature: commanderPairSupport.avgCreature,
      avgInstant: commanderPairSupport.avgInstant,
      avgSorcery: commanderPairSupport.avgSorcery,
      avgArtifact: commanderPairSupport.avgArtifact,
      avgEnchantment: commanderPairSupport.avgEnchantment,
      avgPlaneswalker: commanderPairSupport.avgPlaneswalker,
      avgBattle: commanderPairSupport.avgBattle,
      avgCurve: commanderPairSupport.avgCurve,
      avgRamp: commanderPairSupport.avgRamp, avgDraw: commanderPairSupport.avgDraw,
      avgRemoval: commanderPairSupport.avgRemoval, avgWipes: commanderPairSupport.avgWipes,
      deckCount: commanderPairSupport.deckCount,
      bracketCounts: commanderPairSupport.bracketCounts,
    })
    .from(commanderPairSupport)
    .where(
      and(
        eq(commanderPairSupport.commanderOracleId, pair.commanderOracleId),
        eq(commanderPairSupport.partnerOracleId, pair.partnerOracleId),
      ),
    );
  return row ?? null;
}

async function loadCompositionRow(condition: string): Promise<CompositionRow | null> {
  const [row] = await db
    .select({
      avgLand: identityComposition.avgLand, avgBasic: identityComposition.avgBasic,
      avgNonbasic: identityComposition.avgNonbasic,
      avgCreature: identityComposition.avgCreature,
      avgInstant: identityComposition.avgInstant,
      avgSorcery: identityComposition.avgSorcery,
      avgArtifact: identityComposition.avgArtifact,
      avgEnchantment: identityComposition.avgEnchantment,
      avgPlaneswalker: identityComposition.avgPlaneswalker,
      avgBattle: identityComposition.avgBattle,
      avgCurve: identityComposition.avgCurve,
      avgRamp: identityComposition.avgRamp, avgDraw: identityComposition.avgDraw,
      avgRemoval: identityComposition.avgRemoval, avgWipes: identityComposition.avgWipes,
      // SELECTED, because the column exists to be shown. A row published from a below-bar
      // bucket that reaches a reader indistinguishable from a ratified one is the whole thing
      // the column was added to prevent.
      thin: identityComposition.thin,
      withRoles: identityComposition.withRoles,
    })
    .from(identityComposition)
    .where(eq(identityComposition.condition, condition));
  return row ?? null;
}

/** The floor, and WHICH bucket served it. Exact identity first, colour count second. */
async function loadStaples(
  exactCondition: string,
  colourCount: number,
): Promise<{ condition: string; staples: StapleRef[] }> {
  for (const condition of [exactCondition, countCondition(colourCount)]) {
    const rows = await db
      .select({
        oracleId: formatStaples.oracleId,
        name: cards.name,
        commanders: formatStaples.commanders,
        commanderTotal: formatStaples.commanderTotal,
        avgInclusion: formatStaples.avgInclusion,
        weightedRank: formatStaples.weightedRank,
      })
      .from(formatStaples)
      .innerJoin(cards, eq(cards.oracleId, formatStaples.oracleId))
      .where(eq(formatStaples.condition, condition))
      .orderBy(formatStaples.weightedRank);
    if (rows.length > 0) return { condition, staples: rows };
  }
  // Neither bucket cleared the sample bar. The exact key is still what the deck's condition
  // IS — the floor is empty, not the condition.
  return { condition: exactCondition, staples: [] };
}

/** The uncached whole, for the probe and for the wrapper alike. */
export async function loadDeckProfile(
  deckId: string,
  userId: string,
): Promise<DeckProfile | null> {
  const head = await loadProfileHead(deckId, userId);
  return head ? loadDeckProfileFromHead(head) : null;
}

/**
 * The cached form.
 *
 * The fingerprint's inputs are ONE cheap read, so the head is fetched outside the cache and
 * everything expensive — flags, combos, staples, composition, population, the build — runs
 * inside it. An edit to the deck changes the fingerprint, which changes the key, so a stale
 * entry is never asked for rather than hunted down. The catalog generation is injected by
 * `cacheForUser` itself.
 *
 * NO SHIPPED ROUTE CALLS THIS YET, and that is stated rather than implied: the first Tier B
 * consumer is what proves stamp-retirement end to end, and its plan carries that as a named
 * task.
 */
export async function cachedDeckProfile(
  deckId: string,
  userId: string,
): Promise<DeckProfile | null> {
  const head = await loadProfileHead(deckId, userId);
  if (!head) return null;
  const fingerprint = profileFingerprint(head);
  return cacheForUser(userId, ["deck-profile", deckId, fingerprint], () =>
    loadDeckProfileFromHead(head),
  );
}

/**
 * Everything the basis chain needs for a set of commanders — both chains, the caveat and the
 * floor — without a deck.
 *
 * EXTRACTED so the CREATE path can build against the same skeleton the profile reads. A deck
 * being filled has no profile yet, and a second copy of this chain written for the fill would
 * drift from the one the deck is measured against afterwards: the fill would build to one set
 * of targets and the profile would grade it against another, a round at a time.
 */
export async function loadSkeletonForCommanders(
  commanderOracleId: string,
  partnerOracleId: string | null,
  combinedIdentity: string[],
  /** The two support rows, when the caller has already read them. The PROFILE path has —
   *  `loadDeckProfileFromHead` needs them for the population anyway — and re-reading here cost
   *  two queries on every profile load AND risked the population and the skeleton coming from
   *  different snapshots of the same rows. The CREATE path has no profile and passes nothing. */
  preloaded?: { pairRow: PairRow | null; commanderRow: CommanderRow | null },
): Promise<{
  /** Resolved, for a caller with no profile — the CREATE path. */
  skeleton: ProfileSkeleton;
  /** The same reads, unresolved, for `buildDeckProfile` — so the first-hit selection stays in
   *  `build.ts`'s `skeleton()` rather than being made twice in two places. */
  candidates: Pick<ProfileInput, "composition" | "roles" | "thinCondition">;
  condition: string;
  staples: StapleRef[];
  commanderDeckCount: number | null;
}> {
  const exactCondition = identityCondition(combinedIdentity);
  const [pairRow, commanderRow] = preloaded
    ? [preloaded.pairRow, preloaded.commanderRow]
    : await Promise.all([
        partnerOracleId ? loadPairRow(commanderOracleId, partnerOracleId) : null,
        loadCommanderRow(commanderOracleId),
      ]);
  const identityRow = await loadCompositionRow(exactCondition);
  const countRow = identityRow
    ? undefined
    : await loadCompositionRow(countCondition(combinedIdentity.length));

  // THE ROLE CHAIN NEEDS ITS OWN COUNT CANDIDATE, because the gating above is a fact about the
  // COMPOSITION chain and not about this one. An identity row that serves the types can carry
  // no roles at all — `with_roles = 0` is the supported pre-role-pass state — and the two
  // chains are deliberately separate, so a commander whose identity bucket has types and whose
  // count bucket has roles would otherwise skip straight to the asserted flat targets while a
  // measured answer sat one rung below, unread.
  //
  // Read only when it can change something: the identity row is absent (already loaded above)
  // or present with no usable roles. A commander whose identity row carries both pays nothing.
  const identityRoles = roleTargetsFrom(identityRow ?? undefined);
  const countRowForRoles = countRow
    ?? (identityRoles === null
        ? await loadCompositionRow(countCondition(combinedIdentity.length))
        : undefined);
  const countRoles = roleTargetsFrom(countRowForRoles ?? undefined);

  // WHICH BUCKET THE CAVEAT DESCRIBES: the one whose ROLE figures were actually taken when a
  // bucket supplied them, and otherwise the one serving the TYPES. A caveat naming a row
  // nobody read would be worse than none.
  //
  // Written as a choice rather than a `??` chain, which is what got this wrong: `thin` is a
  // BOOLEAN, so `??` happily takes a `false` from a row whose roles were never used and never
  // reaches the row that is actually thin. A thin identity bucket then rendered as non-thin.
  const roleBucket = identityRoles !== null ? identityRow
    : countRoles !== null ? countRowForRoles
    : null;
  const typeBucket = identityRow ?? countRow ?? null;
  const thinCondition = Boolean((roleBucket ?? typeBucket)?.thin);

  // The floor's bucket is the one that actually HOLDS rows. A commander whose exact identity
  // never cleared the sample bar falls to its colour count, and looking up the exact key
  // regardless would return nothing and report an empty floor as a complete one.
  const { condition, staples } = await loadStaples(exactCondition, combinedIdentity.length);

  const chain = [
    ["pair", compositionFrom(pairRow ?? undefined)],
    ["commander", compositionFrom(commanderRow ?? undefined)],
    ["identity", compositionFrom(identityRow ?? undefined)],
    ["count", compositionFrom(countRow ?? undefined)],
  ] as const;
  const hit = chain.find(([, value]) => value != null);

  // The rungs are built ONCE and handed both to this skeleton and to the profile path's
  // `candidates`: two copies of the same four reads could drop a rung from one while the other,
  // which `probe:bracket` walks, kept it, and a created deck would be built to different targets
  // than the profile then grades it against.
  const roles = {
    pair: roleTargetsFrom(pairRow ?? undefined),
    commander: roleTargetsFrom(commanderRow ?? undefined),
    identity: identityRoles,
    count: countRoles,
  };
  const roleTargets = pickRoleTargets(roles);

  const commanderDeckCount = pairRow?.deckCount ?? commanderRow?.deckCount ?? null;
  return {
    skeleton: {
      composition: hit ? { of: hit[0], ...hit[1]! } : null,
      roleTargets,
      thinCondition,
      condition,
      staples,
      commanderDeckCount,
    },
    candidates: {
      composition: {
        pair: compositionFrom(pairRow ?? undefined),
        commander: compositionFrom(commanderRow ?? undefined),
        identity: compositionFrom(identityRow ?? undefined),
        count: compositionFrom(countRow ?? undefined),
      },
      roles,
      thinCondition,
    },
    condition,
    staples,
    commanderDeckCount,
  };
}

