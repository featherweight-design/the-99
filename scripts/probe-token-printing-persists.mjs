// A token printing chosen on a deck is still the deck's printing after a reload (#3439).
//
// The claim, as the player sees it: open a token's details from the deck's Tokens group, pick another of the
// printings you hold, reload the page, and the token's row and its details both still show the one you picked.
// Measured at 1300x900 and 390x844, by the set and number the details sheet names and the art the row paints.
//
// It needs a deck token the signed-in account holds two printings of, with distinct sets and numbers, which no
// shared fixture has: seed one on a SCRATCH branch (never local-dev, staging or production) and hand it over as
// PROBE_TOKEN_FIXTURE, a JSON file `{ deckId, tokenId, name, def: { set, cn }, alt: { set, cn } }` where `def`
// is the printing the deck shows unpicked. It WRITES the deck's pick for that one token, and puts the default
// back through the same picker in a `finally`, asserting the cleanup landed.
//
//   PROBE_BASE=http://localhost:3439 PROBE_TOKEN_FIXTURE=<file> node scripts/probe-token-printing-persists.mjs
import { readFileSync } from "node:fs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!process.env.PROBE_TOKEN_FIXTURE) throw new Error("Set PROBE_TOKEN_FIXTURE (see the header).");
const FX = JSON.parse(readFileSync(process.env.PROBE_TOKEN_FIXTURE, "utf8"));
const WIDTHS = [{ width: 1300, height: 900, mobile: false }, { width: 390, height: 844, mobile: true }];

