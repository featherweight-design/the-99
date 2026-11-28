// One mailbox, one welcome lot. The welcome grant (welcome.ts) is claimed once per CANONICAL address, so a person cannot
// collect it again by signing up as `a.b+x@gmail.com` after `ab@gmail.com`. SERVER-ONLY: the hash reads a secret.
//
// The fold itself lives in `src/lib/email/fold.ts`, shared with every other comparison of two addresses.
import { createHmac } from "node:crypto";
import { hashKey } from "../analytics/funnel-events";
import { foldMailbox } from "../email/fold";

/** The address folded to the form that names one mailbox, or null when it is not an address. Pure. */
export const canonicalEmail = foldMailbox;

type EmailRow = { id?: unknown; email_address?: unknown; verification?: { status?: unknown } | null };

/** The primary address of a Clerk `user.created` payload, only when Clerk verified it; otherwise null. */
export function primaryVerifiedEmail(data: { email_addresses?: unknown; primary_email_address_id?: unknown }): string | null {
  if (!Array.isArray(data.email_addresses) || typeof data.primary_email_address_id !== "string") return null;
  const row = (data.email_addresses as EmailRow[]).find((e) => e?.id === data.primary_email_address_id);
  if (!row || typeof row.email_address !== "string" || row.verification?.status !== "verified") return null;
  return row.email_address;
}

/** Every address of a Clerk user payload that Clerk verified, as typed. A user can hold several; the mailbox gate keeps them all. */
export function verifiedEmails(data: { email_addresses?: unknown }): string[] {
  if (!Array.isArray(data.email_addresses)) return [];
  const out: string[] = [];
  for (const row of data.email_addresses as EmailRow[]) {
    if (typeof row?.email_address === "string" && row.verification?.status === "verified") out.push(row.email_address);
  }
  return out;
}

/**
 * The claim key: a keyed HMAC of the canonical address, domain-separated from the other uses of the key. Keyed because a bare
 * hash of an address is guessable from a dictionary. Null with no usable key, and the caller then grants nothing: never an
 * unkeyed hash. Rotating the key quietly resets every claim (it fails open), which is acceptable.
 */
export function welcomeEmailHash(email: string, env: Parameters<typeof hashKey>[0]): string | null {
  const canonical = canonicalEmail(email);
  const key = hashKey(env);
  if (!canonical || !key) return null;
  return createHmac("sha256", key).update(`welcome-email:${canonical}`).digest("hex");
}

/**
 * The account mailbox key: a keyed HMAC of the folded address, domain-separated from the welcome claim's and from the
 * other uses of the key (same key, so no new secret). Null with no usable key or no address, and the caller then skips the
 * mailbox check: the literal Clerk check still runs. Never an unkeyed hash.
 */
export function mailboxHash(email: string, env: Parameters<typeof hashKey>[0]): string | null {
  const folded = foldMailbox(email);
  const key = hashKey(env);
  if (!folded || !key) return null;
  return createHmac("sha256", key).update(`mailbox:${folded}`).digest("hex");
}
