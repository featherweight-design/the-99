// /credits (buying credits, U1): what the reader holds, what they have bought, and, while payments are on for
// them, a pack to buy. Decided from the READER's switches (`requestSwitchEnv`), never `process.env`.
//
// `notFound()` for a reader with the switch off, nothing held and nothing ever bought (`readerSeesCredits`, plan
// E3); anything held or bought keeps the page, without its offers (O4). Loading is this route's own kept
// `loading.tsx` (P6; `route-loading.test.ts` lists it), and a read that throws draws P7, never the error boundary.
//
// The return from Checkout (`?checkout=done&session_id=`) is read here ONCE, server-side, and followed by the band.
// The id is the URL's, so it proves nothing: `readReturn` refuses a Session that is not this reader's own.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CreditsReadFailed } from "../../components/credits/read-failed";
import { CreditsView, type ReturnProp } from "../../components/credits/credits-view";
import { requireUserId } from "../../lib/auth";
import { creditsPageCopy, packOffers } from "../../lib/copy/credits-page";
import { readAllowance } from "../../lib/model/allowance";
import { paymentsEnabled } from "../../lib/payments/flag";
import { purchaseBlocked } from "../../lib/payments/blocked";
import { readPlanFacts } from "../../lib/payments/plan-read";
import { buildCreditsModel } from "../../lib/payments/page-model";
import { listCreditHistory, readReturn } from "../../lib/payments/return";
import { isSessionId } from "../../lib/payments/return-rule";
import { stripeClient } from "../../lib/payments/stripe";
import { requestSwitchEnv } from "../../lib/switches/request";
import type { BalanceWelcome } from "../../components/credits/balance";
import { listDecksWithStats } from "../../lib/decks/read";
import { getCollectionStats } from "../../lib/home/summary";
import { readWelcomeState, welcomeSheetFor } from "../../lib/payments/welcome-read";
import { lotFacts } from "../../lib/payments/welcome-sheet";
import { suggestedChangesV2Enabled } from "../../lib/tuning/flag";

export const metadata: Metadata = { title: creditsPageCopy.title };

type Params = Record<string, string | string[] | undefined>;

export default async function CreditsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  const switchOn = paymentsEnabled(env);
  // A Suggested changes v2 run over 10 changes uses 2 credits, so the sub follows the reader's v2 switch.
  const suggestedV2 = suggestedChangesV2Enabled(env);
  const params = await searchParams;

  // The return is read FIRST, so a grant it observes was committed before the balances and history below are read and
  // is always in them: read the other way round, a webhook landing between the two reads would draw `added` over
  // the old totals. It is read whatever the switch says (stopping sales does not cancel an open Checkout), and a
  // valid return of this reader's own keeps the page, reduced, for a first-time buyer (`returning`).
  const ret = await returnFrom(params, userId, switchOn);
  const returning = ret?.kind === "done" && ret.initial !== null;

  let built: ReturnType<typeof buildCreditsModel>;
  try {
    // The pause (B1) is read only while there is something to pause. A failed read draws the offers: the Buy press
    // checks the block again before any Stripe call, so a missed pause still cannot make a Session.
    // The subscription is read BEFORE the balance and history, never beside them: the webhook writes a cancel's row and
    // the lots' expiry in one transaction, so a row read first and the lots read after can only agree or show the
    // newer lots with the older row. Read the other way round, an acknowledged cancel could be paired with a
    // pre-cancellation balance.
    const subscription = await readPlanFacts(userId);
    const [allowance, history, blocked] = await Promise.all([
      readAllowance(userId),
      listCreditHistory(userId),
      switchOn ? purchaseBlocked(userId).catch(() => false) : false,
    ]);
    built = buildCreditsModel({ switchOn, allowance, history, offers: packOffers(), returning, subscription, blocked });
  } catch (error) {
    console.error(`[credits] read failed${error instanceof Error ? ` (${error.name})` : ""}`);
    return <CreditsReadFailed suggestedV2={suggestedV2} />;
  }
  if (!built.sees) {
    // A return whose read THREW is unresolved, not refused: nothing was learned about the Session, so it may well be this
    // reader's own and the retry may yet show it. The retryable read-failed state says nothing a stranger could use; a
    // read that SUCCEEDED as `none` (forged, foreign, unknown) is `ret === null` and stays a 404.
    if (ret?.kind === "done" && ret.initial === null) return <CreditsReadFailed suggestedV2={suggestedV2} />;
    notFound();
  }

  const welcome = built.model.cells.some((cell) => cell.key === "welcome") ? await readCellWelcome(userId, env, built.model.freeLimit) : null;
  return <CreditsView model={built.model} suggestedV2={suggestedV2} ret={ret} welcome={welcome} />;
}

/**
 * The Welcome cell's `Where they work` (welcome credits R2): the lot and the sheet's list, read only while the cell
 * shows. The sheet's Try it follows the reader's cards and decks, as Home's does. A read that fails draws the cell's date
 * line alone, since the cell is the reference that stays, not a place an error belongs.
 */
async function readCellWelcome(userId: string, env: NodeJS.ProcessEnv, free: number): Promise<BalanceWelcome | null> {
  const now = new Date();
  try {
    const [state, stats, decks] = await Promise.all([
      readWelcomeState(userId, env, now),
      getCollectionStats(userId),
      listDecksWithStats(userId, "name"),
    ]);
    const facts = lotFacts(state, now, free);
    const sheet = facts ? welcomeSheetFor(env, { cards: stats.uniqueCards, decks }) : null;
    return facts && sheet ? { facts, sheet } : null;
  } catch (error) {
    console.error("[credits] the welcome sheet could not be read", error instanceof Error ? error.message : "");
    return null;
  }
}

/** The return band's start: a quiet line on a cancel (only while sales are on), the Session's read on a finish (always). */
async function returnFrom(params: Params, userId: string, switchOn: boolean): Promise<ReturnProp | null> {
  if (params.checkout === "cancelled") return switchOn ? { kind: "cancelled" } : null;
  const sessionId = params.session_id;
  if (params.checkout !== "done" || !isSessionId(sessionId)) return null;
  const stripe = stripeClient();
  // No client is a read that could not be made, not a refusal: unresolved, so a first-time buyer sees the retryable state.
  if (!stripe) return { kind: "done", sessionId, initial: null };
  try {
    const initial = await readReturn(stripe, { sessionId, viewerId: userId });
    // A Session that is not this reader's, or not ours, draws no band at all.
    return initial.kind === "none" ? null : { kind: "done", sessionId, initial };
  } catch {
    // Could not ask Stripe: the band starts empty and its first re-read, at once, says so if it fails again.
    return { kind: "done", sessionId, initial: null };
  }
}
