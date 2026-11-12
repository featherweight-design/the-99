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
 * - `rejected`: Clerk refused the request itself, not the address: its `redirect_url` (`refusesRedirect`). It made
 *   nothing, and nobody is invited, so the caller answers `failed`, never a success.
 */
import { clerkClient } from "@clerk/nextjs/server";
import { captureServerError } from "../sentry/capture";
import { HOLD_MS } from "./rules";

/** A page of Clerk's invitation search, and the most pages read before a cleanup gives up as not known. */
const INVITATION_PAGE = 100;
const MAX_INVITATION_PAGES = 20;

/** Clerk's invitations live this long; ours holds its invite for the same 7 days, on its own clock (R2). */
export const INVITATION_DAYS = Math.round(HOLD_MS / 86_400_000);

export type CreateInvitation = {
  emailAddress: string;
  reservationId: string;
  /** The email path mails (R5); the QR path hands the ticket over itself (R6). */
  notify: boolean;
  /** Only the QR path's hand-over sets it, after proving the mailbox (R6). */
  ignoreExisting?: boolean;
  /**
   * Where Clerk's accept link hands the reader back (`invitationRedirectUrl`, resolved by the action that asks): the
   * app's own `/sign-up`. Null makes the invitation with none, so its link lands on Clerk's hosted sign-up.
   */
  redirectUrl: string | null;
};

export type CreateResult =
  | { ok: true; id: string; url: string | null }
  | { ok: false; reason: "refused"; code: string | null }
  | { ok: false; reason: "indeterminate" }
  | { ok: false; reason: "rejected" };

export type ClerkInvites = {
  create(input: CreateInvitation): Promise<CreateResult>;
  /** True when Clerk revoked it or it was already not pending; false when that is not known. */
  revoke(invitationId: string): Promise<boolean>;
  /**
   * Revokes every PENDING invitation to this address whose public metadata names this reservation: the cleanup for
   * a reservation whose invitation id was never stored (an indeterminate send). True when none is left pending.
   */
  revokeFor(emailAddress: string, reservationId: string): Promise<boolean>;
  /**
   * The id of the PENDING invitation to this address whose public metadata names this reservation: the sweep's
   * reconcile for a send whose answer was lost. `id: null` is none (Clerk made nothing); `ok: false` is not known.
   */
  findFor(emailAddress: string, reservationId: string): Promise<{ ok: true; id: string | null } | { ok: false }>;
  /** Whether an account holds this address (R6's N9). */
  hasAccount(emailAddress: string): Promise<boolean>;
};

type ClerkErrorItem = { code?: unknown; message?: unknown; longMessage?: unknown; meta?: { paramName?: unknown } };

/**
 * Whether a 4xx names the invitation's `redirect_url`: Clerk refusing the address the link goes back to, not the email.
 * Clerk names the parameter (`meta.paramName`, as its 422 for a bad `redirect_url` does). The wording is read only for
 * an error that names no parameter and is not `duplicate_record`, whose message quotes the email address itself: an
 * address containing "redirect_url" must stay the address's refusal.
 */
export function refusesRedirect(error: unknown): boolean {
  const status = typeof error === "object" && error !== null ? (error as { status?: unknown }).status : undefined;
  if (typeof status !== "number" || status < 400 || status >= 500) return false;
  const errors = (error as { errors?: ClerkErrorItem[] }).errors;
  return Array.isArray(errors) && errors.some((e) =>
    e?.meta?.paramName === "redirect_url"
    || (e?.meta?.paramName == null && e?.code !== "duplicate_record"
      && [e?.message, e?.longMessage].some((text) => typeof text === "string" && /redirect_?url/i.test(text))));
}

/**
 * How a thrown Clerk error reads: an HTTP 4xx naming `redirect_url` is the request's own fault (`rejected`), any other
 * 4xx a refusal, anything else may have done the work.
 */
