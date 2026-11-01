/**
 * The carry-over (Hugh, 2026-10-27): a deck started from a precon takes that precon's pre-written
 * Overview (`precon_synopses`) as its own synopsis while its list is the precon's, "effectively kick
 * starting the analysis of a new precon deck". Called from each start's `after()`, once the deck
 * and its v0 have committed.
 *
 * HONEST BY CONSTRUCTION: the Overview is attached only when it is exactly what an Analyze press
 * would write for this deck now (`carryOverDecision`), and through the same rows a press writes, so
 * every rule the deck page already applies keeps working:
 *   - the Analysis tab is on for the owner, and the stored row is at the OWNER's contract and role basis;
 *   - the row is `current` (its inputs are still this database's, the copy's re-check) and its list
 *     is the deck's list, read after the start committed;
 *   - the deck's bracket READING is stored first, through `computeAndStoreProfile` (deterministic, no
 *     model), by the press's own call, so it is v0's, whether or not an Overview follows: the header's bracket shows at once,
 *     and an Overview with no fresh reading reads as stale (`read.ts`);
 *   - a deck holding a card illegal in Commander gets no Overview while notices are on, as a press would;
 *   - the Overview is a `deck_synopses` row with `precon_file` set and NO allowance unit, at the
 *     deck data log's head as of the row's last check (never past the reading's `seen_seq`), and v0's
 *     `deck_version_synopses` names it.
 * The first edit dirties the reading and moves the list, so today's rules mark it stale. A deck that
 * already has a synopsis, or whose list moved before this ran, gets nothing. Failure is logged and
 * swallowed: the start has already answered the player, and a deck without it is as every deck is.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { deckDataChanges, deckProfiles, deckSynopses, deckVersionSynopses, deckVersions, decks, preconSynopses } from "../../db/schema";
import { analysisTabEnabled } from "../decks/analysis-flag";
import { holdsIllegalCard } from "../notices/read";
import { listFingerprint } from "../profile/fingerprint";
import { readProfileHead } from "../profile/load";
import { computeAndStoreProfile, isNewestVersion, requestProfileDeps } from "../profile/stored";
import { synopsisPreconContractVersion } from "../synopsis/limits";
import { overviewV2Enabled } from "../synopsis/overview-v2";
import { carryOverDecision } from "./overview";

export type CarryOverResult =
  | { attached: true; synopsisId: string }
  | { attached: false; reason: "off" | "none" | "not_current" | "list_moved" | "not_a_precon" | "illegal" | "no_reading" | "has_synopsis" | "has_reading" };

/** Attach `deckId`'s precon Overview, if it is honest to. `env` is the OWNER's resolved switches. */
export async function carryOverPreconOverview(deckId: string, userId: string, env: NodeJS.ProcessEnv): Promise<CarryOverResult> {
  if (!analysisTabEnabled(env)) return { attached: false, reason: "off" };
  const [deck] = await db.select({ precon: decks.builtFromPrecon }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  if (!deck?.precon) return { attached: false, reason: "not_a_precon" };
  // A DECK THAT ALREADY HAS A READING has nothing to carry: the arrival copied it, a press wrote one, or
  // this ran before. Said before any compute, and silently (`carryOverAfterStart`): a repeat is not news.
  const [read] = await db.select({ id: deckProfiles.deckId }).from(deckProfiles).where(eq(deckProfiles.deckId, deckId)).limit(1);
  if (read) return { attached: false, reason: "has_reading" };
  const head = await db.transaction((tx) => readProfileHead(tx, deckId, userId));
  if (!head) return { attached: false, reason: "not_a_precon" };
  const list = listFingerprint(head);

  // THE BRACKET READING FIRST, whether or not an Overview follows: the deck's own reading, stored by
  // the Analyze press's own call (deterministic, no model). A press finds the version holding its list
  // (`versionHolding`), so the reading is v0's, the box's own list the start committed. Not a commit's
  // `pinTo`: a pin never computes a reading that is not already stored. The header's bracket shows at
  // once, and an Overview needs a fresh reading to be fresh. As a FIRST reading (rule 0's own guard):
  // it writes nothing over a row of any kind, so a replayed start, or a press landing first, never has
  // its reading (or an edit's dirty mark) replaced by one nobody pressed for.
  const reading = await computeAndStoreProfile(deckId, userId, requestProfileDeps(env), { firstReading: true });
  if (reading?.kind !== "ok" || !reading.reading.fresh) return { attached: false, reason: "no_reading" };

  // The same withhold a press makes before an Overview (`generate.ts`'s `run`): an illegal deck's is not shown.
  if (await holdsIllegalCard(deckId, userId)) return { attached: false, reason: "illegal" };
  const v2 = overviewV2Enabled(env);
  const contract = synopsisPreconContractVersion(v2);
  // At the OWNER's contract AND the labels basis (LABEL_ROLE_COUNTS retired, Hugh 2026-10-31): the
  // reading's roles reach the prompt, so an Overview built by the classifier is not what this owner's
  // Analyze would write, and none is attached.
  const keyFor = (c: number) => and(eq(preconSynopses.preconFile, deck.precon!), eq(preconSynopses.contractVersion, c), eq(preconSynopses.roleBasis, "labels"));
  const [row] = await db.select().from(preconSynopses).where(keyFor(contract));
  const key = keyFor(contract);
  const decision = carryOverDecision({ analysisTab: true, row: row ?? null, liveFingerprint: list });
  if (!decision.attach) return { attached: false, reason: decision.reason };

  const [v0] = await db.select({ id: deckVersions.id }).from(deckVersions).where(eq(deckVersions.deckId, deckId)).orderBy(asc(deckVersions.number)).limit(1);
  return db.transaction(async (tx): Promise<CarryOverResult> => {
    // The press's own lock (`startRun`), so a press landing now and this cannot both write.
    await tx.select({ id: decks.id }).from(decks).where(eq(decks.id, deckId)).for("update");
    const again = await readProfileHead(tx, deckId, userId);
    if (!again || listFingerprint(again) !== list) return { attached: false, reason: "list_moved" };
    const [any] = await tx.select({ id: deckSynopses.id }).from(deckSynopses).where(eq(deckSynopses.deckId, deckId)).limit(1);
    if (any) return { attached: false, reason: "has_synopsis" };
    const [stored] = await tx.select({ list: deckProfiles.fingerprint, dirty: deckProfiles.dirty, seenSeq: deckProfiles.seenSeq })
      .from(deckProfiles).where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId)));
    if (!stored || stored.dirty || stored.list !== list) return { attached: false, reason: "no_reading" };
    // ONE REVISION OF THE SOURCE ROW: re-read under a shared lock, so a build or copy cannot rewrite it
    // between the decision, the content and the check time this transaction writes from it.
    const [src] = await tx.select().from(preconSynopses).where(key).for("share");
    const held = carryOverDecision({ analysisTab: true, row: src ?? null, liveFingerprint: list });
    if (!held.attach) return { attached: false, reason: held.reason };
    // THE OVERVIEW HAS SEEN THE DATA ONLY AS OF ITS LAST CHECK, not as of this reading: a deck data
    // change published after the build or copy last verified the row's inputs (`checked_at`) is one
    // it never read, even while the row still says current (the next build or copy has not re-checked
    // it yet). So its `seen_seq` is the log's head at that check, and every such change reaches the
    // deck's own data-moved rule (`overviewDataMovedFor`) exactly as it would a press's Overview.
    const [log] = await tx.select({ head: sql<number>`coalesce(max(${deckDataChanges.seq}), 0)::bigint` })
      .from(deckDataChanges).where(sql`${deckDataChanges.publishedAt} <= (
        select ps.checked_at from ${preconSynopses} ps
        where ps.precon_file = ${src.preconFile} and ps.contract_version = ${src.contractVersion} and ps.role_basis = ${src.roleBasis}
      )`);
    const seenSeq = Math.min(stored.seenSeq, Number(log?.head ?? 0));
    const [written] = await tx.insert(deckSynopses).values({
      deckId, userId, fingerprint: list, contractVersion: src.contractVersion, model: src.model,
      modelCallId: null, preconFile: deck.precon!, status: "done", outcome: "survived", content: src.content,
      seenSeq,
      // RULING 1 (d9): the deck's read is the precon's, so both rows carry the date its Overview was written,
      // as the arrival's copy does (`stored-carry.ts`). The reading row is re-dated below, in this transaction.
      createdAt: src.createdAt,
    }).returning({ id: deckSynopses.id });
    await tx.update(deckProfiles).set({ computedAt: src.createdAt })
      .where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId), eq(deckProfiles.fingerprint, list), eq(deckProfiles.dirty, false)));
    if (v0) {
      await tx.insert(deckVersionSynopses)
        .select(tx.select({ versionId: sql<string>`${v0.id}::uuid`.as("version_id"), synopsisId: sql<string>`${written.id}::uuid`.as("synopsis_id") })
          .from(sql`(select 1) as one`).where(isNewestVersion(deckId, v0.id)))
        .onConflictDoNothing();
    }
    return { attached: true, synopsisId: written.id };
  });
}

/**
 * The one line a carry-over logs, or none. Nothing to do is SILENT: the switch off, no Overview to carry,
 * or a deck already read (a repeat arrival, a replayed start), which is not news (d9, 2026-10-28).
 */
export function carryLogLine(r: CarryOverResult): string | null {
  if (r.attached || r.reason === "off" || r.reason === "none" || r.reason === "has_reading") return null;
  return `precon overview not carried over: ${r.reason}`;
}

/** The start's `after()` body: never throws into a response that has already been sent. */
export async function carryOverAfterStart(deckId: string, userId: string, env: NodeJS.ProcessEnv): Promise<void> {
  try {
    const r = await carryOverPreconOverview(deckId, userId, env);
    const line = carryLogLine(r);
    if (line) console.info(line);
  } catch (error) {
    console.warn("the precon overview was not carried over", error);
  }
}
