import { and, desc, eq, inArray, isNotNull, lt, max, sql } from "drizzle-orm";

import { db } from "../../db";
import {
  cards,
  collectionItems,
  csvUploads,
  deckGames,
  deckCards,
  deckSuggestionItems,
  deckSuggestionRuns,
  decks,
  deckVersions,
} from "../../db/schema";
import { readAllowance, settleModelCall } from "../model/allowance";
import { cacheForUser } from "../cache/user-lists";
import { listFingerprint, profileFingerprint } from "../profile/fingerprint";
import { loadDeckProfileFromHead, readProfileHead, type ProfileHead } from "../profile/load";
import { PROFILE_VERSION } from "../profile/version";
import type { Bracket, DeckProfile } from "../profile/types";
import { bracketAfter } from "../tuning/bracket-shift";
import { tuningFingerprint } from "../tuning/fingerprint";
import { PROMPT_VERSION } from "../tuning/prompt-version";
import { loadUniversalStaples } from "../staples/universal";
import { readShownSynopsis } from "../synopsis/generate";
import { reapCutoff } from "../tuning/reaper";
import type { TuningItem, TuningRun, TuningState } from "../tuning/state";
import type { ValidatedSuggestion } from "../tuning/validate";
import { listDeckGames, type DeckGame } from "./games";
import { loadPrices } from "./price-query";
import type { Availability } from "./availability";
import { loadAvailability } from "./availability-query";

/**
 * Deck tuning's reads. SERVER-ONLY: it imports the database.
 *
 * `tuningInputs` is the ONE place "what would a run read, and what is its fingerprint" is
 * answered. `runTuning` and `readTuningPanel` both call it, so the panel's "nothing has changed"
 * and the action's refusal cannot disagree.
 */

export type TuningInputs = {
  head: ProfileHead;
  games: DeckGame[];
  intent: string | null;
  declared: Bracket | null;
  fingerprint: string;
  /** The deck's newest version number in the same snapshot as `head`, or null for none. A run
   *  records it, and a newer version later retires the set. */
  readVersion: number | null;
};

