import { and, eq, inArray, isNotNull, isNull, max, ne, sql } from "drizzle-orm";

import { db } from "../../../db";
import { deckCards, deckPrintings, deckSuggestionItems, deckSuggestionRuns, decks, deckVersions, type ApplySnapshot } from "../../../db/schema";
import { lockDecksInOrder, pullClaimants, pullInTx, type PulledDraftRow } from "../../decks/pull";
import { readPullRelease, undoPullRelease } from "../../decks/pull-release";
import { touchDeck } from "../../decks/touch";
import { newestVersion } from "../../decks/versions";
import { isUuid } from "../../uuid";
import { readProfileHead } from "../../profile/load";
import { applySwap, planSwap, restoreSwap } from "../../swaps/draft-swap";
import { planPicks, type PickRefusal } from "./picks";
import { deckTotal, V2_DECK_TOTAL } from "./run";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Why a set was not applied or undone. `picks` names the pure rule's own reason (`planPicks`); the rest are what the deck
 * or the run says under the locks.
 */
export type ApplySetRefusal =
  | { kind: "notFound" }
  /** Not a finished v2 run (still being made, failed, or a v10 run, which keeps per-card apply). */
  | { kind: "notV2" }
  | { kind: "picks"; reason: PickRefusal }
  /** The deck is not at its size, so equal counts would not keep it there (spec §3). */
  | { kind: "notAtSize" }
  /** A version was committed since the run read the deck: its lines were made for a list that is no longer the base. */
  | { kind: "stale" }
  /** A line no longer applies to the deck as it is (`planSwap`: the cut is gone, the add is already in, it is locked). */
  | { kind: "swap"; itemId: string }
  /** A staged pull the shipped pull refuses under the locks (`pullInTx`'s own words), or one naming no picked addition. */
  | { kind: "pull"; itemId: string; message: string }
  /** Undo all: a deck a copy was pulled out of has moved on since (its draft committed, or the pulled card's row edited),
   *  so the pull cannot be put back as it was, and nothing of the set is undone. Names that deck. */
  | { kind: "pullMoved"; itemId: string; deckName: string };

export type ApplySetResult =
  | {
      ok: true; deckId: string; applySet: string; itemIds: string[];
      /** The decks a copy was pulled out of (or put back into), whose claims moved with the set. */
      sourceDeckIds?: string[];
    }
  | { ok: false; refusal: ApplySetRefusal };

/** One staged pull (Small items 4, item 2): the picked addition's copy comes out of this deck when the set applies. */
export type SetPull = { itemId: string; sourceDeckId: string };

/** At most one pull per addition, and no more additions than a side holds. */
export const MAX_SET_PULLS = 20;

/**
 * A request's staged pulls, or null when they are not a list of at most `MAX_SET_PULLS` `{ itemId, sourceDeckId }` uuid
 * pairs, one per item, each naming one of the set's picked additions (`addIds`). Absent is none. Lowered, as every id
 * the apply compares is.
 */
export function parseSetPulls(value: unknown, addIds: readonly string[]): SetPull[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_SET_PULLS) return null;
  const adds = new Set(addIds.map((id) => id.toLowerCase()));
  const seen = new Set<string>();
  const out: SetPull[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) return null;
    const { itemId, sourceDeckId } = entry as Record<string, unknown>;
    if (!isUuid(itemId) || !isUuid(sourceDeckId)) return null;
    const id = (itemId as string).toLowerCase();
    if (seen.has(id) || !adds.has(id)) return null;
    seen.add(id);
    out.push({ itemId: id, sourceDeckId: (sourceDeckId as string).toLowerCase() });
  }
  return out;
}

class Refused extends Error {
  constructor(readonly refusal: ApplySetRefusal) {
    super(refusal.kind);
  }
}

async function lockDeck(tx: Tx, deckId: string): Promise<void> {
  await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
}

