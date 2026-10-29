// Card search's handover and history, in a browser at 390 (plan `2026-10-16-card-search.md`, PR C). It opens the
// sheet from the header, types, presses a result, and asserts card details shows with Find a deck; then Back three
// times: the search with its query standing, then the page, then the route before it. Then again with two handovers
// before the Backs, which is where an extra history stop would show. Run on a list page and on a deck page.
// Then the desktop leg at 1300 (PR D): the rail slot, the shortcut from a page field and from nowhere, the 540px field
// beside the rail, a result's card and Escape on it back to the field, a press outside, and the shortcut doing nothing
// under a dialog.
//
//   PROBE_BASE=http://localhost:3437 pnpm probe:card-search-ui
//
// Reads only: it opens cards and writes nothing but the
// browser's own recent-cards entry.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

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

// The sheet and the card are both role=dialog; the sheet is the one labelled by its hidden heading.
const sheet = (page) => page.getByRole("dialog", { name: "Search all cards" });
const card = (page) => page.locator('[role="dialog"]').filter({ hasText: /\d+ of \d+/ });

async function openAndPick(page, tag, index = 0) {
  const field = sheet(page).getByRole("combobox");
  if (!(await sheet(page).isVisible())) {
    await page.getByRole("button", { name: "Search all cards", exact: true }).click();
    report(`${tag} sheet opens`, await sheet(page).isVisible());
    report(`${tag} field has focus`, await field.evaluate((el) => el === document.activeElement));
  }
  if ((await field.inputValue()) !== QUERY) await field.fill(QUERY);
  const option = sheet(page).getByRole("option").nth(index);
  await option.waitFor({ timeout: 15_000 });
  const name = await option.getAttribute("aria-label");
  await option.click();
  await card(page).first().waitFor({ timeout: 15_000 });
  report(`${tag} card opens`, await card(page).first().isVisible(), name ?? "");
  // On the phone the details sit under "All details"; Find a deck is the footer's door there (H2).
  const more = card(page).first().getByRole("button", { name: /All details/ });
  if (await more.isVisible()) await more.click();
  const door = card(page).first().getByText(/Find a deck for it/).locator("visible=true").first();
  await door.waitFor({ timeout: 5_000 }).catch(() => {});
  report(`${tag} Find a deck stays (a first layer)`, await door.isVisible());
  // "All details" is a rung of the card's own (Back or Escape folds it before closing the card): fold it again.
  const opened = !(await more.isVisible());
  if (opened) await page.keyboard.press("Escape");
  report(`${tag} the card stays up after folding its details`, await card(page).first().isVisible());
  report(`${tag} sheet closed under the card`, !(await sheet(page).isVisible()));
}

async function backToSearch(page, tag) {
  await page.goBack();
  await sheet(page).waitFor({ timeout: 5_000 }).catch(() => {});
  report(`${tag} Back returns to the search`, await sheet(page).isVisible());
  report(`${tag} the query stands`, (await sheet(page).getByRole("combobox").inputValue()) === QUERY);
  report(`${tag} focus is on the row that opened the card`, await page.evaluate(() => Boolean(document.activeElement?.closest("[data-card-search-row]"))));
}

async function walk(page, tag, before, pageUrl, handovers) {
  await page.goto(before, { waitUntil: "networkidle" });
  await page.goto(pageUrl, { waitUntil: "networkidle" });
  for (let i = 0; i < handovers; i += 1) {
    await openAndPick(page, `${tag} handover ${i + 1}:`, i);
    await backToSearch(page, `${tag} handover ${i + 1}:`);
  }
  await page.goBack();
  await page.waitForTimeout(400);
  report(`${tag} Back again closes the search`, !(await sheet(page).isVisible()));
  report(`${tag} …on the page`, new URL(page.url()).pathname === new URL(pageUrl).pathname, page.url());
  await page.goBack();
  await page.waitForURL((u) => u.pathname === new URL(before).pathname, { timeout: 10_000 }).catch(() => {});
  report(`${tag} one more Back reaches the route before`, new URL(page.url()).pathname === new URL(before).pathname, page.url());
}

let shotPage = null;