/** Null when the deck is not the reader's. Ownership is in `loadProfileHead`'s `where`. */
export async function tuningInputs(deckId: string, userId: string): Promise<TuningInputs | null> {
  // The head and the version it belongs to, in ONE snapshot: read apart, a commit landing between
  // them would pair the list before the commit with the version after it.
  const snapshot = await db.transaction(async (tx) => {
    const head = await readProfileHead(tx, deckId, userId);
    if (!head) return null;
    const [v] = await tx.select({ n: max(deckVersions.number) }).from(deckVersions)
      .where(eq(deckVersions.deckId, deckId));
    return { head, readVersion: v?.n ?? null };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
  if (!snapshot) return null;
  const { head, readVersion } = snapshot;
  const [games, [deck], [upload]] = await Promise.all([
    listDeckGames(deckId, userId),
    db.select({ intent: decks.intent })
      .from(decks)
      .where(and(eq(decks.id, deckId), eq(decks.userId, userId))),
    db.select({ confirmedAt: max(csvUploads.confirmedAt) })
      .from(csvUploads)
      .where(and(eq(csvUploads.userId, userId), isNotNull(csvUploads.confirmedAt))),
  ]);
  if (!deck) return null;
  const intent = deck.intent;
  const fingerprint = tuningFingerprint({
    list: listFingerprint(head),
    games,
    intent,
    collection: upload?.confirmedAt ? new Date(upload.confirmedAt).toISOString() : null,
  });
  return { head, games, intent, declared: (head.declaredBracket as Bracket | null) ?? null, fingerprint, readVersion };
}

/**
 * The profile of exactly this head — the one the fingerprint hashed and the bracket flag swaps.
 * `cachedDeckProfile` would read the head again, and an edit landing between the two reads would
 * pair a profile of one list with a fingerprint and a flag of another. The cache key is the one
 * `cachedDeckProfile` files under, so an analysis already pressed is still reused.
 */
export function profileOfHead(head: ProfileHead): Promise<DeckProfile> {
  return cacheForUser(head.userId, ["deck-profile", head.deckId, profileFingerprint(head)], () =>
    loadDeckProfileFromHead(head),
  );
}

/**
 * What v2 tells the model about the deck it already knows (Hugh's ruling, 2026-09-24): the deck's
 * own overview, its strategy steps and its Key cards, and the universal staples by name.
 *
 * The overview is `readShownSynopsis`'s, which prefers the one written for this very list and
 * falls back to the newest shown; `buildEvidencePack` then keeps only the Key cards the deck still
 * holds. A refused section is null in the stored content, and reads as nothing rather than as an
 * empty strategy. The universal staples come from `staples/universal.ts`, the one definition,
 * named through the catalog.
 */
export async function readTuningContext(head: ProfileHead): Promise<{
  overview: { strategy: string[]; keyCards: string[] } | null;
  universal: { oracleId: string; name: string }[];
}> {
  const [shown, universalIds] = await Promise.all([
    readShownSynopsis(head.deckId, head.userId, listFingerprint(head)),
    loadUniversalStaples(),
  ]);
  const content = shown?.content;
  const strategy = content?.primer?.strategy ?? [];
  const keyCards = (content?.keyCards ?? []).map((k) => k.card);
  const overview = strategy.length > 0 || keyCards.length > 0 ? { strategy, keyCards } : null;
  const universal = universalIds.size === 0 ? [] : await db
    .select({ oracleId: cards.oracleId, name: cards.name })
    .from(cards)
    .where(inArray(cards.oracleId, [...universalIds]));
  return { overview, universal };
}

/** Which of these cards the reader owns at all. One read, for the evidence pack. */
export async function readOwnedOracleIds(userId: string, oracleIds: readonly string[]): Promise<Set<string>> {
  if (oracleIds.length === 0) return new Set();
  const rows = await db.selectDistinct({ oracleId: collectionItems.oracleId })
    .from(collectionItems)
    .where(and(eq(collectionItems.userId, userId), inArray(collectionItems.oracleId, [...new Set(oracleIds)])));
  return new Set(rows.map((r) => r.oracleId));
}

/**
 * The bracket flag on each kept suggestion (Task 9b). For each, the REAL profile of the swapped
 * list — the cut's row one copy down, the add's one copy up — built by the same loader as
 * `before`, and compared through `bracketAfter`. At most `MAX_SUGGESTIONS` builds per run.
 */
export async function withBracketAfter(
  head: ProfileHead,
  before: DeckProfile,
  declared: Bracket | null,
  kept: ValidatedSuggestion[],
): Promise<ValidatedSuggestion[]> {
  return Promise.all(kept.map(async (s) => {
    const after = await loadDeckProfileFromHead({ ...head, cards: swapped(head.cards, s) });
    return { ...s, bracketAfter: bracketAfter({ before, after, declared }) };
  }));
}

/** The head's list with one copy of the cut out and one copy of the add in. */
export function swapped(
  list: ProfileHead["cards"],
  s: Pick<ValidatedSuggestion, "addOracleId" | "cutOracleId">,
): ProfileHead["cards"] {
  const next = new Map(list.map((c) => [c.oracleId, c.quantity]));
  const cut = next.get(s.cutOracleId) ?? 0;
  if (cut <= 1) next.delete(s.cutOracleId);
  else next.set(s.cutOracleId, cut - 1);
  next.set(s.addOracleId, (next.get(s.addOracleId) ?? 0) + 1);
  return [...next].map(([oracleId, quantity]) => ({ oracleId, quantity }));
}

/**
 * The panel's state. Reaps this deck's abandoned runs on the way past, refunding their units in
 * the same transaction, then reads. Scoped to the deck being read: one player opening a deck
 * never writes across other players' rows.
 */
export async function readTuningState(
  deckId: string,
  userId: string,
  fingerprint: string,
  now: Date = new Date(),
): Promise<TuningState> {
  await db.transaction(async (tx) => {
    const reaped = await tx.update(deckSuggestionRuns)
      .set({ status: "failed", errorClass: "interrupted" })
      .where(and(
        eq(deckSuggestionRuns.deckId, deckId),
        eq(deckSuggestionRuns.status, "pending"),
        lt(deckSuggestionRuns.createdAt, reapCutoff(now)),
      ))
      .returning({ callId: deckSuggestionRuns.modelCallId });
    for (const r of reaped) await settleModelCall(tx, r.callId, "refunded", undefined, now);
  });

  const runOf = eq(deckSuggestionRuns.deckId, deckId);
  const mine = eq(deckSuggestionRuns.userId, userId);
  const [[newest], [lastOk], [games], allowance] = await Promise.all([
    db.select({
      id: deckSuggestionRuns.id,
      status: deckSuggestionRuns.status,
      errorClass: deckSuggestionRuns.errorClass,
      createdAt: deckSuggestionRuns.createdAt,
      droppedCount: deckSuggestionRuns.droppedCount,
    }).from(deckSuggestionRuns).where(and(runOf, mine))
      .orderBy(desc(deckSuggestionRuns.createdAt)).limit(1),
    db.select({
      id: deckSuggestionRuns.id,
      fingerprint: deckSuggestionRuns.inputFingerprint,
      createdAt: deckSuggestionRuns.createdAt,
      promptVersion: deckSuggestionRuns.promptVersion,
      profileVersion: deckSuggestionRuns.profileVersion,
    }).from(deckSuggestionRuns).where(and(runOf, mine, eq(deckSuggestionRuns.status, "ok")))
      .orderBy(desc(deckSuggestionRuns.createdAt)).limit(1),
    db.select({ count: sql<number>`count(*)::int` }).from(deckGames)
      .where(and(eq(deckGames.deckId, deckId), eq(deckGames.userId, userId))),
    readAllowance(userId, now),
  ]);

  const run: TuningRun | null = newest ? { ...newest, status: newest.status as TuningRun["status"] } : null;
  // The items are the newest OK run's. A failed or stopped re-run leaves the set it would have
  // replaced on screen, still open (STATES-tuning-panel.md :42): the failure is about the new
  // run, and nothing the player had was changed by it.
  const { items, newestPriceAsOf } = lastOk
    ? await readItems(lastOk.id, deckId, userId)
    : { items: [], newestPriceAsOf: null };

  return {
    run,
    items,
    lastOkFingerprint: lastOk?.fingerprint ?? null,
    lastOkAt: lastOk?.createdAt ?? null,
    stale: lastOk ? lastOk.fingerprint !== fingerprint : false,
    retired: lastOk ? await readRetired(deckId, lastOk.id) : null,
    modelVersionMoved: lastOk
      ? lastOk.promptVersion !== PROMPT_VERSION || lastOk.profileVersion !== PROFILE_VERSION
      : false,
    allowance,
    gameCount: games?.count ?? 0,
    newestPriceAsOf,
  };
}

/**
 * A version newer than the one the run read means the set was read against an older deck.
 * NUMBERS, not clocks: the run stores the version it read, taken in the same snapshot as its
 * list, and a commit's `committed_at` (its transaction's start) could never say whether the run
 * saw it. `from` is null for a deck that had no version when the run read it.
 */
async function readRetired(deckId: string, runId: string): Promise<TuningState["retired"]> {
  const rows = await db.execute<{ newest: number | null; read_version: number | null }>(sql`
    select (select max(v.number) from ${deckVersions} v where v.deck_id = ${deckId}) as newest,
           r.read_version
    from ${deckSuggestionRuns} r where r.id = ${runId}`);
  const [r] = rows.rows;
  if (!r || r.newest === null || r.newest <= (r.read_version ?? 0)) return null;
  return { from: r.read_version, to: r.newest };
}

async function readItems(
  runId: string,
  deckId: string,
  userId: string,
): Promise<{ items: TuningItem[]; newestPriceAsOf: Date | null }> {
  const rows = await db.execute<{
    id: string; add_oracle_id: string; add_name: string; add_type_line: string;
    cut_oracle_id: string; cut_name: string; rationale: string; rationale_short: string;
    evidence: TuningItem["evidence"]; position: number; verdict: TuningItem["verdict"];
    bracket_after: number[] | null; owned_quantity: number; applies: boolean;
    add_image_uri: string | null; cut_image_uri: string | null; cut_in_deck: boolean;
    add_in_deck: boolean;
  }>(sql`
    select i.id, i.add_oracle_id, a.name as add_name, a.type_line as add_type_line,
           a.image_uri as add_image_uri, c.image_uri as cut_image_uri,
           i.cut_oracle_id, c.name as cut_name, i.rationale, i.rationale_short, i.evidence,
           i.position, i.verdict, i.bracket_after,
           coalesce((
             select sum(ci.quantity) from ${collectionItems} ci
             where ci.user_id = ${userId} and ci.oracle_id = i.add_oracle_id
           ), 0)::int as owned_quantity,
           exists (select 1 from ${deckCards} dc where dc.deck_id = ${deckId} and dc.oracle_id = i.cut_oracle_id)
             as cut_in_deck,
           exists (select 1 from ${deckCards} dc where dc.deck_id = ${deckId} and dc.oracle_id = i.add_oracle_id)
             as add_in_deck,
           -- The swap can still be made: the cut is in the deck, and the add is not (a basic
           -- may be held already; the apply adds a copy). The apply checks the same rule.
           (exists (select 1 from ${deckCards} dc where dc.deck_id = ${deckId} and dc.oracle_id = i.cut_oracle_id)
             and (a.type_line like '%Basic%' or not exists (
               select 1 from ${deckCards} dc where dc.deck_id = ${deckId} and dc.oracle_id = i.add_oracle_id)))
             as applies
    from ${deckSuggestionItems} i
    join ${cards} a on a.oracle_id = i.add_oracle_id
    join ${cards} c on c.oracle_id = i.cut_oracle_id
    where i.run_id = ${runId}
      and exists (select 1 from ${deckSuggestionRuns} r where r.id = i.run_id and r.deck_id = ${deckId})
    order by i.position
  `);
  const addIds = rows.rows.map((r) => r.add_oracle_id);
  // The add's claims are read from THIS deck's vantage, as the decklist reads its own cards: the
  // swap would put the card in this deck, so this deck's own claim is not a rival for it.
  // Both are decoration on a card that stands without them, so each fails soft, as the deck page's
  // own price and claim rollups do: a card with no price draws no figure, and one with no claim
  // picture draws no mark, rather than the whole set failing to draw.
  const [{ prices, newestAsOf }, claims] = await Promise.all([
    loadPrices(addIds).catch((e): Awaited<ReturnType<typeof loadPrices>> => {
      console.error("tuning items: price read failed", e);
      return { prices: new Map(), newestAsOf: null };
    }),
    addIds.length > 0
      ? loadAvailability(userId, { oracleIds: addIds, excludeDeckId: deckId }).catch((e) => {
          console.error("tuning items: claim read failed", e);
          return new Map<string, Availability>();
        })
      : new Map<string, Availability>(),
  ]);
  const items = rows.rows.map((r): TuningItem => {
    return {
      id: r.id,
      addOracleId: r.add_oracle_id,
      addName: r.add_name,
      addTypeLine: r.add_type_line,
      cutOracleId: r.cut_oracle_id,
      cutName: r.cut_name,
      rationale: r.rationale,
      rationaleShort: r.rationale_short,
      evidence: r.evidence,
      position: r.position,
      verdict: r.verdict,
      addImageUri: r.add_image_uri,
      cutImageUri: r.cut_image_uri,
      owned: r.owned_quantity > 0,
      ownedQuantity: r.owned_quantity,
      availability: r.owned_quantity > 0 ? claims.get(r.add_oracle_id) ?? null : null,
      price: prices.get(r.add_oracle_id) ?? null,
      bracketAfter: r.bracket_after,
      applies: r.applies,
      cutInDeck: r.cut_in_deck,
      addInDeck: r.add_in_deck,
    };
  });
  return { items, newestPriceAsOf: newestAsOf };
}

/**
 * The generating manifest's reads, one per row (Task 13). Each is cheap and authorised,
 * and the panel calls them in sequence so a tick lands on a read that actually finished. The
 * run rebuilds its evidence from scratch: this is disclosure, never input.
 */
export const EVIDENCE_STEPS = ["games", "notes", "decklist", "intent", "collection"] as const;
export type EvidenceStep = (typeof EVIDENCE_STEPS)[number];

export async function readEvidenceStep(
  deckId: string,
  userId: string,
  step: EvidenceStep,
): Promise<number | null> {
  const [deck] = await db.select({ intent: decks.intent }).from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  if (!deck) return null;
  const ofDeck = and(eq(deckGames.deckId, deckId), eq(deckGames.userId, userId));
  switch (step) {
    case "games": {
      const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(deckGames).where(ofDeck);
      return r?.n ?? 0;
    }
    case "notes": {
      const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(deckGames)
        .where(and(ofDeck, isNotNull(deckGames.note)));
      return r?.n ?? 0;
    }
    case "decklist": {
      const [r] = await db.select({ n: sql<number>`coalesce(sum(${deckCards.quantity}), 0)::int` })
        .from(deckCards).where(eq(deckCards.deckId, deckId));
      return r?.n ?? 0;
    }
    case "intent":
      return deck.intent === null ? 0 : 1;
    case "collection": {
      // Distinct cards owned: what the run reads to say which adds the player already has.
      const [r] = await db.select({ n: sql<number>`count(distinct ${collectionItems.oracleId})::int` })
        .from(collectionItems).where(eq(collectionItems.userId, userId));
      return r?.n ?? 0;
    }
  }
}
