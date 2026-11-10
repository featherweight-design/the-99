import { MIN_SWAPS } from "./constants";

/**
 * Whether an upgrade run is charged its `UPGRADE_UNITS` or refunded whole (credits are never split, as v2's). Charged only
 * when the checked answer reaches `MIN_SWAPS` kept pairs. A short answer is the model's: the player's own limits here
 * (the card cap) are the pool's filter, not a restriction they set. Pure.
 */
export type UpgradeCharge =
  | { outcome: "spent" }
  | { outcome: "refunded"; why: "failed" | "ungrounded" | "short" | "bracket" };

/** `missed`: the kept swaps do not land the deck at the bracket the player chose (`shortfall`), which is the model's shortfall as well. */
export function upgradeChargeFor(run: { failed: boolean; kept: number; missed?: boolean }): UpgradeCharge {
  if (run.failed) return { outcome: "refunded", why: "failed" };
  if (run.kept === 0) return { outcome: "refunded", why: "ungrounded" };
  if (run.kept < MIN_SWAPS) return { outcome: "refunded", why: "short" };
  if (run.missed) return { outcome: "refunded", why: "bracket" };
  return { outcome: "spent" };
}
