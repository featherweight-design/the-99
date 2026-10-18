import { freeCount, heldCredits } from "../model/allowance-rule";
import type { CreditHistoryRow } from "./return";
import { paidToday, type PaidToday } from "./paid-today-rule";
import { readerSeesCredits, readerSeesOffers } from "./visible-rule";
import { creditsPageCopy, dollars, shortDate, type PackOffer } from "../copy/credits-page";

/**
 * What `/credits` draws, from what the server read. Pure: the page reads, this decides.
 *
 * - VISIBLE (`readerSeesCredits`, plan E3): the switch is on, or credits are held, or the account has ever
 *   bought (any `credit_grants` row). Otherwise the page is `notFound()`.
 * - OFFERS only while the switch is on (`readerSeesOffers`). With it off the page keeps balances, history and the
 *   refund line and draws NO offers section (O4): `offers` is null, never an empty list.
 * - CELLS in spend order, free first. Free is always drawn. A Plan or Packs cell is drawn only for a source the
 *   reader holds now or has held once (a grant row of that source), never an empty one for a reader who never
 *   bought. The total is the sum of every source, drawn or not.
 */
export type BalanceCell = { key: "free" | "welcome" | "plan" | "pack"; value: number };

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
};

export type CreditsModel = {
  total: number;
  freeLeft: number;
  freeLimit: number;
  /** When the next free credit comes back, ms since epoch, or null while all are ready. */
  nextAtMs: number | null;
  cells: BalanceCell[];
  offers: PackOffer[] | null;
  history: HistoryItem[];
  /** P5 / P5b: the daily paid line, or null below 15 paid runs (or with no paid lot). */
  paidToday: PaidToday | null;
};

export type AllowanceFacts = { used: number; limit: number; nextAt: Date | null; welcome?: number; plan?: number; pack?: number; paidUsedToday?: number; paidLimit?: number; paidBackAt?: Date | null; paidNextAt?: Date | null };

export function buildCreditsModel(input: {
  switchOn: boolean;
  allowance: AllowanceFacts;
  history: readonly CreditHistoryRow[];
  /** The packs on sale. The page passes the registry's (`packOffers()`); a test passes a second to prove the layout. */
  offers: readonly PackOffer[];
  /** A valid return from a Checkout of this reader's own (`ReturnProp` of kind `done` with a read), switch state aside. */
  returning?: boolean;
}): { sees: false } | { sees: true; model: CreditsModel } {
  const { allowance: a, history } = input;
  const welcome = a.welcome ?? 0;
  const plan = a.plan ?? 0;
  const pack = a.pack ?? 0;
  const held = heldCredits(a) > 0;
  if (!readerSeesCredits({ switchOn: input.switchOn, held, everBought: history.length > 0, returning: input.returning ?? false })) return { sees: false };
  const freeLeft = freeCount(a);
  const oncePlan = history.some((r) => r.source === "plan");
  const oncePack = history.some((r) => r.source === "pack");
  const cells: BalanceCell[] = [{ key: "free", value: freeLeft }];
  // The welcome lot is spent after the free allowance and before the others, so its cell sits second. It is drawn only
  // while it holds a credit: it is never bought, so there is no empty cell to explain (D1; D2 owns its wording).
  if (welcome > 0) cells.push({ key: "welcome", value: welcome });
  if (plan > 0 || oncePlan) cells.push({ key: "plan", value: plan });
  if (pack > 0 || oncePack) cells.push({ key: "pack", value: pack });
  return {
    sees: true,
    model: {
      total: freeLeft + welcome + plan + pack,
      freeLeft,
      freeLimit: a.limit,
      nextAtMs: a.nextAt ? a.nextAt.getTime() : null,
      cells,
      offers: readerSeesOffers({ switchOn: input.switchOn }) ? [...input.offers] : null,
      history: history.map(historyItem),
      paidToday: paidToday(a),
    },
  };
}

const usd = (cents: number) => dollars(cents).includes(".") ? dollars(cents) : `${dollars(cents)}.00`;

export function historyItem(r: CreditHistoryRow): HistoryItem {
  return {
    id: r.id,
    date: shortDate(r.createdAt),
    label: r.source === "plan" ? creditsPageCopy.hist.planMonth : creditsPageCopy.hist.pack,
    units: r.units,
    amount: r.amountCents !== null && r.currency === "usd" ? usd(r.amountCents) : null,
    sessionId: r.externalId?.startsWith("cs_") ? r.externalId : null,
  };
}
