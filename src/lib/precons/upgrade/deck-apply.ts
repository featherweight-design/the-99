import { and, asc, desc, eq, gt, inArray, ne } from "drizzle-orm";

import { db } from "../../../db";
import {
  cardAssignments, deckCards, deckPrintings, deckProxies, decks, deckVersionCards, deckVersions,
  type PreconUpgradeUndo,
} from "../../../db/schema";
import { isForeignKeyViolation } from "../../db-error";
import { liveLockedIds, pruneOrphanLocks, reviveDormantLocks } from "../../decks/locks";
import { pruneOrphanProxies } from "../../decks/prune-proxies";
import { preparePreconDeckIn } from "../start";
import { isStartVersion } from "../start-version";
import { insertDeckList, prepareUpgradeIn, upgradedDeck, type UpgradeRefusal } from "./apply";
import { sameHelm, sameList, upgradeGateOpen, type GateBox } from "./deck-gate";

/**
 * Upgrade precon on the deck page (addendum A2c, G17): Apply a kept run's swaps to a deck that is still the box, and its one
 * Undo. Not a "use server" module: it takes a user id (the actions are `src/app/decks/precon-upgrade-deck-actions.ts`).
 *
 * Apply is not the start's `applyUpgradeIn`. It commits NO version and writes NO Overview: the swaps land as ordinary changes
 * since v0 (a linked brew stays a brew, R3 K14), and the player commits them in Review. It charges nothing; only a run costs
 * credits. The gate (`deck-gate.ts`) is re-asked inside the write's own transaction, after the deck row lock, so the swaps
 * never land over the player's own changes.
 *
 * Undo puts back EVERYTHING Apply took (orchestrator, 2026-11-11). The list and helm come from the snapshot Apply wrote
 * (`decks.precon_upgrade_undo`), and so do the cut cards' proxy marks, printing picks and reservations, which the prune every
 * `deck_cards` delete takes (`pruneOrphanProxies`) deletes. Locks go dormant (`pruneOrphanLocks`) and are revived. Undo
 * refuses unless the deck is exactly as Apply left it: nothing committed since, the same list and helm, and no lock put on
 * an added card (a lock is an edit, as `restoreSwap` reads one).
 *
 * READ COMMITTED, the default, on purpose: every deck writer locks the deck row first, and a statement after the lock must
 * see the list as that writer left it. A repeatable-read snapshot would be taken before the lock wait and read a stale list.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** `closed`: the gate is shut (the deck moved off the box, or it has no precon). `locked`: a cut is a card the player locked. */
export type DeckApplyRefusal = "closed" | "locked" | UpgradeRefusal;
export type DeckApplyResult = { ok: true; swaps: number; lead: string | null } | { ok: false; reason: DeckApplyRefusal };
export type DeckUndoResult = { ok: true } | { ok: false };

const iso = (d: Date) => d.toISOString();

/** The version that IS the box, as `readDeckOriginAndStart` reads it, but inside the caller's transaction. */
async function startVersionIn(tx: Tx, deckId: string, deckCreatedAt: Date, box: GateBox, versions: readonly { id: string; number: number; committedAt: Date; commanderOracleId: string | null; partnerOracleId: string | null }[]): Promise<string | null> {
  const oldest = versions[0];
  if (!oldest || oldest.number > 1) return null;
  const versionCards = await tx.select({ oracleId: deckVersionCards.oracleId, quantity: deckVersionCards.quantity })
    .from(deckVersionCards).where(eq(deckVersionCards.versionId, oldest.id));
  return isStartVersion(oldest, deckCreatedAt, versionCards, { cards: box.cards, helm: box }) ? oldest.id : null;
}

