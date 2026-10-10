import { and, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { deckCards, deckCutItems, deckProxies, deckSuggestionRuns, decks, type ApplySnapshot } from "../../db/schema";
import { cutsFingerprint, readKeyCardNames } from "../decks/cuts-read";
import { isLiveLocked, liveLockedIds, pruneOrphanLocks } from "../decks/locks";
import { neverCutEnabled } from "../decks/never-cut-flag";
import { pruneOrphanProxies } from "../decks/prune-proxies";
import { touchDeck } from "../decks/touch";
import { readProfileHead } from "../profile/load";
import { PROPOSED_CUTS_TOOL } from "./limits";

/**
 * A proposed cut's verdicts, as transactions. SERVER-ONLY, in the shape of `verdicts.ts` and with
 * the same discipline: the deck row is locked FIRST (the order every deck write takes), then the
 * item, and every verdict is guarded on the verdict it expects, so a second press changes nothing.
 *
 * CUT IS A LIST MUTATION and does everything Suggested changes' Apply does for its cut half: one
 * copy out (the row goes when it was the last), orphaned proxy marks and locks pruned, the deck
 * stamped. Its LOCK RE-CHECK is the point of this file's `cutLocked` refusal: a card locked while
 * the model ran can still be stored as a proposal, and this is the gate that stops it being cut
 * (plan, #1356 round 7). The commander is refused the same way, whatever a stale row says.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type CutRefusal = "cutGone" | "cutLocked" | "moved" | "stale";
export type CutOutcome = { ok: true; deckId: string; runId: string } | { ok: false; reason: CutRefusal | "gone" };

const rowOf = (deckId: string, oracleId: string) =>
  and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId));

async function lockDeck(tx: Tx, deckId: string): Promise<void> {
  await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
}

/**
 * The deck's input fingerprint as THIS transaction sees it, which is the only view that is certain
 * to include the change it just made. A cut is a list edit, and the result it came from stays
 * current only if the run's stored fingerprint follows it: so the verdict moves it in the same
 * transaction, from what the deck was before the edit to what it is after, and only when the run
 * still carried the former. Read in a separate step after the commit, the new figure raced the
 * pooled connections' snapshots and the result retired itself after its own cut.
 */
async function deckFingerprint(tx: Tx, deckId: string, userId: string, keyCards?: readonly string[]): Promise<string | null> {
  const head = await readProfileHead(tx, deckId, userId);
  if (!head) return null;
  const locked = neverCutEnabled() ? [...(await liveLockedIds(tx, deckId))] : [];
  const [d] = await tx.select({ intent: decks.intent }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  return cutsFingerprint(head, locked, d?.intent?.trim() ? d.intent : null, keyCards ?? (await readKeyCardNames(head)));
}

/** The Key cards, read ONCE per verdict: both fingerprints of one transaction must be made from the
 *  same set, or an overview retry landing between them would be adopted into the run silently. */
const keyCardsOf = async (tx: Tx, deckId: string, userId: string): Promise<string[]> => {
  const head = await readProfileHead(tx, deckId, userId);
  return head ? readKeyCardNames(head) : [];
};

async function chainRun(tx: Tx, runId: string, from: string | null, to: string | null): Promise<void> {
  if (from === null || to === null || from === to) return;
  await tx.update(deckSuggestionRuns)
    .set({ inputFingerprint: to })
    .where(and(eq(deckSuggestionRuns.id, runId), eq(deckSuggestionRuns.tool, PROPOSED_CUTS_TOOL), eq(deckSuggestionRuns.status, "ok"), eq(deckSuggestionRuns.inputFingerprint, from)));
}

/** The item and its run, or null unless the reader owns a Proposed cuts run; deck locked, then item. */
async function lockedCut(tx: Tx, itemId: string, userId: string) {
  const [owner] = await tx
    .select({ deckId: deckSuggestionRuns.deckId, runId: deckSuggestionRuns.id })
    .from(deckCutItems)
    .innerJoin(deckSuggestionRuns, eq(deckSuggestionRuns.id, deckCutItems.runId))
    .where(and(
      eq(deckCutItems.id, itemId),
      eq(deckSuggestionRuns.userId, userId),
      eq(deckSuggestionRuns.tool, PROPOSED_CUTS_TOOL),
    ));
  if (!owner) return null;
  // The first read only finds the deck. The item AND its run's fingerprint and status are read AGAIN
  // under the deck lock: read before it, a cut waiting behind another cut would compare the figure
  // the first one had already moved and be refused as stale.
  await lockDeck(tx, owner.deckId);
  const [row] = await tx
    .select({
      oracleId: deckCutItems.cutOracleId, verdict: deckCutItems.verdict, undoSnapshot: deckCutItems.undoSnapshot,
      fingerprint: deckSuggestionRuns.inputFingerprint, runStatus: deckSuggestionRuns.status,
    })
    .from(deckCutItems)
    .innerJoin(deckSuggestionRuns, eq(deckSuggestionRuns.id, deckCutItems.runId))
    .where(eq(deckCutItems.id, itemId)).for("update", { of: deckCutItems });
  return row ? { ...row, ...owner } : null;
}

/** Cut one copy of the card, and remember the row exactly as it was. */
export async function cutItem(itemId: string, userId: string): Promise<CutOutcome> {
  return db.transaction(async (tx): Promise<CutOutcome> => {
    const item = await lockedCut(tx, itemId, userId);
    if (!item || item.verdict !== "pending") return { ok: false, reason: "gone" };
    const { deckId, oracleId } = item;
    const keys = await keyCardsOf(tx, deckId, userId);
    const before = await deckFingerprint(tx, deckId, userId, keys);

    const [deck] = await tx.select({ commander: decks.commanderOracleId, partner: decks.partnerOracleId })
      .from(decks).where(eq(decks.id, deckId));
    if (!deck || oracleId === deck.commander || oracleId === deck.partner) return { ok: false, reason: "cutGone" };
    const [row] = await tx.select({ quantity: deckCards.quantity, auto: deckCards.auto })
      .from(deckCards).where(rowOf(deckId, oracleId)).for("update");
    if (!row) return { ok: false, reason: "cutGone" };
    if (neverCutEnabled() && (await isLiveLocked(tx, deckId, oracleId))) return { ok: false, reason: "cutLocked" };
    // A result is actionable only for the list it was made against. Another tab may still show one
    // after the deck moved, and a cut from it would remove a card the model never saw in this list.
    if (item.runStatus !== "ok" || before === null || item.fingerprint !== before) return { ok: false, reason: "stale" };
    const [proxy] = await tx.select({ oracleId: deckProxies.oracleId }).from(deckProxies)
      .where(and(eq(deckProxies.deckId, deckId), eq(deckProxies.oracleId, oracleId)));
    const snapshot: ApplySnapshot = {
      cut: { quantity: row.quantity, auto: row.auto, proxied: proxy !== undefined },
      add: { quantity: 0, auto: false },
    };

    // The verdict and the snapshot first, before the deck changes, as Suggested changes' Apply does.
    await tx.update(deckCutItems)
      .set({ verdict: "accepted", verdictAt: new Date(), undoSnapshot: snapshot })
      .where(and(eq(deckCutItems.id, itemId), eq(deckCutItems.verdict, "pending")));
    if (row.quantity > 1) {
      await tx.update(deckCards).set({ quantity: row.quantity - 1 }).where(rowOf(deckId, oracleId));
    } else {
      await tx.delete(deckCards).where(rowOf(deckId, oracleId));
      await pruneOrphanProxies(tx, deckId);
      await pruneOrphanLocks(tx, deckId);
    }
    await touchDeck(tx, deckId);
    await chainRun(tx, item.runId, before, await deckFingerprint(tx, deckId, userId, keys));
    return { ok: true, deckId, runId: item.runId };
  });
}

/** Put the card back as the cut found it, and only over the deck the cut left. */
export async function undoCutItem(itemId: string, userId: string): Promise<CutOutcome> {
  return db.transaction(async (tx): Promise<CutOutcome> => {
    const item = await lockedCut(tx, itemId, userId);
    const snap = item?.undoSnapshot?.cut;
    if (!item || item.verdict !== "accepted" || !snap) return { ok: false, reason: "gone" };
    const { deckId, oracleId } = item;
    const keys = await keyCardsOf(tx, deckId, userId);
    const before = await deckFingerprint(tx, deckId, userId, keys);
    // Only over the deck the cut left: the card's own row is checked below, and the rest of the
    // inputs (the list, the locks, the intent, the bracket) by the run's fingerprint.
    if (item.runStatus !== "ok" || before === null || item.fingerprint !== before) return { ok: false, reason: "moved" };

    const [row] = await tx.select({ quantity: deckCards.quantity, auto: deckCards.auto })
      .from(deckCards).where(rowOf(deckId, oracleId)).for("update");
    const left = snap.quantity - 1;
    // The deck must be as the cut left it: an edit of this card since is the player's, and the
    // snapshot would overwrite it.
    const asCut = left === 0 ? row === undefined : row?.quantity === left && row.auto === snap.auto;
    if (!asCut) return { ok: false, reason: "moved" };

    await tx.insert(deckCards)
      .values({ deckId, oracleId, quantity: snap.quantity, auto: snap.auto })
      .onConflictDoUpdate({ target: [deckCards.deckId, deckCards.oracleId], set: { quantity: snap.quantity, auto: snap.auto } });
    if (snap.proxied) {
      await tx.insert(deckProxies).values({ deckId, oracleId }).onConflictDoNothing();
    } else {
      await tx.delete(deckProxies).where(and(eq(deckProxies.deckId, deckId), eq(deckProxies.oracleId, oracleId)));
    }
    await tx.update(deckCutItems)
      .set({ verdict: "pending", verdictAt: null, undoSnapshot: null })
      .where(and(eq(deckCutItems.id, itemId), eq(deckCutItems.verdict, "accepted")));
    await touchDeck(tx, deckId);
    await chainRun(tx, item.runId, before, await deckFingerprint(tx, deckId, userId, keys));
    return { ok: true, deckId, runId: item.runId };
  });
}

/** Keep (dismiss) or show again (restore): the verdict alone, the deck untouched. */
export async function setCutKept(itemId: string, userId: string, kept: boolean): Promise<CutOutcome> {
  return db.transaction(async (tx): Promise<CutOutcome> => {
    const item = await lockedCut(tx, itemId, userId);
    const from = kept ? "pending" : "dismissed";
    if (!item || item.verdict !== from) return { ok: false, reason: "gone" };
    await tx.update(deckCutItems)
      .set({ verdict: kept ? "dismissed" : "pending", verdictAt: kept ? new Date() : null })
      .where(and(eq(deckCutItems.id, itemId), eq(deckCutItems.verdict, from)));
    return { ok: true, deckId: item.deckId, runId: item.runId };
  });
}
