/**
 * The newcomer's code email (plan `2026-10-16-invites.md`, R6, G-1), sent by Resend with one `fetch` to its REST
 * API: no SDK, so no dependency. SERVER-ONLY. FAIL CLOSED: without the-99's own key, a sender on its verified
 * domain AND the code secret, nothing is sent and nothing is fetched, and the caller (the claim, PR 3) refuses
 * before it holds an invite, so a misconfigured deployment never holds an invite for 7 days and mails nothing.
 *
 * Logs carry the outcome, never the address, the code or the key.
 */
import { inviteSecret } from "./tokens";

export const RESEND_URL = "https://api.resend.com/emails";
/** A send that has not answered in this long is a failure; the claim's toast offers Try again (R14). */
export const RESEND_TIMEOUT_MS = 8000;

export type MailConfig = { apiKey: string; from: string };
export type Mail = { to: string; subject: string; text: string; html: string };
export type MailResult = { ok: true } | { ok: false; reason: "unconfigured" | "failed" };

type MailEnv = { RESEND_API_KEY?: string; INVITE_EMAIL_FROM?: string; INVITE_CODE_SECRET?: string };

/**
 * The configuration a send needs, or null when any part is missing: the key (`re_…`), a sender with an address
 * (`The 99 <invites@…>` or a bare address), and the code secret, which every claim needs before a code can be
 * stored.
 */
export function mailConfig(env: MailEnv): MailConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.INVITE_EMAIL_FROM?.trim();
  if (!apiKey || !/^re_\S+$/.test(apiKey)) return null;
  // A bare address, or a display name with the address in balanced brackets.
  const address = "[^\\s@<>]+@[^\\s@<>]+\\.[^\\s@<>]+";
  if (!from || !new RegExp(`^(?:${address}|[^<>@]*<${address}>)$`).test(from)) return null;
  if (!inviteSecret(env)) return null;
  return { apiKey, from };
}

let warnedUnconfigured = false;

export async function sendMail(
  config: MailConfig | null,
  mail: Mail,
  fetchImpl: typeof fetch = fetch,
): Promise<MailResult> {
  if (!config) {
    if (!warnedUnconfigured) console.warn("[invites] invite-code unconfigured");
    warnedUnconfigured = true;
    return { ok: false, reason: "unconfigured" };
  }
  try {
    const res = await fetchImpl(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
    if (res.ok) return { ok: true };
    console.warn(`[invites] invite-code send failed status=${res.status}`);
  } catch {
    console.warn("[invites] invite-code send failed status=none");
  }
  return { ok: false, reason: "failed" };
}
