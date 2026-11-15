/**
 * The email invite, built from the shell (`shell.ts`) and the words in `src/lib/copy/emails.ts`. PURE: the caller reads the
 * sender (`readInviteSender`) and decides the picture, and hands in strings; nothing here reads, fetches or draws. The hand
 * image is only a URL: it is drawn when a client fetches it (`src/app/email/hand/[file]/route.ts`), never inside a send, so a
 * slow Scryfall cannot turn a delivered invite into an `indeterminate` one.
 *
 * With a name: the hand with the sender's card, "{name} saved you a seat at The 99". With no art the same words and the plain
 * hand (the 99's own card back on top). With no name, the anonymous forms: "A friend saved you a seat at The 99", "Don't know
 * who sent it?", and the footer says someone on The 99 invited this address. The email never says whether the address has an
 * account.
 */
import { inviteEmailCopy } from "../copy/emails";
import { buttonHtml, fineHtml, headingHtml, heroHtml, kickerHtml, leadHtml, pointsHtml, rawLinkHtml, renderShell, renderText } from "./shell";

export type InviteMailInput = {
  to: string;
  /** The sender's display name as the player wrote it (a plain string: this is the sender's own, drawn in the sender's own mail), or null. */
  senderName: string | null;
  /** Clerk's invitation URL. */
  url: string;
  days: number;
  origin: string;
  /** The hand image's address, or null for the plain hand (no commander art to draw). */
  handUrl: string | null;
  /** The sender's commander, for the hand's alt text. */
  commanderName: string | null;
};

/** The plain hand: one static file made by `pnpm gen:email-images`. */
export const PLAIN_HAND_PATH = "/email/invite-hero-plain@2x.png";

export function inviteEmailParts(input: InviteMailInput): { subject: string; html: string; text: string } {
  const { url, days, origin } = input;
  const c = inviteEmailCopy;
  const given = input.senderName?.replace(/\s+/g, " ").trim() ?? "";
  const named = given !== "";
  const name = named ? given : c.anon.name;
  const art = named && input.handUrl !== null;
  const lead = named ? c.lead(given) : c.anon.lead;
  const preheader = named ? c.preheader(given, days) : c.anon.preheader(days);
  const reason = named ? c.reason(given) : c.anon.reason;
  const fine = c.fine(days, named ? given : c.anon.who);
  const heroSrc = art ? input.handUrl! : `${origin}${PLAIN_HAND_PATH}`;
  const heroAlt = art ? c.heroAlt(given, input.commanderName ?? "") : c.heroPlainAlt;
  const heading = c.heading(name);
  return {
    subject: c.subject(name),
    html: renderShell({
      origin,
      title: c.subject(name),
      preheader,
      panel:
        heroHtml(heroSrc, heroAlt) +
        kickerHtml(c.kicker) +
        // The name is the sender's to write: escaped where it is drawn (`headingHtml`, `leadHtml`, `fineHtml`, `renderShell`).
        headingHtml(heading.replace(" The 99", " The\u00a099")) +
        leadHtml(lead) +
        pointsHtml(c.points) +
        buttonHtml(url, c.button) +
        rawLinkHtml(c.rawLinkLabel, url) +
        fineHtml(fine),
      reason,
    }),
    text: renderText({
      origin,
      body: [`${heading}.`, lead, c.points.map((p) => `- ${p}`).join("\n"), `${c.textLinkLabel}\n${url}`, fine],
      reason,
    }),
  };
}
