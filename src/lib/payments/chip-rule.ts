import { creditsCopy } from "../copy/credits";
import { freeCount, heldCredits, type Allowance } from "../model/allowance-rule";
import { creditLineKind, expiringPhrase } from "../model/credit-line";
import { readerSeesCredits } from "./visible-rule";

/**
 * THE ACCOUNT MENU'S CHIP (M1b, buying credits U2b), decided here and nowhere else. Pure.
 *
 *   credits   `117 credits`        credits held, or ever bought
 *   free      `3 free credits`     never bought: the free allowance alone
 *   out       `Get more credits`   nothing to spend (hollow diamond), only while payments are on for the reader
 *   expiring  the count in `--warning`, `74 plan credits expire Nov 16` on a line under it (a cancelled plan, within 3 days)
 *
 * The count is free plus plan plus packs: what the reader can still spend, not what today's paid limit allows
 * (that is the credit line's, L5). Absent (`null`) for a reader `readerSeesCredits` turns away. The strings carry
 * the figures already formatted, so the client component holds no rule.
 */
export type ChipState = {
  kind: "credits" | "free" | "out" | "expiring";
  label: string;
  /** The line under the chip, `expiring` only. */
  line: string | null;
  /** The diamond is drawn hollow: nothing to spend. */
  hollow: boolean;
};

export function chipFor(input: { allowance: Allowance; switchOn: boolean; everBought: boolean }, now: Date): ChipState | null {
  const a = input.allowance;
  const held = heldCredits(a) > 0;
  if (!readerSeesCredits({ switchOn: input.switchOn, held, everBought: input.everBought, returning: false })) return null;
  const total = freeCount(a) + heldCredits(a);
  if (creditLineKind(a) === "spent") {
    // Nothing to spend. The offer is a purchase, so it follows the switch; a reader who can no longer buy sees the count.
    return input.switchOn
      ? { kind: "out", label: creditsCopy.chip.out, line: null, hollow: true }
      : { kind: "credits", label: creditsCopy.chip.credits(total), line: null, hollow: true };
  }
  const expiring = expiringPhrase(a, now);
  if (expiring) return { kind: "expiring", label: creditsCopy.chip.credits(total), line: expiring, hollow: false };
  if (held || input.everBought) return { kind: "credits", label: creditsCopy.chip.credits(total), line: null, hollow: false };
  return { kind: "free", label: creditsCopy.chip.free(total), line: null, hollow: false };
}
