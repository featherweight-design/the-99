/**
 * Clerk's sign-in code and password-reset code emails, on the same shell (branded emails R2, G3). Clerk sends these itself, so this
 * is not a send path: `scripts/gen-clerk-templates.mts` renders them with Clerk's `{{otp_code}}` variable where our mails put the
 * code, and Hugh pastes the files into Clerk's dashboard (`docs/clerk-email-templates/README.md`). PURE: strings in, strings out.
 *
 * Clerk's email editor takes only its own Revolvapp markup (`<re-html>`, `<re-body>`, `<re-block>`, `<re-text>`...), so the HTML
 * here is NOT the shell's table markup (`renderShell`, which our own Resend mails use). It carries the same palette and words in
 * `re-*` elements. The mark is a hosted image (`/email/mark-112@2x.png`), not Clerk's `{{> app_logo}}` partial, which Clerk's
 * preview left literal. `{{otp_code}}` sits inside a `<re-text>`, as in Clerk's default.
 */
import { clerkEmailCopy, emailShellCopy } from "../copy/emails";
import { BOX, BRASS, FINE, INK, LINE, MONO, MUTED, PANEL, SERIF, TEXT, escapeHtml, renderText } from "./shell";

export const CLERK_OTP = "{{otp_code}}";
export type ClerkTemplateKind = keyof typeof clerkEmailCopy;

const e = escapeHtml;

/**
 * The Revolvapp markup for one code email, matching the drawn code email (`design/design_handoff_the99_emails`, board K): the
 * hosted mark centred on top, a card with a brass rule, the brass kicker, the serif heading, the code in a brass-bordered box, a
 * hairline and the expiry line, then the diamonds, the flavor line, the reason and the site. Elements and attributes are the
 * ones Revolvapp documents (imperavi.com/legacy/revolvapp/docs/syntax/tags) plus the few Clerk's own default template uses
 * (`font-size` and `line-height` on `re-heading`). Revolvapp has no font-family or letter-spacing attribute, so those ride on
 * classes in a `re-style` block.
 */
function revolvappHtml(c: (typeof clerkEmailCopy)[ClerkTemplateKind], origin: string): string {
  const site = e(origin);
  const host = e(new URL(origin).host);
  return `<re-html>
<re-head>
    <re-title>
        ${e(c.subject)}
    </re-title>
    <re-style>
        .serif { font-family: ${SERIF}; }
        .mono { font-family: ${MONO}; letter-spacing: 0.28em; padding-left: 0.28em; }
        .kicker { letter-spacing: 0.22em; text-transform: uppercase; }
    </re-style>
</re-head>
<re-body background-color="${INK}" padding="36px 24px 44px 24px">
    <re-preheader>
        ${e(c.preheader)}
    </re-preheader>
    <re-header padding="0px 0px 24px 0px" background-color="${INK}">
        <re-block align="center" padding="0px 0px 0px 0px" background-color="${INK}">
            <re-image src="${site}/email/mark-112@2x.png" width="56px" alt="${e(emailShellCopy.markAlt)}" href="${site}" border-radius="13px"></re-image>
        </re-block>
    </re-header>
    <re-main background-color="${PANEL}" border="1px solid ${LINE}" border-radius="12px" padding="0px 40px 32px 40px">
        <re-divider background-color="${BRASS}" height="3px"></re-divider>
        <re-block align="center" padding="36px 0px 0px 0px" background-color="${PANEL}">
            <re-text class="kicker" align="center" margin="0px 0px 14px 0px" font-size="12px" font-weight="bold" color="${BRASS}">
                &#9670;&nbsp;&nbsp;${e(c.kicker)}&nbsp;&nbsp;&#9670;
            </re-text>
            <re-heading class="serif" level="h1" align="center" margin="0px 0px 14px 0px" color="${TEXT}" font-size="30px" line-height="36px">
                ${e(c.heading)}
            </re-heading>
            <re-text align="center" margin="0px 0px 24px 0px" font-size="16px" font-weight="normal" line-height="26px" color="${MUTED}">
                ${e(c.lead)}
            </re-text>
        </re-block>
        <re-block align="center" padding="18px 30px 18px 30px" background-color="${BOX}" border="1px solid ${BRASS}" border-radius="10px">
            <re-text class="mono" align="center" margin="0px 0px 0px 0px" font-size="38px" font-weight="bold" line-height="44px" color="${TEXT}">
                {{otp_code}}
            </re-text>
        </re-block>
        <re-block align="center" padding="24px 0px 0px 0px" background-color="${PANEL}">
            <re-divider background-color="${LINE}" height="1px"></re-divider>
            <re-text align="center" margin="20px 0px 0px 0px" font-size="14px" font-weight="normal" line-height="22px" color="${FINE}">
                ${e(c.fine)}
            </re-text>
        </re-block>
    </re-main>
    <re-footer padding="28px 24px 0px 24px" background-color="${INK}">
        <re-block align="center" padding="0px 0px 0px 0px" background-color="${INK}">
            <re-text align="center" margin="0px 0px 10px 0px" font-size="10px" font-weight="normal" color="${BRASS}">
                &#9670;&#9670;&#9670;
            </re-text>
            <re-text class="serif" align="center" margin="0px 0px 14px 0px" font-size="15px" font-style="italic" font-weight="normal" line-height="22px" color="${MUTED}">
                ${e(emailShellCopy.flavor)}
            </re-text>
            <re-text align="center" margin="0px 0px 0px 0px" font-size="13px" font-weight="normal" line-height="21px" color="${FINE}">
                ${e(c.reason)}
            </re-text>
            <re-text align="center" margin="0px 0px 0px 0px" font-size="13px" font-weight="normal" line-height="21px" color="${FINE}">
                ${e(emailShellCopy.noReplies)}
            </re-text>
            <re-link href="${site}" align="center" margin="0px 0px 0px 0px" font-size="13px" color="${FINE}">${host}</re-link>
        </re-block>
    </re-footer>
</re-body>
</re-html>
`;
}

export function clerkEmailParts(kind: ClerkTemplateKind, origin: string): { subject: string; html: string; text: string } {
  const c = clerkEmailCopy[kind];
  return {
    subject: c.subject,
    html: revolvappHtml(c, origin),
    text: renderText({ origin, body: [c.textLead, CLERK_OTP, c.fine], reason: c.reason }),
  };
}
