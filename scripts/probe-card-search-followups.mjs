// Card search's three staging follow-ups, in a browser at 390 and at 1300 (Hugh, 2026-10-16):
//   1. Leaving the search empties the field: Close, Escape and Back each, and the next open starts empty.
//   2. On Collection › Wishlist, a card added to the wishlist from card details (opened from the search) is in the
//      list behind at once, and gone again after Remove.
//   3. Picking a result goes from the search to card details with the page never shown in between: every animation
//      frame from the press until the card is up has either the search's frame or the card's dialog drawn.
//
//   PROBE_BASE=http://localhost:3472 pnpm probe:card-search-followups
//
// Needs a server started with CARD_SEARCH_ENABLED, SOCIAL_WISHLIST_ENABLED and COLLECTION_EDIT_ENABLED set to true.
// Leg 2 writes one wishlist line for the audit account and removes it again; point it at local-dev, never staging.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const QUERY = process.env.PROBE_QUERY ?? "sol";

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const sheet = (page) => page.getByRole("dialog", { name: "Search all cards" });
const card = (page) => page.locator('[role="dialog"]').filter({ hasText: /\d+ of \d+/ });
// Card details fold in rungs on the phone ("All details"), so leaving it is Escape until the search is back.
async function backToSearch(page) {
  for (let i = 0; i < 4 && !(await sheet(page).isVisible()); i += 1) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  }
  await sheet(page).waitFor({ timeout: 5_000 });
}
async function unfold(page) {
  const more = card(page).first().getByRole("button", { name: /All details/ });
  if (await more.isVisible()) await more.click();
}
const opener = (page, wide) =>
  wide ? page.locator('aside button[aria-label="Search all cards"]') : page.getByRole("button", { name: "Search all cards", exact: true });

// A goto right after a leg's last Escape can abort against the navigation still settling: let it settle, retry once.
async function go(page, path) {
  await page.waitForTimeout(500);
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" }).catch(async () => {
    await page.waitForTimeout(1000);
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  });
}

async function open(page, wide) {
  await opener(page, wide).click();
  await sheet(page).waitFor({ timeout: 5_000 });
}

// 1. Every way out empties the field.
async function emptyOnLeave(page, wide, tag) {
  const field = () => sheet(page).getByRole("combobox");
  const ways = [
    ["Close", async () => (wide ? page.mouse.click(900, 700) : sheet(page).getByRole("button", { name: "Close search" }).click())],
    ["Escape", async () => { await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); }],
    ["Back", async () => { await page.goBack(); await page.waitForTimeout(400); }],
  ];
  for (const [name, leave] of ways) {
    await open(page, wide);
    await field().fill(QUERY);
    await sheet(page).getByRole("option").first().waitFor({ timeout: 15_000 });
    await leave();
    await page.waitForTimeout(200);
    report(`${tag} ${name}: the search is closed`, !(await sheet(page).isVisible()));
    await open(page, wide);
    report(`${tag} ${name}: it opens with an empty field`, (await field().inputValue()) === "");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
  }
}

// Opens a card from the search by name and takes it off the wishlist. Only ever called for the card this run added.
async function removeAdded(page, wide, name) {
  await open(page, wide);
  await sheet(page).getByRole("combobox").fill(name);
  await sheet(page).getByRole("option").first().waitFor({ timeout: 15_000 });
  await sheet(page).getByRole("option").first().click();
  await card(page).first().waitFor({ timeout: 15_000 });
  await unfold(page);
  await card(page).first().getByRole("button", { name: /^Remove$/ }).first().click();
  await card(page).first().getByRole("button", { name: /Add to wishlist/ }).first().waitFor({ timeout: 10_000 });
  await backToSearch(page);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
}