// The desktop leg (PR D): the rail slot, the shortcut and the field beside the rail, at 1300.
async function desktopLeg(browser) {
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  shotPage = page;
  await signIn(page);
  await page.goto(`${BASE}/collection`, { waitUntil: "networkidle" });
  const slot = page.locator('aside button[aria-label="Search all cards"]');
  report("desktop: the rail slot is drawn", await slot.isVisible());
  const box = await slot.boundingBox();
  report("desktop: …38px square", Boolean(box) && Math.round(box.width) === 38 && Math.round(box.height) === 38, JSON.stringify(box));
  const mac = await page.evaluate(() => /mac/i.test(navigator.platform));
  const keys = mac ? "Meta+k" : "Control+k";
  report("desktop: …names its shortcut", (await slot.getAttribute("aria-keyshortcuts")) === (mac ? "Meta+K" : "Control+K"));

  // From nowhere: the shortcut opens the field, focused, 540 wide and 12px off the rail.
  await page.keyboard.press(keys);
  const field = sheet(page);
  await field.waitFor({ timeout: 5_000 }).catch(() => {});
  report("desktop: the shortcut opens the search", await field.isVisible());
  report("desktop: …field has focus", await field.getByRole("combobox").evaluate((el) => el === document.activeElement));
  const fbox = await field.boundingBox();
  const rail = await page.locator("aside").first().boundingBox();
  report("desktop: …540 wide", Boolean(fbox) && Math.round(fbox.width) === 540, `${fbox?.width}`);
  report("desktop: …12px out from the rail", Boolean(fbox && rail) && Math.round(fbox.x - (rail.x + rail.width)) === 12, `${fbox && rail ? fbox.x - (rail.x + rail.width) : "?"}`);
  report("desktop: …not modal", (await field.getAttribute("aria-modal")) === null);
  report("desktop: …the shortcut shows in the field", /⌘K|Ctrl K/.test((await field.textContent()) ?? ""));
  report("desktop: …the page is not locked", (await page.evaluate(() => getComputedStyle(document.body).overflow)) !== "hidden");

  // Escape closes, and focus stays where there was none to return to (the shortcut was pressed from nowhere).
  await page.keyboard.press("Escape");
  report("desktop: escape closes the empty field", !(await field.isVisible()));

  // From inside a page field: the shortcut opens it, and closing returns focus to that page field.
  const pageField = onPage(page, 'input[type="search"], input[placeholder*="earch"]').first();
  await pageField.focus();
  await page.keyboard.press(keys);
  report("desktop: the shortcut works inside a page field", await field.isVisible());
  await page.keyboard.press("Escape");
  report("desktop: …focus returns to that page field", await pageField.evaluate((el) => el === document.activeElement));

  // The slot opens it too, and returns focus to the slot.
  await slot.click();
  report("desktop: the slot opens the search", await field.isVisible());
  await field.getByRole("combobox").fill(QUERY);
  const options = field.getByRole("option");
  await options.first().waitFor({ timeout: 15_000 });
  const osize = await options.first().locator("span").first().boundingBox();
  report("desktop: …rows draw art at 30x42", Boolean(osize) && Math.round(osize.width) === 30 && Math.round(osize.height) === 42, JSON.stringify(osize));
  report("desktop: …the foot names the shortcut", /opens this from anywhere/.test((await field.textContent()) ?? ""));

  // ↓ ↵ opens card details; Escape on the card returns to the field as it was.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await card(page).first().waitFor({ timeout: 15_000 });
  report("desktop: a result opens card details", await card(page).first().isVisible());
  const door = card(page).first().getByText(/Find a deck for it/).locator("visible=true").first();
  await door.waitFor({ timeout: 5_000 }).catch(() => {});
  report("desktop: …Find a deck stays", await door.isVisible());
  report("desktop: …the search stepped aside", !(await field.isVisible()));
  await page.keyboard.press(keys);
  report("desktop: …the shortcut does nothing under the card", !(await field.isVisible()));
  await page.keyboard.press("Escape");
  await field.waitFor({ timeout: 5_000 }).catch(() => {});
  report("desktop: escape on the card returns to the field", await field.isVisible());
  report("desktop: …the query stands", (await field.getByRole("combobox").inputValue()) === QUERY);
  report("desktop: …focus is on the row that opened it", await page.evaluate(() => Boolean(document.activeElement?.closest("[data-card-search-row]"))));

  // Escape clears, then closes, and the slot has focus again; a press outside closes too.
  await page.keyboard.press("Escape");
  report("desktop: escape clears the query first", (await field.getByRole("combobox").inputValue()) === "" && (await field.isVisible()));
  await page.keyboard.press("Escape");
  report("desktop: …then closes", !(await field.isVisible()));
  report("desktop: …focus is back on the slot", await slot.evaluate((el) => el === document.activeElement));
  await slot.click();
  await page.mouse.click(900, 600);
  report("desktop: a press outside closes it", !(await field.isVisible()));

  await context.close();
}

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  shotPage = page;
  await signIn(page);

  await walk(page, "list:", `${BASE}/`, `${BASE}/collection`, 1);
  await walk(page, "list x2:", `${BASE}/`, `${BASE}/collection`, 2);

  // Escape clears the query, then closes, and focus goes back to the icon (README call 7).
  await page.goto(`${BASE}/collection`, { waitUntil: "networkidle" });
  const icon = page.getByRole("button", { name: "Search all cards", exact: true });
  await icon.click();
  await sheet(page).getByRole("combobox").fill(QUERY);
  await page.keyboard.press("Escape");
  report("escape: the first clears the query", (await sheet(page).getByRole("combobox").inputValue()) === "");
  report("escape: …and the sheet stays", await sheet(page).isVisible());
  await page.keyboard.press("Escape");
  report("escape: the second closes", !(await sheet(page).isVisible()));
  report("escape: focus is back on the icon", await icon.evaluate((el) => el === document.activeElement));

  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  // A deck's own page: a uuid after /decks/, never /decks/new or /decks/import.
  const hrefs = await onPage(page, 'a[href^="/decks/"]').evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  const href = hrefs.find((h) => /^\/decks\/[0-9a-f-]{36}$/.test(h ?? "")) ?? null;
  if (report("deck: a deck to open", Boolean(href), href ?? "none")) {
    await walk(page, "deck:", `${BASE}/decks`, `${BASE}${href}`, 1);
  }

  await desktopLeg(browser);
  await browser.close();
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  // PROBE_SHOT names a file to keep what the page showed when the run stopped.
  if (shotPage && process.env.PROBE_SHOT) await shotPage.screenshot({ path: process.env.PROBE_SHOT }).catch(() => {});
  process.exit(1);
});
