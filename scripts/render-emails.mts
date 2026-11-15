// render:emails <out-dir>: renders every email the app builds (fixture values, no send, no network, no database, no `.env`) in
// Chromium at the handoff's 648 desktop and 375 phone widths, as PNGs in <out-dir>: the emails' contact sheet. The tile is read
// from `public/email/` on disk. It shows the dark shell as drawn; a real client pass (Gmail, Apple Mail, Outlook) is a separate
// check, the handoff's G5.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { ImageResponse } from "next/og";
import { named } from "../src/lib/person-name/mint";
import { HAND_SIZE, InviteHand } from "../src/components/email/invite-hand-image";
import { codeEmailParts } from "../src/lib/email/code-mail";
import { inviteEmailParts } from "../src/lib/email/invite-mail";
import { ogFonts } from "../src/lib/og/fonts";
import { SCRYFALL_HEADERS } from "../src/lib/scryfall/http";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] ?? "email-shots");
mkdirSync(out, { recursive: true });

const ORIGIN = "https://the-99.dev";
// The hand for the "with art" invite is drawn here, from Ghalta's art as Scryfall serves it (the one fixture that needs the network);
// with no network the sheet draws the plain hand for it.
let hand: Buffer | null = null;
try {
  const card = await (await fetch("https://api.scryfall.com/cards/named?exact=Ghalta,+Primal+Hunger", { headers: { ...SCRYFALL_HEADERS, Accept: "application/json" } })).json() as { image_uris: { art_crop: string } };
  const art = await fetch(card.image_uris.art_crop, { headers: { ...SCRYFALL_HEADERS, Accept: "image/*" } });
  const dataUrl = `data:image/jpeg;base64,${Buffer.from(await art.arrayBuffer()).toString("base64")}`;
  hand = Buffer.from(await new ImageResponse(InviteHand({ face: { name: named("Colin"), commanderName: "Ghalta, Primal Hunger", art: dataUrl } }), { ...HAND_SIZE, fonts: await ogFonts() }).arrayBuffer());
  writeFileSync(join(out, "hand-colin.png"), hand);
} catch (error) {
  console.warn("no hand drawn:", error instanceof Error ? error.message : error);
}
const INVITE = { to: "new@x.dev", url: "https://accounts.the-99.dev/sign-up?__clerk_ticket=abc", days: 7, origin: ORIGIN };
const EMAILS: Record<string, string> = {
  code: codeEmailParts("042917", ORIGIN).html,
  "invite-art": inviteEmailParts({ ...INVITE, senderName: "Colin", handUrl: hand ? `${ORIGIN}/email/hand-colin.png` : null, commanderName: "Ghalta, Primal Hunger" }).html,
  "invite-plain": inviteEmailParts({ ...INVITE, senderName: "Colin", handUrl: null, commanderName: null }).html,
  "invite-anon": inviteEmailParts({ ...INVITE, senderName: null, handUrl: null, commanderName: null }).html,
  "invite-long-name": inviteEmailParts({ ...INVITE, senderName: "Bartholomew Featherstonehaugh-Wetherby", handUrl: null, commanderName: null }).html,
};

const browser = await chromium.launch();
for (const [name, html] of Object.entries(EMAILS)) {
  const local = html
    .replaceAll(`${ORIGIN}/email/hand-colin.png`, pathToFileURL(join(out, "hand-colin.png")).href)
    .replaceAll(`${ORIGIN}/email/`, `${pathToFileURL(join(ROOT, "public/email")).href}/`);
  const file = join(out, `${name}.html`);
  writeFileSync(file, local);
  for (const [width, label] of [[648, "desktop"], [375, "phone"]] as const) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto(pathToFileURL(file).href);
    await page.screenshot({ path: join(out, `${name}-${label}.png`), fullPage: true });
    await page.close();
    console.log(`${name}-${label}.png`);
  }
}
await browser.close();
