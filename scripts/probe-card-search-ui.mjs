// Card search's handover and history, in a browser at 390 (plan `2026-10-16-card-search.md`, PR C). It opens the
// sheet from the header, types, presses a result, and asserts card details shows with Find a deck; then Back three
// times: the search with its query standing, then the page, then the route before it. Then again with two handovers
// before the Backs, which is where an extra history stop would show. Run on a list page and on a deck page.
//
//   PROBE_BASE=http://localhost:3437 pnpm probe:card-search-ui
//
// Needs a server started with CARD_SEARCH_ENABLED=true. Reads only: it opens cards and writes nothing but the
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
  const door = card(page).first().getByText(/Find a deck for it/).first();
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
