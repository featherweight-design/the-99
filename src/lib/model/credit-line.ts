import { creditsCopy } from "../copy/credits";
import { freeCount, freeRoom, hasCredit, heldCredits, paidAtLimit, type Allowance, type RunFunding } from "./allowance-rule";

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
 *
 * WELCOME CREDITS (D2, Line-and-Chip W1 to W6) take their own segment, in spend order: `1 of 1 free · 15 welcome · 40
 * paid`. `paid` is what is held less the welcome lot (a gift stays in it, as shipped). While the welcome lot holds a
 * credit it funds the next lot-funded run (`SOURCE_RANK`), so L3 reads `this run uses 1 of 15 welcome` and `first` says
 * `Uses a welcome credit.`; L5 names welcome among what is banked. Within three days of the lot's expiry L2/L3 carry
 * a welcome tail shaped like L7's, dated in the reader's own day, which `CreditsText` draws only after hydration. A
 * reader with no welcome credit reads every shipped form byte for byte.
 */
export type LineAllowance = Pick<Allowance, "used" | "limit" | "nextAt" | "reopensAt"> &
  Partial<Pick<Allowance, "welcome" | "plan" | "gift" | "pack" | "paidUsedToday" | "paidLimit" | "paidBackAt" | "planExpiresAt" | "planExpiring" | "welcomeExpiresAt" | "payments">>;

export type CreditLineKind = "free" | "withPaid" | "paidNext" | "spent" | "limit" | "limitFree";

/** Three days, the lead time the warning is drawn at (handoff G9). */
export const EXPIRY_WARNING_MS = 3 * 24 * 60 * 60 * 1000;

const paidHeld = (a: LineAllowance) => heldCredits(a);
/** The welcome credits left, which a line counts in their own segment. */
const welcomeLeft = (a: LineAllowance) => Math.max(0, a.welcome ?? 0);
/** The `paid` figure a line shows: what is held less the welcome lot (plan, gift and packs as one number). */
const paidShown = (a: LineAllowance) => paidHeld(a) - welcomeLeft(a);
/** The next lot-funded run spends a welcome credit: the welcome lot is first in `SOURCE_RANK` while it holds one. A
 *  surface that words its own paid form (`againPaid`, `writesPaid`) asks this to say a welcome credit instead. */
export const welcomeNext = (a: LineAllowance) => welcomeLeft(a) > 0;

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
  const plan = a.planExpiring ?? 0;
  if (!a.planExpiresAt || plan <= 0) return null;
  const ahead = a.planExpiresAt.getTime() - now.getTime();
  return ahead >= 0 && ahead <= EXPIRY_WARNING_MS ? creditsCopy.expiring(plan, a.planExpiresAt) : null;
}

/**
 * The welcome lot's warning, or null: credits left and the lot within three days of its expiry (the plan's lead,
 * `EXPIRY_WARNING_MS`). The whole lot lapses at once, so the figure is every welcome credit left. Exported for the chip.
 */
export function welcomeExpiring(a: LineAllowance, now: Date): { n: number; at: Date } | null {
  const n = welcomeLeft(a);
  if (!a.welcomeExpiresAt || n <= 0) return null;
  const ahead = a.welcomeExpiresAt.getTime() - now.getTime();
  return ahead >= 0 && ahead <= EXPIRY_WARNING_MS ? { n, at: a.welcomeExpiresAt } : null;
}

/** Every expiry tail L2/L3 carry, in spend order: the welcome lot's, then the plan's (G5: the line names both). */
function expiringTail(a: LineAllowance, now: Date): string {
  const w = welcomeExpiring(a, now);
  const plan = expiringPhrase(a, now);
  return `${w ? ` · ${creditsCopy.welcomeExpiring(w.n, w.at)}` : ""}${plan ? ` · ${plan}` : ""}`;
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
  const tail = kind === "withPaid" || kind === "paidNext" ? expiringTail(a, now) : "";
  const left = freeCount(a);
  if (kind === "withPaid" || kind === "paidNext") return `${creditsCopy.withPaid(left, a.limit, freeNext(a), paidShown(a), welcomeLeft(a))}${tail}`;
  if (kind === "limitFree") return creditsCopy.limitFree(left, a.limit, a.nextAt, a.paidBackAt!);
  return creditsCopy.standing(left, a.limit, freeNext(a));
}

/** The line when no press can start: L4 or L5. `Get more credits` is its own line, only on L4 and only while payments are on. */
export function creditSpent(a: LineAllowance): string {
  if (creditLineKind(a) === "limit") return creditsCopy.limit(a.paidLimit ?? 0, paidShown(a), backAt(a), welcomeLeft(a));
  const line = creditsCopy.spent(a.limit, a.reopensAt ?? a.nextAt);
  return creditsCopy.withMore(line, a.payments === true);
}

/** Beside a press that spends for the first time on a surface. */
export function creditFirst(a: LineAllowance, now: Date = new Date()): string {
  const kind = creditLineKind(a);
  if (kind === "spent" || kind === "limit") return creditSpent(a);
  if (kind === "free") return creditsCopy.first(freeCount(a), a.limit, a.nextAt);
  if (kind !== "paidNext") return creditsCopy.usesCredit(creditCount(a, now));
  return (welcomeNext(a) ? creditsCopy.firstWelcome : creditsCopy.firstPaid)(creditCount(a, now));
}

/** Beside a press that replaces what is on screen. */
export function creditAgain(a: LineAllowance, now: Date = new Date()): string {
  const kind = creditLineKind(a);
  if (kind === "spent" || kind === "limit") return creditSpent(a);
  if (kind === "free") return creditsCopy.again(freeCount(a), a.limit, a.nextAt);
  if (kind !== "paidNext") return creditsCopy.replacesUsesCredit(creditCount(a, now));
  return (welcomeNext(a) ? creditsCopy.againWelcome : creditsCopy.againPaid)(creditCount(a, now));
}

/** The line standing alone (no lead): the count, or the spent/limit form. L3 reads "this run uses 1 of N paid". */
export function creditStanding(a: LineAllowance, now: Date = new Date()): string {
  const kind = creditLineKind(a);
  if (kind === "spent" || kind === "limit") return creditSpent(a);
  if (kind === "paidNext") return `${creditsCopy.paidNext(a.limit, freeNext(a), paidShown(a), welcomeLeft(a))}${expiringTail(a, now)}`;
  return creditCount(a, now);
}

/**
 * The line beside a press whose run costs 2 credits and can start (Small items 7, SC-Cost B, D and E): the source and the
 * count in `lead`, why it is 2 in `why` (drawn in `--fg-body`), then the count that source is spent from. Null for a
 * 1-credit run, which keeps the shipped line, and for a run that cannot start (`short`/`spent`: the surface draws those).
 */
export function creditTwo(a: LineAllowance, f: RunFunding, now: Date = new Date()): { lead: string; why: string; count: string } | null {
  if (f.units < 2) return null;
  if (f.source === "free") {
    return {
      lead: creditsCopy.two.lead("free"),
      why: creditsCopy.two.whyFree,
      count: creditsCopy.two.freeAfter(f.freeLeft, a.limit, f.freeAfter, a.nextAt, paidShown(a), welcomeLeft(a)),
    };
  }
  if (f.source === "welcome" || f.source === "paid") {
    return { lead: creditsCopy.two.lead(f.source), why: creditsCopy.two.whyLot, count: creditsCopy.two.count(creditCount(a, now)) };
  }
  return null;
}
