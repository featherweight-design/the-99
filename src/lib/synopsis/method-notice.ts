import { and, eq, inArray } from "drizzle-orm";

import type { db } from "../../db";
import { deckSynopses, modelCalls } from "../../db/schema";
import { SYNOPSIS_CONTRACT_VERSION_V2, SYNOPSIS_CONTRACT_VERSION_V2_BENCHMARKS } from "./limits";

/**
 * The method-changed notice and the free rewrite (plan `2026-10-10-overview-accuracy.md` §7.4;
 * the addendum_method_notice READINESS audit, build rules 3, 4 and 11).
 *
 * A deck is ELIGIBLE for one free rewrite per method version when its shown overview was written
 * under an older contract and no free run has produced an overview yet. The free run is written
 * with `origin = 'system'`, so it never touches the player allowance, which means the bound on its
 * cost is this file's two rules and nothing else: at most `FREE_ATTEMPTS` free calls per deck per
 * contract, whatever they settled as, and none once one has produced an overview.
 */
export const FREE_ATTEMPTS = 2;

/** `attemptsLeft` 2 or 1 offers the free press; 0 is the paid fallback (the audit's 1e). */
export type MethodNotice = { attemptsLeft: number };

/** What the deck's free runs at the new contract came to: every one counts, and whether any produced an overview. */
export type FreeRuns = { attempts: number; succeeded: boolean };

/**
 * Pure. The notice a deck owes, or null. Needs the switch, a shown overview written under an
 * older contract, and no free run that has produced an overview (a free run that did leaves the
 * shown row at the new contract, and survives a revert to a list whose own overview is older).
 */
export function methodNoticeOf(input: {
  v2: boolean;
  /** `overviewOk` false: a partial run at the new contract whose Overview section was refused wrote no new overview. */
  shown: { contractVersion: number; overviewOk?: boolean } | null;
  runs: FreeRuns;
}): MethodNotice | null {
  const { v2, shown, runs } = input;
  if (!v2 || !shown || runs.succeeded) return null;
  if (shown.overviewOk === false) {
    // A partial row (another section passed, the Overview was refused) is no old-method OVERVIEW.
    // The one exception is a new-method row a free run of ours wrote: it stands in for the legacy
    // overview that run was started over, which exists because the free run does.
    if (shown.contractVersion < SYNOPSIS_CONTRACT_VERSION_V2 || runs.attempts === 0) return null;
  } else if (shown.contractVersion >= SYNOPSIS_CONTRACT_VERSION_V2) {
    return null;
  }
  return { attemptsLeft: Math.max(0, FREE_ATTEMPTS - runs.attempts) };
}

/** Whether the press would be a free run: the notice with an attempt left. */
export function freeRunAvailable(notice: MethodNotice | null): boolean {
  return !!notice && notice.attemptsLeft > 0;
}

/**
 * Every `system` call this deck has made at the new contract. A failed run counts, so does a
 * refused one and a reaped one: the bound has to hold against a flaky upstream. `succeeded` is
 * a finished run whose Overview section passed, because a failed or partial free run also leaves a
 * row at the new contract and must not end the deck's eligibility.
 *
 * Takes the caller's transaction when the count must be read under the reservation's lock.
 */
export async function freeRunsFor(q: Pick<typeof db, "select">, deckId: string): Promise<FreeRuns> {
  const rows = await q
    .select({ status: deckSynopses.status, content: deckSynopses.content })
    .from(deckSynopses)
    .innerJoin(modelCalls, eq(modelCalls.id, deckSynopses.modelCallId))
    .where(and(
      eq(deckSynopses.deckId, deckId),
      // BOTH current-method contracts: a free rewrite with the benchmarks on is written at 12, and
      // counting 11 alone let a failing one retry free without end.
      inArray(deckSynopses.contractVersion, [SYNOPSIS_CONTRACT_VERSION_V2, SYNOPSIS_CONTRACT_VERSION_V2_BENCHMARKS]),
      eq(modelCalls.origin, "system"),
    ));
  return {
    attempts: rows.length,
    // The OVERVIEW passed: a partial run (another section ok, the Overview refused) wrote no new
    // overview, so it neither ends eligibility nor spends the deck's second try's right to exist.
    succeeded: rows.some((r) => r.status === "done" && !!r.content?.verdicts.some((v) => v.section === "overview" && v.status === "ok")),
  };
}
