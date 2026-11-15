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

/** Inline styles for what Revolvapp has no attribute for (a font family, letter-spacing), on a `<span>` inside the element's text. */
const span = (style: string, text: string) => `<span style="${style}">${text}</span>`;

/**
 * The Revolvapp markup for one code email, matching the drawn code email (`design/design_handoff_the99_emails`, board K,
 * `templates/clerk-*.html`): the hosted mark centred on top, a card with a brass rule across its full width, the brass kicker,
 * the Georgia heading, the code in a brass-bordered box that hugs the code, a hairline and the expiry line, then the diamonds,
 * the flavor line, the reason and the site. Elements and attributes are the ones Revolvapp documents
 * (imperavi.com/legacy/revolvapp/docs/syntax/tags). It has none for a font family or letter-spacing, and Clerk's preview dropped
 * a `re-style` block, so those ride on inline `<span style>`s inside the text.
 */
function revolvappHtml(c: (typeof clerkEmailCopy)[ClerkTemplateKind], origin: string): string {
  const site = e(origin);
  const host = e(new URL(origin).host);
  const serif = (text: string) => span(`font-family:${SERIF};`, text);
  return `<re-html>
<re-head>
    <re-title>
        ${e(c.subject)}
    </re-title>
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
    <re-main background-color="${PANEL}" border="1px solid ${LINE}" border-radius="12px" padding="0px 0px 32px 0px">
        <re-divider background-color="${BRASS}" height="3px"></re-divider>
        <re-block align="center" padding="36px 40px 0px 40px" background-color="${PANEL}">
            <re-text align="center" margin="0px 0px 14px 0px" font-size="12px" font-weight="600" line-height="17px" color="${BRASS}">
                ${span("letter-spacing:0.22em;text-transform:uppercase;", `&#9670;&nbsp;&nbsp;${e(c.kicker)}&nbsp;&nbsp;&#9670;`)}
            </re-text>
            <re-heading level="h1" align="center" margin="0px 0px 14px 0px" color="${TEXT}" font-size="30px" line-height="36px">
                ${serif(e(c.heading))}
            </re-heading>
            <re-text align="center" margin="0px 0px 22px 0px" font-size="16px" font-weight="normal" line-height="26px" color="${MUTED}">
                ${e(c.lead)}
            </re-text>
        </re-block>
        <re-block align="center" padding="0px 40px 0px 40px" background-color="${PANEL}">
            <re-grid>
                <re-column width="262px" align="center" padding="18px 30px 18px 30px" background-color="${BOX}" border="1px solid ${BRASS}" border-radius="10px">
                    <re-text align="center" margin="0px 0px 0px 0px" font-size="38px" font-weight="600" line-height="44px" color="${TEXT}">
                        ${span(`font-family:${MONO};letter-spacing:0.28em;padding-left:0.28em;`, "{{otp_code}}")}
                    </re-text>
                </re-column>
            </re-grid>
        </re-block>
        <re-block align="center" padding="24px 40px 0px 40px" background-color="${PANEL}">
            <re-divider background-color="${LINE}" height="1px"></re-divider>
            <re-text align="center" margin="20px 0px 0px 0px" font-size="14px" font-weight="normal" line-height="22px" color="${FINE}">
                ${e(c.fine)}
            </re-text>
        </re-block>
    </re-main>
    <re-footer padding="28px 40px 0px 40px" background-color="${INK}">
        <re-block align="center" padding="0px 0px 0px 0px" background-color="${INK}">
            <re-text align="center" margin="0px 0px 10px 0px" font-size="10px" font-weight="normal" line-height="10px" color="${BRASS}">
                ${span("letter-spacing:8px;", "&#9670;&#9670;&#9670;")}
            </re-text>
            <re-text align="center" margin="0px 0px 14px 0px" font-size="15px" font-style="italic" font-weight="normal" line-height="22px" color="${MUTED}">
                ${serif(e(emailShellCopy.flavor))}
            </re-text>
            <re-text align="center" margin="0px 0px 0px 0px" font-size="13px" font-weight="normal" line-height="21px" color="${FINE}">
                ${e(c.reason)}<br>${e(emailShellCopy.noReplies)}<br><a href="${site}" style="color:${FINE};text-decoration:underline;">${host}</a>
            </re-text>
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