export function classifyClerkError(error: unknown): CreateResult & { ok: false } {
  const status = typeof error === "object" && error !== null ? (error as { status?: unknown }).status : undefined;
  if (refusesRedirect(error)) return { ok: false, reason: "rejected" };
  if (typeof status === "number" && status >= 400 && status < 500) {
    const errors = (error as { errors?: { code?: unknown }[] }).errors;
    const code = Array.isArray(errors) && typeof errors[0]?.code === "string" ? errors[0].code : null;
    return { ok: false, reason: "refused", code };
  }
  return { ok: false, reason: "indeterminate" };
}

/**
 * Whether a revoke's error still means nothing is left to revoke: a 400, 404, 410 or 422 is an invitation already
 * accepted, revoked, expired or gone. An auth failure (401, 403), a rate limit (429) or no answer proves nothing.
 */
export function revokeSettled(error: unknown): boolean {
  const status = typeof error === "object" && error !== null ? (error as { status?: unknown }).status : undefined;
  return status === 400 || status === 404 || status === 410 || status === 422;
}

/** Every pending invitation to the address that names this reservation, across pages; null when not all were read. */
async function pendingFor(emailAddress: string, reservationId: string): Promise<{ id: string }[] | null> {
  const client = await clerkClient();
  // Every page: the query matches substrings, so other invitations can fill the first.
  const ours: { id: string }[] = [];
  for (let offset = 0; ; offset += INVITATION_PAGE) {
    const page = await client.invitations.getInvitationList({
      query: emailAddress, status: "pending", limit: INVITATION_PAGE, offset,
    });
    ours.push(...page.data.filter((i) => i.publicMetadata?.inviteReservation === reservationId));
    if (page.data.length < INVITATION_PAGE) return ours;
    if (offset >= INVITATION_PAGE * MAX_INVITATION_PAGES) return null;
  }
}

export const clerkInvites: ClerkInvites = {
  async create({ emailAddress, reservationId, notify, ignoreExisting, redirectUrl }) {
    const attempt = async (redirect: string | null): Promise<CreateResult> => {
      const invitation = await (await clerkClient()).invitations.createInvitation({
        emailAddress,
        notify,
        expiresInDays: INVITATION_DAYS,
        publicMetadata: { inviteReservation: reservationId },
        ...(redirect ? { redirectUrl: redirect } : {}),
        ...(ignoreExisting ? { ignoreExisting: true } : {}),
      });
      return { ok: true, id: invitation.id, url: invitation.url ?? null };
    };
    try {
      return await attempt(redirectUrl);
    } catch (error) {
      // A refused `redirect_url` (an origin not on the instance's allowed list) is the deployment's, not the address's:
      // made once more without it, the link still works on Clerk's hosted sign-up. Only once: a second refusal is read
      // as any other, and a second `redirect_url` one stays `rejected`: an invitation never made never answers as sent.
      if (redirectUrl === null || !refusesRedirect(error)) return classifyClerkError(error);
      // Reported, not only logged: a refused `redirect_url` in production is the instance's allowed list missing this
      // deployment, and every invitation would land on the hosted sign-up until it is fixed. The tag only travels.
      console.warn("[invites] invitation redirect_url refused; retrying without it");
      captureServerError("invite-redirect-refused", error);
      try {
        return await attempt(null);
      } catch (retryError) {
        return classifyClerkError(retryError);
      }
    }
  },
  async revoke(invitationId) {
    try {
      await (await clerkClient()).invitations.revokeInvitation(invitationId);
      return true;
    } catch (error) {
      return revokeSettled(error);
    }
  },
  async revokeFor(emailAddress, reservationId) {
    try {
      const ours = await pendingFor(emailAddress, reservationId);
      if (ours === null) return false;
      const done = await Promise.all(ours.map((i) => clerkInvites.revoke(i.id)));
      return done.every(Boolean);
    } catch {
      return false;
    }
  },
  async findFor(emailAddress, reservationId) {
    try {
      const ours = await pendingFor(emailAddress, reservationId);
      return ours === null ? { ok: false } : { ok: true, id: ours[0]?.id ?? null };
    } catch {
      return { ok: false };
    }
  },
  async hasAccount(emailAddress) {
    const list = await (await clerkClient()).users.getUserList({ emailAddress: [emailAddress], limit: 1 });
    return list.data.length > 0;
  },
};
