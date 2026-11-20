/**
 * The launch email (launch email R2c), built from the shell (`shell.ts`) and `launchEmailCopy`. PURE: the sender
 * (`sendLaunchBatch`, `src/lib/flyer/launch-send.ts`) hands in the origin, which list the address came from, and its unsubscribe URL;
 * nothing here reads, fetches or draws. The images are static files in `public/email/`, so the email never points at
 * Scryfall. They are not in the repository yet (the handoff's G4, the next PR); until they are, every batch refuses with
 * `images-missing`.
 *
 * One action, drawn twice: Sign up free under the lead, and again after the four features with the fine line and the raw
 * link. The text twin carries the link at both places too.
 */
import { inviteEmailCopy, launchEmailCopy } from "../copy/emails";
import { buttonHtml, escapeHtml, FINE, LINE, BOX, BRASS, MUTED, SANS, SERIF, TEXT, headingHtml, kickerHtml, renderShell, renderText } from "./shell";

export type LaunchSource = "landing" | "flyer";

export type LaunchMailInput = {
  /** The app's own origin (`APP_ORIGIN`): the sign-up link and every image are built from it. */
  origin: string;
  /** Where the address was left: the landing (`code_id` null) or a flyer (`code_id` set). Only the footer's reason differs. */
  source: LaunchSource;
  /** This address's `/unsubscribe?t=` URL (`launch-unsubscribe.ts`). */
  unsubscribeUrl: string;
};

/** The five images the email points at, under `public/email/` (the handoff's G4). */
export const LAUNCH_IMAGES = ["launch-fan@2x.png", ...launchEmailCopy.features.map((f) => `${f.image}@2x.png`)] as const;

/** Each feature capture's drawn size (320 wide), as the handoff's templates draw it (`templates/launch.html`). */
const FEATURE_HEIGHT: Record<(typeof launchEmailCopy.features)[number]["image"], number> = {
  "feature-commanders": 317,
  "feature-tune": 141,
  "feature-written": 227,
  "feature-credits": 155,
};

function fanHtml(src: string, alt: string): string {
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:-8px auto 14px;"><tr><td align="center"><img src="${escapeHtml(src)}" width="520" height="280" alt="${escapeHtml(alt)}" style="display:block;width:100%;max-width:520px;height:auto;border:0;font:italic 14px/1.5 ${SANS};color:${FINE};"></td></tr></table>`;
}

/** The section label over the features: small caps in the fine grey. */
function sectionHtml(label: string): string {
  return `<p style="margin:0 0 22px;font:600 12px/1.4 ${SANS};letter-spacing:.22em;text-transform:uppercase;color:${FINE};text-align:center;">${escapeHtml(label)}</p>`;
}

/** One feature: an elevated box with ◆ 0n, the title, one sentence and its capture. The credits card carries its own border. */
function featureHtml(origin: string, n: number, f: (typeof launchEmailCopy.features)[number]): string {
  const framed = f.image !== "feature-credits";
  const border = framed ? `border:1px solid ${LINE};border-radius:10px;` : "border:0;";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BOX}" style="margin:0 0 20px;background:${BOX};border:1px solid ${LINE};border-radius:12px;"><tr><td class="fbox" align="center" style="padding:26px 28px 28px;text-align:center;"><p style="margin:0 0 8px;font:600 11px/1.4 ${SANS};letter-spacing:.22em;text-transform:uppercase;color:${BRASS};">&#9670;&nbsp;&nbsp;${String(n).padStart(2, "0")}</p><p style="margin:0 0 8px;font:bold 22px/1.25 ${SERIF};color:${TEXT};">${escapeHtml(f.title)}</p><p style="margin:0 auto 20px;max-width:400px;font:15px/1.6 ${SANS};color:${MUTED};">${escapeHtml(f.body)}</p><img src="${escapeHtml(`${origin}/email/${f.image}@2x.png`)}" width="320" height="${FEATURE_HEIGHT[f.image]}" alt="${escapeHtml(f.alt)}" style="display:block;width:100%;max-width:320px;height:auto;margin:0 auto;${border}font:italic 13px/1.5 ${SANS};color:${FINE};"></td></tr></table>`;
}

function leadHtml(text: string): string {
  return `<p style="margin:0 0 24px;font:16px/1.6 ${SANS};color:${MUTED};text-align:center;">${escapeHtml(text)}</p>`;
}

/** The first button sits in its own spaced row, so the features start clear of it. */
function firstButtonHtml(url: string, label: string): string {
  return buttonHtml(url, label).replace("margin:0 auto 18px;", "margin:0 auto 36px;");
}

function closingHtml(url: string): string {
  const c = launchEmailCopy;
  const href = escapeHtml(url);
  return (
    buttonHtml(url, c.button) +
    `<p style="margin:0 0 22px;font:13px/1.5 ${SANS};color:${FINE};text-align:center;">${escapeHtml(c.buttonFine)}</p>` +
    `<p style="margin:0 0 4px;font:13px/1.5 ${SANS};color:${FINE};text-align:center;">${escapeHtml(RAW_LINK_LABEL)}</p>` +
    `<p style="margin:0;font:12px/1.5 'SFMono-Regular',Menlo,Consolas,'Liberation Mono','Courier New',monospace;color:${FINE};text-align:center;word-break:break-all;"><a href="${href}" style="color:${FINE};text-decoration:underline;">${href}</a></p>`
  );
}

/** The shipped raw-link label (`inviteEmailCopy.rawLinkLabel`), the same words under every button. */
const RAW_LINK_LABEL = inviteEmailCopy.rawLinkLabel;

export function launchEmailParts({ origin, source, unsubscribeUrl }: LaunchMailInput): { subject: string; html: string; text: string } {
  const c = launchEmailCopy;
  const signup = `${origin}/sign-up`;
  const reason = c.reason[source];
  return {
    subject: c.subject,
    html: renderShell({
      origin,
      title: c.subject,
      preheader: c.preheader,
      panel:
        fanHtml(`${origin}/email/launch-fan@2x.png`, c.fanAlt) +
        kickerHtml(c.kicker) +
        headingHtml(c.heading) +
        leadHtml(c.lead) +
        firstButtonHtml(signup, c.button) +
        sectionHtml(c.section) +
        c.features.map((f, i) => featureHtml(origin, i + 1, f)).join("") +
        closingHtml(signup),
      reason,
      unsubscribe: { url: unsubscribeUrl, ...c.unsubscribe },
    }),
    text: renderText({
      origin,
      body: [
        c.textLead,
        `${c.textLinkLabel}\n${signup}`,
        `${c.section}:\n${c.features.map((f) => `- ${f.title}. ${"textBody" in f ? f.textBody : f.body}`).join("\n")}`,
        `${c.textLinkLabel}\n${signup}`,
        c.buttonFine,
      ],
      reason,
      unsubscribe: { line: c.textUnsubscribe, url: unsubscribeUrl },
    }),
  };
}
