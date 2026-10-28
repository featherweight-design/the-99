"use server";

// Spare requests' writes (plan `2026-10-22-spare-requests.md`, PR 3a; handoff G1 and G2). Every action takes the
// reader from the session and decides `SPARE_REQUESTS_ENABLED` for THAT reader (`requestSwitchEnv`); the library
// re-checks the switch and every input (the friend by public id, the card, the request id, the answer, the copies and
// the deck), so nothing the client sends is trusted. Each returns a small serializable outcome; a refusal never
// reads as done.
//
// Revalidation: the ✕ and the answer are pressed on `/friends`, which redraws from the reply, so they revalidate it
// when they land. An ask is pressed from Shopping or the cart, which draw it from `GET /api/spare-requests`, so it
// revalidates nothing. Opening an answer over Home marks it seen and revalidates `/friends` alone, where its diamond
// and the badge's count are drawn. Never Home or `/decks`.
// Nothing here names a social table: the writes live in `lib/social/spare-requests.ts`.

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireUserId } from "../../lib/auth";
import {
  answerSpareRequest, askForSpare, askInsteadForSpare, closeSpareRequest, markAnswerSeen,
  type AnswerOutcome, type AskOutcome, type CloseOutcome,
} from "../../lib/social/spare-requests";
import { loadAnsweredRequest, type YourRequest } from "../../lib/social/your-requests";
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

export type OpenAnswerOutcome = { ok: true; request: YourRequest } | { ok: false };

/**
 * An answer item on Home, opened over Home (small items item 3, board `Spare-Answer-Sheet`): the one Your requests row
 * its key names, and that answer marked seen as it opens (the diamond goes; the badge drops by it alone). `key` is the
 * item's own Home key; the server resolves it to the reader's own request, so a stranger's or a non-answer names nothing.
 */
export async function openAnswerAction(key: string): Promise<OpenAnswerOutcome> {
  const { userId, env } = await reader();
  const now = new Date();
  const request = typeof key === "string" ? await loadAnsweredRequest(userId, key, env, now) : null;
  if (!request) return { ok: false };
  // Marked whatever the Friends cursor says: Home reads its own cursor, so an answer a /friends visit already covered can
  // still be unseen on Home. The write lands only on a change (`markAnswerSeenQuery`). `/friends` is revalidated after
  // the response: revalidating inside the action would redraw the page it was pressed on (Home), whose visit has already
  // moved its own cursor, and every diamond there would go at once.
  if (await markAnswerSeen(userId, request.id, env, now)) after(() => revalidatePath("/friends"));
  return { ok: true, request: { ...request, unseen: false } };
}
