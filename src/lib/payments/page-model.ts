import { freeCount, heldCredits } from "../model/allowance-rule";
import type { CreditHistoryRow } from "./return";
import { paidToday, type PaidToday } from "./paid-today-rule";
import { readerSeesCredits, readerSeesOffers, readerSeesPause } from "./visible-rule";
import { creditsPageCopy, dollars, longDate, planOffer, shortDate, type PackOffer, type PlanOffer } from "../copy/credits-page";
import { planCardFacts, type PlanCardState, type PlanSubscriptionFacts } from "./plan-card-rule";
import { daysUntil, expiringAt } from "./welcome-sheet";

/**
 * What `/credits` draws, from what the server read. Pure: the page reads, this decides.
 *
 * - VISIBLE (`readerSeesCredits`, plan E3): the switch is on, or credits are held, or the account has ever
 *   bought (any `credit_grants` row). Otherwise the page is `notFound()`.
 * - OFFERS only while the switch is on and buying is not paused (`readerSeesOffers`). With the switch off the page
 *   keeps balances, history and the refund line and draws NO offers section (O4): `offers` is null, never an empty
 *   list. With buying paused by a dispute (B1) the offers go the same way and the pause band stands in their place.
 * - CELLS in spend order, free first. Free is always drawn. A Plan or Packs cell is drawn only for a source the
 *   reader holds now or has held once (a grant row of that source), never an empty one for a reader who never
 *   bought. The total is the sum of every source, drawn or not.
 */
export type BalanceCell = {
  key: "free" | "welcome" | "plan" | "gift" | "pack";
  value: number;
  /** The Welcome cell's lot (welcome credits R2): when it stops funding runs, whether that is within the 3 days the
   *  credit line warns at, and the whole days left. Absent on every other cell. */
  expires?: { atMs: number; expiring: boolean; days: number };
};

export type HistoryItem = {
  id: string;
  /** `Oct 16`, UTC. */
  date: string;
  label: string;
  units: number;
  /** `$5.31`, what the payment record says was PAID (tax included), or null when no record backs the lot. */
  amount: string | null;
  /** The Checkout Session id a Receipt is fetched by, or null (a lot with no Session has no receipt link). */
  sessionId: string | null;
  /** A plan month's invoice id (its lot's `external_id`), which its Receipt is fetched by, or null. */
  invoiceId: string | null;
};

/** The plan card (K1 to K6), formatted for the client: dates are the server's, in UTC, like the history's. */
export type PlanCardModel = {
  state: PlanCardState;
  /** Set to end at the period end, in any plan-holding state (a past-due plan can be cancelling too). */
  cancelling: boolean;
  offer: PlanOffer;
  /** `November 16`: when the plan renews (active, past due) or ends (cancelled, ending), or null. */
  on: string | null;
  /** Plan credits held now (active, past due) or lapsing on `on` (cancelled, ending). */
  credits: number;
  /** Whole days left on a cancelled plan; null otherwise. */
  days: number | null;
};

export type CreditsModel = {
  total: number;
  freeLeft: number;
  freeLimit: number;
  /** When the next free credit comes back, ms since epoch, or null while all are ready. */
  nextAtMs: number | null;
  cells: BalanceCell[];
  offers: PackOffer[] | null;
  /** B1: a dispute paused this reader's buying, so the pause band stands where the offers would (`readerSeesPause`). */
  paused: boolean;
  history: HistoryItem[];
  /** P5 / P5b: the daily paid line, or null below 15 paid runs (or with no paid lot). */
  paidToday: PaidToday | null;
  /** The plan card, or null while there is nothing to draw: no plan and no offer (the switch is off). */
  plan: PlanCardModel | null;
};

export type AllowanceFacts = { used: number; limit: number; nextAt: Date | null; welcome?: number; plan?: number; gift?: number; pack?: number; paidUsedToday?: number; paidLimit?: number; paidBackAt?: Date | null; paidNextAt?: Date | null; planExpiresAt?: Date | null; welcomeExpiresAt?: Date | null; planExpiring?: number; planByExpiry?: { at: Date | null; n: number }[] };

