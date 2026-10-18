import { creditsCopy } from "../copy/credits";
import { freeCount, freeRoom, hasCredit, heldCredits, paidAtLimit, type Allowance } from "./allowance-rule";

/**
 * THE CREDIT LINE, as every spend surface draws it (buying credits U2b, frames L1 to L8). Pure.
 *
 * Which line a reader sees is decided here from the two rules `allowance-rule.ts` owns (`freeRoom`/`hasCredit`/
 * `paidAtLimit`); no surface compares a count itself. Nothing here says whether a press is open: that is
 * `hasCredit`, asked by the surface. These are the WORDS under it.
 *
 *   free        L1  nothing bought: the shipped line
 *   withPaid    L2  a free credit left, paid held
 *   paidNext    L3  free spent, the next run takes a paid credit
 *   spent       L4  nothing to spend (`Get more credits` under it only while payments are on, L8 otherwise)
 *   limit       L5  free spent and today's paid limit reached
 *   limitFree   L6  a free credit left but the paid limit reached
 *
 * L7 (a cancelled plan within three days of lapsing) is a suffix on L2/L3, drawn in `--warning` by `CreditsText`.
 */
export type LineAllowance = Pick<Allowance, "used" | "limit" | "nextAt" | "reopensAt"> &
  Partial<Pick<Allowance, "welcome" | "plan" | "pack" | "paidUsedToday" | "paidLimit" | "paidBackAt" | "planExpiresAt" | "payments">>;

export type CreditLineKind = "free" | "withPaid" | "paidNext" | "spent" | "limit" | "limitFree";

/** Three days, the lead time the warning is drawn at (handoff G9). */
export const EXPIRY_WARNING_MS = 3 * 24 * 60 * 60 * 1000;

const paidHeld = (a: LineAllowance) => heldCredits(a);

export function creditLineKind(a: LineAllowance): CreditLineKind {
  const held = paidHeld(a) > 0;
  if (freeRoom(a)) {
    if (!held) return "free";
    return paidAtLimit(a) && a.paidBackAt ? "limitFree" : "withPaid";
  }
  if (!held) return "spent";
  return hasCredit(a) ? "paidNext" : "limit";
}

/** When the free count next rises: the oldest unit leaving once none is left, the next one otherwise. */
function freeNext(a: LineAllowance): Date | null {
  return freeRoom(a) ? a.nextAt : a.reopensAt ?? a.nextAt;
}

/** L7's phrase, or null: plan credits that lapse (a cancel set `planExpiresAt`) within three days. */
export function expiringPhrase(a: LineAllowance, now: Date): string | null {
  const plan = a.plan ?? 0;
  if (!a.planExpiresAt || plan <= 0) return null;
  const ahead = a.planExpiresAt.getTime() - now.getTime();
  return ahead >= 0 && ahead <= EXPIRY_WARNING_MS ? creditsCopy.expiring(plan, a.planExpiresAt) : null;
}

/** The earlier of the next free credit and the paid limit's reset: when anything can run again. */
function backAt(a: LineAllowance): Date | null {
  const free = freeNext(a);
  const paid = a.paidBackAt ?? null;
  if (free && paid) return free.getTime() <= paid.getTime() ? free : paid;
  return free ?? paid;
}

/** The count a surface composes its own lead around (`read.again(count)`): never the spent or limit forms. */
export function creditCount(a: LineAllowance, now: Date = new Date()): string {
  const kind = creditLineKind(a);
  const expiring = kind === "withPaid" || kind === "paidNext" ? expiringPhrase(a, now) : null;
  const tail = expiring ? ` · ${expiring}` : "";
  const held = paidHeld(a);
  const left = freeCount(a);
  if (kind === "withPaid" || kind === "paidNext") return `${creditsCopy.withPaid(left, a.limit, freeNext(a), held)}${tail}`;
  if (kind === "limitFree") return creditsCopy.limitFree(left, a.limit, a.nextAt, a.paidBackAt!);
  return creditsCopy.standing(left, a.limit, freeNext(a));
}

/** The line when no press can start: L4 or L5. `Get more credits` is its own line, only on L4 and only while payments are on. */
export function creditSpent(a: LineAllowance): string {
  if (creditLineKind(a) === "limit") return creditsCopy.limit(a.paidLimit ?? 0, paidHeld(a), backAt(a));
  const line = creditsCopy.spent(a.limit, a.reopensAt ?? a.nextAt);
  return creditsCopy.withMore(line, a.payments === true);
}

/** Beside a press that spends for the first time on a surface. */
export function creditFirst(a: LineAllowance, now: Date = new Date()): string {
  const kind = creditLineKind(a);
  if (kind === "spent" || kind === "limit") return creditSpent(a);
  if (kind === "free") return creditsCopy.first(freeCount(a), a.limit, a.nextAt);
  return kind === "paidNext" ? creditsCopy.firstPaid(creditCount(a, now)) : creditsCopy.usesCredit(creditCount(a, now));
}

/** Beside a press that replaces what is on screen. */
export function creditAgain(a: LineAllowance, now: Date = new Date()): string {
  const kind = creditLineKind(a);
  if (kind === "spent" || kind === "limit") return creditSpent(a);
  if (kind === "free") return creditsCopy.again(freeCount(a), a.limit, a.nextAt);
  return kind === "paidNext" ? creditsCopy.againPaid(creditCount(a, now)) : creditsCopy.replacesUsesCredit(creditCount(a, now));
}

/** The line standing alone (no lead): the count, or the spent/limit form. L3 reads "this run uses 1 of N paid". */
export function creditStanding(a: LineAllowance, now: Date = new Date()): string {
  const kind = creditLineKind(a);
  if (kind === "spent" || kind === "limit") return creditSpent(a);
  if (kind === "paidNext") {
    const expiring = expiringPhrase(a, now);
    return `${creditsCopy.paidNext(a.limit, freeNext(a), paidHeld(a))}${expiring ? ` · ${expiring}` : ""}`;
  }
  return creditCount(a, now);
}
