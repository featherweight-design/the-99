// Home's section heads and the Game to log card's ✕ (tool discovery PR E2, plan 2026-11-23-tool-discovery.md G18, G19),
// at 390 and 1300 wide. Needs the same fixture as probe:log-reminder (scripts/seed-rule-zero-fixture.mts then
// scripts/seed-log-reminder-fixture.mts, on a migrated scratch branch made from local-dev), `pnpm dev` on that branch, and
// the audit account: PROBE_BASE names the server (a localhost, pk_test instance).
//   G19  the single-game card's ✕ sits in the card's top right corner at every width (within 14px of the top and
//        right edges), and does not overlap the Log this game link
//   G18  Home's section heads draw in the display face at 17px, not the old 13px uppercase label
// It fails on `main`: there the ✕ is at the row's end at 1300 (static, vertically centered) and the heads are small caps.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv(["E2E_AUDIT_USER_EMAIL", "E2E_AUDIT_USER_PASSWORD", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error(`refusing: PROBE_BASE must be a server on this machine, got ${BASE}`);
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failures.push(what); };

await clerkSetup();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
const page = await ctx.newPage();
await setupClerkTestingToken({ page });
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 120000 });
const failure = await page.evaluate(async ([email, password]) => {
  try {
    const signIn = window.Clerk.client.signIn;
    let a = await signIn.create({ identifier: email, password });
    if (a.status === "needs_client_trust") {
      const f = a.supportedFirstFactors?.find((x) => x.strategy === "email_code");
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: f?.emailAddressId });
      a = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
    }
    if (a.status !== "complete") return `status ${a.status}`;
    await window.Clerk.setActive({ session: a.createdSessionId });
    return null;
  } catch (e) { return e?.errors?.[0]?.longMessage ?? String(e); }
}, [EMAIL, PASSWORD]);
if (failure) throw new Error(`sign-in failed: ${failure}`);


for (const [w, h] of [[390, 844], [1300, 900]]) {
  await page.setViewportSize({ width: w, height: h });
  const at = `${w}px`;
  try {
    await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 240000 });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    const rows = page.getByTestId("home-log-row");
    await page.getByTestId("home-log-card").first().waitFor({ state: "visible", timeout: 120000 });
    // Two games draw as rows; hide one so the card is the single-game card.
    if ((await rows.count()) >= 2) {
      await rows.first().getByTestId("home-log-hide").click();
      await page.getByTestId("home-log-card").first().waitFor({ state: "visible", timeout: 60000 });
      await page.waitForFunction(() => document.querySelectorAll('[data-testid="home-log-row"]').length === 0, null, { timeout: 30000 });
    }
    const card = await page.getByTestId("home-log-card").boundingBox();
    const hide = await page.getByTestId("home-log-hide").boundingBox();
    const open = await page.getByTestId("home-log-open").boundingBox();
    check(!!card && !!hide, `${at} G19 the single-game card and its ✕ are drawn`);
    if (card && hide) {
      const top = hide.y - card.y;
      const right = card.x + card.width - (hide.x + hide.width);
      check(top >= 0 && top <= 14 && right >= 0 && right <= 14, `${at} G19 the ✕ sits in the card's top right corner (${Math.round(top)}px down, ${Math.round(right)}px in)`);
      if (open) {
        const apart = hide.x >= open.x + open.width || hide.x + hide.width <= open.x || hide.y >= open.y + open.height || hide.y + hide.height <= open.y;
        check(apart, `${at} G19 the ✕ does not overlap Log this game`);
      }
    }
    if (process.env.PROBE_SHOTS) await page.getByTestId("home-log-card").screenshot({ path: `${process.env.PROBE_SHOTS}/home-log-x-${w}.png` });
    const heads = await page.evaluate(() => [...document.querySelectorAll("h2")].filter((h) => h.querySelector("span[aria-hidden=true]") && /Friends|new|left off|Commitments/i.test(h.textContent ?? "")).map((h) => ({ t: (h.textContent ?? "").trim().slice(0, 24), size: getComputedStyle(h).fontSize, tt: getComputedStyle(h).textTransform })));
    check(heads.length > 0 && heads.every((x) => x.size === "17px" && x.tt === "none"), `${at} G18 section heads draw at 17px, no uppercase (${JSON.stringify(heads)})`);
  } catch (e) { check(false, `${at}: ${String(e.message).split("\n")[0]}`); }
}
await browser.close();
if (failures.length) { console.error(`${failures.length} failed`); process.exit(1); }
console.log("all passed");