export async function applyUpgradeOnDeck(userId: string, deckId: string, runId: string): Promise<DeckApplyResult> {
  try {
    return await db.transaction(async (tx): Promise<DeckApplyResult> => {
      const [deck] = await tx.select({
        builtFromPrecon: decks.builtFromPrecon, commanderOracleId: decks.commanderOracleId, partnerOracleId: decks.partnerOracleId,
        createdAt: decks.createdAt, builtFromUpgradeId: decks.builtFromUpgradeId,
      }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId))).for("update");
      if (!deck?.builtFromPrecon) return { ok: false, reason: "closed" };
      const box = await boxIn(tx, deck.builtFromPrecon);
      if (!box) return { ok: false, reason: "closed" };

      const live = await tx.select({ oracleId: deckCards.oracleId, quantity: deckCards.quantity, auto: deckCards.auto })
        .from(deckCards).where(eq(deckCards.deckId, deckId));
      const versions = await tx.select({
        id: deckVersions.id, number: deckVersions.number, committedAt: deckVersions.committedAt,
        commanderOracleId: deckVersions.commanderOracleId, partnerOracleId: deckVersions.partnerOracleId,
      }).from(deckVersions).where(eq(deckVersions.deckId, deckId)).orderBy(asc(deckVersions.number));
      const startVersionId = await startVersionIn(tx, deckId, deck.createdAt, box, versions);
      const liveDeck = { commanderOracleId: deck.commanderOracleId, partnerOracleId: deck.partnerOracleId, cards: live };
      if (!upgradeGateOpen(box, startVersionId, versions.map((v) => v.id), liveDeck)) return { ok: false, reason: "closed" };

      const up = await prepareUpgradeIn(tx, userId, deck.builtFromPrecon, runId, box);
      if (typeof up === "string") return { ok: false, reason: up };
      // A run that changes nothing would leave the gate open over its own snapshot, so a second Apply could bury it.
      if (up.pairs.length === 0 && up.lead === null) return { ok: false, reason: "listChanged" };
      // A lock is "never cut this" (D4): the reviewed result would cut it, so the whole Apply refuses rather than skip a pair.
      const locked = await liveLockedIds(tx, deckId);
      if (up.pairs.some((p) => locked.has(p.cutId))) return { ok: false, reason: "locked" };

      const made = upgradedDeck(box, up);
      const kept = new Set(made.cards.map((c) => c.oracleId));
      const leaving = live.map((c) => c.oracleId).filter((id) => !kept.has(id));
      // One after another: a transaction is one connection, and its statements run in turn either way.
      const proxies = leaving.length === 0 ? [] : await tx.select({ oracleId: deckProxies.oracleId }).from(deckProxies)
        .where(and(eq(deckProxies.deckId, deckId), inArray(deckProxies.oracleId, leaving)));
      const printings = leaving.length === 0 ? [] : await tx.select({
        oracleId: deckPrintings.oracleId, setCode: deckPrintings.setCode, collectorNumber: deckPrintings.collectorNumber,
        createdAt: deckPrintings.createdAt, updatedAt: deckPrintings.updatedAt,
      }).from(deckPrintings).where(and(eq(deckPrintings.deckId, deckId), inArray(deckPrintings.oracleId, leaving)));
      const assignments = leaving.length === 0 ? [] : await tx.select({
        userId: cardAssignments.userId, oracleId: cardAssignments.oracleId, copies: cardAssignments.copies, createdAt: cardAssignments.createdAt,
      }).from(cardAssignments).where(and(eq(cardAssignments.deckId, deckId), inArray(cardAssignments.oracleId, leaving)));
      const undo: PreconUpgradeUndo = {
        runId,
        appliedAt: iso(new Date()),
        versionId: versions.at(-1)?.id ?? null,
        priorUpgradeId: deck.builtFromUpgradeId,
        before: { commanderOracleId: deck.commanderOracleId, partnerOracleId: deck.partnerOracleId, cards: live },
        after: made,
        proxies: proxies.map((p) => p.oracleId),
        printings: printings.map((p) => ({ ...p, createdAt: iso(p.createdAt), updatedAt: iso(p.updatedAt) })),
        assignments: assignments.map((a) => ({ ...a, createdAt: iso(a.createdAt) })),
      };

      // A kept card keeps its `auto` flag: the swaps changed nothing about it. An add is the player's choice, as a swap's is.
      const autoOf = new Map(live.map((c) => [c.oracleId, c.auto] as const));
      await tx.delete(deckCards).where(eq(deckCards.deckId, deckId));
      await insertDeckList(tx, deckId, made.cards.map((c) => ({ ...c, auto: autoOf.get(c.oracleId) ?? false })));
      await tx.update(decks).set({
        commanderOracleId: made.commanderOracleId, partnerOracleId: made.partnerOracleId, builtFromUpgradeId: runId, preconUpgradeUndo: undo,
      }).where(eq(decks.id, deckId));
      // The slots that left take the deck's statements about them with them, as every list write does; the snapshot keeps them.
      await pruneOrphanProxies(tx, deckId);
      await pruneOrphanLocks(tx, deckId);
      return { ok: true, swaps: up.pairs.length, lead: up.lead };
    });
  } catch (err) {
    // The run was purged between the check and the link: the foreign key says so, and nothing was written.
    if (isForeignKeyViolation(err)) return { ok: false, reason: "gone" };
    throw err;
  }
}