/**
 * The run's deck, by an unlocked read scoped to the reader (a run's deck never changes), then the deck locked before any
 * item: the order every deck write and a deck delete take (`verdicts.ts`'s `lockedItem`). With staged pulls, `also`
 * names the source decks and their claimants, and every one of them is locked with the run's deck in ONE sorted order
 * (`lockDecksInOrder`), the order the shipped pull takes: the run's deck first and the rest after would deadlock against a
 * concurrent pull holding a lower id. `lockIds` is the whole set locked.
 */
async function lockRunDeck(tx: Tx, runId: string, userId: string, also: readonly string[] = []) {
  const [owner] = await tx.select({ deckId: deckSuggestionRuns.deckId }).from(deckSuggestionRuns)
    .where(and(eq(deckSuggestionRuns.id, runId), eq(deckSuggestionRuns.userId, userId)));
  if (!owner) return null;
  let lockIds = [owner.deckId];
  if (also.length === 0) await lockDeck(tx, owner.deckId);
  else lockIds = await lockDecksInOrder(tx, [owner.deckId, ...also]);
  // Read under the lock, never before it: an apply and an Undo that commit while this waits must be seen (a set id they
  // spent, a status that settled), or a delayed press would act on the run as it was.
  const [run] = await tx.select({
    deckId: deckSuggestionRuns.deckId,
    status: deckSuggestionRuns.status,
    requestedCount: deckSuggestionRuns.requestedCount,
    readVersion: deckSuggestionRuns.readVersion,
    spentSets: deckSuggestionRuns.spentSets,
  }).from(deckSuggestionRuns).where(eq(deckSuggestionRuns.id, runId));
  return run ? { ...run, lockIds } : null;
}

/**
 * A version committed since the run read the deck retires the run (spec §8): its lines were made for a list that is no
 * longer the base, so neither an apply nor an undo may touch it. Read under the deck lock, which a commit also takes.
 */
async function refuseIfRetired(tx: Tx, run: { deckId: string; readVersion: number | null }): Promise<void> {
  const [v] = await tx.select({ n: max(deckVersions.number) }).from(deckVersions).where(eq(deckVersions.deckId, run.deckId));
  if ((v?.n ?? null) !== run.readVersion) throw new Refused({ kind: "stale" });
}

/** The run's lines, locked `for update`, in the order the run saved them. */
async function lockedLines(tx: Tx, runId: string) {
  return tx.select({
    id: deckSuggestionItems.id,
    addOracleId: deckSuggestionItems.addOracleId,
    cutOracleId: deckSuggestionItems.cutOracleId,
    verdict: deckSuggestionItems.verdict,
    applySet: deckSuggestionItems.applySet,
    undoSnapshot: deckSuggestionItems.undoSnapshot,
  }).from(deckSuggestionItems)
    .where(eq(deckSuggestionItems.runId, runId))
    .orderBy(deckSuggestionItems.position, deckSuggestionItems.id)
    .for("update");
}

/**
 * The decks a set's staged pulls touch, besides the run's own: each named source, and every deck the claim on the pulled
 * card is made of (`pullClaimants`). Read BEFORE the transaction and used only to choose the locks, as the shipped pull
 * does: the pull itself re-reads the claim under them and refuses a claimant this did not name.
 */
async function pullParties(runId: string, userId: string, env: NodeJS.ProcessEnv, pulls: readonly SetPull[]): Promise<string[]> {
  if (pulls.length === 0) return [];
  const [owner] = await db.select({ deckId: deckSuggestionRuns.deckId }).from(deckSuggestionRuns)
    .where(and(eq(deckSuggestionRuns.id, runId), eq(deckSuggestionRuns.userId, userId)));
  if (!owner) return [];
  const items = await db.select({ id: deckSuggestionItems.id, addOracleId: deckSuggestionItems.addOracleId })
    .from(deckSuggestionItems)
    .where(and(eq(deckSuggestionItems.runId, runId), inArray(deckSuggestionItems.id, pulls.map((p) => p.itemId))));
  const claimants = await Promise.all(pulls.map((p) => {
    const add = items.find((i) => i.id === p.itemId)?.addOracleId ?? null;
    return add === null ? [] : pullClaimants(userId, env, add, owner.deckId);
  }));
  return [...pulls.map((p) => p.sourceDeckId), ...claimants.flat()];
}

