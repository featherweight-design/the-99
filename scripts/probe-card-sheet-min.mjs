// probe:card-sheet-min — the phone card sheet's min snap (Hugh, 2026-10-13).
//
// At 390 this opens a card from the deck page's list and swipes down on the card from the teaser.
// It checks the sheet reaches its min snap (the shelf 72 tall, its title row in view), the card
// grows to the band's width less a 16px gutter each side, a horizontal swipe still pages and the
// next card opens at min too, and a tap on the card brings the teaser back with the card at its
// teaser size. At 1300 it checks the desktop card details draw no sheet snap at all, unchanged.
//
//   PROBE_BASE=http://localhost:3074 PROBE_DECK_ID=<id> [PROBE_SHOTS=<dir>] node scripts/probe-card-sheet-min.mjs
//
// Writes only the probe account's About row, and restores it.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

// It writes the probe account's About row, so it runs only against a local server and a database
// no other reader uses, judged by the branch the database reports rather than by its URL.
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname)) throw new Error(`PROBE_BASE must be a local server, not ${BASE}.`);
const [{ branch }] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
if (!branch || branch === PRODUCTION || branch === STAGING) throw new Error(`Refusing branch ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev or a scratch branch.`);
const DECK = process.env.PROBE_DECK_ID;
if (!DECK) throw new Error("Set PROBE_DECK_ID to a deck the probe account owns.");

let failures = 0;
const fail = (m) => {
  failures++;
  console.log(`  FAIL ${m}`);
};
const ok = (m) => console.log(`  ok   ${m}`);

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  return page.evaluate(() => window.Clerk.user.id);
}


/** The sheet's snap and top, and the phone card's laid-out box, read off the dialog. */
const READ = () => {
  const sheet = document.querySelector("[data-testid=card-sheet]");
  const card = document.querySelector("[data-testid=modal-art-mobile]");
  const band = document.querySelector("[data-testid=card-band]");
  const title = document.querySelector("#card-modal-title");
  const s = sheet?.getBoundingClientRect();
  const c = card?.getBoundingClientRect();
  const t = title?.getBoundingClientRect();
  return {
    snap: sheet?.getAttribute("data-sheet") ?? null,
    shelf: s ? window.innerHeight - s.top : null,
    titleInView: t ? t.top >= (s?.top ?? 0) && t.bottom <= window.innerHeight : false,
    card: c ? { left: c.left, width: c.width, top: c.top, height: c.height } : null,
    bandWidth: band?.getBoundingClientRect().width ?? null,
    name: title?.textContent?.trim() ?? null,
    // A neighbor's peek, centred on the card's own middle at every snap.
    peekMid: (() => {
      const p = document.querySelector("[data-testid=phone-peek-next], [data-testid=phone-peek-prev]")?.getBoundingClientRect();
      return p ? p.top + p.height / 2 : null;
    })(),
  };
};

/** A touch-like drag with the mouse: the sheet's gestures read pointer events, whatever the pointer. */
async function drag(page, [x0, y0], [x1, y1], steps = 8) {
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps);
  await page.mouse.up();
}

/** Waits out the move (100ms beat + 320ms) and reads the settled state. */
const settle = async (page) => {
  await page.waitForTimeout(700);
  return page.evaluate(READ);
};

