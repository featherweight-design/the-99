// probe:about — About's ways in, pressed in a real browser at 390x844 and 1300x820 (About visual build, plan
// `2026-10-27-about-visual.md`, PR 6a): the index's tiles (W1), the retired Tools tab drawing the index (W2), and the ?
// pressed on Upload a file, History, New deck and an About page, each landing read off the URL, the back bar and the
// lit unit (W3 to W6). Read-only: it writes nothing.
//
//   PROBE_BASE=http://localhost:3291 pnpm probe:about        (`--ways-in` is accepted and means the same)
//
// The R6 walks this probe once ran retired with what they walked (About visual PR 6b): the one-time sheet, its cookie
// and forged-header checks, and the `--flip` walk of entries announced by a switch flipping on. The banner now carries
// every launch, and `pnpm probe:about-banner` presses it, the flip included (`src/proxy-flip.test.ts` walks the same
// rule through the real proxy). Point it at `local-dev`, never production.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL"]);
if (!EMAIL.includes("+clerk_test")) throw new Error("Use a +clerk_test account (see the local-auth note).");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

const WIDTHS = [
  { label: 390, viewport: { width: 390, height: 844 } },
  { label: 1300, viewport: { width: 1300, height: 820 } },
];

// Counted here, never at the call sites: a check that forgot to count once printed FAIL
// and then "All checks passed" over the top.
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
  return page.evaluate(() => window.Clerk.user.id);
}

async function waysInWalk(browser, width) {
  const context = await browser.newContext({ viewport: width.viewport });
  const page = await context.newPage();
  await signIn(page);
  const L = (s) => `${width.label}: ${s}`;
  const desk = width.label >= 768;
  const pressQuestion = async () => {
    const q = page.locator(`[data-help-button='${desk ? "rail" : "header"}']`);
    await q.waitFor({ timeout: 15_000 });
    await q.click();
  };
  const landed = async (path) => {
    await page.waitForURL((u) => u.pathname === path, { timeout: 20_000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    return new URL(page.url());
  };

  // W1. The index: its Decks tile goes to the Decks page.
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
  const tile = page.locator("[data-about-tile='decks']");
  await tile.click();
  report(L("W1 the index's Decks tile opens /about/decks"), (await landed("/about/decks")).pathname === "/about/decks");

  // W2. The retired Tools tab draws the index, not a tab.
  await page.goto(`${BASE}/about?tab=tools`, { waitUntil: "networkidle" });
  const toolsTab = await page.getByRole("tab", { name: /^Tools/ }).count();
  await page.locator("[data-about-tile='home']").click();
  report(L("W2 ?tab=tools draws the index: its Home tile opens /about/home"), toolsTab === 0 && (await landed("/about/home")).pathname === "/about/home", `${toolsTab} Tools tab`);

  // W3. The ? on Upload a file lands on Collection at #upload with the back bar; the bar goes back.
  await page.goto(`${BASE}/collection/replace`, { waitUntil: "networkidle" });
  await pressQuestion();
  const up = await landed("/about/collection");
  report(L("W3 the ? on Upload a file lands on #upload, from the screen"), up.hash === "#upload" && up.searchParams.get("from") === "/collection/replace", up.href);
  const back = page.locator("[data-about-back] a");
  const backText = (await back.textContent().catch(() => null))?.trim();
  report(L("W3 the back bar names the screen"), backText === "‹ Back to Upload a file", String(backText));
  const top = await back.evaluate((el) => el.getBoundingClientRect().top).catch(() => null);
  await page.mouse.wheel(0, 1600);
  await page.waitForTimeout(500);
  const held = await back.evaluate((el) => el.getBoundingClientRect().top).catch(() => null);
  report(L("W3 the back bar is held at the top while the page scrolls"), top !== null && held !== null && held >= 0 && held < 140, `${top} → ${held}`);
  await back.click();
  report(L("W3 Back to Upload a file returns there"), (await landed("/collection/replace")).pathname === "/collection/replace");

  // W4. The ? on History lands on Upload a file with the Replace and Add rule lit, no New tag, `lit` stripped.
  await page.goto(`${BASE}/collection/history`, { waitUntil: "networkidle" });
  await pressQuestion();
  const hist = await landed("/about/collection");
  const lit = await page.locator("[data-rule='rule/replace'][data-lit]").count();
  const news = await page.locator("[data-about-new]").count();
  report(
    L("W4 the ? on History lights the Replace and Add rule, no New tag, lit stripped, from kept"),
    lit === 1 && news === 0 && !hist.searchParams.has("lit") && hist.searchParams.get("from") === "/collection/history",
    `${page.url()} lit ${lit} new ${news}`,
  );

  // W5. The ? on New deck lights the New deck label (halo, its line pressed).
  await page.goto(`${BASE}/decks/new`, { waitUntil: "networkidle" });
  await pressQuestion();
  await landed("/about/decks");
  const label = page.locator(`[data-about-width='${desk ? "desktop" : "phone"}'] [data-about-label='decks/your-decks/new-deck'] button[aria-pressed='true']`);
  report(L("W5 the ? on New deck lands on Your decks with New deck lit"), (await label.count()) === 1 && (await page.locator("[data-about-new]").count()) === 0);

  // W6. On a page with no landing (About itself) the ? opens the index.
  await page.goto(`${BASE}/about/friends`, { waitUntil: "networkidle" });
  await pressQuestion();
  report(L("W6 the ? on an About page opens the index"), (await landed("/about")).pathname === "/about");
  await context.close();
}

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const width of WIDTHS) {
    console.log(`\nways in, ${width.label}x${width.viewport.height}`);
    // A step that throws (a control a broken build never drew) is a failure at THIS width, reported and counted, and
    // the other width still runs.
    try {
      await waysInWalk(browser, width);
    } catch (error) {
      report(`${width.label}: the ways-in walk stopped`, false, String(error?.message ?? error).split("\n")[0]);
    }
  }
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
