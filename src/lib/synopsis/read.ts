import { and, desc, eq, inArray } from "drizzle-orm";

import { resolveDeckOwnedPrintings } from "../decks/printings";
import { db } from "../../db";
import { cards, deckProfiles, deckSynopses, deckVersionSynopses, deckVersions, decks, modelCalls } from "../../db/schema";
import { readAllowance } from "../model/allowance";
import type { Allowance } from "../model/allowance-rule";
import { listFingerprint } from "../profile/fingerprint";
import { readProfileHead } from "../profile/load";
import { readStoredReading, type StoredProfileDeps } from "../profile/stored";
import { readShownSynopsis, type SynopsisRow } from "./generate";
import { methodNoticeOf, freeRunsFor, type MethodNotice } from "./method-notice";
import { overviewV2Enabled } from "./overview-v2";
import { reapSynopses } from "./reaper";
import { overviewDataMovedFor } from "../notices/overview";
import { noticesEnabled } from "../notices/flag";
import { liveOffendingIds } from "../notices/read";
import type { CheckedSynopsis, SynopsisOutcome } from "./types";

/**
 * What the Analysis tab and the modal read about a deck's synopsis. SERVER-ONLY. Never writes a
 * synopsis and never analyzes; the one write it makes is the reaper's, which fails an abandoned
 * run so the deck can be written again.
 */

export type SynopsisState = {
  synopsis: SynopsisRow | null;
  /**
   * The synopsis no longer describes the deck (plan, decision 3): an edit since it was written
   * (`dirty`), or a list it was not written for. A contract change never stales it (ruling B).
   * False when there is no synopsis.
   */
  stale: boolean;
  /**
   * A press would actually write one (plan, decision 9): a fresh reading to write from, no
   * synopsis for the current list, no run already in flight, and a unit left. What the credit note keys on, never `stale`
   * (credits audit, finding 4): after a revert the banner shows while the synopsis is current.
   */
  wouldSpend: boolean;
  /**
   * An Analyze or Re-analyze press would write an overview (the credits audit, item 2): the deck's
   * LIVE list has none, by fingerprint alone (ruling B). A press reads the list as it is now, so
   * this compares against the deck rather than against the stored reading, which after an edit
   * describes the list before it. False when the list already has its overview (7d: the press
   * returns it and spends nothing). The allowance, beside it, picks which note draws.
   */
  pressWrites: boolean;
  allowance: Allowance;
  /**
   * The deck's newest run failed after the synopsis on screen was written, without an answer
   * (busy, timeout, malformed, interrupted). Ruling A's failure line reads from it; it is true
   * only right after this deck's own write failed, never otherwise.
   */
  lastFailed: boolean;
  /**
   * That failure was the upstream REFUSING the request (`upstream_rejected`: a bad key, a retired
   * model id), which no retry fixes, so the slot offers no Try again and does not say "just now".
   * True only alongside `lastFailed`.
   */
  lastRejected: boolean;
  /**
   * The deck's newest run was refused in EVERY section, after the overview on screen was written:
   * Round 0's refused state, with the count summed over its sections. Null otherwise.
   */
  lastRefused: { failed: number; total: number } | null;
  /**
   * The preview art for every card the shown overview names, by oracle id. The page's own art
   * covers the deck; Weaknesses may name a card the deck does not hold, resolved against the
   * catalog, and its name must preview like any other.
   */
  art: Record<string, string | null>;
  /** A run is in flight on this deck. */
  pending: boolean;
  /**
   * The deck holds a card a legality notice stands for (deck notices HANDOFF §6, plan D10). A new
   * overview is withheld: the write refuses before its reservation, so nothing would spend. A
   * saved overview stays shown under a warning line (H3).
   */
  illegal: boolean;
  /**
   * The method-changed notice (addendum_method_notice): the shown overview was written under an
   * older contract and no free rewrite has produced one. `attemptsLeft` 2 or 1 is the free press;
   * 0 is the paid fallback. Null otherwise, and whenever a legality notice holds the slot.
   *
   * It is NOT `stale` and never a reason added to it (ruling B: a contract change never stales an
   * overview). While `attemptsLeft > 0` the press spends no credit, so the client's refusal points
   * (the press note, the disabled press) read it and not the allowance. `wouldSpend` stays what
   * it was, because it means a credit would be spent.
   */
  methodNotice: MethodNotice | null;
  /** The deck's newest run was a free (`system`) one: the notice carries its failure, so the slot draws none of its own. */
  lastFree: boolean;
};

