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
} from "../../db/schema";
import { readAllowance, settleModelCall } from "../model/allowance";
import { cacheForUser } from "../cache/user-lists";
import { listFingerprint, profileFingerprint } from "../profile/fingerprint";
import { loadDeckProfileFromHead, loadProfileHead, type ProfileHead } from "../profile/load";
import { PROFILE_VERSION } from "../profile/version";
import type { Bracket, DeckProfile } from "../profile/types";
import { bracketAfter } from "../tuning/bracket-shift";
import { tuningFingerprint } from "../tuning/fingerprint";
import { PROMPT_VERSION } from "../tuning/prompt-version";
import { reapCutoff } from "../tuning/reaper";
import type { TuningItem, TuningRun, TuningState } from "../tuning/state";
import type { ValidatedSuggestion } from "../tuning/validate";
import { listDeckGames, type DeckGame } from "./games";
import { loadPrices } from "./price-query";
import { priceOf, priceState } from "./price";

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
};

/** Null when the deck is not the reader's. Ownership is in `loadProfileHead`'s `where`. */
export async function tuningInputs(deckId: string, userId: string): Promise<TuningInputs | null> {
  const head = await loadProfileHead(deckId, userId);
  if (!head) return null;
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
  return { head, games, intent, declared: (head.declaredBracket as Bracket | null) ?? null, fingerprint };
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
    for (const r of reaped) await settleModelCall(tx, r.callId, "refunded", now);
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
  // The items belong to the newest run only: a failed run after a good one shows no stale cards.
  const items = run?.status === "ok" ? await readItems(run.id, deckId, userId) : [];

  return {
    run,
    items,
    lastOkFingerprint: lastOk?.fingerprint ?? null,
    lastOkAt: lastOk?.createdAt ?? null,
    stale: lastOk ? lastOk.fingerprint !== fingerprint : false,
    versionMoved: lastOk
      ? lastOk.promptVersion !== PROMPT_VERSION || lastOk.profileVersion !== PROFILE_VERSION
      : false,
    allowance,
    gameCount: games?.count ?? 0,
  };
}

async function readItems(runId: string, deckId: string, userId: string): Promise<TuningItem[]> {
  const rows = await db.execute<{
    id: string; add_oracle_id: string; add_name: string; add_type_line: string;
    cut_oracle_id: string; cut_name: string; rationale: string; rationale_short: string;
    evidence: TuningItem["evidence"]; position: number; verdict: TuningItem["verdict"];
    bracket_after: number[] | null; owned_quantity: number;
  }>(sql`
    select i.id, i.add_oracle_id, a.name as add_name, a.type_line as add_type_line,
           i.cut_oracle_id, c.name as cut_name, i.rationale, i.rationale_short, i.evidence,
           i.position, i.verdict, i.bracket_after,
           coalesce((
             select sum(ci.quantity) from ${collectionItems} ci
             where ci.user_id = ${userId} and ci.oracle_id = i.add_oracle_id
           ), 0)::int as owned_quantity
    from ${deckSuggestionItems} i
    join ${cards} a on a.oracle_id = i.add_oracle_id
    join ${cards} c on c.oracle_id = i.cut_oracle_id
    where i.run_id = ${runId}
      and exists (select 1 from ${deckSuggestionRuns} r where r.id = i.run_id and r.deck_id = ${deckId})
    order by i.position
  `);
  const { prices, newestAsOf } = await loadPrices(rows.rows.map((r) => r.add_oracle_id));
  return rows.rows.map((r) => {
    const fact = prices.get(r.add_oracle_id);
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
      owned: r.owned_quantity > 0,
      ownedQuantity: r.owned_quantity,
      priceCents: fact ? priceOf(fact, priceState(fact, newestAsOf)) : null,
      bracketAfter: r.bracket_after,
    };
  });
}

/**
 * The generating manifest's four reads, one per step (Task 13). Each is cheap and authorised,
 * and the panel calls them in sequence so a tick lands on a read that actually finished. The
 * run rebuilds its evidence from scratch: this is disclosure, never input.
 */
export type EvidenceStep = "games" | "notes" | "decklist" | "intent";

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
  }
}
