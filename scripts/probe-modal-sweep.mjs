// probe:modal-sweep — the phone entrance of a ModalChrome dialog, pressed in a real browser at 390x844 and 1300x820
// (Hugh, 2026-11-21: "make them all match": a sheet slides up on a phone and is instant on desktop). It opens
// About > Report a problem (drawn in `ModalChrome`, as are ~22 other dialogs, so one caller proves the class) and asserts, at open:
//   390:  the dialog runs a `filter-sheet-in` animation (read from the computed `animation-name` the frame it mounts);
//   1300: the dialog runs no animation.
// Its one write: About draws the Report row only with FEEDBACK_ENABLED on, and /friends needs the friend switches, so the run adds per-user `flag_overrides`
// rows (marked `updated_by = probe:modal-sweep`, only when the account has none of its own) and deletes it in `finally`.
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
const SWITCHES = ["FEEDBACK_ENABLED"];
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
  switched = true;
  let added = false;
  for (const name of SWITCHES) {
    const [own] = await sql`select 1 from flag_overrides where "switch" = ${name} and scope = 'user' and user_id = ${userId}`;
    if (own) continue;
    await sql`insert into flag_overrides ("switch", scope, user_id, value, updated_by) values (${name}, 'user', ${userId}, 'on', ${MARK})`;
    added = true;
  }
  if (added) await page.waitForTimeout(31_000);
}

/** Press `open` until the dialog at `selector` mounts (a hydrating page can swallow a press), recording the animation
 *  name the frame it mounts. */
