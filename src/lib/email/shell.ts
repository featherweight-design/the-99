/**
 * The one dark shell every email The 99 sends sits on (handoff `design_handoff_the99_emails`, R2): the crowned 99 tile alone on top,
 * a panel with a brass top rule, a brass kicker over a Georgia heading, the message, and a footer that closes on a flavor line.
 * Email-safe tables with inline styles and an MSO wrapper, one fixed palette (Table Candlelight), system fonts only. PURE and
 * SERVER-ONLY by use: strings in, strings out, no read, no fetch. Every dynamic value goes through `escapeHtml`; every URL is built
 * from the `origin` the caller hands in (`appOrigin(APP_ORIGIN)`, validated in `mailConfig`), never a hard-coded host.
 *
 * This file is the markup; the words live in `src/lib/copy/emails.ts`. The email palette is its own (an email client has no theme
 * system), so these hexes are the handoff's and nothing here reads the app's tokens.
 */
import { emailShellCopy } from "../copy/emails";

const INK = "#14110E";
const PANEL = "#1E1A15";
const BOX = "#2A241D";
const LINE = "#3A3229";
const BRASS = "#C9A24B";
const TEXT = "#EDE6D8";
const MUTED = "#C6B79A";
const FINE = "#A89B84";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',Times,serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono','Courier New',monospace";

/** Escapes text for an HTML body: a name or a code is never trusted as markup. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** "The 99" never breaks across a line in the footer's reason. */
function holdName(escaped: string): string {
  return escaped.replaceAll("The 99", "The&nbsp;99");
}

/** The hidden line a mail client shows beside the subject, padded so the body does not leak into the preview. */
function preheaderRow(text: string): string {
  const pad = "&#8199;&#65279;&#847;".repeat(6);
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${INK};opacity:0;">${escapeHtml(text)}${pad}</div>`;
}

/** The brass kicker over the heading: ◆ label ◆. */
export function kickerHtml(label: string): string {
  return `<p style="margin:0 0 14px;font:600 12px/1.4 ${SANS};letter-spacing:.22em;text-transform:uppercase;color:${BRASS};text-align:center;">&#9670;&nbsp;&nbsp;${escapeHtml(label)}&nbsp;&nbsp;&#9670;</p>`;
}

export function headingHtml(text: string): string {
  return `<h1 class="h1" style="margin:0 0 14px;font:bold 30px/1.2 ${SERIF};color:${TEXT};text-align:center;">${escapeHtml(text)}</h1>`;
}

export function leadHtml(text: string): string {
  return `<p style="margin:0 0 22px;font:16px/1.6 ${SANS};color:${MUTED};text-align:center;">${escapeHtml(text)}</p>`;
}

/** The code in a brass-bordered box: live text with no spaces, so copy and autofill get the digits clean. */
export function codeBoxHtml(code: string): string {
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;">
<tr><td align="center" bgcolor="${BOX}" style="background:${BOX};border:1px solid ${BRASS};border-radius:10px;padding:18px 30px;">
<p style="margin:0;font:600 38px/1.15 ${MONO};letter-spacing:.28em;color:${TEXT};padding-left:.28em;">${escapeHtml(code)}</p>
</td></tr></table>`;
}

/** A hairline, then the fine print under it. */
export function fineHtml(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${LINE};font-size:0;line-height:0;height:1px;padding:0 0 20px;">&nbsp;</td></tr></table><p style="margin:0;font:14px/1.55 ${SANS};color:${FINE};text-align:center;">${escapeHtml(text)}</p>`;
}

/** The hand image above the kicker: a hosted PNG with a transparent ground, its alt styled to read inside its box when images are off. */
export function heroHtml(src: string, alt: string): string {
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 18px;"><tr><td align="center"><img src="${escapeHtml(src)}" width="280" height="270" alt="${escapeHtml(alt)}" style="display:block;width:280px;height:270px;border:0;font:italic 14px/1.5 ${SANS};color:${FINE};"></td></tr></table>`;
}

/** The three points in an elevated box, each behind a brass diamond. */
export function pointsHtml(points: readonly string[]): string {
  const rows = points
    .map((text) => `<tr><td valign="top" style="padding:0 12px 10px 0;font:12px/24px ${SANS};color:${BRASS};">&#9670;</td><td valign="top" style="padding:0 0 10px;font:15px/24px ${SANS};color:${TEXT};">${escapeHtml(text)}</td></tr>`)
    .join("");
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" bgcolor="${BOX}" style="margin:0 auto 28px;background:${BOX};border:1px solid ${LINE};border-radius:10px;"><tr><td style="padding:16px 22px 6px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0">${rows}</table></td></tr></table>`;
}

