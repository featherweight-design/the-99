/**
 * Clerk's sign-in code and password-reset code emails, on the same shell (branded emails R2, G3). Clerk sends these itself, so this
 * is not a send path: `scripts/gen-clerk-templates.mts` renders them with Clerk's `{{otp_code}}` variable where our mails put the
 * code, and Hugh pastes the files into Clerk's dashboard (`docs/clerk-email-templates/README.md`). PURE: strings in, strings out.
 */
import { clerkEmailCopy } from "../copy/emails";
import { codeBoxHtml, fineHtml, headingHtml, kickerHtml, leadHtml, renderShell, renderText } from "./shell";

export const CLERK_OTP = "{{otp_code}}";
export type ClerkTemplateKind = keyof typeof clerkEmailCopy;

export function clerkEmailParts(kind: ClerkTemplateKind, origin: string): { subject: string; html: string; text: string } {
  const c = clerkEmailCopy[kind];
  return {
    subject: c.subject,
    html: renderShell({
      origin,
      // The subject without its variable ("Your sign-in code for The 99"), for the document title.
      title: c.subject.replace(`: ${CLERK_OTP}`, ""),
      preheader: c.preheader,
      panel: kickerHtml(c.kicker) + headingHtml(c.heading) + leadHtml(c.lead) + codeBoxHtml(CLERK_OTP) + fineHtml(c.fine),
      reason: c.reason,
    }),
    text: renderText({ origin, body: [c.textLead, CLERK_OTP, c.fine], reason: c.reason }),
  };
}
