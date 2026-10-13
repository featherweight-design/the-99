// probe:search-dismiss — one rule for a search field that picks from a list (DECK INPUT UX, Hugh
// 2026-10-12), pressed in a real browser at 1300x900 and 390x844 on the two fields it first ships on:
// the deck page's Quick add and Help me choose's Theme picker.
//
// 1. ESCAPE clears the text and closes the list in ONE press.
// 2. A PRESS OUTSIDE the field and its list clears the text and closes the list.
// 3. A PRESS INSIDE (Quick add's owned toggle) keeps the text.
// 4. A THEME PICK clears the typed text and leaves the list open for the next pick, focus in the field.
//
// Quick add's clear-after-an-add is pinned by its unit test rather than pressed here: an add writes a
// card to the deck. This probe writes the account's About row (`clearAboutSheet`) and nothing else,
// and restores it. Needs a server with HELP_ME_CHOOSE_ENABLED=true; point it at local-dev, never
// staging or production. PROBE_DECK names the deck; otherwise the account's newest.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

const VIEWPORTS = [
  { label: 1300, width: 1300, height: 900 },
  { label: 390, width: 390, height: 844 },
];

let failures = 0;
function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test")
          ? await signIn.create({ identifier: email })
          : await signIn.create({ identifier: email, password });
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
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

// Fail closed before the first write: this probe writes the account's About row (`clearAboutSheet`), through
// the DATABASE_URL `env.mjs` loads, so that is the database whose branch is checked. Never staging or production.
const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";
// The app the browser reaches must be local too: this probe signs in there and dismisses its About card.
const baseHost = new URL(BASE).hostname;
if (!["localhost", "127.0.0.1", "[::1]"].includes(baseHost)) throw new Error(`probe:search-dismiss refuses PROBE_BASE ${BASE}; it runs against a local server only.`);
const [{ branch }] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
  throw new Error(`probe:search-dismiss refuses branch ${branch ?? "(unknown)"}; point DATABASE_URL at local-dev or a scratch branch.`);
}

await clerkSetup();
const sql = neon(DATABASE_URL);
const browser = await chromium.launch();
let prior = null;

/** A real pointer press on something on the page that is not the field's own root. */
async function pressOutside(page, rootSelector) {
  const point = await page.evaluate((sel) => {
    const root = document.querySelector(sel);
    for (const el of document.querySelectorAll("main h1, main h2, main p")) {
      if (root && root.contains(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight) return { x: r.left + 4, y: r.top + r.height / 2 };
    }
    return null;
  }, rootSelector);
  if (!point) throw new Error("no visible element outside the field to press");
  await page.mouse.click(point.x, point.y);
}

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.width < 768, hasTouch: vp.width < 768 });
    const page = await context.newPage();
    const userId = await signIn(page);
    if (prior === null) prior = await captureAboutSeen(userId);
    await clearAboutSheet(page, userId);

    // ── Quick add ──────────────────────────────────────────────────────────
    const deckId = process.env.PROBE_DECK
      ?? (await sql`select id from decks where user_id = ${userId} order by created_at desc limit 1`)[0]?.id;
    if (!deckId) throw new Error("the account holds no deck; set PROBE_DECK");
    await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "networkidle" });
    const deckTab = onPage(page, "#tab-deck").first();
    if ((await deckTab.count()) > 0 && (await deckTab.isVisible())) await deckTab.click();
    const bar = onPage(page, 'input[role="combobox"]').first();
    await bar.waitFor({ timeout: 60_000 });
    const barRoot = "main div:has(> div > div > input[role=combobox])";
    const openBar = async () => {
      await bar.click();
      await bar.fill("sol");
      await onPage(page, '[role="option"]').first().waitFor({ timeout: 15_000 });
    };

    await openBar();
    await bar.press("Escape");
    report(`${vp.label} Quick add: one Escape clears the text and closes the list`,
      (await bar.inputValue()) === "" && (await onPageRole(page, "listbox").count()) === 0);

    await openBar();
    const owned = onPageRole(page, "checkbox", /only cards you own/i).first();
    await owned.locator("xpath=..").click();
    await page.waitForTimeout(300);
    report(`${vp.label} Quick add: pressing the owned toggle keeps the text`, (await bar.inputValue()) === "sol");

    await openBar();
    await pressOutside(page, barRoot);
    await page.waitForTimeout(200);
    report(`${vp.label} Quick add: a press outside clears the text and closes the list`,
      (await bar.inputValue()) === "" && (await onPageRole(page, "listbox").count()) === 0);

    // ── Help me choose, Theme ──────────────────────────────────────────────
    await page.goto(`${BASE}/decks/new/choose`, { waitUntil: "networkidle" });
    const theme = onPage(page, 'input[role="combobox"]').first();
    await theme.waitFor({ timeout: 60_000 });
    const chips = () => onPage(page, '[data-testid="theme-chip"]').count();
    const before = await chips();
    await theme.click();
    await theme.fill("elf");
    const option = onPageRole(page, "option").filter({ visible: true }).first();
    await option.waitFor({ timeout: 10_000 });
    await option.click();
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => ({
      focused: document.activeElement?.getAttribute("role") === "combobox" && document.activeElement.tagName === "INPUT",
      expanded: document.querySelector('main input[role="combobox"]')?.getAttribute("aria-expanded"),
    }));
    report(`${vp.label} Theme: a pick adds the chip, clears the text, keeps the list open and focus in the field`,
      (await chips()) === before + 1 && (await theme.inputValue()) === "" && after.focused && after.expanded === "true", JSON.stringify(after));

    await theme.fill("orc");
    await theme.press("Escape");
    report(`${vp.label} Theme: one Escape clears the text and closes the list`,
      (await theme.inputValue()) === "" && (await theme.getAttribute("aria-expanded")) === "false");

    await theme.click();
    await theme.fill("orc");
    await pressOutside(page, 'main div:has(> div > input[role="combobox"])');
    await page.waitForTimeout(200);
    report(`${vp.label} Theme: a press outside clears the text and closes the list`,
      (await theme.inputValue()) === "" && (await theme.getAttribute("aria-expanded")) === "false");

    await context.close();
  }
} finally {
  if (prior) await restoreAboutSeen(prior).catch((e) => report("About row restored", false, String(e)));
  await browser.close();
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
