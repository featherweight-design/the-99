/**
 * The Overview an upgraded precon deck is started with (Hugh's ruling G13, 2026-11-10). The run's 2 credits cover it: the first Start
 * from a run writes the new deck's Overview at no further credit (`writeUpgradedOverviewFor`, a player-origin synopsis call of 0 units,
 * so its dollars still count toward the owner's month), and its worst case is priced into `FEATURE_CALLS.precon_upgrade`.
 *
 * ONE PER RUN, EVER: `precon_upgrades.overview_at` is claimed by a single conditional update before anything is called, so a second Start
 * from the same run (a deleted deck started again, two tabs) gets nothing and the player's own Write an Overview press, which costs a
 * credit as everywhere, is the way to one. The claim is given back only when the write never reserved a call (no reading, illegal deck,
 * switch paused, over the owner's share, already written): a call that was made and failed keeps it, so a failing model is never retried
 * for free. Run from the start's `after()`; it never throws into a response that has already been sent.
 */
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "../../../db";
import { decks, preconUpgrades } from "../../../db/schema";
import { computeAndStoreProfile, requestProfileDeps } from "../../profile/stored";
import { defaultDeps, writeUpgradedOverviewFor, type WriteResult } from "../../synopsis/generate";
import { preconUpgradeEnabled } from "./flag";

export type UpgradedOverviewResult =
  | { done: false; reason: "off" | "not_upgraded" | "already_claimed" | "released" }
  | { done: true; write: WriteResult };

/** A write that reserved nothing leaves the claim to the next Start; any other outcome used the run's one Overview. */
const reservedNothing = (r: WriteResult): boolean =>
  r.kind === "no_reading" || r.kind === "illegal" || r.kind === "paused" || r.kind === "ownerShare" || r.kind === "allowance";

export async function writeOverviewForUpgradedDeck(deckId: string, userId: string, env: NodeJS.ProcessEnv): Promise<UpgradedOverviewResult> {
  if (!preconUpgradeEnabled(env)) return { done: false, reason: "off" };
  const [deck] = await db.select({ run: decks.builtFromUpgradeId }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  if (!deck?.run) return { done: false, reason: "not_upgraded" };
  const claimed = await db.update(preconUpgrades)
    .set({ overviewAt: new Date() })
    .where(and(eq(preconUpgrades.id, deck.run), eq(preconUpgrades.userId, userId), isNull(preconUpgrades.overviewAt)))
    .returning({ id: preconUpgrades.id });
  if (claimed.length === 0) return { done: false, reason: "already_claimed" };
  let write: WriteResult | null = null;
  // A throw once the write has begun may come after its call was reserved or made, so it keeps the claim; only a throw before it gives it back.
  let began = false;
  try {
    const deps = { ...defaultDeps(), profile: requestProfileDeps(env) };
    // The reading first, as every carry-over does: a first reading writes over nothing, so a landing that got there first is left alone.
    await computeAndStoreProfile(deckId, userId, deps.profile, { firstReading: true });
    began = true;
    write = await writeUpgradedOverviewFor(deckId, userId, deps, env);
    return { done: true, write };
  } finally {
    if (write === null ? !began : reservedNothing(write)) {
      await db.update(preconUpgrades).set({ overviewAt: null }).where(and(eq(preconUpgrades.id, deck.run), eq(preconUpgrades.userId, userId), isNotNull(preconUpgrades.overviewAt)));
    }
  }
}

/** The start's `after()` body. */
export async function overviewAfterUpgradedStart(deckId: string, userId: string, env: NodeJS.ProcessEnv): Promise<void> {
  try {
    const r = await writeOverviewForUpgradedDeck(deckId, userId, env);
    if (!r.done) console.info(`upgraded deck's overview not written: ${r.reason}`);
  } catch (error) {
    console.warn("the upgraded deck's overview was not written", error);
  }
}
