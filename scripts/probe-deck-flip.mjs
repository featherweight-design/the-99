// The deck page's flip strip, pressed (handoff design_handoff_the99_deck_flip_order): opened from the Decks list, the
// strip names `k of N` for the list the reader saw; a square or ←/→ opens the neighbour, the ends wrap, a field keeps
// its own arrows, and a deck opened directly steps All decks.
//
// Read-only: it signs in, presses tiles and squares, writes nothing. Needs an account with 3+ decks.
//   PROBE_BASE=http://localhost:3721 node scripts/probe-deck-flip.mjs
// Point it at local-dev or a scratch branch, NEVER production.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL", "E2E_AUDIT_USER_PASSWORD", "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
let failed = 0;
const check = (width, label, ok, saw) => {
  if (!ok) failed++;
  console.log(`${ok ? "  ok  " : " FAIL "} [${width}] ${label} — ${saw}`);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async ([email, password]) => {
    try {
      const s = window.Clerk.client.signIn;
      let a = await s.create({ identifier: email, password });
      if (a.status === "needs_client_trust" || a.status === "needs_first_factor") {
        const f = a.supportedFirstFactors?.find((x) => x.strategy === "email_code");
        await s.prepareFirstFactor({ strategy: "email_code", emailAddressId: f?.emailAddressId });
        a = await s.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (a.status !== "complete") return `sign-in status: ${a.status}`;
      await window.Clerk.setActive({ session: a.createdSessionId });
      return null;
    } catch (e) { return e?.errors?.[0]?.longMessage ?? String(e); }
  }, [EMAIL, PASSWORD]);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const SIZES = { phone: { width: 390, height: 844, touch: true }, desktop: { width: 1280, height: 900, touch: false } };
const idOf = (url) => new URL(url).pathname.split("/")[2];

async function run(browser, name, { width, height, touch }) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, serviceWorkers: "block" });
  const page = await ctx.newPage();
  try {
    await signIn(page);
    await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
    const tiles = page.locator('main a[href^="/decks/"][aria-label]:visible').filter({ hasNot: page.locator('[href="/decks/new"]') });
    await tiles.first().waitFor({ timeout: 30_000 });
    const hrefs = await tiles.evaluateAll((els) => els.map((e) => e.getAttribute("href")).filter((h) => /^\/decks\/[0-9a-f-]{36}$/.test(h)));
    const n = hrefs.length;
    check(name, "the list has 3+ decks to flip through", n >= 3, `n=${n}`);
    if (n < 3) return;
    await page.goto(`${BASE}${hrefs[1]}`.replace(BASE, BASE), { waitUntil: "domcontentloaded" }); // direct open first: All decks, saved sort
    const strip = () => page.locator(`[data-flip-strip="${name}"]`);
    await strip().waitFor({ state: "visible", timeout: 30_000 });
    check(name, "opened directly, the left link reads All decks", (await strip().locator("a").first().innerText()).trim() === "All decks", await strip().locator("a").first().innerText());

    // From the list: press the second tile, the strip reads 2 of N and the list's order.
    await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
    await tiles.nth(1).waitFor({ timeout: 30_000 });
    await tiles.nth(1).click();
    await page.waitForURL(/\/decks\/[0-9a-f-]{36}/);
    await strip().waitFor({ state: "visible", timeout: 30_000 });
    const place = () => strip().locator("span.font-mono").innerText();
    check(name, "from the list, the strip reads 2 of N", (await place()).trim() === `2 of ${n}`, await place());
    // PROBE_SHOTS=<dir> keeps the contact sheet's two frames (the strip at this width, top of the page).
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/flip-${name}.png` });

    const sq = strip().locator("a[aria-label^='Previous deck'], a[aria-label^='Next deck']");
    const boxes = await sq.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    const want = touch ? 44 : 36;
    check(name, `both squares are ${want}px`, boxes.length === 2 && boxes.every(([w, h]) => w === want && h === want), JSON.stringify(boxes));
    const nextLabel = await strip().locator("a[aria-label^='Next deck']").getAttribute("aria-label");
    check(name, touch ? "phone names no key" : "desktop names its key", touch ? !nextLabel.includes("→") : nextLabel.endsWith("(→)"), nextLabel);

    // Next opens the third tile's deck (the list's order), and ends wrap.
    const before = idOf(page.url());
    await strip().locator("a[aria-label^='Next deck']").click();
    await page.waitForURL((u) => idOf(u.toString()) !== before);
    check(name, "Next opens the next tile's deck", page.url().endsWith(hrefs[2]), page.url());
    await strip().waitFor({ state: "visible" });
    check(name, "the place moves to 3 of N", (await place()).trim() === `3 of ${n}`, await place());
    check(name, "the page is scrolled to the top", (await page.evaluate(() => window.scrollY)) === 0, String(await page.evaluate(() => window.scrollY)));

    if (!touch) {
      // Keys: → steps on, and a focused field keeps its own arrows.
      await page.evaluate(() => { const i = document.createElement("input"); i.id = "probe-field"; document.body.prepend(i); i.focus(); });
      const here = page.url();
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(600);
      check(name, "an arrow in a field does not flip", page.url() === here, page.url());
      await page.evaluate(() => { document.getElementById("probe-field").remove(); document.activeElement?.blur?.(); });
      await page.keyboard.press("Shift+ArrowRight");
      await page.waitForTimeout(400);
      check(name, "a modified arrow does not flip", page.url() === here, page.url());
      await page.keyboard.press("ArrowLeft");
      await page.waitForURL((u) => u.toString() !== here, { timeout: 15_000 });
      check(name, "← opens the previous deck", page.url().endsWith(hrefs[1]), page.url());
    }
  } finally {
    await ctx.close();
  }
}

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const [name, size] of Object.entries(SIZES)) await run(browser, name, size);
} finally {
  await browser.close();
}
console.log(failed === 0 ? "\nall checks passed" : `\n${failed} check(s) FAILED`);
process.exit(failed === 0 ? 0 : 1);