await clerkSetup();
const browser = await chromium.launch();
let aboutCapture = null;
try {
  const auth = await browser.newContext();
  const userId = await signIn(await auth.newPage());
  const state = await auth.storageState();
  await auth.close();
  aboutCapture = await captureAboutSeen(userId);

  const phone = await browser.newContext({ storageState: state, viewport: { width: 390, height: 844 } });
  const page = await phone.newPage();
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await clearAboutSheet(page, userId);
  await onPage(page, "[data-decklist-row]").first().waitFor({ timeout: 60_000 });
  await onPage(page, "[data-decklist-row]").filter({ visible: true }).first().click();
  await page.locator("#card-modal-title").waitFor({ timeout: 30_000 });
  const teaser = await settle(page);
  if (teaser.snap !== "teaser") fail(`phone: the card opened at ${teaser.snap}, not the teaser`);

  // Down the card, from the teaser.
  const c = teaser.card;
  await drag(page, [c.left + c.width / 2, c.top + 80], [c.left + c.width / 2, c.top + 80 + 260]);
  const min = await settle(page);
  if (process.env.PROBE_SHOTS) {
    await page.screenshot({ path: `${process.env.PROBE_SHOTS}/sheet-min.png` });
  }
  if (min.snap !== "min") fail(`phone: a swipe down the card left the sheet at ${min.snap}, not min`);
  else ok(`phone: a swipe down the card reaches min`);
  if (Math.abs(min.shelf - 72) > 1) fail(`phone: the shelf is ${min.shelf}px tall at min, not 72`);
  else ok("phone: the shelf is 72px tall, the grip and the title row");
  if (!min.titleInView) fail("phone: the title is not in view on the min shelf");
  const want = min.bandWidth - 32;
  if (Math.abs(min.card.width - want) > 1.5) fail(`phone: the card is ${min.card.width.toFixed(1)}px wide at min, want ${want}`);
  else ok(`phone: the card grows from ${teaser.card.width.toFixed(0)} to ${min.card.width.toFixed(0)}px, the band less 16px each side`);
  if (Math.abs(min.card.left - 16) > 1.5) fail(`phone: the grown card starts ${min.card.left.toFixed(1)}px in, not 16`);
  if (min.peekMid !== null && Math.abs(min.peekMid - (min.card.top + min.card.height / 2)) > 1.5)
    fail(`phone: the neighbor's peek sits at ${min.peekMid.toFixed(0)}, the grown card's middle at ${(min.card.top + min.card.height / 2).toFixed(0)}`);
  if (min.card.top < 63.5 || min.card.top + min.card.height > 844 - 72 + 0.5) fail(`phone: the grown card runs outside the band (${min.card.top.toFixed(0)} to ${(min.card.top + min.card.height).toFixed(0)})`);

  // Paging still works at min, and the next card opens there too.
  const before = min.name;
  await drag(page, [340, min.card.top + 120], [60, min.card.top + 125]);
  await page.waitForFunction((n) => document.querySelector("#card-modal-title")?.textContent?.trim() !== n, before, { timeout: 15_000 }).catch(() => {});
  const paged = await settle(page);
  if (paged.name === before) fail("phone: a horizontal swipe at min did not page (or the list has one card)");
  else if (paged.snap !== "min") fail(`phone: the next card opened at ${paged.snap}, not min`);
  else ok(`phone: paging at min opens ${paged.name}, still at min`);

  // A tap on the card brings the teaser back, and the card with it.
  const pc = paged.card;
  await page.mouse.click(pc.left + pc.width / 2, pc.top + pc.height / 3);
  const back = await settle(page);
  if (back.snap !== "teaser") fail(`phone: a tap on the card left the sheet at ${back.snap}, not the teaser`);
  else if (Math.abs(back.card.width - teaser.card.width) > 1.5) fail(`phone: back at the teaser the card is ${back.card.width}px, not ${teaser.card.width}`);
  else ok("phone: a tap on the card restores the teaser and the card's teaser size");
  await phone.close();

  const desk = await browser.newContext({ storageState: state, viewport: { width: 1300, height: 900 } });
  const dpage = await desk.newPage();
  await dpage.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await clearAboutSheet(dpage, userId);
  await onPage(dpage, "[data-decklist-row]").first().waitFor({ timeout: 60_000 });
  await onPage(dpage, "[data-decklist-row]").filter({ visible: true }).first().click();
  await dpage.locator("#card-modal-title").waitFor({ timeout: 30_000 });
  const d = await settle(dpage);
  const bandShown = await dpage.locator("[data-testid=card-band]").isVisible();
  if (bandShown) fail("desktop: the phone's card band is drawn at 1300");
  else ok(`desktop: unchanged, no phone band (the sheet reads ${d.snap})`);
  await desk.close();
} finally {
  try {
    if (aboutCapture) await restoreAboutSeen(aboutCapture);
  } finally {
    await browser.close();
  }
}
console.log(failures ? `\n${failures} failure(s)` : "\nall checks passed");
process.exit(failures ? 1 : 0);
