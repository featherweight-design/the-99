/**
 * The app's ONE caller of Clerk's invitations API (plan `2026-10-16-invites.md`). SERVER-ONLY. Every invite write
 * reaches Clerk through `ClerkInvites`, so the probe and the tests run the whole write with a stub in its place
 * and never create a real invitation.
 *
 * A create's failure is told apart by WHAT it can mean, never by the address (which is never logged):
 * - `refused`: Clerk answered 4xx. It made nothing (an address with an account, or someone else's pending
 *   invitation, is refused this way). R5 answers it as a success all the same.
 * - `indeterminate`: no answer, a timeout or a 5xx. Clerk may have created and mailed the invitation before the
 *   answer was lost, so the caller must keep its reservation holding; the sweep reconciles it (PR 3).
 */
import { clerkClient } from "@clerk/nextjs/server";
import { HOLD_MS } from "./rules";

/** Clerk's invitations live this long; ours holds its invite for the same 7 days, on its own clock (R2). */
export const INVITATION_DAYS = Math.round(HOLD_MS / 86_400_000);

export type CreateInvitation = {
  emailAddress: string;
  reservationId: string;
  /** The email path mails (R5); the QR path hands the ticket over itself (R6). */
  notify: boolean;
  /** Only the QR path's hand-over sets it, after proving the mailbox (R6). */
  ignoreExisting?: boolean;
};

export type CreateResult =
  | { ok: true; id: string; url: string | null }
  | { ok: false; reason: "refused"; code: string | null }
  | { ok: false; reason: "indeterminate" };

export type ClerkInvites = {
  create(input: CreateInvitation): Promise<CreateResult>;
  /** True when Clerk revoked it or it was already not pending; false when Clerk could not be reached. */
  revoke(invitationId: string): Promise<boolean>;
  /** Whether an account holds this address (R6's N9). */
  hasAccount(emailAddress: string): Promise<boolean>;
};

/** How a thrown Clerk error reads: an HTTP 4xx is a refusal, anything else may have done the work. */
export function classifyClerkError(error: unknown): CreateResult & { ok: false } {
  const status = typeof error === "object" && error !== null ? (error as { status?: unknown }).status : undefined;
  if (typeof status === "number" && status >= 400 && status < 500) {
    const errors = (error as { errors?: { code?: unknown }[] }).errors;
    const code = Array.isArray(errors) && typeof errors[0]?.code === "string" ? errors[0].code : null;
    return { ok: false, reason: "refused", code };
  }
  return { ok: false, reason: "indeterminate" };
}

export const clerkInvites: ClerkInvites = {
  async create({ emailAddress, reservationId, notify, ignoreExisting }) {
    try {
      const invitation = await (await clerkClient()).invitations.createInvitation({
        emailAddress,
        notify,
        expiresInDays: INVITATION_DAYS,
        publicMetadata: { inviteReservation: reservationId },
        ...(ignoreExisting ? { ignoreExisting: true } : {}),
      });
      return { ok: true, id: invitation.id, url: invitation.url ?? null };
    } catch (error) {
      return classifyClerkError(error);
    }
  },
  async revoke(invitationId) {
    try {
      await (await clerkClient()).invitations.revokeInvitation(invitationId);
      return true;
    } catch (error) {
      // A 4xx is an invitation already accepted, revoked or expired: nothing is left to revoke.
      return classifyClerkError(error).reason === "refused";
    }
  },
  async hasAccount(emailAddress) {
    const list = await (await clerkClient()).users.getUserList({ emailAddress: [emailAddress], limit: 1 });
    return list.data.length > 0;
  },
};
