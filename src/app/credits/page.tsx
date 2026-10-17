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
import { buildCreditsModel } from "../../lib/payments/page-model";
import { listCreditHistory, readReturn } from "../../lib/payments/return";
import { isSessionId } from "../../lib/payments/return-rule";
import { stripeClient } from "../../lib/payments/stripe";
import { requestSwitchEnv } from "../../lib/switches/request";

export const metadata: Metadata = { title: creditsPageCopy.title };

type Params = Record<string, string | string[] | undefined>;

export default async function CreditsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const userId = await requireUserId();
  const switchOn = paymentsEnabled(await requestSwitchEnv(userId));
  const params = await searchParams;

  // The return is read FIRST, so a grant it observes was committed before the balances and history below are read and
  // is always in them: read the other way round, a webhook landing between the two reads would draw `added` over
  // the old totals. It is read whatever the switch says (stopping sales does not cancel an open Checkout), and a
  // valid return of this reader's own keeps the page, reduced, for a first-time buyer (`returning`).
  const ret = await returnFrom(params, userId, switchOn);
  const returning = ret?.kind === "done" && ret.initial !== null;

  let built: ReturnType<typeof buildCreditsModel>;
  try {
    const [allowance, history] = await Promise.all([readAllowance(userId), listCreditHistory(userId)]);
    built = buildCreditsModel({ switchOn, allowance, history, offers: packOffers(), returning });
  } catch (error) {
    console.error(`[credits] read failed${error instanceof Error ? ` (${error.name})` : ""}`);
    return <CreditsReadFailed />;
  }
  if (!built.sees) {
    // A return whose read THREW is unresolved, not refused: nothing was learned about the Session, so it may well be this
    // reader's own and the retry may yet show it. The retryable read-failed state says nothing a stranger could use; a
    // read that SUCCEEDED as `none` (forged, foreign, unknown) is `ret === null` and stays a 404.
    if (ret?.kind === "done" && ret.initial === null) return <CreditsReadFailed />;
    notFound();
  }

  return <CreditsView model={built.model} ret={ret} />;
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
