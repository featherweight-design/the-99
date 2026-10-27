"use server";

// Spare requests' writes (plan `2026-10-22-spare-requests.md`, PR 3a; handoff G1 and G2). Every action takes the
// reader from the session and decides `SPARE_REQUESTS_ENABLED` for THAT reader (`requestSwitchEnv`); the library
// re-checks the switch and every input (the friend by public id, the card, the request id, the answer, the copies and
// the deck), so nothing the client sends is trusted. Each returns a small serializable outcome; a refusal never
// reads as done.
//
// Revalidation: the ✕ and the answer are pressed on `/friends`, which redraws from the reply, so they revalidate it
// when they land. An ask is pressed from Shopping or the cart, which draw it from `GET /api/spare-requests`, so it
// revalidates nothing. Never Home or `/decks`.
// Nothing here names a social table: the writes live in `lib/social/spare-requests.ts`.

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import {
  answerSpareRequest, askForSpare, askInsteadForSpare, closeSpareRequest,
  type AnswerOutcome, type AskOutcome, type CloseOutcome,
} from "../../lib/social/spare-requests";
import { requestSwitchEnv } from "../../lib/switches/request";

/** The signed-in reader and their resolved switches. */
async function reader(): Promise<{ userId: string; env: NodeJS.ProcessEnv }> {
  const userId = await requireUserId();
  return { userId, env: await requestSwitchEnv(userId) };
}

/** A client's argument as a record; anything else reads as empty, so the library refuses each missing field. */
const fields = (v: unknown): Record<string, unknown> => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export type AskInput = { friendPublicId: string; oracleId: string; copies?: number; deckId?: string | null; standalone?: boolean };

/** Ask a friend for a spare of one card (Shopping, the cart's By friend). */
export async function askSpareAction(input: AskInput): Promise<AskOutcome> {
  const { userId, env } = await reader();
  const i = fields(input);
  return askForSpare(userId, i.friendPublicId, i.oracleId, env, new Date(), { copies: i.copies, deckId: i.deckId, standalone: i.standalone });
}

export type AskInsteadInput = AskInput & { fromRequestId: string };

/** Withdraw the open ask `fromRequestId` for the card and ask this friend instead, in one transaction. */
export async function askInsteadAction(input: AskInsteadInput): Promise<AskOutcome> {
  const { userId, env } = await reader();
  const i = fields(input);
  return askInsteadForSpare(userId, i.fromRequestId, i.friendPublicId, i.oracleId, env, new Date(), { copies: i.copies, deckId: i.deckId, standalone: i.standalone });
}

/**
 * Redraws /friends after an Ask from its own spares sheet (Ask in place, product call 8), so Your requests lists it. The
 * ask actions revalidate nothing, since Shopping and the cart ask too and their pages draw no request list; the sheet
 * on /friends calls this after its ask lands. Signed in only; writes nothing.
 */
export async function refreshFriendsAction(): Promise<void> {
  await reader();
  revalidatePath("/friends");
}

/** ✕ on one of the reader's asks: withdraws it while open, else clears it from their list. */
export async function closeSpareAction(requestId: string): Promise<CloseOutcome> {
  const { userId, env } = await reader();
  const out = await closeSpareRequest(userId, requestId, env);
  if (out.ok) revalidatePath("/friends");
  return out;
}

/** Yes or No on an ask waiting on the reader. */
export async function answerSpareAction(requestId: string, answer: "yes" | "no"): Promise<AnswerOutcome> {
  const { userId, env } = await reader();
  const out = await answerSpareRequest(userId, requestId, answer, env);
  if (out.ok) revalidatePath("/friends");
  return out;
}
