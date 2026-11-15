/**
 * The invite emails, sent by Resend: the newcomer's code (plan `2026-10-16-invites.md`, R6, G-1) and the email
 * invite, both with one `fetch` to its REST API: no SDK, so no dependency. SERVER-ONLY. FAIL CLOSED: without the-99's
 * own key, a sender on its verified domain AND the code secret, nothing is sent and nothing is fetched, and each
 * caller (the claim, the email invite) refuses before it holds an invite, so a misconfigured deployment never holds
 * an invite for 7 days and mails nothing.
 *
 * Logs carry the outcome, never the address, the code or the key.
 */
import { appOrigin } from "../payments/checkout-rule";
import { mailRefusal } from "./mail-limits";
import { inviteSecret } from "./tokens";

export const RESEND_URL = "https://api.resend.com/emails";
/**
 * A send that has not answered in this long is `indeterminate`: the claim reads it as not mailed (its toast offers
 * Try again, R14); the email invite as perhaps mailed, keeping its invitation.
 */
export const RESEND_TIMEOUT_MS = 8000;

/** `origin` is the app's own (`APP_ORIGIN`): every absolute URL in a mail (the tile, the footer link, the invite's hand) is built from it. */
export type MailConfig = { apiKey: string; from: string; origin: string };
/**
 * `idempotencyKey`, when given, is sent as Resend's `Idempotency-Key`: Resend sends one key once (for 24 hours), so a
 * mail that somehow reached it twice goes out once. The email invite passes its request id; the codes pass none.
 * `limitsChecked` marks a mail whose caller already passed `mailRefusal` (the code claims do, before they hold anything), so
 * `sendMail` does not count it a second time.
 */
export type Mail = { to: string; subject: string; text: string; html: string; idempotencyKey?: string; limitsChecked?: boolean };
/**
 * `failed` is Resend's own refusal (it answered, and sent nothing); `indeterminate` is no answer in time, so the mail
 * may have gone. `limited` and `capped` are OUR refusals before any fetch (`mail-limits.ts`): this recipient is over its
 * hourly or daily allowance (`waitSec` until it ends), or the day's send cap is spent. Nothing was sent in either.
 */
export type MailResult =
  | { ok: true }
  | { ok: false; reason: "unconfigured" | "failed" | "indeterminate" | "capped" }
  | { ok: false; reason: "limited"; waitSec: number };

export type MailEnv = { RESEND_API_KEY?: string; INVITE_EMAIL_FROM?: string; INVITE_CODE_SECRET?: string; APP_ORIGIN?: string; ADMIN_ENV_LABEL?: string };

/** The variables a send reads, from this deployment. */
export function mailEnv(): MailEnv {
  return { RESEND_API_KEY: process.env.RESEND_API_KEY, INVITE_EMAIL_FROM: process.env.INVITE_EMAIL_FROM, INVITE_CODE_SECRET: process.env.INVITE_CODE_SECRET, APP_ORIGIN: process.env.APP_ORIGIN, ADMIN_ENV_LABEL: process.env.ADMIN_ENV_LABEL };
}

let warnedOrigin = false;

/**
 * The configuration a send needs, or null when any part is missing: the key (`re_…`), a sender with an address
 * (`The 99 <invites@…>` or a bare address), the code secret, which every claim needs before a code can be
 * stored, and the app's own origin (`APP_ORIGIN`, a bare https origin, or `http://localhost` outside production): a mail never goes out with relative image paths or a
 * hard-coded host.
 */
export function mailConfig(env: MailEnv): MailConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.INVITE_EMAIL_FROM?.trim();
  if (!apiKey || !/^re_\S+$/.test(apiKey)) return null;
  // A bare address, or a display name with the address in balanced brackets.
  const address = "[^\\s@<>]+@[^\\s@<>]+\\.[^\\s@<>]+";
  if (!from || !new RegExp(`^(?:${address}|[^<>@]*<${address}>)$`).test(from)) return null;
  if (!inviteSecret(env)) return null;
  const origin = appOrigin(env.APP_ORIGIN, env.ADMIN_ENV_LABEL);
  if (!origin) {
    // Said once per instance, never the value: unset is quiet (`unconfigured` already says so); a value that is not a bare https
    // origin is a misconfiguration worth a line.
    if (env.APP_ORIGIN?.trim() && !warnedOrigin) {
      console.warn("[invites] mail refused: APP_ORIGIN is not a bare https origin");
      warnedOrigin = true;
    }
    return null;
  }
  return { apiKey, from, origin };
}

let warnedUnconfigured = false;

export async function sendMail(
  config: MailConfig | null,
  mail: Mail,
  fetchImpl: typeof fetch = fetch,
): Promise<MailResult> {
  if (!config) {
    if (!warnedUnconfigured) console.warn("[invites] mail unconfigured");
    warnedUnconfigured = true;
    return { ok: false, reason: "unconfigured" };
  }
  // Every app email passes the recipient and daily limits before the one fetch: the code claims earlier (so a refusal never
  // rotates a code), everything else here.
  if (!mail.limitsChecked) {
    const refused = await mailRefusal(mail.to);
    if (refused) return { ok: false, ...refused };
  }
  try {
    const res = await fetchImpl(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...(mail.idempotencyKey ? { "Idempotency-Key": mail.idempotencyKey } : {}),
      },
      body: JSON.stringify({ from: config.from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
    if (res.ok) return { ok: true };
    console.warn(`[invites] mail send failed status=${res.status}`);
    return { ok: false, reason: "failed" };
  } catch {
    console.warn("[invites] mail send failed status=none");
    return { ok: false, reason: "indeterminate" };
  }
}
