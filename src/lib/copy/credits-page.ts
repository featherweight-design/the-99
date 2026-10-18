// The /credits page, the buying-credits line's U1 surfaces: the head, the balance, the pack offer, the purchase
// history, the refund line, the read-failed state and the Checkout return band (R1 to R6).
//
// PLACEHOLDER wording, owed to /copy-review (plan E9, never to Hugh). Transcribed from the handoff's
// `buying-credits · copy strings.ts` (US English, no em dashes). Two groups are NOT in that file and are this
// PR's own placeholders: `buy.*` (the six Buy outcomes the page must say, a toast each) and `hist.receiptFailed`.
// Figures are never baked in: counts, prices and dates arrive as arguments from the server's read.
//
// The credit line's own strings stay in `credits.ts` (`creditsCopy`); the phrase `What uses credits?` is its `link`.

import { PACKS, type PackId } from "../payments/packs";
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

export const creditsPageCopy = {
  title: "Credits",
  sub: "1 credit is 1 run of any tool",
  /** The phrase after the sub, drawn as the shared link (`CreditsText`). */
  subLink: creditsCopy.link,
  supportEmail: "support@the-99.dev",
  /** The refunds line around the address, so it can be drawn as a mailto link (`SupportLink`). */
  refunds: {
    before: "Refunds: email ",
    after: " within 14 days. Unused packs and a plan’s first month come back in full; used credits don’t. A run that fails refunds itself.",
  },
  bal: {
    total: "credits to spend",
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
    /** P5: from 15 paid runs today up to one under the player's paid limit (20 unless their group sets one). `time` is the reader's clock, absent before hydration. */
    near: (used: number, limit: number, time: string | null) =>
      `${used} of ${limit} paid credits used today${time ? ` · the limit resets at ${time}` : ""}. Free credits still run.`,
    /** P5b: at the limit; nothing banked is lost. */
    atLimit: (used: number, limit: number, time: string | null) =>
      `${used} of ${limit} paid credits used today.${time ? ` Back at ${time}.` : ""} Free credits still run, and nothing banked is lost.`,
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