export async function undoUpgradeOnDeck(userId: string, deckId: string, runId: string): Promise<DeckUndoResult> {
  return db.transaction(async (tx): Promise<DeckUndoResult> => {
    const [deck] = await tx.select({
      commanderOracleId: decks.commanderOracleId, partnerOracleId: decks.partnerOracleId,
      builtFromUpgradeId: decks.builtFromUpgradeId, undo: decks.preconUpgradeUndo,
    }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId))).for("update");
    const snap = deck?.undo;
    // Matched on the snapshot, not on `built_from_upgrade_id`: that link is set null if the run row goes, and the snapshot
    // still holds everything Undo needs.
    if (!deck || !snap || snap.runId !== runId) return { ok: false };

    // Exactly as Apply left it, or the snapshot no longer describes what to undo and writing it would destroy an edit.
    const [newest] = await tx.select({ id: deckVersions.id }).from(deckVersions)
      .where(eq(deckVersions.deckId, deckId)).orderBy(desc(deckVersions.number)).limit(1);
    if ((newest?.id ?? null) !== snap.versionId) return { ok: false };
    const live = await tx.select({ oracleId: deckCards.oracleId, quantity: deckCards.quantity })
      .from(deckCards).where(eq(deckCards.deckId, deckId));
    if (!sameHelm(deck, snap.after) || !sameList(snap.after.cards, live)) return { ok: false };
    const before = new Set(snap.before.cards.map((c) => c.oracleId));
    const added = snap.after.cards.map((c) => c.oracleId).filter((id) => !before.has(id));
    const locked = await liveLockedIds(tx, deckId);
    if (added.some((id) => locked.has(id))) return { ok: false };
    // A cut card's copy reserved for another deck since Apply freed it: putting this deck's older reservation back would
    // outrank that one and take the copy from it. That deck moved on, so Undo refuses, as it does for this deck moving.
    const reserved = snap.assignments.map((a) => a.oracleId);
    if (reserved.length > 0) {
      const [taken] = await tx.select({ deckId: cardAssignments.deckId }).from(cardAssignments).where(and(
        eq(cardAssignments.userId, userId), ne(cardAssignments.deckId, deckId), inArray(cardAssignments.oracleId, reserved),
        gt(cardAssignments.createdAt, new Date(snap.appliedAt)),
      )).limit(1);
      if (taken) return { ok: false };
    }

    const after = new Set(snap.after.cards.map((c) => c.oracleId));
    // Before the insert, in its transaction: the `deck_cards` insert trigger deletes a dormant lock for a card it brings back.
    await reviveDormantLocks(tx, deckId, snap.before.cards.map((c) => c.oracleId).filter((id) => !after.has(id)));
    await tx.delete(deckCards).where(eq(deckCards.deckId, deckId));
    await insertDeckList(tx, deckId, snap.before.cards);
    await tx.update(decks).set({
      commanderOracleId: snap.before.commanderOracleId, partnerOracleId: snap.before.partnerOracleId,
      builtFromUpgradeId: snap.priorUpgradeId, preconUpgradeUndo: null,
    }).where(eq(decks.id, deckId));
    // The adds leave, and their statements with them; then the cut cards' statements come back as they were.
    await pruneOrphanProxies(tx, deckId);
    await pruneOrphanLocks(tx, deckId);
    if (snap.proxies.length > 0) {
      await tx.insert(deckProxies).values(snap.proxies.map((oracleId) => ({ deckId, oracleId }))).onConflictDoNothing();
    }
    if (snap.printings.length > 0) {
      await tx.insert(deckPrintings).values(snap.printings.map((p) => ({
        deckId, oracleId: p.oracleId, setCode: p.setCode, collectorNumber: p.collectorNumber, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt),
      }))).onConflictDoNothing();
    }
    if (snap.assignments.length > 0) {
      // Its original `created_at`: that orders it against the other decks' reservations for the same copies.
      await tx.insert(cardAssignments).values(snap.assignments.map((a) => ({
        userId: a.userId, oracleId: a.oracleId, deckId, copies: a.copies, createdAt: new Date(a.createdAt),
      }))).onConflictDoNothing();
    }
    return { ok: true };
  });
}

/** The box, or null when there is none to apply over: a precon a later feed dropped, or whose commanders no longer pass the start's checks. */
async function boxIn(tx: Tx, fileName: string): Promise<GateBox & { commanderOracleId: string } | null> {
  try {
    return await preparePreconDeckIn(tx, fileName);
  } catch (err) {
    // Only the read's own refusals, thrown before any write: a database error aborts the transaction and must surface.
    if (err instanceof Error && BOX_REFUSALS.has(err.message)) return null;
    throw err;
  }
}
const BOX_REFUSALS = new Set(["precon not found", "precon has no single commander or pair", "card is not a legal commander", "commanders cannot be paired"]);