let failures = 0;
const report = (label, ok, saw = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${saw ? ` (${saw})` : ""}`);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const err = await page.evaluate(async ([email, password]) => {
    try {
      const si = window.Clerk.client.signIn;
      let a = email.includes("+clerk_test") ? await si.create({ identifier: email }) : await si.create({ identifier: email, password });
      if (a.status === "needs_first_factor" || a.status === "needs_client_trust") {
        const f = a.supportedFirstFactors?.find((x) => x.strategy === "email_code");
        await si.prepareFirstFactor({ strategy: "email_code", emailAddressId: f?.emailAddressId });
        a = await si.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (a.status !== "complete") return a.status;
      await window.Clerk.setActive({ session: a.createdSessionId });
      return null;
    } catch (e) { return e?.errors?.[0]?.longMessage ?? String(e); }
  }, [EMAIL, PASSWORD]);
  if (err) throw new Error(`sign-in failed: ${err}`);
}

/** Leaves the deck by a visible in-app link to the Decks place: the desktop rail, or the phone's tab bar or back chevron. */
async function leaveToDecks(page) {
  await page.locator('a[href="/decks"]:visible, a[href^="/decks?"]:visible').first().click();
  await page.waitForURL((u) => u.pathname === "/decks", { timeout: 30_000 });
}

const tokenRow = (page) => page.locator("main li[data-token-state]").filter({ hasText: FX.name }).first();

async function loadDeck(page) {
  await page.goto(`${BASE}/decks/${FX.deckId}`, { waitUntil: "load" });
  await tokenRow(page).waitFor({ timeout: 60_000 });
}

/** The row's painted art URL: what the deck shows for the token at rest. */
async function rowArt(page) {
  return tokenRow(page).evaluate((li) => {
    const img = li.querySelector("img");
    if (img) return img.currentSrc || img.src;
    const bg = [...li.querySelectorAll("*")].map((e) => getComputedStyle(e).backgroundImage).find((b) => b && b !== "none");
    return bg ?? null;
  });
}

/** Opens the token's details from its row and returns the set and number the sheet names, e.g. "TC18 21". */
async function openDetails(page) {
  await tokenRow(page).getByRole("button", { name: FX.name, exact: true }).first().click();
  const dialog = page.getByRole("dialog").last();
  await dialog.waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1_200);
  // The phone sheet opens at its peek: the picker is under "Show all details".
  const more = dialog.getByRole("button", { name: "Show all details" });
  if (await more.isVisible()) { await more.click(); await page.waitForTimeout(800); }
  return dialog;
}

const shows = async (dialog, p) => (await dialog.getByText(new RegExp(`\\b${p.set}\\b[^\\n]{0,6}\\b${p.cn}\\b`)).count()) > 0;

/** Picks printing `p` in the open sheet's picker and waits for the write to land. */
async function pick(page, dialog, p) {
  await dialog.getByRole("button", { name: /printings? (you own|owned)/i }).first().click();
  await page.waitForTimeout(800);
  const radio = page.getByRole("radio", { name: new RegExp(`${p.set}.*${p.cn}`, "i") }).first();
  await radio.waitFor({ timeout: 10_000 });
  await radio.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1_500);
}

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const w of WIDTHS) {
    const tag = `${w.width}`;
    const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, isMobile: w.mobile, hasTouch: w.mobile, serviceWorkers: "block" });
    const page = await context.newPage();
    let picked = false;
    try {
      await signIn(page);
      await loadDeck(page);
      const before = await rowArt(page);
      let dialog = await openDetails(page);
      report(`${tag}: unpicked, the details open on the default printing`, await shows(dialog, FX.def), `${FX.def.set} ${FX.def.cn}`);
      picked = true;
      await pick(page, dialog, FX.alt);
      await page.keyboard.press("Escape");
      // The row repaints from the server's answer to the write: poll for it rather than read once.
      let afterPick = await rowArt(page);
      for (let i = 0; i < 30 && afterPick === before; i++) { await page.waitForTimeout(500); afterPick = await rowArt(page); }
      report(`${tag}: the pick moves the row's art`, afterPick !== null && afterPick !== before, `${before} -> ${afterPick}`);

      await page.reload({ waitUntil: "load" });
      await tokenRow(page).waitFor({ timeout: 60_000 });
      const afterReload = await rowArt(page);
      report(`${tag}: after a reload the row still paints the pick`, afterReload !== null && afterReload !== before, `${afterReload}`);
      dialog = await openDetails(page);
      report(`${tag}: after a reload the details still name the pick`, await shows(dialog, FX.alt), `want ${FX.alt.set} ${FX.alt.cn}`);
      await page.keyboard.press("Escape");

      // Leave and come back by navigation, not a reload: the other way the issue names. In-app, the way a
      // player does it: a link out of the deck, then the browser's Back, which reuses the router's copy.
      await page.waitForLoadState("networkidle");
      await leaveToDecks(page);
      await page.waitForLoadState("networkidle");
      await page.goBack({ waitUntil: "load" });
      await tokenRow(page).waitFor({ timeout: 60_000 });
      await page.waitForTimeout(1_500);
      const afterBack = await rowArt(page);
      report(`${tag}: after leaving and coming Back the row still paints the pick`, afterBack !== null && afterBack !== before, `${afterBack}`);
      // And by a fresh in-app navigation back to the deck.
      await leaveToDecks(page);
      await page.locator(`a[href="/decks/${FX.deckId}"]:visible`).first().click();
      await page.waitForURL((u) => u.pathname === `/decks/${FX.deckId}`, { timeout: 30_000 });
      await tokenRow(page).waitFor({ timeout: 60_000 });
      await page.waitForTimeout(1_500);
      const afterNav = await rowArt(page);
      report(`${tag}: after leaving and navigating back in the app the row still paints the pick`, afterNav !== null && afterNav !== before, `${afterNav}`);
    } finally {
      if (picked) {
        try {
          await loadDeck(page);
          const dialog = await openDetails(page);
          await pick(page, dialog, FX.def);
          await page.keyboard.press("Escape");
          await loadDeck(page);
          const d2 = await openDetails(page);
          report(`${tag}: cleanup put the default printing back`, await shows(d2, FX.def));
        } catch (e) { report(`${tag}: cleanup put the default printing back`, false, String(e).slice(0, 160)); }
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log(failures === 0 ? "all checks passed" : `${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
