/**
 * The ARRIVAL carry-over (small items 5, PR 6; the-99-d9's option (c), 2026-10-28): the start's own
 * `?from=precon` landing COPIES the precon's stored reading and Overview into the deck, inline in the
 * render, so the header's bracket and the Analysis tab are there at once. Nothing is computed: the reading
 * was built with the precon's Overview (`precon_synopses.reading_*`, PR 6a), the same row an Analyze press
 * would write for this list, and this copies it as the deck's FIRST reading.
 *
 * WHEN IT CANNOT COPY, IT SAYS SO and writes nothing: no stored reading, or one not fresh for this deck
 * (its list, the profile or rules version, or a change log entry touching its cards since it was built:
 * `preconReadingFresh`, "the catalog moved since the build"). The caller then runs the computing carry-over
 * (`carryOverAfterStart`) in `after()`, as every start did before, and the page renders WITHOUT the chip:
 * the tab draws what any unread deck draws until that lands. No pending state is drawn for it.
 *
 * THE SAME GUARANTEES AS THE COMPUTING CARRY-OVER (`carry-over.ts`), by the same rows:
 *   - FIRST READING ONLY: a deck that already has a `deck_profiles` row of any kind is left alone, silently
 *     (a re-render, a refresh keeping the parameter, a double arrival), and the insert itself does nothing
 *     on a conflict, so a press landing first is never replaced;
 *   - the Overview only when `carryOverDecision` says so (current, the owner's contract and basis, the
 *     deck's very list), never over an illegal deck while notices are on, never over an existing synopsis,
 *     at the change log head as of the row's last check (never past the reading's own);
 *   - under the deck's own lock (the press's), and only if the deck's edit stamp has not moved since its
 *     list was read: an edit in between writes nothing, and the next press reads the deck as it is.
 *
 * THE DATE (d9's ruling 1): with an Overview carried, the reading and the Overview are both dated when the
 * precon's Overview was written, so the date line says when the precon's read was made; with none, the
 * reading is the deck's own, dated now.
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { deckCards, deckDataChanges, deckProfiles, deckSynopses, deckVersionSynopses, deckVersions, decks, preconSynopses } from "../../db/schema";
import type { CheckedSynopsis } from "../synopsis/types";
import { analysisTabEnabled } from "../decks/analysis-flag";
import { roleBasisFromEnv } from "../decks/label-counts-flag";
import { noticesEnabled } from "../notices/flag";
import { liveOffendingIds } from "../notices/read";
import { listFingerprint, profileFingerprint } from "../profile/fingerprint";
import { PROFILE_VERSION } from "../profile/version";
import { isNewestVersion } from "../profile/stored";
import { synopsisContractVersion } from "../synopsis/limits";
import { overviewV2Enabled } from "../synopsis/overview-v2";
import { carryOverDecision } from "./overview";
import { preconReadingFresh, readPreconCarry } from "./reading";

export type StoredCarryResult =
  /** The stored reading was copied; `overview` says whether the Overview came with it. */
  | { kind: "copied"; overview: boolean }
  /** Nothing to do: the switch is off, the deck is not a precon start, or it already has a reading. */
  | { kind: "nothing" }
  /** No fresh stored reading: the caller runs the computing carry-over after the response. */
  | { kind: "fallback"; reason: "no_row" | "no_reading" | "not_fresh" | "edited" };

