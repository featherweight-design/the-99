// The /credits page, the buying-credits line's U1 surfaces: the head, the balance, the pack offer, the purchase
// history, the refund line, the read-failed state and the Checkout return band (R1 to R6).
//
// PLACEHOLDER wording, owed to /copy-review (plan E9, never to Hugh). Transcribed from the handoff's
// `buying-credits · copy strings.ts` (US English, no em dashes). Two groups are NOT in that file and are this
// PR's own placeholders: `buy.*` (the six Buy outcomes the page must say, a toast each) and `hist.receiptFailed`.
// Figures are never baked in: counts, prices and dates arrive as arguments from the server's read.
//
// The credit line's own strings stay in `credits.ts` (`creditsCopy`); the phrase `What uses credits?` is its `link`.

import { PACKS, PLANS, type PackId, type PlanId } from "../payments/packs";
import { creditsCopy } from "./credits";

/** `$5`, `$12.50`: a whole-dollar price carries no cents, as the boards draw it. */
export function dollars(cents: number): string {
  const whole = cents % 100 === 0;
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** A history date, `Oct 16`, in UTC: the server renders it, and a server has no reader clock. */
export function shortDate(at: Date): string {
  return at.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** A pack as the page draws it: the closed registry's facts, never a price typed in a component. */
export type PackOffer = { id: PackId; units: number; price: string };

export function packOffers(ids: readonly PackId[] = Object.keys(PACKS) as PackId[]): PackOffer[] {
  return ids.map((id) => ({ id, units: PACKS[id].units, price: dollars(PACKS[id].priceCents) }));
}

/** A history or card date, `November 16`, in UTC for the same reason as `shortDate`. */
export function longDate(at: Date): string {
  return at.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

/** The plan as the page draws it: the closed registry's facts, never a price typed in a component. */
export type PlanOffer = { id: PlanId; units: number; price: string };

export function planOffer(id: PlanId = "plan50"): PlanOffer {
  return { id, units: PLANS[id].units, price: dollars(PLANS[id].priceCents) };
}

const creditWord = (n: number) => `${n} plan ${n === 1 ? "credit" : "credits"}`;

export const creditsPageCopy = {
  title: "Credits",
  sub: "1 credit is 1 run of any tool",
  /** The sub while the reader's SUGGESTED_CHANGES_V2_ENABLED is on (Hugh 2026-10-30): a v2 run over 10 changes uses 2, so
   *  "any tool" is no longer true. Also the loading screen's, which is drawn before any switch is read: it is true for
   *  every reader and names no 2-credit price. Short enough to keep the phone's one line. */
  subV2: "Most runs use 1 credit",
  /** The phrase after the sub, drawn as the shared link (`CreditsText`). */
  subLink: creditsCopy.link,
  /** C1: browsing costs nothing; only what is written for the reader uses a credit. FINAL (Hugh with the copywriter). */
  viewsFree: "Browsing is always free. Anything we write just for you uses a credit.",
  supportEmail: "support@the-99.dev",
  /** D1/D2: the Manage account interstitial while paid credits are held (plan E6). */
  del: {
    title: (total: number) => `You have ${total} paid ${total === 1 ? "credit" : "credits"}`,
    plan: "Plan",
    packs: "Packs",
    planSub: "roll over while subscribed",
    packsSub: "never expire",
    /** Both sources held: the sentence names each; one source: the split above already says it. */
    says: (plan: number, pack: number) =>
      plan > 0 && pack > 0
        ? `Deleting your account forfeits them: ${plan} plan ${plan === 1 ? "credit" : "credits"} and ${pack} pack ${pack === 1 ? "credit" : "credits"}. Nothing else in Manage account touches them.`
        : "Deleting your account forfeits them. Nothing else in Manage account touches them.",
    refundBefore: "Bought a pack in the last 14 days and not used it? Email ",
    refundAfter: " for a refund before you delete.",
    go: "Continue to Manage account",
    close: "Close",
  },
  /** The refunds line around the address, so it can be drawn as a mailto link (`SupportLink`). */
  refunds: {
    before: "Refunds: email ",
    after: " within 14 days. Unused packs and a plan’s first month come back in full; used credits don’t. A run that fails refunds itself.",
  },
  bal: {
    total: (n: number) => (n === 1 ? "credit to spend" : "credits to spend"),
    order: "Spent in this order",
    free: "Free",
    welcome: "Welcome",
    gift: "Gift",
    plan: "Plan",
    packs: "Packs",
    freeOf: (limit: number) => `of ${limit}`,
    freeNext: (time: string) => `reset at ${time}`,
    freeFull: (limit: number) => `all ${limit} ready`,
    planSub: "roll over",
    packsSub: "never expire",
    added: (units: number) => `+${units}`,
    /** P5: from 15 lot-funded runs today up to one under the player's paid limit (20 unless their group sets one). `time` is the reader's clock, absent before hydration.
     *  "banked", not "paid": the limit counts every run a held lot funds, welcome and gift included (welcome credits D2, Hugh 2026-10-21). */
    near: (used: number, limit: number, time: string | null) =>
      `${used} of ${limit} banked credits used today${time ? ` · the limit resets at ${time}` : ""}. Free credits still run.`,
    /** P5b: at the limit; nothing banked is lost. */
    atLimit: (used: number, limit: number, time: string | null) =>
      `${used} of ${limit} banked credits used today.${time ? ` Back at ${time}.` : ""} Free credits still run, and nothing banked is lost.`,
  },
  pack: {
    k: "Credit pack",
    heading: "Get more credits",
    title: (units: number) => `${units} credits`,
    fine: "Pack credits never expire. They’re forfeited if you delete your account.",
    /** The card already says the count and the price, so the button does not (Hugh, 2026-10-17). */
    buy: "Buy pack",
    /** The button's accessible name: with more than one pack on sale, "Buy pack" alone names none of them; the visible words stay inside the name (label in name). */
    buyAria: (units: number, price: string) => `Buy pack: ${units} credits · ${price}`,
    via: "Checkout on Stripe · US cards",
  },
  /** Why a Buy press did nothing, one line each. Placeholders: not in the handoff's strings file. */
  buy: {
    off: "Buying credits isn’t available right now.",
    invalid: "That pack isn’t available.",
    unverified: "Verify your email address to buy credits.",
    throttled: "Too many tries. Wait a little, then try again.",
    unconfigured: "Buying credits isn’t set up here yet.",
    failed: "Couldn’t start checkout. Try again.",
    already: "You already have a plan.",
    blocked: "Buying is paused on this account. Email support@the-99.dev and we’ll sort it out. Your free credits and everything else work as usual.",
  },
  /** The plan card, every state (K1 to K6). Placeholders from the handoff's `plan` block; dates and counts arrive as arguments. */
  plan: {
    heading: "Your plan",
    k: "Monthly plan",
    title: (units: number) => `${units} credits a month`,
    price: (price: string) => `${price} a month`,
    fine: [
      "Unused plan credits roll over, with no cap, while you stay subscribed.",
      "Renews every month until you cancel. Cancel any time, in one tap, here.",
      "If you cancel, plan credits last until the end of the month you paid for, then expire.",
      "Paid credits are forfeited if you delete your account.",
    ],
    subscribe: (price: string) => `Subscribe · ${price} a month`,
    via: "Checkout on Stripe · US cards",
    active: (on: string | null, price: string) => (on ? `Renews ${on} · ${price}` : price),
    activeLeft: (n: number) => `${creditWord(n)}, rolling over`,
    cancel: "Cancel plan",
    cancelSays: (n: number, on: string | null) => `Canceling keeps your ${creditWord(n)} until ${on ?? "the end of your paid month"}, then they expire. Pack credits aren’t affected.`,
    updateCard: "Update card",
    ended: (on: string | null) => (on ? `Ends ${on}` : "Ends with your paid month"),
    endedSays: (n: number, on: string | null) => `Your ${creditWord(n)} expire on ${on ?? "the last day of your paid month"}. You won’t be charged again.`,
    /** Past due and cancelling: the expiry and the non-renewal only, since Stripe is still retrying the payment. */
    dueEndsSays: (n: number, on: string | null) => `Your ${creditWord(n)} expire on ${on ?? "the last day of your paid month"}. The plan will not renew.`,
    soon: (n: number, days: number, on: string | null) =>
      `Your ${creditWord(n)} expire ${days <= 0 ? "today" : `in ${days} ${days === 1 ? "day" : "days"}`}${on ? `, on ${on}` : ""}.`,
    keep: "Keep my plan",
    keepSays: (on: string | null) => `Keeps your credits and renews${on ? ` on ${on}` : ""}, as before.`,
    cancelledLive: (n: number, on: string | null) => `Plan canceled. Your ${creditWord(n)} last until ${on ?? "the end of your paid month"}.`,
    keptLive: (on: string | null) => `Plan kept.${on ? ` It renews on ${on}.` : ""}`,
    /** Never names a date: the subscription's period end is not the failed invoice's date. */
    dueTitle: "Your payment didn’t go through",
    dueSays: (n: number) => `Your ${creditWord(n)} still work for now. Update your card to keep the plan going; if it ends, they expire.`,
    /** A cancel or keep that was accepted but whose new state has not reached the page yet, and the line when it never does. */
    working: "Updating your plan",
    slow: "Still updating your plan. Reload in a moment to see it.",
    /** Why a Cancel, Keep or Update card press did nothing. Placeholders: not in the handoff's strings file. */
    outcome: {
      off: "Keeping your plan isn’t available right now.",
      blocked: "Buying is paused on this account, so the plan can’t be kept. Email support@the-99.dev and we’ll sort it out.",
      unconfigured: "Plan changes aren’t set up here yet.",
      not_found: "We couldn’t find a plan on your account.",
      failed: "Couldn’t update your plan. Try again.",
      cardFailed: "Couldn’t open the card page. Try again.",
      alreadyCancelled: "Your plan was already canceled.",
      alreadyKept: "Your plan was already set to renew.",
    },
    /** The return band after a plan Checkout (R3). */
    added: (units: number) => `Plan started: ${units} credits added`,
    addedSays: (on: string) => `Renews ${on}. Cancel any time below.`,
  },
  hist: {
    title: "Purchase history",
    receipt: "Receipt",
    /** A placeholder: not in the handoff's strings file. */
    receiptFailed: "Couldn’t open that receipt.",
    empty: "Nothing bought yet. Receipts show here once you do.",
    planMonth: "Monthly plan",
    planFirst: "Monthly plan, first month",
    pack: "Credit pack",
    units: (units: number) => `${units} credits`,
  },
  read: {
    failed: "We couldn’t load your credits.",
    retry: "Try again",
  },
  /** B1: the band in place of the offers while a dispute pauses buying. The address is drawn as the support link. */
  pause: {
    title: "Buying is paused",
    before: "Email ",
    after: " and we’ll sort it out. Your free credits and everything else work as usual.",
  },
  ret: {
    procTitle: (units: number) => `Adding your ${units} credits`,
    procSays: "Payment received. Credits usually land in a second or two.",
    addedPack: (units: number) => `${units} pack credits added`,
    slowTitle: "Still adding your credits",
    /** Around the address, like `refunds`. */
    slowSays: {
      before: "This can take a few minutes. You won’t be charged twice. If they haven’t landed in an hour, email ",
      after: ".",
    },
    cancelled: "Checkout closed. Nothing was charged.",
    dismiss: "Dismiss",
    toast: "Couldn’t check on your purchase.",
    toastDetail: "Trying again in a moment",
  },
} as const;