/**
 * Apply M picked additions and M picked cuts of one v2 run as ONE set, in one transaction (spec §7, plan PR 4). The set's
 * id is the caller's `actionId`, so a repeat of the same press (a double tap, a retried request) finds its set already
 * applied and answers with it rather than applying twice. Each line is planned and applied against the deck as the lines
 * before it left it, cuts first, with its own snapshot, so `undoSet` can put each back in reverse. Any line that no longer
 * applies refuses the whole set: nothing is written. Unpicked lines stay open for a later set.
 *
 * Staged pulls (Small items 4, item 2) run in the same transaction AFTER every swap, through the shipped pull
 * (`pullInTx`), because a pull is authorized by the asking deck's draft holding the addition. A pull whose copy has come
 * free since is done already and writes nothing; any other refusal refuses the whole set. Each pull is recorded on its
 * addition's snapshot, so the set's one Undo takes it back too.
 */
export async function applyPicks(args: {
  runId: string; addIds: readonly string[]; cutIds: readonly string[]; actionId: string; userId: string; env: NodeJS.ProcessEnv;
  pulls?: readonly SetPull[];
}): Promise<ApplySetResult> {
  const { runId, userId, env } = args;
  // Postgres returns a uuid in lower case, and every id here is compared as a string against what it read, so the set id
  // and the picked ids are lowered first.
  const actionId = args.actionId.toLowerCase();
  const pulls = (args.pulls ?? []).map((p) => ({ itemId: p.itemId.toLowerCase(), sourceDeckId: p.sourceDeckId.toLowerCase() }));
  const parties = await pullParties(runId, userId, env, pulls);
  try {
    return await db.transaction(async (tx) => {
      const run = await lockRunDeck(tx, runId, userId, parties);
      if (!run) throw new Refused({ kind: "notFound" });
      const lines = await lockedLines(tx, runId);
      const done = lines.filter((l) => l.applySet === actionId);
      if (done.length > 0) return { ok: true as const, deckId: run.deckId, applySet: actionId, itemIds: done.map((l) => l.id) };
      // Applied once and undone since: a retried or delayed press of that set must not reverse the Undo. It writes nothing
      // and names no line; a fresh press (a new `actionId`) can apply the same picks again.
      if (run.spentSets.includes(actionId)) return { ok: true as const, deckId: run.deckId, applySet: actionId, itemIds: [] };
      if (run.status !== "ok" || run.requestedCount === null) throw new Refused({ kind: "notV2" });

      const lower = (ids: readonly string[]) => ids.map((id) => id.toLowerCase());
      const plan = planPicks({ requestedCount: run.requestedCount, lines, addIds: lower(args.addIds), cutIds: lower(args.cutIds) });
      if (!plan.ok) throw new Refused({ kind: "picks", reason: plan.reason });

      await refuseIfRetired(tx, run);
      const head = await readProfileHead(tx, run.deckId, userId);
      if (!head) throw new Refused({ kind: "notFound" });
      if (deckTotal(head) !== V2_DECK_TOTAL) throw new Refused({ kind: "notAtSize" });

      const now = new Date();
      const snapshots = new Map<string, ApplySnapshot>();
      for (const line of [...plan.cuts, ...plan.adds]) {
        const swap = await planSwap(tx, run.deckId, line.cutOracleId, line.addOracleId, env);
        if (!swap.ok) throw new Refused({ kind: "swap", itemId: line.id });
        // The verdict and the snapshot first, as `applyItem` writes them: the snapshot is the deck before this line.
        await tx.update(deckSuggestionItems)
          .set({ verdict: "accepted", verdictAt: now, undoSnapshot: swap.snapshot, applySet: actionId, picked: true })
          .where(eq(deckSuggestionItems.id, line.id));
        await applySwap(tx, run.deckId, line.cutOracleId, line.addOracleId, swap.snapshot);
        snapshots.set(line.id, swap.snapshot);
      }
      // The pulls, after every swap: each is authorized by this deck's draft now holding its addition.
      const pulledFrom: string[] = [];
      for (const p of pulls) {
        const line = plan.adds.find((l) => l.id === p.itemId);
        const snapshot = snapshots.get(p.itemId);
        if (!line || line.addOracleId === null || !snapshot) throw new Refused({ kind: "pull", itemId: p.itemId, message: "" });
        const pulled = await pullInTx(tx, {
          userId, env, sourceDeckId: p.sourceDeckId, oracleId: line.addOracleId, askingDeckId: run.deckId, lockIds: run.lockIds,
        });
        if (!pulled.ok) {
          // A copy came free since the confirmation was drawn: the deck needs nothing out of anybody's box.
          if (pulled.covered) continue;
          throw new Refused({ kind: "pull", itemId: p.itemId, message: pulled.message });
        }
        await tx.update(deckSuggestionItems)
          .set({
            undoSnapshot: {
              ...snapshot,
              pull: {
                sourceDeckId: p.sourceDeckId, draft: pulled.draft, versionId: pulled.versionId,
                release: pulled.release, printing: pulled.printing,
              },
            },
          })
          .where(eq(deckSuggestionItems.id, line.id));
        pulledFrom.push(p.sourceDeckId);
      }
      await tx.update(deckSuggestionRuns)
        .set({ spentSets: sql`array_append(${deckSuggestionRuns.spentSets}, ${actionId}::uuid)` })
        .where(eq(deckSuggestionRuns.id, runId));
      await touchDeck(tx, run.deckId);
      return {
        ok: true as const, deckId: run.deckId, applySet: actionId, itemIds: [...plan.cuts, ...plan.adds].map((l) => l.id),
        sourceDeckIds: [...new Set(pulledFrom)],
      };
    });
  } catch (error) {
    if (error instanceof Refused) return { ok: false, refusal: error.refusal };
    throw error;
  }
}

