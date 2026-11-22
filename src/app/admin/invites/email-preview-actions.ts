"use server";

import { currentUser } from "@clerk/nextjs/server";

import { requireAdmin } from "../../../lib/admin/access";
import { primaryEmail } from "../../../lib/account/sign-in";
import { previewMails } from "../../../lib/email/preview-mails";
import { mailConfig, mailEnv, sendMail } from "../../../lib/invites/mail";
import { enforceHit } from "../../../lib/rate/observe";

// "Send every email template to me" (admin tools). Every export calls `requireAdmin()` on its first line
// (`src/app/admin/actions.test.ts` reads every action module under src/app/admin); the page is never trusted.
// The recipient is the signed-in admin's OWN Clerk address, read here, never taken from the client. The cooldown (one press in
// five minutes, `rate_hits`) is checked BEFORE the first send, and each send passes the recipient and daily mail walls in
// `sendMail`. Only the `*EmailParts` builders and `sendMail` run: no claim, token, code or mailing-list row is written.

export type EmailPreviewResult =
  | { ok: true; sent: string[]; total: number; stoppedBy: "capped" | "limited" | "failed" | null }
  | { ok: false; reason: "cooldown"; waitSec: number }
  | { ok: false; reason: "unconfigured" | "no-address" | "failed" };

export async function sendEmailPreviews(): Promise<EmailPreviewResult> {
  const { userId } = await requireAdmin();
  try {
    const config = mailConfig(mailEnv());
    if (!config) return { ok: false, reason: "unconfigured" };
    const user = await currentUser();
    const to = user ? primaryEmail(user) : "";
    if (!to) return { ok: false, reason: "no-address" };
    const wait = await enforceHit(userId, "admin-mail-preview");
    if (wait !== null) return { ok: false, reason: "cooldown", waitSec: wait };
    const mails = previewMails(to, config.origin);
    const sent: string[] = [];
    let stoppedBy: "capped" | "limited" | "failed" | null = null;
    for (const mail of mails) {
      const r = await sendMail(config, mail);
      if (r.ok) {
        sent.push(mail.template ?? "");
        continue;
      }
      stoppedBy = r.reason === "capped" ? "capped" : r.reason === "limited" ? "limited" : "failed";
      // A cap or a recipient wall refuses the rest too; anything else may be one template's failure, so try the next.
      if (stoppedBy !== "failed") break;
    }
    console.info(`[email-preview] by=${userId} sent=${sent.length} of=${mails.length} stoppedBy=${stoppedBy ?? "none"}`);
    return { ok: true, sent, total: mails.length, stoppedBy };
  } catch (error) {
    console.error("admin: email preview failed", error instanceof Error ? error.name : "unknown");
    return { ok: false, reason: "failed" };
  }
}
