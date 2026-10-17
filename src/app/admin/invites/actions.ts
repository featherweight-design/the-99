"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/admin/access";
import {
  revokeReservation,
  setInvites,
  topUpGroupInvites,
  type RevokeResult,
  type SetInvitesResult,
  type TopUpResult,
} from "../../../lib/invites/admin";

// The admin's invite writes (plan `2026-10-16-invites.md`, PR 6): an account's Invites left (M2), a group's top-up
// (M3) and Revoke on a waiting invite (R12). Every export calls `requireAdmin()` on its first line (`actions.test.ts`
// reads every action module under src/app/admin); the actor is the gate's own `userId`, never an argument. The
// library parses the number and takes each sender's lock.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sets what an account has left. A refusal (`invalid`) writes nothing. */
export async function setAccountInvites(accountId: string, left: string): Promise<SetInvitesResult> {
  const { userId } = await requireAdmin();
  if (typeof accountId !== "string" || accountId === "") return { ok: false, reason: "invalid" };
  const result = await setInvites(userId, accountId, left);
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}

/** Raises every member of a group with fewer left to `to`; lowers nobody. */
export async function topUpGroup(groupId: string, to: string): Promise<TopUpResult> {
  const { userId } = await requireAdmin();
  if (typeof groupId !== "string" || !UUID.test(groupId)) return { ok: false, reason: "notFound" };
  const result = await topUpGroupInvites(userId, groupId, to);
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}

/** Revokes a waiting invite: it is back at once, and its address is erased. */
export async function revokeInvite(reservationId: string): Promise<RevokeResult> {
  const { userId } = await requireAdmin();
  if (typeof reservationId !== "string" || !UUID.test(reservationId)) return { ok: true, changed: false };
  const result = await revokeReservation(userId, reservationId);
  if (result.changed) revalidatePath("/admin", "layout");
  return result;
}
