/**
 * The admin "send every email template to me" set (`/admin/invites`). PURE: it calls only the `*EmailParts` builders on FIXED sample
 * data, so a preview mints no claim, token, code or mailing-list row. The invite link, the codes and the unsubscribe URL are inert
 * samples that open nothing. Every subject carries `[Preview]` so a preview never reads as a real send.
 *
 * `code` and `flyer-code` are one builder (`codeEmailParts`), so they are one email here; `PREVIEW_CODE_SHARED` says so, and the
 * admin's result line names it. Clerk's sign-in and reset emails are sent by Clerk, never by this app, and are not in the set.
 */
import { codeEmailParts } from "./code-mail";
import { inviteEmailParts, PLAIN_HAND_PATH } from "./invite-mail";
import { launchEmailParts } from "./launch-mail";
import type { Mail, MailTemplate } from "../invites/mail";

export const PREVIEW_SUBJECT_PREFIX = "[Preview] ";

/** The templates the claim flows send under `code` and `flyer-code`: the same builder, so the same email. */
export const PREVIEW_CODE_SHARED: readonly MailTemplate[] = ["code", "flyer-code"];

/** An obviously fake six-digit code and link: nothing here opens a real claim. */
const SAMPLE_CODE = "000000";

export function previewMails(to: string, origin: string): Mail[] {
  const invite = inviteEmailParts({
    to,
    senderName: "A friend",
    url: `${origin}/preview-sample`,
    days: 7,
    origin,
    handUrl: `${origin}${PLAIN_HAND_PATH}`,
    commanderName: null,
  });
  const code = codeEmailParts(SAMPLE_CODE, origin);
  const launch = launchEmailParts({ origin, source: "landing", unsubscribeUrl: `${origin}/preview-sample` });
  const tag = (m: { subject: string; text: string; html: string }, template: MailTemplate): Mail => ({
    to,
    template,
    subject: PREVIEW_SUBJECT_PREFIX + m.subject,
    text: m.text,
    html: m.html,
  });
  return [tag(invite, "invite"), tag(code, "code"), tag(launch, "launch")];
}
