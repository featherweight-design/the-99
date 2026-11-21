/**
 * The Overview a guided deck is written once its run kept its charge (READINESS G2): inside the run's 2 credits, a player-origin
 * synopsis call of 0 units (`writeUpgradedOverviewFor`), so its dollars still count toward the owner's month. The same claim pattern
 * as Upgrade's (`precons/upgrade/overview.ts`): `guided_builds.overview_at` is claimed by ONE conditional update before anything is
 * called, so one run writes one Overview, however many times this is reached. The claim is given back only when the write never
 * reserved a call; a call that was made and failed keeps it, so a failing model is never retried for free. It never throws.
 */
import { and, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "../../db";
import { guidedBuilds } from "../../db/schema";
import { computeAndStoreProfile, requestProfileDeps } from "../profile/stored";
import { defaultDeps, writeUpgradedOverviewFor, type WriteResult } from "../synopsis/generate";

export type GuidedOverviewResult =
  | { done: false; reason: "already_claimed" | "released" }
  | { done: true; write: WriteResult };

/** A write that reserved nothing leaves the claim for the next try; any other outcome used the run's one Overview. */
const reservedNothing = (r: WriteResult): boolean =>
  r.kind === "no_reading" || r.kind === "illegal" || r.kind === "paused" || r.kind === "ownerShare" || r.kind === "allowance";

export async function writeGuidedOverview(runId: string, deckId: string, userId: string, env: NodeJS.ProcessEnv): Promise<GuidedOverviewResult> {
  const claimed = await db.update(guidedBuilds)
    .set({ overviewAt: new Date() })
    .where(and(eq(guidedBuilds.id, runId), eq(guidedBuilds.userId, userId), eq(guidedBuilds.deckId, deckId), isNull(guidedBuilds.overviewAt)))
    .returning({ id: guidedBuilds.id });
  if (claimed.length === 0) return { done: false, reason: "already_claimed" };
  let write: WriteResult | null = null;
  // A throw once the write has begun may come after its call was reserved or made, so it keeps the claim; only a throw before it gives it back.
  let began = false;
  try {
    const deps = { ...defaultDeps(), profile: requestProfileDeps(env) };
    await computeAndStoreProfile(deckId, userId, deps.profile, { firstReading: true });
    began = true;
    write = await writeUpgradedOverviewFor(deckId, userId, deps, env);
    return { done: true, write };
  } finally {
    if (write === null ? !began : reservedNothing(write)) {
      await db.update(guidedBuilds).set({ overviewAt: null }).where(and(eq(guidedBuilds.id, runId), isNotNull(guidedBuilds.overviewAt)));
    }
  }
}

/** The run's `after()` body: logs, never throws into a response that has been sent. */
export async function overviewAfterGuidedRun(runId: string, deckId: string, userId: string, env: NodeJS.ProcessEnv): Promise<void> {
  try {
    const r = await writeGuidedOverview(runId, deckId, userId, env);
    if (!r.done) console.info(`guided deck's overview not written: ${r.reason}`);
  } catch (error) {
    console.warn("the guided deck's overview was not written", error);
  }
}