/** The one button style: brass fill, dark bold label, 52 tall, with a VML twin for Outlook. */
export function buttonHtml(url: string, label: string): string {
  const href = escapeHtml(url);
  const text = escapeHtml(label);
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 18px;">
<tr><td align="center" bgcolor="${BRASS}" style="background:${BRASS};border:1px solid ${BRASS};border-radius:8px;">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:52px;v-text-anchor:middle;width:260px;" arcsize="16%" stroke="f" fillcolor="${BRASS}"><center style="color:${INK};font:bold 17px Arial,sans-serif;">${text}</center></v:roundrect><![endif]-->
<!--[if !mso]><!-- --><a href="${href}" style="display:inline-block;padding:16px 44px;min-width:180px;font:bold 17px/20px ${SANS};color:${INK};text-decoration:none;border-radius:8px;">${text}</a><!--<![endif]-->
</td></tr></table>`;
}

/** The raw link under the button, for a client that will not draw it. */
export function rawLinkHtml(label: string, url: string): string {
  const href = escapeHtml(url);
  return `<p style="margin:0 0 4px;font:13px/1.5 ${SANS};color:${FINE};text-align:center;">${escapeHtml(label)}</p><p style="margin:0 0 28px;font:12px/1.5 ${MONO};color:${FINE};text-align:center;word-break:break-all;"><a href="${href}" style="color:${FINE};text-decoration:underline;">${href}</a></p>`;
}

export type ShellInput = {
  /** The app's own origin (`https://the-99.dev`), for the tile, its link and the footer's site link. */
  origin: string;
  /** The document title and the preheader's words. */
  title: string;
  preheader: string;
  /** The panel's rows, already HTML (the helpers above). */
  panel: string;
  /** Why this mail came, in the footer. */
  reason: string;
};

/** The whole document. */
export function renderShell({ origin, title, preheader, panel, reason }: ShellInput): string {
  const site = escapeHtml(origin);
  // The footer link reads as the host of the origin it points at (staging says its own).
  const host = escapeHtml(new URL(origin).host);
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body { margin:0; padding:0; background:${INK}; }
  a { color:${BRASS}; }
  @media (max-width:620px) {
    .pad { padding-left:24px !important; padding-right:24px !important; }
    .gut { padding-left:12px !important; padding-right:12px !important; }
    .h1 { font-size:26px !important; }
  }
</style>
<!--[if mso]><style>table,td,p,a,h1{font-family:Arial,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${INK};" bgcolor="${INK}">
${preheaderRow(preheader)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${INK}" style="background:${INK};">
<tr><td align="center" class="gut" style="padding:36px 24px 44px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td align="center" style="padding:0 0 24px;">
  <a href="${site}" style="text-decoration:none;"><img src="${site}/email/mark-112@2x.png" width="56" height="56" alt="${escapeHtml(emailShellCopy.markAlt)}" style="display:block;width:56px;height:56px;border:0;border-radius:13px;font:bold 13px/56px ${SERIF};color:${BRASS};text-align:center;"></a>
</td></tr>
<tr><td bgcolor="${PANEL}" class="pad" style="background:${PANEL};border:1px solid ${LINE};border-top:3px solid ${BRASS};border-radius:12px;padding:36px 40px 32px;">
${panel}
</td></tr>
<tr><td align="center" class="pad" style="padding:28px 40px 0;">
  <p aria-hidden="true" style="margin:0 0 10px;font:10px/1 ${SANS};letter-spacing:8px;color:${BRASS};">&#9670;&#9670;&#9670;</p>
  <p style="margin:0 0 14px;font:italic 15px/1.5 ${SERIF};color:${MUTED};">${escapeHtml(emailShellCopy.flavor)}</p>
  <p style="margin:0;font:13px/1.6 ${SANS};color:${FINE};">${holdName(escapeHtml(reason))}<br>${escapeHtml(emailShellCopy.noReplies)}<br><a href="${site}" style="color:${FINE};text-decoration:underline;">${host}</a></p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>
`;
}

export type TextInput = {
  origin: string;
  /** The message's lines, each its own paragraph (a lone code or link goes on a line of its own). */
  body: string[];
  reason: string;
};

/** The plain-text twin: the message, then `--`, the reason, the flavor line, the replies line and the site. */
export function renderText({ origin, body, reason }: TextInput): string {
  return `${body.map(straight).join("\n\n")}\n\n--\n${straight(reason)}\n${straight(emailShellCopy.flavor)}\n${straight(emailShellCopy.noReplies)}\n${origin}\n`;
}

/** A curly apostrophe or quote becomes a straight one: a plain-text part uses straight quotes. */
export function straight(text: string): string {
  return text.replaceAll("’", "'").replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"');
}