/**
 * Undo a whole set (spec §7a): each line restored over the deck the set left, in the reverse of the order it was applied,
 * back to open and still picked (H4: an Undo keeps the picks). Any line whose restore no longer fits the deck refuses the
 * whole undo, so a set is never half undone. Returns the set's item ids for the panel to re-select.
 */
export async function undoSet(args: { applySet: string; userId: string; env: NodeJS.ProcessEnv }): Promise<ApplySetResult> {
  const { userId, env } = args;
  const applySet = args.applySet.toLowerCase();
  try {
    return await db.transaction(async (tx) => {
      const [owner] = await tx.select({ runId: deckSuggestionItems.runId })
        .from(deckSuggestionItems)
        .innerJoin(deckSuggestionRuns, eq(deckSuggestionRuns.id, deckSuggestionItems.runId))
        .where(and(eq(deckSuggestionItems.applySet, applySet), eq(deckSuggestionRuns.userId, userId), isNotNull(deckSuggestionRuns.requestedCount)))
        .limit(1);
      if (!owner) throw new Refused({ kind: "notFound" });
      // The decks the set pulled copies out of, read before the locks only to choose them (a set's snapshots are written
      // by its apply and cleared by its undo, both under the run deck's lock, so the read under the locks agrees).
      const pre = await tx.select({ undoSnapshot: deckSuggestionItems.undoSnapshot }).from(deckSuggestionItems)
        .where(and(eq(deckSuggestionItems.runId, owner.runId), eq(deckSuggestionItems.applySet, applySet)));
      const sources = pre.flatMap((l) => (l.undoSnapshot?.pull ? [l.undoSnapshot.pull.sourceDeckId] : []));
      const run = await lockRunDeck(tx, owner.runId, userId, sources);
      if (!run) throw new Refused({ kind: "notFound" });
      await refuseIfRetired(tx, run);
      const set = (await lockedLines(tx, owner.runId)).filter((l) => l.applySet === applySet && l.verdict === "accepted");
      if (set.length === 0) throw new Refused({ kind: "notFound" });

      // The pulls first: the apply made them after every swap. Any one that cannot be put back as it was refuses the whole
      // undo, so a set is never half undone and no other deck is left short.
      const putBack: string[] = [];
      for (const line of [...set].reverse()) {
        const pull = line.undoSnapshot?.pull;
        if (!pull || line.addOracleId === null) continue;
        if (!run.lockIds.includes(pull.sourceDeckId)) throw new Refused({ kind: "notFound" });
        const back = await undoPull(tx, { userId, askingDeckId: run.deckId, oracleId: line.addOracleId, ...pull });
        if (!back.ok) throw new Refused({ kind: "pullMoved", itemId: line.id, deckName: back.deckName });
        putBack.push(pull.sourceDeckId);
      }

      // The apply wrote cuts, then additions; undo walks that back, additions first. No two lines of a run name the same
      // card (the engine keeps one line per card), so within a side the order cannot change what a restore finds.
      const order = [...set.filter((l) => l.cutOracleId !== null), ...set.filter((l) => l.addOracleId !== null)].reverse();
      for (const line of order) {
        if (!line.undoSnapshot || !(await restoreSwap(tx, run.deckId, line.cutOracleId, line.addOracleId, line.undoSnapshot, env))) {
          throw new Refused({ kind: "swap", itemId: line.id });
        }
        await tx.update(deckSuggestionItems)
          .set({ verdict: "pending", verdictAt: null, undoSnapshot: null, applySet: null })
          .where(eq(deckSuggestionItems.id, line.id));
      }
      await touchDeck(tx, run.deckId);
      return { ok: true as const, deckId: run.deckId, applySet, itemIds: set.map((l) => l.id), sourceDeckIds: [...new Set(putBack)] };
    });
  } catch (error) {
    if (error instanceof Refused) return { ok: false, refusal: error.refusal };
    throw error;
  }
}

