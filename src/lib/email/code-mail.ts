/**
 * The newcomer's code and the flyer's code: one email, built from the shell (`shell.ts`) and the words in `src/lib/copy/emails.ts`.
 * PURE: a code and an origin in, `{ subject, html, text }` out. The code is live text with no spaces. The ten minutes the copy
 * names is `CODE_TTL_MS` (`src/lib/invites/rules.ts`), which both claims use.
 */
import { codeEmailCopy } from "../copy/emails";
import { codeBoxHtml, fineHtml, headingHtml, kickerHtml, leadHtml, renderShell, renderText, straight } from "./shell";

export function codeEmailParts(code: string, origin: string): { subject: string; html: string; text: string } {
  const c = codeEmailCopy;
  return {
    subject: c.subject(code),
    html: renderShell({
      origin,
      title: `Your code for The 99`,
      preheader: c.preheader,
      panel: kickerHtml(c.kicker) + headingHtml(c.heading) + leadHtml(c.lead) + codeBoxHtml(code) + fineHtml(c.fine),
      reason: c.reason,
    }),
    text: renderText({ origin, body: [straight(c.textLead), code, straight(c.fine)], reason: straight(c.reason) }),
  };
}
