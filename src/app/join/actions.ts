"use server";

// The newcomer's three steps (plan `2026-10-16-invites.md`, PR 3; dark until PR 5 draws `/join/[token]`). The newcomer
// has no account, so there is no reader: each action finds the token's SENDER and decides `SOCIAL_INVITES_ENABLED`
// for THEM (`resolveSwitchEnv(sender)`); off reads as an ended invite, which names nobody (N12). What binds a claim
// to this browser is the claim secret in an httpOnly cookie scoped to the token's own path. The rate buckets
// (`invite-claim`, `invite-code`) are keyed by the sender, observe-only.

import { cookies } from "next/headers";
import { atFloor } from "../../lib/invites/floor";
import { claimInvite, confirmCode, handOver, senderOfToken, type ClaimResult, type ConfirmResult, type HandOverResult } from "../../lib/invites/claim";
import { HOLD_MS, joinPath } from "../../lib/invites/rules";
import { observeHit } from "../../lib/rate/observe";
import { socialInvitesEnabled } from "../../lib/social/flag";
import { resolveSwitchEnv } from "../../lib/switches/snapshot";

const COOKIE = "invite_claim";

/** The token's sender when their switch is on; null when it is off or the token is nobody's. */
async function liveSender(token: unknown): Promise<string | null> {
  if (typeof token !== "string") return null;
  const sender = await senderOfToken(token);
  if (!sender) return null;
  return socialInvitesEnabled(await resolveSwitchEnv(sender)) ? sender : null;
}

const ENDED = { ok: false, reason: "ended" } as const;

/** What the page is told of a claim: never the claim secret, which only the cookie carries. */
export type ClaimOutcome = { ok: true; mailed: boolean } | Exclude<ClaimResult, { ok: true }>;

export async function claimInviteAction(token: unknown, email: unknown): Promise<ClaimOutcome> {
  const sender = await liveSender(token);
  if (!sender || typeof token !== "string") return ENDED;
  if (typeof email !== "string") return { ok: false, reason: "invalid" };
  await observeHit(sender, "invite-claim");
  const jar = await cookies();
  // The same floor as the email path, whatever the address, so the answer's speed tells nothing about it.
  const result = await atFloor(() => claimInvite(token, email, jar.get(COOKIE)?.value ?? null));
  if (result.ok) {
    jar.set(COOKIE, result.claimSecret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      // This invite's own page, and the 7 days its claim holds: never sent anywhere else.
      path: joinPath(token),
      maxAge: Math.floor(HOLD_MS / 1000),
    });
    // The secret stays in the cookie: the page is never handed it.
    return { ok: true, mailed: result.mailed };
  }
  return result;
}

export async function confirmCodeAction(token: unknown, code: unknown): Promise<ConfirmResult> {
  const sender = await liveSender(token);
  if (!sender || typeof token !== "string") return ENDED;
  if (typeof code !== "string") return { ok: false, reason: "wrong", triesLeft: 0 };
  await observeHit(sender, "invite-code");
  const jar = await cookies();
  return confirmCode(token, code, jar.get(COOKIE)?.value ?? null);
}

export async function handOverAction(token: unknown): Promise<HandOverResult> {
  const sender = await liveSender(token);
  if (!sender || typeof token !== "string") return ENDED;
  const jar = await cookies();
  return handOver(token, jar.get(COOKIE)?.value ?? null);
}