/**
 * One staged pull taken back (Undo all): the source's draft row as the pull found it (with its printing pick), and the
 * release given up. Under the source's row lock, which the caller holds. Refused (naming the deck) whenever the source
 * has moved on so the pull cannot be put back as it was:
 *
 * - The source deck is gone: the copy went with it, so there is nothing to give back.
 * - The pull edited the source's draft, and the source's newest version is not the one the pull saw: it COMMITTED
 *   since, whatever its release or its row now say (a row can survive a commit: a pull that took 2 to 1 commits at 1),
 *   and putting the card back would edit a list the player committed. Refused.
 * - The release row is not the one this pull wrote (a later pull under the same key wrote it, after a commit or discard
 *   cleared ours): giving it back would undo that later pull. Refused.
 * - The release is gone with the version unchanged: a discard put the card back, so the pull is undone already, as long
 *   as the card is back in the draft.
 * - Otherwise the draft row must be as the pull left it (one copy fewer, or gone at one); an edit since refuses, as
 *   `restoreSwap` does.
 *
 * A pull that only wrote a release (the draft had cut the card already) answers to the release alone: gone is nothing
 * to give back, a later pull's is refused, its own is given back.
 */
async function undoPull(tx: Tx, p: {
  userId: string; askingDeckId: string; oracleId: string; sourceDeckId: string; draft: PulledDraftRow; versionId?: string;
  release?: string | null; printing?: { setCode: string; collectorNumber: string } | null;
}): Promise<{ ok: true } | { ok: false; deckName: string }> {
  const [source] = await tx.select({ name: decks.name }).from(decks)
    .where(and(eq(decks.id, p.sourceDeckId), eq(decks.userId, p.userId)));
  if (!source) return { ok: true };
  const refused = { ok: false as const, deckName: source.name };
  if (p.draft !== null) {
    const version = await newestVersion(p.sourceDeckId, tx);
    if (p.versionId === undefined || version?.id !== p.versionId) return refused;
  }
  const key = { sourceDeckId: p.sourceDeckId, oracleId: p.oracleId, askingDeckId: p.askingDeckId };
  const release = await readPullRelease(tx, key);
  const rowOf = and(eq(deckCards.deckId, p.sourceDeckId), eq(deckCards.oracleId, p.oracleId));
  const [row] = await tx.select({ quantity: deckCards.quantity, auto: deckCards.auto }).from(deckCards).where(rowOf).for("update");
  if (!release) return p.draft === null || row ? { ok: true } : refused;
  const ours = p.release != null && release.createdAt.getTime() === new Date(p.release).getTime();
  if (!ours) return refused;
  if (p.draft === null) {
    await undoPullRelease(tx, key);
    return { ok: true };
  }
  const left = p.draft.quantity - 1;
  const asLeft = left === 0 ? !row : row?.quantity === left && row.auto === p.draft.auto;
  if (!asLeft) return refused;
  await tx.insert(deckCards)
    .values({ deckId: p.sourceDeckId, oracleId: p.oracleId, quantity: p.draft.quantity, auto: p.draft.auto })
    .onConflictDoUpdate({ target: [deckCards.deckId, deckCards.oracleId], set: { quantity: p.draft.quantity, auto: p.draft.auto } });
  // The printing pick the last copy's prune dropped, back with the card.
  if (p.printing) {
    await tx.insert(deckPrintings)
      .values({ deckId: p.sourceDeckId, oracleId: p.oracleId, setCode: p.printing.setCode, collectorNumber: p.printing.collectorNumber })
      .onConflictDoNothing();
  }
  await undoPullRelease(tx, key);
  // The source's list changed back, so it reads as edited.
  await touchDeck(tx, p.sourceDeckId);
  return { ok: true };
}

