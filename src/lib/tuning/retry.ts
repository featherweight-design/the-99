import { costMicroUsd, featureWorstCaseMicroUsd } from "../model/prices";
import type { ModelFeature } from "../model/allowance-rule";
import type { Billed } from "../model/allowance";
import { MODEL_TIMEOUT_MS, TUNING_RETRY_FLOOR_MS } from "./limits";

/**
 * Whether an answer with nothing to show earns ONE more ask (a degenerate reply, or every suggestion
 * dropped). Never when every drop was a locked card (`locked_only` is the player's own state, and asking
 * again says the same), when the first ask already cost more than half the reservation (the reservation is
 * two attempts; the second ask is one attempt with no retry inside it, so the two stay within it only if the
 * first used no more than one attempt's worth), or when a whole attempt no longer fits the deadline.
 */
export function retryable(
  billed: readonly Billed[], drops: readonly { rule: string }[], elapsedMs: number,
  /** The tool asking, whose reservation the two asks must stay inside, and the drop rule that is the player's own state. */
  tool: { feature: ModelFeature; lockedRule: string } = { feature: "tuning", lockedRule: "neverCut" },
): boolean {
  if (billed.length === 0) return false;
  if (drops.length > 0 && drops.every((d) => d.rule === tool.lockedRule)) return false;
  if (billed.reduce((sum, b) => sum + costMicroUsd(b.model, b.usage), 0) * 2 > featureWorstCaseMicroUsd(tool.feature, billed[0].model)) return false;
  return MODEL_TIMEOUT_MS - elapsedMs >= TUNING_RETRY_FLOOR_MS;
}
