// render:emails <out-dir>: renders every email the app builds (fixture values, no send, no network, no database, no `.env`) in
// Chromium at the handoff's 648 desktop and 375 phone widths, as PNGs in <out-dir>: the emails' contact sheet. The tile is read
// from `public/email/` on disk. It shows the dark shell as drawn; a real client pass (Gmail, Apple Mail, Outlook) is a separate
// check, the handoff's G5.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { codeEmailParts } from "../src/lib/email/code-mail";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] ?? "email-shots");
mkdirSync(out, { recursive: true });

const ORIGIN = "https://the-99.dev";
const EMAILS: Record<string, string> = {
  code: codeEmailParts("042917", ORIGIN).html,
};

const browser = await chromium.launch();
for (const [name, html] of Object.entries(EMAILS)) {
  const local = html.replaceAll(`${ORIGIN}/email/`, `file://${join(ROOT, "public/email")}/`);
  const file = join(out, `${name}.html`);
  writeFileSync(file, local);
  for (const [width, label] of [[648, "desktop"], [375, "phone"]] as const) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto(`file://${file}`);
    await page.screenshot({ path: join(out, `${name}-${label}.png`), fullPage: true });
    await page.close();
    console.log(`${name}-${label}.png`);
  }
}
await browser.close();
