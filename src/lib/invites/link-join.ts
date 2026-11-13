/**
 * A newcomer joining through a friend link (friend links R1, Q1, clarification 2). SERVER-ONLY. Join on the signed-out
 * landing opens a reservation on the link owner's invite, in the shipped QR path's shape (`showInviteQr`): kind `qr`,
 * state `qr_open`, its token derived from the row id. The newcomer then walks the shipped `/join/<token>` flow unchanged.
 * What differs is recorded on the row (`link_key_id`): it holds the invite only briefly (`linkHoldUntil`), at most
 * `MAX_LINK_HOLDS` per link at once, and the spend writes a friend request instead of a friendship.
 *
 * Out of invites, or the link's holds full, opens nothing; a link that is reset or unknown reads as ended. The owner's
 * own FRIEND_LINKS_ENABLED decides whether their link works at all: the visitor is signed out and has no switches.
 */
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { inviteReservations } from "../../db/schema";
import { friendLinksEnabled } from "../friend-links/flag";
import { resolveFlags } from "../flags/snapshot";
import { liveLinkKeyIn } from "../social/friend-link-keys";
import { OPEN_STATES, readCountIn } from "./read";
import { CODE_TTL_MS, holdsInvite, MAX_LINK_HOLDS, type HoldingRow } from "./rules";
import { lockSenderIn } from "./send";
import { qrToken, secretHash } from "./tokens";

export type LinkJoinResult =
  | { ok: true; token: string }
  | { ok: false; reason: "ended" | "out" | "busy" | "unconfigured" };

export type LinkJoinDeps = { now?: Date; flagsFor?: (userId: string) => Promise<NodeJS.ProcessEnv> };

/** Whether the owner can take one more newcomer from this link: an invite left and fewer than two of its holds live. */
export function linkJoinRefusal(out: boolean, liveHolds: number): "out" | "busy" | null {
  if (out) return "out";
  return liveHolds >= MAX_LINK_HOLDS ? "busy" : null;
}

export async function openLinkJoin(linkToken: unknown, secret: string | null, deps: LinkJoinDeps = {}): Promise<LinkJoinResult> {
  if (!secret) return { ok: false, reason: "unconfigured" };
  const key = await liveLinkKeyIn(db, linkToken, secret);
  if (!key) return { ok: false, reason: "ended" };
  if (!friendLinksEnabled(await (deps.flagsFor ?? resolveFlags)(key.userId))) return { ok: false, reason: "ended" };
  return db.transaction(async (tx): Promise<LinkJoinResult> => {
    const now = await lockSenderIn(tx, key.userId, deps.now);
    const { count } = await readCountIn(tx, key.userId, now);
    const rows = (await tx
      .select({ kind: inviteReservations.kind, state: inviteReservations.state, qrExpiresAt: inviteReservations.qrExpiresAt, holdsUntil: inviteReservations.holdsUntil })
      .from(inviteReservations)
      .where(and(eq(inviteReservations.linkKeyId, key.id), inArray(inviteReservations.state, [...OPEN_STATES])))) as HoldingRow[];
    const refusal = linkJoinRefusal(count.out, rows.filter((r) => holdsInvite(r, now)).length);
    if (refusal) return { ok: false, reason: refusal };
    const id = randomUUID();
    const token = qrToken(secret, id);
    await tx.insert(inviteReservations).values({
      id,
      userId: key.userId,
      kind: "qr",
      state: "qr_open",
      qrTokenHash: secretHash(token),
      qrExpiresAt: new Date(now.getTime() + CODE_TTL_MS),
      linkKeyId: key.id,
      createdAt: now,
    });
    return { ok: true, token };
  });
}