/** Copy the precon's stored reading (and Overview, when honest) into `deckId`. `env` is the OWNER's switches. */
export async function carryStoredOnArrival(deckId: string, userId: string, env: NodeJS.ProcessEnv): Promise<StoredCarryResult> {
  if (!analysisTabEnabled(env)) return { kind: "nothing" };
  // THE DECK, ITS LIST, WHAT IT ALREADY HAS AND THE PRECON'S STORED ROW, in two reads side by side (the row
  // named by the deck, `readPreconCarry`'s by-deck form). The edit stamp and the list come from ONE statement
  // (`arrivalDeckQuery`), so they are one snapshot: the write below re-reads the stamp under the lock, and any
  // edit after this read moves it. Round trips are the cost here (measured: 9 came to ~380ms at the median
  // from a laptop), so every independent read shares one.
  const contract = synopsisContractVersion(overviewV2Enabled(env), true);
  const [[deck], stored] = await Promise.all([
    arrivalDeckQuery(deckId, userId),
    readPreconCarry({ deckId, userId }, contract, roleBasisFromEnv(env)),
  ]);
  if (!deck?.precon || deck.hasReading) return { kind: "nothing" };
  const head = { commanderOracleId: deck.commanderOracleId, partnerOracleId: deck.partnerOracleId, cards: deck.cards };
  const list = listFingerprint(head);

  if (!stored) return { kind: "fallback", reason: "no_row" };
  const reading = stored.reading;
  if (!reading) return { kind: "fallback", reason: "no_reading" };
  // The stored profile's own fingerprint carries the list and PROFILE_VERSION: it must be this deck's.
  if (reading.profile.fingerprint !== profileFingerprint(head)) return { kind: "fallback", reason: "not_fresh" };

  const commanders = [deck.commanderOracleId, ...(deck.partnerOracleId ? [deck.partnerOracleId] : [])];
  const decision = carryOverDecision({ analysisTab: true, row: { listFingerprint: stored.overview.listFingerprint, contractVersion: stored.overview.contractVersion, current: stored.overview.current }, liveFingerprint: list });
  const wantsOverview = decision.attach && !deck.hasSynopsis;
  // Side by side: the reading's freshness (one change log read) and the legality withhold a press makes
  // before an Overview (notices on).
  const [fresh, illegal] = await Promise.all([
    preconReadingFresh(reading, list),
    wantsOverview && noticesEnabled(env) ? liveOffendingIds(db as unknown as Parameters<typeof liveOffendingIds>[0], deckId, commanders).then((ids) => ids.length > 0) : Promise.resolve(false),
  ]);
  if (!fresh) return { kind: "fallback", reason: "not_fresh" };

  return db.transaction(async (tx): Promise<StoredCarryResult> => {
    // The press's own lock (`startRun`), and the edit stamp under it: unchanged means the list read above
    // is still the deck's, so the copy describes it.
    const [locked] = await tx.select({
      stamp: sql<string>`${decks.lastEditedAt}::text`,
      hasSynopsis: sql<boolean>`exists (select 1 from ${deckSynopses} ds where ds.deck_id = ${decks}.id)`,
    }).from(decks).where(eq(decks.id, deckId)).for("update");
    if (!locked || locked.stamp !== deck.stamp) return { kind: "fallback", reason: "edited" };
    // ONE REVISION OF THE SOURCE ROW, under a shared lock, as the computing carry-over takes it: a build or
    // copy cannot mark it not current or rewrite it between this decision and the write, and the content,
    // dates and change log mark all come from this revision.
    const [src] = await sourceRowQuery(tx, deck.precon!, contract, roleBasisFromEnv(env));
    const plan = lockedCarry({ wantsOverview: wantsOverview && !illegal, readAt: reading.at, readingSeenSeq: reading.seenSeq, list, src: src ?? null });
    if (plan.kind === "fallback") return plan;
    const at = plan.overview?.createdAt ?? null;
    // The reading is v0's, as a press finds the version holding its list: a start's newest version IS v0.
    // Read with the deck; pinned only while it is still the newest, checked in the write itself.
    const v0 = deck.newestNumber === 0 ? deck.newestId : null;
    const [written] = await tx.insert(deckProfiles).values({
      deckId, userId, fingerprint: list, catalog: reading.catalog, profile: { ...reading.profile, deckId }, permits: reading.permits,
      profileVersion: PROFILE_VERSION, dirty: false,
      versionId: v0 ? sql`(case when ${isNewestVersion(deckId, v0)} then ${v0}::uuid end)` : null,
      seenSeq: reading.seenSeq, rulesVersion: reading.rulesVersion, analyzedOracleIds: reading.analyzedOracleIds,
      ...(at ? { computedAt: at } : {}),
    }).onConflictDoNothing({ target: deckProfiles.deckId }).returning({ deckId: deckProfiles.deckId });
    // A FIRST READING replaces nothing: a press that wrote one first stands, and so does its Overview (a
    // press's Overview needs its reading, written first, so a deck this insert reaches has none of its own).
    if (!written) return { kind: "nothing" };
    const o = plan.overview;
    if (!o || locked.hasSynopsis) return { kind: "copied", overview: false };
    const [synopsis] = await tx.insert(deckSynopses).values({
      deckId, userId, fingerprint: list, contractVersion: o.contractVersion, model: o.model,
      modelCallId: null, preconFile: deck.precon!, status: "done", outcome: "survived", content: o.content,
      seenSeq: o.seenSeq,
      createdAt: o.createdAt,
    }).returning({ id: deckSynopses.id });
    if (v0) {
      await tx.insert(deckVersionSynopses)
        .select(tx.select({ versionId: sql<string>`${v0}::uuid`.as("version_id"), synopsisId: sql<string>`${synopsis.id}::uuid`.as("synopsis_id") })
          .from(sql`(select 1) as one`).where(isNewestVersion(deckId, v0)))
        .onConflictDoNothing();
    }
    return { kind: "copied", overview: true };
  });
}