async function openCheck(page, check, name, selector, open, tries = 4) {
  for (let i = 0; ; i += 1) {
    await page.evaluate((sel) => {
      window.__seen = null;
      const mo = new MutationObserver(() => {
        const d = document.querySelector(sel);
        if (d && !window.__seen) { window.__seen = getComputedStyle(d).animationName; mo.disconnect(); }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }, selector);
    await open();
    if (await page.locator(selector).first().waitFor({ timeout: 5_000 }).then(() => true, () => false)) break;
    if (i >= tries - 1) throw new Error(`${name} never opened`);
  }
  check(name, { found: true, css: await page.evaluate(() => window.__seen) });
}

/** The landing draws only with PUBLIC_LANDING_ENABLED on, and its "What credits cost" link only with PAYMENTS_ENABLED on and both
 *  Stripe Price ids set (start the dev server with STRIPE_PRICE_PACK_40 and STRIPE_PRICE_PLAN_MONTHLY set to any text: the sheet
 *  shows prices, it never calls Stripe). Adds an app-wide row for each switch that has none; the `finally` removes only this probe's. */
async function landingSwitchesOn(page) {
  let added = false;
  for (const name of ["PUBLIC_LANDING_ENABLED", "PAYMENTS_ENABLED"]) {
    const [own] = await sql`select 1 from flag_overrides where "switch" = ${name} and scope = 'app'`;
    if (own) continue;
    await sql`insert into flag_overrides ("switch", scope, value, updated_by) values (${name}, 'app', 'on', ${MARK})`;
    added = true;
  }
  if (added) await page.waitForTimeout(31_000);
}

/** The landing's "What credits cost" sheet (CostSheet), signed out: a phone slide, instant on desktop. */
async function landing(browser, width) {
  const context = await browser.newContext({ viewport: width.viewport });
  const page = await context.newPage();
  const phone = width.label === 390;
  try {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    const link = page.getByRole("button", { name: "What credits cost" }).first();
    await link.waitFor({ timeout: 30_000 });
    await openCheck(page, (name, info) => {
      const sheetIn = info.css === "filter-sheet-in";
      report(`${width.label}: ${name} ${phone ? "slides in" : "is instant"}`, info.found && (phone ? sheetIn : info.css === "none"), `animationName ${info.css}`);
    }, "landing > What credits cost", '[data-testid="cost-sheet"]', () => link.click());
  } finally {
    await context.close();
  }
}

async function walk(browser, width) {
  const context = await browser.newContext({ viewport: width.viewport });
  const page = await context.newPage();
  const L = (s) => `${width.label}: ${s}`;
  const phone = width.label === 390;
  const check = (name, info) => {
    const sheetIn = info.css === "filter-sheet-in";
    report(L(`${name} ${phone ? "slides in" : "is instant"}`), info.found && (phone ? sheetIn : info.css === "none"), `animationName ${info.css}`);
  };
  try {
    const userId = await signIn(page);
    await switchOn(userId, page);
    await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    const press = page.locator("[data-about-report] button");
    await press.waitFor({ timeout: 30_000 });
    await openCheck(page, check, "About > Report a problem", '[data-testid="receipt-modal"]', () => page.locator("[data-about-report] button").click(), 12);
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/modal-sweep-report-${width.label}.png` });
    await page.keyboard.press("Escape");

    // A deck page: the commander sheet is ModalChrome inside the deck's own containers.
    const [deck] = await sql`select id from decks where user_id = ${userId} order by created_at limit 1`;
    if (!deck) {
      report(L("a deck to open"), false, "the signed-in account owns no deck on this database");
    } else {
      await page.goto(`${BASE}/decks/${deck.id}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
      await openCheck(page, check, "deck page > Change commander", '[data-testid="receipt-modal"]', () => page.getByRole("button", { name: "Change commander" }).first().click());
      await page.keyboard.press("Escape");
    }

    // A SocialModal (its own chrome, anim-sheet-in): the same entrance, and it opens on its heading.
    // /friends may spend a recovery token and redirect to itself, which aborts the first navigation.
    for (let i = 0; i < 3 && !page.url().includes("/friends"); i += 1) {
      await page.waitForTimeout(1_500);
      await page.goto(`${BASE}/friends`, { waitUntil: "domcontentloaded", timeout: 180_000 }).catch(() => {});
    }
    await page.getByRole("button", { name: /^Add a friend$/ }).first().waitFor({ timeout: 30_000 }).catch(async (e) => {
      console.log("   url", page.url(), "|", (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 500));
      throw e;
    });
    await openCheck(page, check, "friends > Add a friend (SocialModal)", "[role=dialog]", () => page.getByRole("button", { name: /^Add a friend$/ }).first().click());
    const onHeading = await page.evaluate(() => document.activeElement?.tagName === "H2");
    report(L("SocialModal opens with its heading focused"), onHeading, onHeading ? "" : "focus is elsewhere");
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/modal-sweep-social-${width.label}.png` });
    await page.keyboard.press("Escape");

    // PR C: the set page's phone filter sheet (FilterSheet, phone only: it is not drawn from 768, so only 390 is checked).
    // The friends page can still be settling a navigation of its own, which aborts this one: let it land, and retry once.
    await page.waitForTimeout(1500);
    for (let attempt = 0; ; attempt++) {
      try {
        await page.goto(`${BASE}/collection/sets/lea`, { waitUntil: "domcontentloaded", timeout: 180_000 });
        break;
      } catch (error) {
        if (attempt >= 2 || !/ERR_ABORTED/.test(String(error?.message))) throw error;
        await page.waitForTimeout(1500);
      }
    }
    if (phone) {
      await openCheck(page, check, "set page > Filters (FilterSheet)", "[role=dialog]", () => page.getByRole("button", { name: /^Filters/ }).first().click());
      await page.keyboard.press("Escape");
    }
  } finally {
    await context.close();
  }
}

const [{ branch } = {}] = await sql`select current_setting('neon.branch_id', true) as branch`;
assertNotSharedBranch(branch, "probe:modal-sweep");
await clerkSetup();
const browser = await chromium.launch();
try {
  const warm = await browser.newPage();
  await landingSwitchesOn(warm);
  await warm.close();
  for (const width of WIDTHS) {
    try {
      await landing(browser, width);
      await walk(browser, width);
    } catch (error) {
      report(`${width.label}: the walk stopped`, false, String(error?.message ?? error).split("\n")[0]);
    }
  }
} finally {
  await browser.close();
  try {
    await sql`delete from flag_overrides where updated_by = ${MARK}`;
    const [{ n }] = await sql`select count(*)::int as n from flag_overrides where updated_by = ${MARK}`;
    report("the probe's switch row is removed", n === 0, `${n} left`);
  } catch (error) {
    report("the probe's switch row is removed", false, String(error?.message ?? error));
  }
}
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
