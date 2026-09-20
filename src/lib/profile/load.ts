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
import { classifyTutor, tutorReaches } from "../bracket/tutor-targets";
import { cacheForUser } from "../cache/user-lists";
import { canonicalPair } from "../edhrec/pair";
import { COMBO_DETECTION, isInfiniteOrGameEnding } from "../spellbook/combo-features";
import { countCondition, identityCondition } from "../staples/condition";
import { buildDeckProfile, type ProfileCardRow, type ProfileInput } from "./build";
import { profileFingerprint } from "./fingerprint";
import type {
  Bracket,
  BracketPopulation,
  ComboRef,
  CompositionTargets,
  DeckProfile,
  FlagSource,
  StapleRef,
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
  return db.transaction(
    async (tx) => {
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
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
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
      group by v.variant_id, v.bracket_tag, v.produces
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
  }[];


  // CARD COUNT IS NEVER THE TEST. A two-card variant producing "infinite squirrels" is not a
  // combo this system counts; `isInfiniteOrGameEnding` reads what it produces.
  const kept = rows.filter((r) => isInfiniteOrGameEnding(r.produces));
  if (kept.length === 0) return [];

  const names = await nameMap(kept.flatMap((r) => r.pieces));
  return kept.map((r) => ({
    variantId: r.variant_id,
    cards: r.pieces.map((oracleId) => ({ oracleId, name: names.get(oracleId) ?? oracleId })),
    produces: r.produces,
    bracketTag: r.bracket_tag ?? "",
    usesCommander: r.uses_commander,
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
  if (Object.values(targets).some((v) => v === null)) return null;
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

  // THE BASIS CHAIN, as four cheap keyed reads. First hit wins, and the discriminant travels
  // with the data — see `ProfileSkeleton`.
  const identityRow = await loadCompositionRow(exactCondition);
  const countRow = identityRow
    ? undefined
    : await loadCompositionRow(countCondition(combinedIdentity.length));

  // The floor's bucket is the one that actually HOLDS rows. A commander whose exact identity
  // never cleared the sample bar falls to its colour count, and looking up the exact key
  // regardless would return nothing and report an empty floor as a complete one.
  const { condition, staples } = await loadStaples(exactCondition, combinedIdentity.length);

  const mldFlags = new Map<string, FlagSource[]>();
  const extraTurnFlags = new Map<string, FlagSource[]>();
  for (const [oracleId, f] of flags) {
    if (f.massLandDenial) mldFlags.set(oracleId, f.massLandDenialSources as FlagSource[]);
    if (f.extraTurn) extraTurnFlags.set(oracleId, f.extraTurnSources as FlagSource[]);
  }

  // THE TUTORS, classified here rather than in the builder, so the builder stays pure. Only
  // a tutor that can actually FIND a piece of a combo this deck assembles is recorded: the
  // profile reports the reach as a fact, and a tutor that reaches nothing is still a tutor —
  // which is why `comboReach.tutors` takes the whole set and the pairing is the builder's.
  const tutorIds = new Set<string>();
  const tutorTargets = new Map<string, ReturnType<typeof classifyTutor>>();
  for (const row of rows) {
    const target = classifyTutor(row.oracleText);
    if (!target) continue;
    tutorIds.add(row.oracleId);
    tutorTargets.set(row.oracleId, target);
  }

  const input: ProfileInput = {
    deckId: head.deckId,
    fingerprint: profileFingerprint(head),
    cards: rows,
    commanderOracleIds: commanderIds,
    identity: combinedIdentity,
    declared: bracketOf(head.declaredBracket),
    condition,
    composition: {
      pair: compositionFrom(pairRow ?? undefined),
      commander: compositionFrom(commanderRow ?? undefined),
      identity: compositionFrom(identityRow ?? undefined),
      count: compositionFrom(countRow ?? undefined),
    },
    staples,
    commanderDeckCount: pairRow?.deckCount ?? commanderRow?.deckCount ?? null,
    population: populationFrom(pairRow, commanderRow),
    mldFlags,
    extraTurnFlags,
    gameChangerIds: new Set(cardRows.filter((r) => r.gameChanger).map((r) => r.oracleId)),
    twoCardCombos: combos,
    tutorIds,
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

/** 1-5 or null. The check constraint makes a bad write loud; this makes a bad READ
 *  impossible, on a column an older row could already carry anything in. */
function bracketOf(value: number | null): Bracket | null {
  return value !== null && value >= 1 && value <= 5 ? (value as Bracket) : null;
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