export function buildCreditsModel(input: {
  switchOn: boolean;
  allowance: AllowanceFacts;
  history: readonly CreditHistoryRow[];
  /** The packs on sale. The page passes the registry's (`packOffers()`); a test passes a second to prove the layout. */
  offers: readonly PackOffer[];
  /** A valid return from a Checkout of this reader's own (`ReturnProp` of kind `done` with a read), switch state aside. */
  returning?: boolean;
  /** Whether a dispute paused this reader's buying (`purchaseBlocked`, K2). */
  blocked?: boolean;
  /** The reader's newest subscription row (`readPlanFacts`), or null. */
  subscription?: PlanSubscriptionFacts | null;
  /** The clock the plan card's days are counted from; a test passes one. */
  now?: Date;
}): { sees: false } | { sees: true; model: CreditsModel } {
  const { allowance: a, history } = input;
  const welcome = a.welcome ?? 0;
  const plan = a.plan ?? 0;
  const gift = a.gift ?? 0;
  const pack = a.pack ?? 0;
  const held = heldCredits(a) > 0;
  const facts = planCardFacts(input.subscription ?? null, a, input.now ?? new Date());
  // A live plan keeps the page even with no credit yet and no history: its first invoice may not have granted.
  if (!readerSeesCredits({ switchOn: input.switchOn, held, everBought: history.length > 0, returning: input.returning ?? false, planHeld: facts.state !== "offer" })) return { sees: false };
  const freeLeft = freeCount(a);
  const oncePack = history.some((r) => r.source === "pack");
  const cells: BalanceCell[] = [{ key: "free", value: freeLeft }];
  // The welcome lot is spent after the free allowance and before the others, so its cell sits second. It is drawn only
  // while it holds a credit: it is never bought, so there is no empty cell to explain (D1; D2 owns its wording).
  // Its line names when the lot expires (R1 Open 4), counted from the same clock as the plan card's days.
  const welcomeAt = a.welcomeExpiresAt ?? null;
  const now = input.now ?? new Date();
  if (welcome > 0) {
    cells.push({
      key: "welcome",
      value: welcome,
      ...(welcomeAt ? { expires: { atMs: welcomeAt.getTime(), expiring: expiringAt(welcomeAt, now), days: daysUntil(welcomeAt, now) } } : {}),
    });
  }
  // The Plan cell goes once the plan credits are gone and no plan is held (K6): never a cell at 0 forever. A held plan with
  // everything spent still draws it, because the card beside it says the plan renews.
  if (plan > 0 || facts.state !== "offer") cells.push({ key: "plan", value: plan });
  // A gift (an admin's support grant, admin plan A-R5) is spent after plan and before pack, and like the welcome lot it
  // is never bought, so its cell is drawn only while it holds a credit.
  if (gift > 0) cells.push({ key: "gift", value: gift });
  if (pack > 0 || oncePack) cells.push({ key: "pack", value: pack });
  // The offer is a purchase, so it follows the switch; a plan the reader already holds is theirs to manage (O2, O3).
  const planCard: PlanCardModel | null = facts.state === "offer" && !input.switchOn ? null : {
    state: facts.state,
    cancelling: facts.cancelling,
    offer: planOffer(),
    on: facts.endsAt ? longDate(facts.endsAt) : null,
    credits: planCreditsFor(a, input.subscription ?? null, facts.cancelling),
    days: facts.days,
  };
  return {
    sees: true,
    model: {
      total: freeLeft + welcome + plan + gift + pack,
      freeLeft,
      freeLimit: a.limit,
      nextAtMs: a.nextAt ? a.nextAt.getTime() : null,
      cells,
      offers: readerSeesOffers({ switchOn: input.switchOn, blocked: input.blocked ?? false }) ? [...input.offers] : null,
      paused: readerSeesPause({ switchOn: input.switchOn, blocked: input.blocked ?? false }),
      history: history.map(historyItem),
      paidToday: paidToday(a),
      plan: planCard,
    },
  };
}

const usd = (cents: number) => dollars(cents).includes(".") ? dollars(cents) : `${dollars(cents)}.00`;

export function historyItem(r: CreditHistoryRow): HistoryItem {
  return {
    id: r.id,
    date: shortDate(r.createdAt),
    label: r.source === "plan" ? (r.billingReason === "subscription_create" ? creditsPageCopy.hist.planFirst : creditsPageCopy.hist.planMonth) : creditsPageCopy.hist.pack,
    units: r.units,
    amount: r.amountCents !== null && r.currency === "usd" ? usd(r.amountCents) : null,
    sessionId: r.externalId?.startsWith("cs_") ? r.externalId : null,
    invoiceId: r.source === "plan" && r.externalId?.startsWith("in_") ? r.externalId : null,
  };
}

/**
 * The plan credits the card names. The expiry breakdown (`planByExpiry`), when supplied, is AUTHORITATIVE: the current
 * subscription's lots are the ones that roll over (no expiry) or, once it is cancelling, the ones that lapse on its period
 * end (the webhook sets exactly that instant), and an older subscription's lots carry their own earlier expiry and are
 * never counted here. Nothing matching is zero, not the older lots. Without a breakdown the account's figures stand.
 */
export function planCreditsFor(a: AllowanceFacts, sub: PlanSubscriptionFacts | null, cancelling: boolean): number {
  const total = a.plan ?? 0;
  const groups = a.planByExpiry;
  if (!groups) return cancelling ? (a.planExpiring ?? total) : total;
  const sum = (match: (at: Date | null) => boolean) => groups.filter((g) => match(g.at)).reduce((n, g) => n + g.n, 0);
  const rolling = sum((at) => at === null);
  if (!cancelling) return rolling;
  const end = sub?.currentPeriodEnd?.getTime() ?? null;
  const onEnd = end === null ? 0 : sum((at) => at?.getTime() === end);
  return onEnd > 0 ? onEnd : rolling;
}
