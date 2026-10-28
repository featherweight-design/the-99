/**
 * The carry-over on the ARRIVAL visit (small items 5; the-99-d9's rulings, 2026-10-28): "Start with this
 * precon", with or without "I own this precon", lands on the deck with `?from=precon`, and that render
 * COPIES the precon's stored reading and Overview into the deck before it reads the stored reading
 * (`carryStoredOnArrival`), so the header's bracket and the Analysis tab are there at once. Nothing is
 * computed in the render. Every other visit runs nothing.
 *
 * WHEN THE STORED READING IS NOT FRESH FOR THE DECK (none stored yet, or the catalog's data under it moved
 * since the build: `preconReadingFresh`), nothing is copied: the computing carry-over (`carryOverAfterStart`)
 * runs in `after()`, as every start's did before, and the page renders WITHOUT the chip. No pending state is
 * drawn for that window; the tab shows what any unread deck shows until the reading lands.
 *
 * IDEMPOTENT: a deck that already has a reading is left alone, silently (a re-render, a refresh that keeps
 * the parameter, a second arrival), and both writes are first readings that replace nothing. Never throws:
 * the deck renders as every deck does if the copy fails, and the computing carry-over is tried after.
 *
 * The other start (Precons I own, `addPrecons`) has no arrival and keeps its own `after()`.
 */
import { after } from "next/server";
import { carryOverAfterStart } from "./carry-over";
import { carryStoredOnArrival, type StoredCarryResult } from "./stored-carry";

type Deps = {
  copy: (deckId: string, userId: string, env: NodeJS.ProcessEnv) => Promise<StoredCarryResult>;
  later: (fn: () => Promise<void>) => void;
  compute: (deckId: string, userId: string, env: NodeJS.ProcessEnv) => Promise<void>;
};
const DEPS: Deps = { copy: carryStoredOnArrival, later: (fn) => after(fn), compute: carryOverAfterStart };

export async function carryOnArrival(arrived: boolean, deckId: string, userId: string, env: NodeJS.ProcessEnv, deps: Deps = DEPS): Promise<StoredCarryResult | null> {
  if (!arrived) return null;
  let result: StoredCarryResult;
  try {
    result = await deps.copy(deckId, userId, env);
  } catch (error) {
    console.warn("the precon's stored reading was not copied; computing it after the response", error);
    result = { kind: "fallback", reason: "no_reading" };
  }
  // NOT FRESH (or the copy failed): the computing carry-over, after the response, exactly as before.
  if (result.kind === "fallback") deps.later(() => deps.compute(deckId, userId, env));
  return result;
}
