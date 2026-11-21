// probe:modal-sweep — the phone entrance of a ModalChrome dialog, pressed in a real browser at 390x844 and 1300x820
// (Hugh, 2026-11-21: "make them all match": a sheet slides up on a phone and is instant on desktop). It opens
// About > Report a problem (drawn in `ModalChrome`, as are ~22 other dialogs, so one caller proves the class) and asserts, at open:
//   390:  the dialog runs a `filter-sheet-in` animation (read from `getAnimations()`);
//   1300: the dialog runs no animation.
// Its one write: About draws the Report row only with FEEDBACK_ENABLED on, so the run adds a per-user `flag_overrides`
// row (marked `updated_by = probe:modal-sweep`, only when the account has none of its own) and deletes it in `finally`.
// Production and staging are refused by `neon.branch_id`. DATABASE_URL must be the database the dev server reads.
//
//   PROBE_BASE=http://localhost:3291 node scripts/probe-modal-sweep.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertNotSharedBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL"]);
const sql = neon(DATABASE_URL);
const MARK = "probe:modal-sweep";
const SWITCH = "FEEDBACK_ENABLED";
if (!EMAIL.includes("+clerk_test")) throw new Error("Use a +clerk_test account (see the local-auth note).");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error("This probe runs against a local dev server only.");

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
  return page.evaluate(() => window.Clerk.user.id);
}

/** Switch Report on for this account, unless it already has a row of its own. The server memoizes the switch
 *  overrides for 30s (`SNAPSHOT_TTL_MS`), and the sign-in just read them, so a new row waits that out. */
let switched = false;
async function switchOn(userId, page) {
  if (switched) return;
  const [own] = await sql`select 1 from flag_overrides where "switch" = ${SWITCH} and scope = 'user' and user_id = ${userId}`;
  switched = true;
  if (own) return;
  await sql`insert into flag_overrides ("switch", scope, user_id, value, updated_by) values (${SWITCH}, 'user', ${userId}, 'on', ${MARK})`;
  await page.waitForTimeout(31_000);
}

async function walk(browser, width) {
  const context = await browser.newContext({ viewport: width.viewport });
  const page = await context.newPage();
  const L = (s) => `${width.label}: ${s}`;
  const phone = width.label === 390;
  const check = (name, info) => {
    const sheetIn = info.css === "filter-sheet-in" || info.names.includes("filter-sheet-in");
    report(L(`${name} ${phone ? "slides in" : "is instant"}`), info.found && sheetIn === phone, `animationName ${info.css}`);
  };
  try {
    await switchOn(await signIn(page), page);
    await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    const press = page.locator("[data-about-report] button");
    await press.waitFor({ timeout: 30_000 });
    const dialog = page.locator('[data-testid="receipt-modal"]');
    for (let i = 0; ; i += 1) {
      // Arm a watcher that records the animation name the moment the dialog mounts.
      await page.evaluate(() => {
        window.__seen = null;
        const mo = new MutationObserver(() => {
          const d = document.querySelector('[data-testid="receipt-modal"]');
          if (d && !window.__seen) { window.__seen = getComputedStyle(d).animationName; mo.disconnect(); }
        });
        mo.observe(document.body, { childList: true, subtree: true });
      });
      await press.click();
      if (await dialog.waitFor({ timeout: 5_000 }).then(() => true, () => false)) break;
      if (i === 11) throw new Error("Report a problem never opened");
    }
    const seen = await page.evaluate(() => window.__seen);
    check("About > Report a problem", { found: true, names: [], css: seen });
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/modal-sweep-report-${width.label}.png` });
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});

  } finally {
    await context.close();
  }
}

const [{ branch } = {}] = await sql`select current_setting('neon.branch_id', true) as branch`;
assertNotSharedBranch(branch, "probe:modal-close-focus");
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
  try {
    await sql`delete from flag_overrides where "switch" = ${SWITCH} and updated_by = ${MARK}`;
    const [{ n }] = await sql`select count(*)::int as n from flag_overrides where updated_by = ${MARK}`;
    report("the probe's switch row is removed", n === 0, `${n} left`);
  } catch (error) {
    report("the probe's switch row is removed", false, String(error?.message ?? error));
  }
}
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
