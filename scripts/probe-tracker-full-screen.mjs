// probe:tracker-full-screen — the life tracker's /play is full screen, as its boards draw it: no shell nav (the phone
// header, the tab bar, the desktop rail) is visible on it, at 390x844 and 1300x820, and the setup screen starts at the
// top of the viewport. Leaving restores the nav: setup's ✕ goes back to the table with its nav, and so does the
// browser's own Back from /play. It writes nothing to the database. The audit account must sit at the table
// (`scripts/seed-rule-zero-fixture.mts`'s S4 on a scratch branch); production and staging are refused.
//
//   PROBE_BASE=http://localhost:3393 node scripts/probe-tracker-full-screen.mjs
// Optional: SETUP_TABLE (default the fixture's S4), PROBE_SHOTS=<dir> to keep a photograph of each width.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertNotSharedBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL"]);
if (!EMAIL.includes("+clerk_test")) throw new Error("Use a +clerk_test account (see the local-auth note).");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error("This probe runs against a local dev server only.");
const TABLE = process.env.SETUP_TABLE ?? "7a0e0000-0000-4000-8000-000000000013";
const SHOTS = process.env.PROBE_SHOTS;
const WIDTHS = [
  { label: 390, viewport: { width: 390, height: 844 } },
  { label: 1300, viewport: { width: 1300, height: 820 } },
];

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
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

// The shell's nav by role, not by any marker this change adds, so the probe reads main's shell the same way.
const SHELL_NAV = 'header, nav[aria-label], aside';
const visibleNav = (page) =>
  page.locator(SHELL_NAV).evaluateAll((els) =>
    els
      .filter((e) => !e.closest("main, [data-testid=tracker-setup], [data-testid=tracker-play]"))
      .filter((e) => {
        const r = e.getBoundingClientRect();
        const s = getComputedStyle(e);
        return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
      })
      .map((e) => `${e.tagName.toLowerCase()}${e.getAttribute("aria-label") ? `[${e.getAttribute("aria-label")}]` : ""}`),
  );

async function walk(browser, width) {
  const context = await browser.newContext({ viewport: width.viewport });
  const page = await context.newPage();
  const L = (s) => `${width.label}: ${s}`;
  try {
    await signIn(page);
    await page.evaluate(() => localStorage.clear());
    // The table first, so Back has somewhere to return to.
    await page.goto(`${BASE}/friends/table/${TABLE}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    const tableNav = await visibleNav(page);
    report(L("the table page draws the shell's nav (control)"), tableNav.length > 0, tableNav.join(", "));

    await page.goto(`${BASE}/friends/table/${TABLE}/play`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.addStyleTag({ content: "[data-seat-notice-stack]{display:none!important}" });
    const setup = page.getByTestId("tracker-setup");
    await setup.waitFor({ timeout: 60_000 });
    const onPlay = await visibleNav(page);
    report(L("no shell nav is visible on /play"), onPlay.length === 0, onPlay.join(", ") || "none");
    const top = (await setup.boundingBox())?.y ?? -1;
    const left = (await setup.boundingBox())?.x ?? -1;
    report(L("setup starts at the top of the viewport"), top >= 0 && top <= 1, `top ${top}`);
    // With no rail, setup's column is centered in the whole viewport; a rail column pushes it right of center.
    if (width.viewport.width >= 768) {
      const w = (await setup.boundingBox())?.width ?? 0;
      const centered = (width.viewport.width - w) / 2;
      report(L("no rail column holds the left edge (setup is centered in the full width)"), Math.abs(left - centered) <= 1, `setup x ${left}, centered at ${centered}`);
    }
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/tracker-full-screen-${width.label}.png` });

    // The browser's Back returns to the table, with its nav.
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.waitForURL((u) => u.pathname === `/friends/table/${TABLE}`, { timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    const back = await visibleNav(page);
    report(L("Back returns to the table, and its nav returns"), back.length > 0, `${new URL(page.url()).pathname} · ${back.join(", ")}`);

    // Setup's ✕ is the way out in-app: a client navigation, so the nav must come back without a reload.
    await page.goto(`${BASE}/friends/table/${TABLE}/play`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.addStyleTag({ content: "[data-seat-notice-stack]{display:none!important}" });
    await setup.waitFor({ timeout: 60_000 });
    const close = setup.getByRole("link", { name: "Close" });
    if ((await close.count()) === 1) {
      await close.click();
      await page.waitForURL((u) => u.pathname === `/friends/table/${TABLE}`, { timeout: 30_000 });
      await page.waitForTimeout(500);
      const after = await visibleNav(page);
      report(L("setup's ✕ returns to the table, and its nav returns"), after.length > 0, after.join(", "));
    } else {
      report(L("setup's ✕ returns to the table, and its nav returns"), false, "no Close link on setup");
    }
  } catch (error) {
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/tracker-full-screen-stopped-${width.label}.png` }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

const [{ branch } = {}] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
assertNotSharedBranch(branch, "probe:tracker-full-screen");
await clerkSetup();
const browser = await chromium.launch();
try {
  for (const width of WIDTHS) {
    try {
      await walk(browser, width);
    } catch (error) {
      report(`${width.label}: the walk stopped`, false, String(error?.message ?? error).split("\n")[0]);
    }
  }
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
