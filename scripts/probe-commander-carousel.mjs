// probe:commander-carousel — the commander's card details page on into the deck.
//
// The deck header opened its commander with no list, so the card details read "1 of 1" with both
// arrows dead (Hugh, 2026-10-13: it should step on to the next card). The header now passes the
// deck's own list: the commanders first, then the cards in the order the decklist draws them. At
// 390 and at 1300 this opens the commander from the header's card-details control and checks:
//
//   - the counter reads "1 of N", where N is the commanders plus the deck's listed cards;
//   - Next steps to the decklist's FIRST card, the one its first row opens;
//   - Prev from there steps back to the commander;
//
// in All, and again in Shopping when the deck has something to buy (Shopping draws its own list in
// its own order, and the commander pages into that one).
//
//   PROBE_BASE=http://localhost:3071 PROBE_DECK_ID=<id> node scripts/probe-commander-carousel.mjs
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

/** The open card's title and the counter, read off the dialog. */
async function readModal(page) {
  const dialog = page.getByRole("dialog").filter({ has: page.locator("#card-modal-title") });
  await dialog.waitFor({ timeout: 30_000 });
  const title = (await page.locator("#card-modal-title").innerText()).trim();
  const counter = await dialog
    .getByText(/^\d[\d,]* of \d[\d,]*$/)
    .filter({ visible: true })
    .first()
    .innerText()
    .catch(() => null);
  return { title, counter };
}

async function step(page, name, from) {
  await page.getByRole("dialog").getByRole("button", { name }).filter({ visible: true }).first().click();
  await page.waitForFunction((t) => document.querySelector("#card-modal-title")?.textContent?.trim() !== t, from, {
    timeout: 30_000,
  });
  return readModal(page);
}

async function closeModal(page) {
  await page.keyboard.press("Escape");
  await page.locator("#card-modal-title").waitFor({ state: "detached", timeout: 30_000 });
}

/** From one view of the decklist: its first row's card and total, then the commander's carousel. */
async function checkView(page, label, view) {
  const tag = `${label}, ${view}`;
  // The decklist's own first card, and how many it pages through, from its first row.
  await onPage(page, "[data-decklist-row]").filter({ visible: true }).first().click();
  const first = await readModal(page);
  await closeModal(page);
  const listTotal = Number(first.counter?.split(" of ")[1]?.replace(/,/g, ""));

  // The commander's own control, scoped to this width's header: both headers are in the document,
  // and a pair's partner name is a card-details press too.
  const header = label === "phone" ? "[data-testid=spine-band]" : "[data-deck-spine-desktop]";
  await onPage(page, `${header} button[aria-label='View card details']`)
    .filter({ visible: true })
    .first()
    .click();
  const commander = await readModal(page);
  const total = Number(commander.counter?.split(" of ")[1]?.replace(/,/g, ""));
  if (!commander.counter?.startsWith("1 of ")) fail(`${tag}: the commander reads ${commander.counter ?? "no counter"}, not 1 of N`);
  else if (!(total > listTotal)) fail(`${tag}: the commander pages ${total}, the list ${listTotal}; the deck was not added`);
  else ok(`${tag}: the commander reads ${commander.counter} (the list alone is ${listTotal})`);

  // A pair puts its partner second; Next past every commander lands on the list's first card.
  let at = commander;
  for (let i = 0; i < total - listTotal; i++) at = await step(page, "Next card", at.title);
  if (at.title !== first.title) fail(`${tag}: Next from the commanders opened ${at.title}, the list starts at ${first.title}`);
  else ok(`${tag}: Next steps to the list's first card, ${at.title}`);
  for (let i = 0; i < total - listTotal; i++) at = await step(page, "Previous card", at.title);
  if (at.title !== commander.title) fail(`${tag}: Prev came back to ${at.title}, not ${commander.title}`);
  else ok(`${tag}: Prev steps back to ${commander.title}`);
  await closeModal(page);
}

await clerkSetup();
const browser = await chromium.launch();
let aboutCapture = null;
try {
  const auth = await browser.newContext();
  const userId = await signIn(await auth.newPage());
  const state = await auth.storageState();
  await auth.close();
  aboutCapture = await captureAboutSeen(userId);

  for (const [label, viewport] of [
    ["phone", { width: 390, height: 844 }],
    ["desktop", { width: 1300, height: 900 }],
  ]) {
    console.log(label);
    const context = await browser.newContext({ storageState: state, viewport });
    const page = await context.newPage();
    await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await clearAboutSheet(page, userId);
    await onPage(page, "[data-decklist-row]").first().waitFor({ timeout: 60_000 });

    await checkView(page, label, "all cards");
    // The Shopping view draws its own list in its own order; the commander pages into that one.
    const shopping = onPage(page, "[data-shopping-filter]").filter({ visible: true }).first();
    if ((await shopping.count()) && /\b[1-9]/.test(await shopping.innerText())) {
      await shopping.click();
      await page.waitForTimeout(500);
      await checkView(page, label, "Shopping");
    } else console.log(`  skip ${label}: the deck has nothing to buy, so the Shopping view is unmeasured here (decklist.test.tsx pins its order)`);
    await context.close();
  }
} finally {
  try {
    if (aboutCapture) await restoreAboutSeen(aboutCapture);
  } finally {
    await browser.close();
  }
}
console.log(failures ? `\n${failures} failure(s)` : "\nall checks passed");
process.exit(failures ? 1 : 0);