/**
 * Mark or unmark one open line of a v2 run as picked (H4: picks survive leaving mid-run, a return and an Undo), so a line
 * of a run still making its cuts can be picked as soon as it arrives; applying still needs a finished run. Free, and
 * written only on a change. Refused (null) for a retired run (spec §8: a commit since the run read the deck), checked
 * under the deck lock a commit also takes. The deck id when the line is an open v2 line of the reader's, else null.
 */
export async function setPicked(itemId: string, userId: string, picked: boolean): Promise<string | null> {
  return db.transaction(async (tx) => {
    const [owner] = await tx.select({ deckId: deckSuggestionRuns.deckId })
      .from(deckSuggestionItems)
      .innerJoin(deckSuggestionRuns, eq(deckSuggestionRuns.id, deckSuggestionItems.runId))
      .where(and(eq(deckSuggestionItems.id, itemId), eq(deckSuggestionRuns.userId, userId)));
    if (!owner) return null;
    await lockDeck(tx, owner.deckId);
    // Whether the line is open is decided under the lock: an apply that commits while this waits takes the line, and the
    // pick must then answer null rather than report a change it did not make.
    const [line] = await tx.select({ deckId: deckSuggestionRuns.deckId, readVersion: deckSuggestionRuns.readVersion })
      .from(deckSuggestionItems)
      .innerJoin(deckSuggestionRuns, eq(deckSuggestionRuns.id, deckSuggestionItems.runId))
      .where(and(
        eq(deckSuggestionItems.id, itemId),
        inArray(deckSuggestionRuns.status, ["pending", "ok"]),
        isNotNull(deckSuggestionRuns.requestedCount),
        eq(deckSuggestionItems.verdict, "pending"),
        isNull(deckSuggestionItems.applySet),
      ))
      .for("update", { of: deckSuggestionItems });
    if (!line) return null;
    try {
      await refuseIfRetired(tx, line);
    } catch (error) {
      if (error instanceof Refused) return null;
      throw error;
    }
    // Written only on a change; the row is locked, so the value compared is the value written over.
    await tx.update(deckSuggestionItems).set({ picked })
      .where(and(eq(deckSuggestionItems.id, itemId), ne(deckSuggestionItems.picked, picked)));
    return line.deckId;
  });
}