// 2. A wishlist add made in a card the search opened shows in the list behind.
async function wishlistBehind(page, wide, tag) {
  await go(page, "/collection/wishlist");
  const tiles = page.locator('[data-testid="wishlist-tile"]');
  const before = await tiles.count();
  await open(page, wide);
  await sheet(page).getByRole("combobox").fill(QUERY);
  const options = sheet(page).getByRole("option");
  await options.first().waitFor({ timeout: 15_000 });
  const count = await options.count();
  // A result already on the list is somebody's wish, not a fixture: it is never touched.
  let chosen = null;
  for (let i = 0; i < count && chosen === null; i += 1) {
    const name = await sheet(page).getByRole("option").nth(i).getAttribute("aria-label");
    if (name && !/on your wishlist/.test(name)) chosen = { i, name, short: name.split(",")[0] };
  }
  if (!report(`${tag} a result not on the list yet`, chosen !== null)) return;
  await sheet(page).getByRole("option").nth(chosen.i).click();
  await card(page).first().waitFor({ timeout: 15_000 });
  await unfold(page);
  let added = false;
  try {
    const add = card(page).first().getByRole("button", { name: /Add to wishlist/ }).first();
    await add.waitFor({ timeout: 10_000 });
    await add.click();
    added = true;
    await card(page).first().getByRole("button", { name: /^Remove$/ }).first().waitFor({ timeout: 10_000 });
    await backToSearch(page);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    const grew = await page.waitForFunction((n) => document.querySelectorAll('[data-testid="wishlist-tile"]').length === n + 1, before, { timeout: 10_000 }).then(() => true, () => false);
    report(`${tag} the added card is in the list behind`, grew, `${chosen.name}: ${before} tiles before, ${await tiles.count()} after`);
    await removeAdded(page, wide, chosen.short);
    added = false;
    const gone = await page.waitForFunction((n) => document.querySelectorAll('[data-testid="wishlist-tile"]').length === n, before, { timeout: 10_000 }).then(() => true, () => false);
    report(`${tag} …and gone again after Remove`, gone, `${await tiles.count()} tiles`);
  } finally {
    // A check that threw after the add still takes the line it wrote off again.
    if (added) {
      await go(page, "/collection/wishlist").catch(() => {});
      await removeAdded(page, wide, chosen.short).catch((e) => console.error(`COULD NOT REMOVE the wish this run added (${chosen.short}):`, e.message));
    }
  }
}

// 3. No frame between the search and the card shows the page.
async function noFlash(page, wide, tag) {
  await go(page, "/collection");
  // The card's read is slowed, so a gap would be long enough to see.
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"]) await new Promise((r) => setTimeout(r, 700));
    await route.continue();
  });
  await open(page, wide);
  await sheet(page).getByRole("combobox").fill(QUERY);
  const option = sheet(page).getByRole("option").first();
  await option.waitFor({ timeout: 15_000 });
  await page.evaluate(() => {
    window.__frames = [];
    window.__watch = true;
    const drawn = (el) => Boolean(el) && !el.hidden && el.getClientRects().length > 0;
    const tick = () => {
      const search = document.querySelector("[data-card-search-sheet]");
      const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter((d) => d !== search && drawn(d));
      window.__frames.push(drawn(search) || dialogs.length > 0);
      if (window.__watch) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await option.click();
  await card(page).first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(150);
  const frames = await page.evaluate(() => {
    window.__watch = false;
    return window.__frames;
  });
  await page.unroute("**/*");
  const bare = frames.filter((f) => !f).length;
  report(`${tag} the page is never drawn between the search and the card`, bare === 0, `${frames.length} frames, ${bare} bare`);
  await backToSearch(page).catch(() => {});
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
}

let aboutPrior = null;

async function leg(browser, wide) {
  const tag = wide ? "1300:" : "390:";
  const context = await browser.newContext(
    wide ? { viewport: { width: 1300, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  );
  const page = await context.newPage();
  await signIn(page);
  // The one-time About gate would redirect the first load to /about, so it is marked seen first, and put back after.
  const userId = await page.evaluate(() => window.Clerk?.user?.id ?? null);
  if (!userId) throw new Error("Signed in, but Clerk reports no user.");
  aboutPrior ??= await captureAboutSeen(userId);
  await clearAboutSheet(page, userId);
  await page.goto(`${BASE}/collection`, { waitUntil: "networkidle" });
  await emptyOnLeave(page, wide, tag);
  await wishlistBehind(page, wide, tag);
  await noFlash(page, wide, tag);
  await context.close();
}

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    await leg(browser, false);
    await leg(browser, true);
  } finally {
    if (aboutPrior) await restoreAboutSeen(aboutPrior).catch((e) => console.error("could not restore About:", e));
    await browser.close();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
