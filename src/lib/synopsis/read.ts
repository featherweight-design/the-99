import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "../../db";
import { cards, deckProfiles, deckSynopses, deckVersionSynopses, deckVersions, decks } from "../../db/schema";
import { readAllowance } from "../model/allowance";
import type { Allowance } from "../model/allowance-rule";
import { listFingerprint } from "../profile/fingerprint";
import { loadProfileHead } from "../profile/load";
import { readStoredReading, type StoredProfileDeps } from "../profile/stored";
import { readShownSynopsis, type SynopsisRow } from "./generate";
import { reapSynopses } from "./reaper";
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
};

const FAILED: readonly SynopsisOutcome[] = ["upstream_busy", "timeout", "malformed", "interrupted"];

/** Pure: the state from what the reads returned. */
export function synopsisStatus(input: {
  reading: { fresh: boolean; list: string } | null;
  synopsis: Pick<SynopsisRow, "fingerprint"> | null;
  allowance: Allowance;
  /** A run in flight: a press now is refused as `in_flight` and writes nothing. */
  pending: boolean;
}): { stale: boolean; wouldSpend: boolean } {
  const { reading, synopsis, allowance, pending } = input;
  const stale = !!synopsis && (!reading || !reading.fresh || synopsis.fingerprint !== reading.list);
  const forThisList = !!synopsis && !!reading && synopsis.fingerprint === reading.list;
  // Paused (the app-wide cap) or the owner's share used: the reservation refuses, so nothing would spend.
  const refused = !!allowance.paused || !!allowance.ownerShare;
  const wouldSpend = !!reading?.fresh && !forThisList && !pending && !refused && allowance.used < allowance.limit;
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

  // THE LIVE LIST, read in one repeatable-read snapshot (`loadProfileHead`): its deck row and its
  // cards are two reads, and an edit landing between them would fingerprint a list that never
  // existed. It is read first because the overview shown is the one written for it, if any.
  const live = await loadProfileHead(deckId, userId).then((head) => (head ? listFingerprint(head) : null));
  const [reading, row, synopsis, newest, allowance] = await Promise.all([
    readStoredReading(deckId, userId, deps),
    db.select({ list: deckProfiles.fingerprint }).from(deckProfiles)
      .where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId))).then((r) => r[0]),
    readShownSynopsis(deckId, userId, live ?? undefined),
    db.select({ status: deckSynopses.status, outcome: deckSynopses.outcome, createdAt: deckSynopses.createdAt, content: deckSynopses.content, fingerprint: deckSynopses.fingerprint })
      .from(deckSynopses).where(and(eq(deckSynopses.deckId, deckId), eq(deckSynopses.userId, userId)))
      .orderBy(desc(deckSynopses.createdAt)).limit(1).then((r) => r[0]),
    readAllowance(userId, now),
  ]);

  const status = synopsisStatus({
    reading: reading && row ? { fresh: reading.fresh, list: row.list } : null,
    synopsis,
    allowance,
    pending: newest?.status === "pending",
  });
  // WHAT BECAME OF THE LAST WRITE describes the list it was written for. Once the list has moved
  // and been analyzed again, that run is history: its failure or refusal is not this list's.
  const forThisList = !!newest && !!row && newest.fingerprint === row.list;
  const lastFailed = forThisList && newest!.status === "done"
    && FAILED.includes(newest.outcome as SynopsisOutcome)
    && (!synopsis || newest.createdAt > synopsis.createdAt);
  const newer = forThisList && (!synopsis || newest!.createdAt > synopsis.createdAt);
  const lastRefused = newer && newest!.status === "done" && newest!.outcome === "refused" && newest!.content
    && !newest!.content.verdicts.some((v) => v.status === "ok")
    ? newest!.content.verdicts.reduce((sum, v) => ({ failed: sum.failed + v.failed, total: sum.total + v.total }), { failed: 0, total: 0 })
    : null;
  const named = synopsis ? [...new Set(Object.values(synopsis.content.cards).map((c) => c.oracleId))] : [];
  const art = named.length === 0 ? {} : Object.fromEntries(
    (await db.select({ oracleId: cards.oracleId, imageUri: cards.imageUri }).from(cards).where(inArray(cards.oracleId, named)))
      .map((r) => [r.oracleId, r.imageUri]),
  );
  return {
    synopsis, ...status, pressWrites: pressWrites(live, synopsis), allowance, lastFailed, lastRefused, art,
    pending: newest?.status === "pending",
  };
}

/** A version's synopsis, as copied at its commit, or null. Never stale (`SYNOPSIS-modal.md` §4.4). */
export async function readVersionSynopsis(
  versionId: string,
  userId: string,
): Promise<{ versionNumber: number; committedAt: Date; content: CheckedSynopsis } | null> {
  const [row] = await db
    .select({ versionNumber: deckVersions.number, committedAt: deckVersions.committedAt, content: deckSynopses.content })
    .from(deckVersionSynopses)
    .innerJoin(deckSynopses, eq(deckSynopses.id, deckVersionSynopses.synopsisId))
    .innerJoin(deckVersions, eq(deckVersions.id, deckVersionSynopses.versionId))
    .where(and(eq(deckVersionSynopses.versionId, versionId), eq(deckSynopses.userId, userId)));
  return row?.content ? { versionNumber: row.versionNumber, committedAt: row.committedAt, content: row.content } : null;
}
