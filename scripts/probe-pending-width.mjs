// A button that swaps to a shorter label while it works must not shrink (SteadyLabel, src/components/ui/steady-label.tsx).
// Signs in as the audit user (an admin), loads /preview/landing (the signed-out landing's launch panel, whatever the landing
// switch says), holds the form's server-action POST open, presses the button and measures its width at rest and while pending at
// 390 and 1300. A negative control strips the held words (`data-hold`) off the label, which is exactly what main draws, and must
// FAIL the same measurement at desktop (the panel's button is full width on a phone, so the control cannot shrink there). `PROBE_BASE=http://localhost:3210 node scripts/probe-pending-width.mjs`.
// Needs a browser and the audit user (`E2E_AUDIT_USER_*`, `CLERK_SECRET_KEY`); never production. Exits 1 on any miss.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3002";
const WINDOWS = [{ name: "phone", width: 390, height: 844 }, { name: "desktop", width: 1300, height: 900 }];

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_client_trust") {
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
}

async function measure(browser, win, control) {
  const page = await (await browser.newContext({ viewport: { width: win.width, height: win.height } })).newPage();
  await signIn(page);
  await page.goto(`${BASE}/preview/landing`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  const panel = page.locator("[data-testid=launch-panel]:visible").first();
  await panel.waitFor({ timeout: 120_000 });
  const button = panel.locator("button[type=submit]");
  // The form must be hydrated before the press, or the press is a native submit and the button never goes pending.
  await page.waitForLoadState("load");
  await page.waitForTimeout(4000);
  await panel.locator("input").fill("width-probe@example.com");
  if (control) await button.evaluate((el) => el.querySelectorAll("[data-hold]").forEach((n) => n.removeAttribute("data-hold")));
  const before = (await button.boundingBox()).width;
  let release;
  const held = new Promise((r) => (release = r));
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") await held;
    await route.continue();
  });
  await button.click();
  await page.waitForFunction((el) => el?.disabled === true, await button.elementHandle(), { timeout: 10_000 });
  const during = (await button.boundingBox()).width;
  release();
  await page.close();
  return { before, during, moved: Math.abs(before - during) };
}

await clerkSetup();
const browser = await chromium.launch();
let failed = false;
try {
  for (const win of WINDOWS) {
    const real = await measure(browser, win, false);
    const ctl = await measure(browser, win, true);
    const ok = real.moved <= 0.5;
    // The panel's button is full width on a phone (it cannot shrink there), so the control must shrink at desktop and only has to hold at phone.
    const ctlOk = win.name === "phone" || ctl.moved > 0.5;
    console.log(`${ok ? "PASS" : "FAIL"}  ${win.name} ${win.width}: rest ${real.before.toFixed(1)} pending ${real.during.toFixed(1)} moved ${real.moved.toFixed(1)}`);
    console.log(`${ctlOk ? "PASS" : "FAIL"}  ${win.name} ${win.width} control (held words stripped, as on main) moved ${ctl.moved.toFixed(1)}`);
    if (!ok || !ctlOk) failed = true;
  }
} finally {
  await browser.close();
}
if (failed) {
  console.error("FAIL");
  process.exit(1);
}
console.log("ok: width held while pending; the control shrinks");
