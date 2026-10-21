import { creditsCopy } from "../copy/credits";
import { freeCount, heldCredits, type Allowance } from "../model/allowance-rule";
import { creditLineKind, expiringPhrase, welcomeExpiring } from "../model/credit-line";
import { readerSeesCredits } from "./visible-rule";

/**
 * THE ACCOUNT MENU'S CHIP (M1b, buying credits U2b), decided here and nowhere else. Pure.
 *
 *   credits   `117 credits`        credits held, or ever bought
 *   free      `3 free credits`     never bought: the free allowance alone
 *   out       `Get more credits`   nothing to spend (hollow diamond), only while payments are on for the reader
 *   expiring  the count in `--warning`, `74 plan credits expire Nov 16` on a line under it (a cancelled plan, within 3 days),
 *             or `9 welcome credits expire Nov 20` (the welcome lot, within 3 days). With both, the line names the EARLIER
 *             (welcome credits G5; the welcome lot on a tie, as it is spent first).
 *
 * The count is free plus plan plus packs: what the reader can still spend, not what today's paid limit allows
 * (that is the credit line's, L5). Absent (`null`) for a reader `readerSeesCredits` turns away. The strings carry
 * the figures already formatted, so the client component holds no rule, with one exception: the welcome line's date is
 * the reader's own day (G4), which only the client knows, so it arrives as `welcomeExpiring` (the count and the instant)
 * and `CreditChip` formats it with `creditsCopy.welcomeExpiring` after hydration.
 */
export type ChipState = {
  kind: "credits" | "free" | "out" | "expiring";
  label: string;
  /** The line under the chip, `expiring` only: a cancelled plan's, already worded. Null when the welcome line is drawn. */
  line: string | null;
  /** `expiring` for the welcome lot only: what the line under the chip says, formatted in the reader's day by the client. */
  welcomeExpiring?: { n: number; atMs: number };
  /** The diamond is drawn hollow: nothing to spend. */
  hollow: boolean;
};

export function chipFor(input: { allowance: Allowance; switchOn: boolean; everBought: boolean; planHeld?: boolean }, now: Date): ChipState | null {
  const a = input.allowance;
  const held = heldCredits(a) > 0;
  if (!readerSeesCredits({ switchOn: input.switchOn, held, everBought: input.everBought, returning: false, planHeld: input.planHeld })) return null;
  const total = freeCount(a) + heldCredits(a);
  if (creditLineKind(a) === "spent") {
    // Nothing to spend. The offer is a purchase, so it follows the switch; a reader who can no longer buy sees the count.
    return input.switchOn
      ? { kind: "out", label: creditsCopy.chip.out, line: null, hollow: true }
      : { kind: "credits", label: creditsCopy.chip.credits(total), line: null, hollow: true };
  }
  const plan = expiringPhrase(a, now);
  const welcome = welcomeExpiring(a, now);
  if (welcome && (!plan || welcome.at.getTime() <= (a.planExpiresAt?.getTime() ?? Infinity))) {
    return { kind: "expiring", label: creditsCopy.chip.credits(total), line: null, welcomeExpiring: { n: welcome.n, atMs: welcome.at.getTime() }, hollow: false };
  }
  if (plan) return { kind: "expiring", label: creditsCopy.chip.credits(total), line: plan, hollow: false };
  if (held || input.everBought || input.planHeld) return { kind: "credits", label: creditsCopy.chip.credits(total), line: null, hollow: false };
  return { kind: "free", label: creditsCopy.chip.free(total), line: null, hollow: false };
}