/**
 * The deck, its edit stamp and its LIST in one statement, so the stamp and the cards are one snapshot: an edit
 * committing after this read moves the stamp the write re-checks under the lock. Apart so a test can render it.
 */
export function arrivalDeckQuery(deckId: string, userId: string) {
  return db.select({
    precon: decks.builtFromPrecon,
    commanderOracleId: decks.commanderOracleId,
    partnerOracleId: decks.partnerOracleId,
    stamp: sql<string>`${decks.lastEditedAt}::text`,
    cards: sql<{ oracleId: string; quantity: number }[]>`coalesce((
      select json_agg(json_build_object('oracleId', dc.oracle_id, 'quantity', dc.quantity))
      from ${deckCards} dc where dc.deck_id = ${decks}.id
    ), '[]'::json)`,
    hasReading: sql<boolean>`exists (select 1 from ${deckProfiles} dp where dp.deck_id = ${decks}.id)`,
    hasSynopsis: sql<boolean>`exists (select 1 from ${deckSynopses} ds where ds.deck_id = ${decks}.id)`,
    // The deck's newest version: a start's is v0, which the reading is pinned to (re-checked in the write).
    newestId: sql<string | null>`(select dv.id from ${deckVersions} dv where dv.deck_id = ${decks}.id order by dv.number desc limit 1)`,
    newestNumber: sql<number | null>`(select dv.number from ${deckVersions} dv where dv.deck_id = ${decks}.id order by dv.number desc limit 1)`,
  }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The precon's row, re-read FOR SHARE inside the write, with the change log head as of ITS last check
 * (the Overview has seen the data only that far). Apart so a test can render it.
 */
export function sourceRowQuery(tx: Pick<Tx, "select">, file: string, contract: number, basis: string) {
  return tx.select({
    listFingerprint: preconSynopses.listFingerprint, contractVersion: preconSynopses.contractVersion, current: preconSynopses.current,
    model: preconSynopses.model, content: preconSynopses.content, createdAt: preconSynopses.createdAt, readingAt: preconSynopses.readingAt,
    logAtCheck: sql<number>`(select coalesce(max(dc.seq), 0)::bigint from ${deckDataChanges} dc where dc.published_at <= ${preconSynopses}.checked_at)`,
  }).from(preconSynopses).where(and(
    eq(preconSynopses.preconFile, file), eq(preconSynopses.contractVersion, contract), eq(preconSynopses.roleBasis, basis),
  )).for("share");
}

type LockedRow = {
  listFingerprint: string; contractVersion: number; current: boolean; model: string; content: CheckedSynopsis;
  createdAt: Date; readingAt: Date | null; logAtCheck: number | string;
};

/**
 * Pure: what the write does with the LOCKED revision of the source row. The reading copied is the one read
 * before the lock, so the row must still hold that very reading (`reading_at`), or the copy falls back. The
 * Overview is re-decided on this revision (`carryOverDecision`), and its content, date and change log mark
 * (never past the reading's own) come from it.
 */
export function lockedCarry(input: { wantsOverview: boolean; readAt: Date; readingSeenSeq: number; list: string; src: LockedRow | null }):
  | { kind: "fallback"; reason: "no_row" | "not_fresh" }
  | { kind: "copy"; overview: { contractVersion: number; model: string; content: CheckedSynopsis; createdAt: Date; seenSeq: number } | null } {
  const { src } = input;
  if (!src) return { kind: "fallback", reason: "no_row" };
  if (!src.readingAt || src.readingAt.getTime() !== input.readAt.getTime()) return { kind: "fallback", reason: "not_fresh" };
  const decision = carryOverDecision({ analysisTab: true, row: src, liveFingerprint: input.list });
  if (!input.wantsOverview || !decision.attach) return { kind: "copy", overview: null };
  return {
    kind: "copy",
    overview: {
      contractVersion: src.contractVersion, model: src.model, content: src.content, createdAt: src.createdAt,
      seenSeq: Math.min(input.readingSeenSeq, Number(src.logAtCheck)),
    },
  };
}