const FAILED: readonly SynopsisOutcome[] = ["upstream_busy", "upstream_rejected", "timeout", "malformed", "interrupted"];

/**
 * Pure: whether the deck's newest run is a failure the slot reports, and whether that failure was
 * a rejection (no Try again). Only a run written for the list the reading describes, and newer
 * than the overview on screen, counts: once the list has moved and been analyzed again, that run
 * is history, and its failure is not this list's.
 */
export function lastWriteFailure(
  newest: { status: string; outcome: string | null; createdAt: Date; fingerprint: string } | undefined,
  list: string | undefined,
  synopsis: Pick<SynopsisRow, "createdAt"> | null,
): { lastFailed: boolean; lastRejected: boolean } {
  const forThisList = !!newest && list !== undefined && newest.fingerprint === list;
  const lastFailed = forThisList && newest!.status === "done"
    && FAILED.includes(newest!.outcome as SynopsisOutcome)
    && (!synopsis || newest!.createdAt > synopsis.createdAt);
  return { lastFailed, lastRejected: lastFailed && newest!.outcome === "upstream_rejected" };
}

/** Pure: the state from what the reads returned. */
export function synopsisStatus(input: {
  reading: { fresh: boolean; list: string } | null;
  synopsis: Pick<SynopsisRow, "fingerprint"> | null;
  /**
   * A change log entry touching this deck landed between the overview's reading and the current
   * one (deck notices plan D11, Hugh's H4): the list is the same and the data under it is not.
   * `overviewDataMovedFor` decides it; absent, nothing moved.
   */
  dataMoved?: boolean;
  allowance: Allowance;
  /** A run in flight: a press now is refused as `in_flight` and writes nothing. */
  pending: boolean;
  /** The deck holds a card a legality notice stands for: the write refuses, so nothing would spend. */
  illegal?: boolean;
}): { stale: boolean; wouldSpend: boolean } {
  const { reading, synopsis, allowance, pending } = input;
  const stale = !!synopsis && (!reading || !reading.fresh || synopsis.fingerprint !== reading.list || !!input.dataMoved);
  // An overview whose data moved is not this list's any more: its press writes (D11), or the stale
  // form's *Write a new overview* would hand back the overview it says is out of date.
  const forThisList = !!synopsis && !!reading && synopsis.fingerprint === reading.list && !input.dataMoved;
  // Paused (the app-wide cap) or the owner's share used: the reservation refuses, so nothing would spend.
  const refused = !!allowance.paused || !!allowance.ownerShare;
  const wouldSpend = !!reading?.fresh && !forThisList && !pending && !refused && !input.illegal
    && allowance.used < allowance.limit;
  return { stale, wouldSpend };
}

/** Pure: whether a press over the live list writes, which is whether that list has its overview. */
export function pressWrites(live: string | null, synopsis: Pick<SynopsisRow, "fingerprint"> | null): boolean {
  return live !== null && synopsis?.fingerprint !== live;
}

