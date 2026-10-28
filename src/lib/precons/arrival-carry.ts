/**
 * The carry-over on the ARRIVAL visit (small items 5; the-99-d9's ruling, 2026-10-28): "Start with this
 * precon", with or without "I own this precon", lands on the deck with `?from=precon`, and that render
 * runs the carry-over INLINE before it reads the stored reading, so the header's bracket and the Analysis
 * tab's reading and Overview are there at once and no pending state exists to draw. Every other visit
 * reads what is stored and runs nothing.
 *
 * IDEMPOTENT: the carry-over's reading is a FIRST reading (`computeAndStoreProfile` with `firstReading`),
 * which writes nothing over a row of any kind and returns before the Overview step, so a re-render, a
 * refresh that keeps the parameter or a second arrival is a no-op. `probe:precon-overview-carry` proves it
 * against a real database. Never throws (`carryOverAfterStart`): the deck renders as every deck does if
 * the carry-over fails.
 *
 * The other start (Precons I own, `addPrecons`) has no arrival and keeps its `after()`.
 */
import { carryOverAfterStart } from "./carry-over";

export function carryOnArrival(
  arrived: boolean,
  deckId: string,
  userId: string,
  env: NodeJS.ProcessEnv,
  run: (deckId: string, userId: string, env: NodeJS.ProcessEnv) => Promise<void> = carryOverAfterStart,
): Promise<void> {
  return arrived ? run(deckId, userId, env) : Promise.resolve();
}
