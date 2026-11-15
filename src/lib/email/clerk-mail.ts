/**
 * Clerk's sign-in code and password-reset code emails, on the same shell (branded emails R2, G3). Clerk sends these itself, so this
 * is not a send path: `scripts/gen-clerk-templates.mts` renders them with Clerk's `{{otp_code}}` variable where our mails put the
 * code, and Hugh pastes the files into Clerk's dashboard (`docs/clerk-email-templates/README.md`). PURE: strings in, strings out.
 *
 * Clerk's email editor takes only its own Revolvapp markup (`<re-html>`, `<re-body>`, `<re-block>`, `<re-text>`...), so the HTML
 * here is NOT the shell's table markup (`renderShell`, which our own Resend mails use). It carries the same palette and words in
 * `re-*` elements, and only the attributes Clerk's default "Verification code" template uses. The mark is Clerk's `{{> app_logo}}`
 * partial (the app's logo, set in the Clerk dashboard), as in that default. `{{otp_code}}` sits inside a `<re-text>`, as there too.
 */
import { clerkEmailCopy, emailShellCopy } from "../copy/emails";
import { BRASS, FINE, INK, LINE, MUTED, PANEL, TEXT, escapeHtml, renderText } from "./shell";

export const CLERK_OTP = "{{otp_code}}";
export type ClerkTemplateKind = keyof typeof clerkEmailCopy;

const e = escapeHtml;

/** The Revolvapp markup for one code email: the default template's structure, in our palette and words. */
function revolvappHtml(c: (typeof clerkEmailCopy)[ClerkTemplateKind]): string {
  return `<re-html>
<re-head>
    <re-title>
        ${e(c.subject)}
    </re-title>
</re-head>
<re-body background-color="${INK}" padding="48px 32px 48px 32px">
    <re-preheader>
        ${e(c.preheader)}
    </re-preheader>
    <re-header padding="16px 32px 8px 32px">
        <re-text font-size="18px" font-weight="bold" line-height="26px" color="${BRASS}">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="${PANEL}" border-radius="0px">
        <re-block border-radius="0px" align="left" padding="32px 32px 48px 32px" background-color="${PANEL}" font-size="14px" font-weight="bold" margin="0" level="h1">
            <re-text margin="0px 0px 0px 0px" align="left" font-size="12px" font-weight="bold" color="${BRASS}">
                ${e(c.kicker.toUpperCase())}
            </re-text>
            <re-heading margin="8px 0px 0px 0px" level="h1" align="left" color="${TEXT}" font-size="26px" line-height="34px">
                ${e(c.heading)}
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="left" font-size="15px" color="${MUTED}">
                ${e(c.lead)}
            </re-text>
            <re-text font-size="40px" margin="24px 0px 0px 0px" color="${TEXT}">
                <b>${CLERK_OTP}</b>
            </re-text>
            <re-text margin="24px 0px 0px 0px" font-size="14px" color="${FINE}">
                ${e(c.fine)}
            </re-text>
        </re-block>
    </re-main>
    <re-footer padding="24px 32px 48px">
        <re-divider background-color="${LINE}" height="1px"></re-divider>
        <re-text margin="16px 0px 0px 0px" font-size="13px" color="${FINE}">
            ${e(c.reason)} ${e(emailShellCopy.noReplies)}
        </re-text>
        <re-text margin="8px 0px 0px 0px" font-size="13px" color="${FINE}">
            © {{current_year}} {{app.name}}
        </re-text>
    </re-footer>
</re-body>
</re-html>
`;
}

export function clerkEmailParts(kind: ClerkTemplateKind, origin: string): { subject: string; html: string; text: string } {
  const c = clerkEmailCopy[kind];
  return {
    subject: c.subject,
    html: revolvappHtml(c),
    text: renderText({ origin, body: [c.textLead, CLERK_OTP, c.fine], reason: c.reason }),
  };
}