export async function readSynopsisState(
  deckId: string,
  userId: string,
  deps?: StoredProfileDeps,
  now: Date = new Date(),
): Promise<SynopsisState | null> {
  const [owned] = await db.select({ id: decks.id }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  if (!owned) return null;
  await db.transaction((tx) => reapSynopses(tx, deckId, now));

  // THE LIVE LIST AND ITS OVERVIEW, from ONE read-only repeatable-read snapshot. The list is two
  // reads (the deck row and its cards), and the overview shown is the one written for that list:
  // read apart, an edit landing between them pairs list A with A's overview while the deck is
  // already B, and the press note would describe a list that is no longer live. Whether that list
  // holds an illegal card is read in the same snapshot, so the warning never describes another list.
  // Behind the notices switch: off, no note, withheld form or warning line draws.
  const { live, synopsis, illegal } = await db.transaction(async (tx) => {
    const head = await readProfileHead(tx, deckId, userId);
    const list = head ? listFingerprint(head) : null;
    const illegal = !!head && noticesEnabled()
      && (await liveOffendingIds(tx, deckId, [head.commanderOracleId, ...(head.partnerOracleId ? [head.partnerOracleId] : [])])).length > 0;
    return { live: list, synopsis: await readShownSynopsis(deckId, userId, list ?? undefined, tx), illegal };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
  const [reading, row, newest, allowance] = await Promise.all([
    readStoredReading(deckId, userId, deps),
    db.select({ list: deckProfiles.fingerprint }).from(deckProfiles)
      .where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId))).then((r) => r[0]),
    db.select({ status: deckSynopses.status, outcome: deckSynopses.outcome, createdAt: deckSynopses.createdAt, content: deckSynopses.content, fingerprint: deckSynopses.fingerprint, origin: modelCalls.origin })
      .from(deckSynopses).innerJoin(modelCalls, eq(modelCalls.id, deckSynopses.modelCallId)).where(and(eq(deckSynopses.deckId, deckId), eq(deckSynopses.userId, userId)))
      .orderBy(desc(deckSynopses.createdAt)).limit(1).then((r) => r[0]),
    readAllowance(userId, now, "synopsis"),
  ]);

  const status = synopsisStatus({
    reading: reading && row ? { fresh: reading.fresh, list: row.list } : null,
    dataMoved: synopsis ? await overviewDataMovedFor(deckId, userId, synopsis.seenSeq ?? 0) : false,
    synopsis,
    allowance,
    pending: newest?.status === "pending",
    illegal,
  });
  // WHAT BECAME OF THE LAST WRITE describes the list it was written for. Once the list has moved
  // and been analyzed again, that run is history: its failure or refusal is not this list's.
  const forThisList = !!newest && !!row && newest.fingerprint === row.list;
  const { lastFailed, lastRejected } = lastWriteFailure(newest, row?.list, synopsis);
  const newer = forThisList && (!synopsis || newest!.createdAt > synopsis.createdAt);
  const lastRefused = newer && newest!.status === "done" && newest!.outcome === "refused" && newest!.content
    && !newest!.content.verdicts.some((v) => v.status === "ok")
    ? newest!.content.verdicts.reduce((sum, v) => ({ failed: sum.failed + v.failed, total: sum.total + v.total }), { failed: 0, total: 0 })
    : null;
  const art = synopsis ? await namedArt(synopsis.content, userId, deckId) : {};
  // Behind the switch, so a deployment on contract 7 reads nothing more.
  const v2 = overviewV2Enabled();
  const methodNotice = illegal ? null : methodNoticeOf({ v2, shown: synopsis, runs: v2 ? await freeRunsFor(db, deckId) : { attempts: 0, succeeded: false } });
  return {
    methodNotice, lastFree: newest?.origin === "system",
    synopsis, ...status, pressWrites: pressWrites(live, synopsis), allowance, lastFailed, lastRejected, lastRefused, art,
    pending: newest?.status === "pending",
    illegal,
  };
}

/**
 * The preview art for every card an overview names, by oracle id: the printing the reader owns, the
 * one the card's details will draw, over the oracle-level printing (Hugh, 2026-10-05: the preview
 * and the card it opened drew different frames). The deck's own printing picks come first, since the
 * details it opens draw them too. Fail-soft through `resolveDeckOwnedPrintings`.
 */
async function namedArt(content: CheckedSynopsis, userId: string, deckId: string): Promise<Record<string, string | null>> {
  const named = [...new Set(Object.values(content.cards).map((c) => c.oracleId))];
  if (named.length === 0) return {};
  const [rows, owned] = await Promise.all([
    db.select({ oracleId: cards.oracleId, imageUri: cards.imageUri }).from(cards).where(inArray(cards.oracleId, named)),
    resolveDeckOwnedPrintings(userId, deckId, named),
  ]);
  return Object.fromEntries(rows.map((r) => [r.oracleId, owned.get(r.oracleId)?.imageUri ?? r.imageUri]));
}

/** A version's synopsis, as copied at its commit, or null. Never stale (`SYNOPSIS-modal.md` §4.4). */
export async function readVersionSynopsis(
  versionId: string,
  userId: string,
): Promise<{ versionNumber: number; committedAt: Date; content: CheckedSynopsis; art: Record<string, string | null> } | null> {
  const [row] = await db
    .select({ versionNumber: deckVersions.number, committedAt: deckVersions.committedAt, deckId: deckVersions.deckId, content: deckSynopses.content })
    .from(deckVersionSynopses)
    .innerJoin(deckSynopses, eq(deckSynopses.id, deckVersionSynopses.synopsisId))
    .innerJoin(deckVersions, eq(deckVersions.id, deckVersionSynopses.versionId))
    .where(and(eq(deckVersionSynopses.versionId, versionId), eq(deckSynopses.userId, userId)));
  if (!row?.content) return null;
  // The art for every card it names, as the draft read carries: a version can name cards the deck
  // no longer holds, and the page's own art covers only the deck as it is now.
  return { versionNumber: row.versionNumber, committedAt: row.committedAt, content: row.content, art: await namedArt(row.content, userId, row.deckId) };
}
