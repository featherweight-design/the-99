import type { ModelErrorClass, ModelOutcome } from "../../model/client";
import { upgradeChargeFor, type UpgradeCharge } from "./charge";
import { MIN_SWAPS, REPAIR_MAX_TOKENS, UPGRADE_CALL_DEADLINE_MS, UPGRADE_MAX_TOKENS } from "./constants";
import { buildRepairPrompt, buildUpgradePrompt, type UpgradeInput, type UpgradeReply } from "./prompt";
import { buyTotalCents, validateUpgrade, type DeckEntry, type PoolEntry, type UpgradeDrop, type UpgradePair } from "./validate";

/**
 * One upgrade run: ONE model call, checked in code, and ONE repair call only when the checked answer falls short of
 * `MIN_SWAPS`. Model-agnostic, as `runV2` is: the caller injects `callModel`, so this holds the order of the calls and what
 * each answer must pass, and nothing about transport, the ledger or the database. The bracket after is the caller's to
 * compute from the post-swap list (the model's own claim was unchecked in 19 of 19 measured runs).
 */

export type UpgradeCallRequest = {
  stage: "first" | "repair";
  system: string;
  user: string;
  maxTokens: number;
  deadlineMs: number;
};
export type UpgradeCallModel = (req: UpgradeCallRequest) => Promise<ModelOutcome<UpgradeReply>>;

export type UpgradeRunReport = {
  pairs: UpgradePair[];
  drops: UpgradeDrop[];
  buyTotalCents: number;
  /** Calls made: 1, or 2 with the repair. */
  calls: 1 | 2;
  /** The error class of a call that failed: the first (no repair is made, no pairs) or the repair (the first answer's pairs are kept). Read `charge` and `pairs`, not this, to decide what to show. */
  failed: ModelErrorClass | null;
  charge: UpgradeCharge;
};

export async function runUpgrade(args: {
  input: UpgradeInput;
  deck: readonly DeckEntry[];
  pool: readonly PoolEntry[];
  callModel: UpgradeCallModel;
}): Promise<UpgradeRunReport> {
  const { input, deck, pool, callModel } = args;
  const done = (pairs: UpgradePair[], drops: UpgradeDrop[], calls: 1 | 2, failed: ModelErrorClass | null): UpgradeRunReport => ({
    pairs, drops, buyTotalCents: buyTotalCents(pairs), calls, failed,
    charge: upgradeChargeFor({ failed: failed !== null && pairs.length === 0, kept: pairs.length }),
  });

  const first = await callModel({ stage: "first", ...buildUpgradePrompt(input), maxTokens: UPGRADE_MAX_TOKENS, deadlineMs: UPGRADE_CALL_DEADLINE_MS });
  if (!first.ok) return done([], [], 1, first.errorClass);
  const one = validateUpgrade(first.value.swaps, { deck, pool });
  if (one.kept.length >= MIN_SWAPS) return done(one.kept, one.drops, 1, null);

  const repair = await callModel({ stage: "repair", ...buildRepairPrompt(input, one.kept, one.drops), maxTokens: REPAIR_MAX_TOKENS, deadlineMs: UPGRADE_CALL_DEADLINE_MS });
  // A failed repair keeps the first answer's kept pairs; the charge rule then judges them (short is refunded).
  if (!repair.ok) return done(one.kept, one.drops, 2, repair.errorClass);
  const two = validateUpgrade(repair.value.swaps, { deck, pool, already: one.kept });
  return done([...one.kept, ...two.kept], [...one.drops, ...two.drops], 2, null);
}
