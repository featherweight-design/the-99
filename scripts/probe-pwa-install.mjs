// The install slot in the phone header, in a real browser against a local server (PWA plan PR B).
// Read-only: it signs in and loads pages, and writes nothing but this browser's own localStorage.
// - Android-style: a synthetic `beforeinstallprompt` puts the slot in the header; a press calls the
//   held prompt; the slot then goes.
// - The same offer arriving before hydration is kept by the root layout's head script and taken by
//   the slot once it mounts.
// - iPhone Safari (its user agent): the slot shows with no event, a press opens the how-to sheet,
//   Got it closes it, and the ✕ keeps it away on the next load.
// - At 1300 the slot is never drawn: desktop browsers have their own install button.
import { chromium } from "playwright";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { requireEnv } from "./lib/env.mjs";

const BASE = process.env.PROBE_BASE ?? "";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(BASE)) throw new Error("Set PROBE_BASE to a local server, e.g. http://localhost:3089.");
const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const SHOT = process.env.SHOT;
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

await clerkSetup();
const browser = await chromium.launch();
const signCtx = await browser.newContext();
const sp = await signCtx.newPage();
await setupClerkTestingToken({ page: sp });
await sp.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await sp.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
await sp.evaluate(async (email) => {
  const s = window.Clerk.client.signIn;
  let a = await s.create({ identifier: email });
  if (a.status !== "complete") {
    const f = a.supportedFirstFactors?.find((x) => x.strategy === "email_code");
    await s.prepareFirstFactor({ strategy: "email_code", emailAddressId: f?.emailAddressId });
    a = await s.attemptFirstFactor({ strategy: "email_code", code: "424242" });
  }
  await window.Clerk.setActive({ session: a.createdSessionId });
}, EMAIL);
const state = await signCtx.storageState();
await signCtx.close();

const fails = [];
const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) fails.push(what); };
const slot = (page) => page.locator("header [data-install-slot]");

{
  const ctx = await browser.newContext({ storageState: state, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/decks`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  check((await slot(page).count()) === 0, "390 Android: no slot before the browser offers an install");
  await page.evaluate(() => {
    window.__prompted = 0;
    const e = new Event("beforeinstallprompt", { cancelable: true });
    e.prompt = async () => { window.__prompted += 1; };
    e.userChoice = Promise.resolve({ outcome: "dismissed" });
    window.dispatchEvent(e);
  });
  await slot(page).waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  check(await slot(page).isVisible(), "390 Android: the offer puts the slot in the header");
  if (SHOT) await page.screenshot({ path: `${SHOT}/pwa-install-390.png` });
  await page.getByRole("button", { name: "Install The 99" }).click();
  await page.waitForTimeout(300);
  check((await page.evaluate(() => window.__prompted)) === 1, "390 Android: a press shows the held prompt");
  check((await slot(page).count()) === 0, "390 Android: the slot goes once the offer is used");
  await ctx.close();
}
{
  // An offer that arrives before hydration: the app's scripts are held back 3s, and the offer is
  // dispatched at DOMContentLoaded, when only the head script can be listening.
  const ctx = await browser.newContext({ storageState: state, viewport: { width: 390, height: 844 } });
  await ctx.route("**/_next/static/chunks/**", async (route) => {
    await new Promise((r) => setTimeout(r, 3_000));
    await route.continue();
  });
  await ctx.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      window.__prompted = 0;
      const e = new Event("beforeinstallprompt", { cancelable: true });
      e.prompt = async () => { window.__prompted += 1; };
      e.userChoice = Promise.resolve({ outcome: "dismissed" });
      window.dispatchEvent(e);
      window.__keptBeforeHydration = window.__the99InstallPrompt === e && e.defaultPrevented;
    });
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/decks`, { waitUntil: "load", timeout: 60_000 });
  check(await page.evaluate(() => window.__keptBeforeHydration === true), "390 Android: an offer before hydration is kept by the head script");
  await slot(page).waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  check(await slot(page).isVisible(), "390 Android: and the slot takes it once it mounts");
  await page.getByRole("button", { name: "Install The 99" }).click();
  await page.waitForTimeout(300);
  check((await page.evaluate(() => window.__prompted)) === 1, "390 Android: a press shows that early offer");
  await ctx.close();
}
{
  const ctx = await browser.newContext({ storageState: state, viewport: { width: 390, height: 844 }, userAgent: IPHONE, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/decks`, { waitUntil: "load" });
  await slot(page).waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  check(await slot(page).isVisible(), "390 iPhone: the slot shows with no event");
  await page.getByRole("button", { name: "Install The 99" }).click();
  const sheet = page.getByRole("dialog", { name: "How to add The 99 to your home screen" });
  await sheet.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  check(await sheet.isVisible(), "390 iPhone: a press opens the how-to sheet");
  // Past the 180ms slide-in, so the box measured is where the sheet comes to rest.
  await page.waitForTimeout(400);
  const done = await page.getByRole("button", { name: "Got it" }).boundingBox();
  check(done !== null && done.y + done.height <= 844, "390 iPhone: the sheet sits in the viewport, Got it included");
  if (SHOT) await page.screenshot({ path: `${SHOT}/pwa-install-sheet-390.png` });
  await page.getByRole("button", { name: "Got it" }).click();
  await page.waitForTimeout(300);
  check(!(await sheet.isVisible().catch(() => false)), "390 iPhone: Got it closes the sheet");
  await page.getByRole("button", { name: "Dismiss install prompt" }).click();
  check((await slot(page).count()) === 0, "390 iPhone: the ✕ takes the slot away");
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(500);
  check((await slot(page).count()) === 0, "390 iPhone: and it stays away on the next load");
  await ctx.close();
}
{
  const ctx = await browser.newContext({ storageState: state, viewport: { width: 1300, height: 900 }, userAgent: IPHONE });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/decks`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  check(!(await page.locator("[data-install-slot]").first().isVisible().catch(() => false)), "1300: no slot drawn on desktop");
  await ctx.close();
}
await browser.close();
console.log(fails.length ? `${fails.length} FAILED` : "ALL OK");
process.exit(fails.length ? 1 : 0);
