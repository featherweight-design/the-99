// One mailbox, one welcome lot. The welcome grant (welcome.ts) is claimed once per CANONICAL address, so a person cannot
// collect it again by signing up as `a.b+x@gmail.com` after `ab@gmail.com`. SERVER-ONLY: the hash reads a secret.
//
// The fold is the provider's own rule and no more: `+tag` is dropped everywhere, dots only on Gmail (elsewhere a dot
// is a different mailbox), and googlemail.com is gmail.com. A custom domain or a catch-all cannot be folded, so this stops
// casual aliasing, not a determined person with their own domain.
import { createHmac } from "node:crypto";
import { hashKey } from "../analytics/funnel-events";

const GMAIL = "gmail.com";

/** The address folded to the form that names one mailbox, or null when it is not an address. Pure. */
export function canonicalEmail(raw: string): string | null {
  const s = raw.normalize("NFKC").trim().toLowerCase();
  const at = s.lastIndexOf("@");
  if (at < 1 || /\s/.test(s)) return null;
  let local = s.slice(0, at);
  let domain = s.slice(at + 1).replace(/\.$/, "");
  if (!domain.includes(".")) return null;
  if (domain === "googlemail.com") domain = GMAIL;
  const plus = local.indexOf("+");
  if (plus >= 0) local = local.slice(0, plus);
  if (domain === GMAIL) local = local.replaceAll(".", "");
  return local ? `${local}@${domain}` : null;
}

type EmailRow = { id?: unknown; email_address?: unknown; verification?: { status?: unknown } | null };

/** The primary address of a Clerk `user.created` payload, only when Clerk verified it; otherwise null. */
export function primaryVerifiedEmail(data: { email_addresses?: unknown; primary_email_address_id?: unknown }): string | null {
  if (!Array.isArray(data.email_addresses) || typeof data.primary_email_address_id !== "string") return null;
  const row = (data.email_addresses as EmailRow[]).find((e) => e?.id === data.primary_email_address_id);
  if (!row || typeof row.email_address !== "string" || row.verification?.status !== "verified") return null;
  return row.email_address;
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
