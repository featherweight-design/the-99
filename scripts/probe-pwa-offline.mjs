import { chromium } from "playwright";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { requireEnv } from "./lib/env.mjs";
// The service worker's offline fallback and the offline pill, in a real browser against `next start`
// (the worker registers in production builds only). Read-only: it signs in and loads pages, and
// writes nothing. PROBE_BASE must be a local server.
const BASE = process.env.PROBE_BASE ?? "";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(BASE)) throw new Error("Set PROBE_BASE to a local `next start`, e.g. http://localhost:3088.");
const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const SHOT = process.env.SHOT;
await clerkSetup();
const browser = await chromium.launch();
// Sign in on a context with the testing route, then carry the session to contexts with no route.
const signCtx = await browser.newContext();
const sp = await signCtx.newPage();
await setupClerkTestingToken({ page: sp });
await sp.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await sp.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
const name = await sp.evaluate(async (email) => {
  const s = window.Clerk.client.signIn;
  let a = await s.create({ identifier: email });
  if (a.status !== "complete") {
    const f = a.supportedFirstFactors?.find((x) => x.strategy === "email_code");
    await s.prepareFirstFactor({ strategy: "email_code", emailAddressId: f?.emailAddressId });
    a = await s.attemptFirstFactor({ strategy: "email_code", code: "424242" });
  }
  await window.Clerk.setActive({ session: a.createdSessionId });
  return { email, first: window.Clerk.user.firstName, id: window.Clerk.user.id };
}, EMAIL);
const state = await signCtx.storageState();
await signCtx.close();
const fails = [];
const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) fails.push(what); };

for (const [w, h] of [[390, 844], [1300, 900]]) {
  const ctx = await browser.newContext({ storageState: state, viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/decks`, { waitUntil: "load" });
  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 30_000 }).catch(() => {});
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) { await page.reload({ waitUntil: "load" }); }
  check(await page.evaluate(() => !!navigator.serviceWorker.controller), `${w}: the worker controls the page`);
  const kept = await page.evaluate(async () => {
    for (let i = 0; i < 50; i++) {
      const r = await (await caches.open("offline-v1")).match("/offline");
      if (r) return r.text();
      await new Promise((x) => setTimeout(x, 200));
    }
    return null;
  });
  check(kept !== null, `${w}: /offline is kept`);
  const leaks = [name.email, name.id, name.first].filter((x) => x && kept?.includes(x));
  check(leaks.length === 0, `${w}: the kept page names nothing of the reader's (${leaks.join(", ") || "none"})`);
  check(!kept?.includes("data-account") && !kept?.includes("aria-haspopup"), `${w}: the kept page has no shell`);

  await ctx.setOffline(true);
  const pill = page.locator(`[data-offline-pill="${w < 768 ? "header" : "rail"}"]`);
  await pill.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  check(await pill.isVisible(), `${w}: the ${w < 768 ? "header" : "rail"} pill shows offline`);
  if (SHOT) await page.screenshot({ path: `${SHOT}/pwa-pill-${w}.png` });
  await page.goto(`${BASE}/decks/shopping`, { waitUntil: "load" }).catch((e) => console.log("goto threw", e.message.split("\n")[0]));
  const text = await page.evaluate(() => document.body.innerText).catch(() => "");
  check(/No signal/i.test(text) && /offline/i.test(text), `${w}: an offline page load shows /offline`);
  check(new URL(page.url()).pathname === "/decks/shopping", `${w}: at the address asked for (${new URL(page.url()).pathname})`);
  if (SHOT) await page.screenshot({ path: `${SHOT}/pwa-offline-${w}.png` });
  await ctx.setOffline(false);
  await page.getByRole("button", { name: "Try again" }).click();
  await page.waitForLoadState("load");
  await page.waitForTimeout(1500);
  const back = await page.evaluate(() => document.body.innerText);
  check(!/No signal/.test(back) && new URL(page.url()).pathname === "/decks/shopping", `${w}: Try again loads the page once back online`);
  await ctx.close();
}
await browser.close();
console.log(fails.length ? `${fails.length} FAILED` : "ALL OK");
process.exit(fails.length ? 1 : 0);
