// probe:commanders-mode — /commanders opens in the mode the reader last chose, at 1300x900 and
// 390x844 (Hugh, 2026-09-27).
//
// The mode (`All my cards` or `Free cards only`) is saved per account in `user_prefs`, not per
// browser, and an explicit `a=` in the URL always wins over it. What only a browser and a
// database together can answer:
//  - a PRESS on the segment writes the saved mode. The view fires the action and does not wait,
//    so the write is polled for rather than read once.
//  - a FRESH document load of `/commanders`, with no `a=`, opens in the saved mode and writes
//    no `a=` into the address bar.
//  - `?a=all` opens in `All my cards` over a saved `free`, and saves nothing by being visited.
//  - pressing back to `All my cards` saves that, and then carries `a=all` only because it
//    differs from the mode the page was rendered against.
// Below 1000px the segment lives in the Filters sheet, so the phone run opens the sheet to press
// it and to read it.
//
// It writes the signed-in account's `user_prefs.commanders_avail`, capturing it first and
// restoring it in a `finally`. It refuses production and staging by `neon.branch_id`. Point it at
// `local-dev` or a scratch branch that carries the column.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { requireEnv } from "./lib/env.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { onPage, onPageRole, openSheet } from "./lib/surface.mjs";

neonConfig.webSocketConstructor = ws;

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
// production and staging, from the topology note. This probe writes a preference row.
const REFUSED_BRANCHES = ["br-noisy-violet-a6vw4ess", "br-polished-pond-a6e63y0b"];

const VIEWPORTS = [
  { label: 1300, width: 1300, height: 900 },
  { label: 390, width: 390, height: 844 },
];
const ALL = "All my cards";
const FREE = "Free cards only";

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

const pool = new Pool({ connectionString: DATABASE_URL });

async function saved(userId) {
  const { rows } = await pool.query(`select commanders_avail from user_prefs where user_id = $1`, [userId]);
  return rows[0]?.commanders_avail ?? null;
}

/** The view does not wait on the write, so neither does the press; the probe polls for it. */
async function savedBecomes(userId, want) {
  for (let i = 0; i < 40; i += 1) {
    if ((await saved(userId)) === want) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/**
 * The segment on screen. Inline from 1000px; inside the Filters sheet below it, which this opens
 * first. Returns a closer for the sheet, or a no-op.
 */
async function rack(page, width) {
  if (width >= 1000) return async () => {};
  const sheet = await openSheet(page, { timeout: 15_000 });
  if (!sheet) throw new Error("No Filters trigger on /commanders at this width.");
  return async () => {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  };
}

async function checked(page, name) {
  const radio = onPageRole(page, "radio", name).filter({ visible: true }).first();
  await radio.waitFor({ timeout: 15_000 });
  return (await radio.getAttribute("aria-checked")) === "true";
}

async function open(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await onPage(page, "h1").first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(1_000);
}

async function mode(page, width) {
  const close = await rack(page, width);
  const free = await checked(page, FREE);
  await close();
  return free ? "free" : "all";
}

/**
 * Presses the segment and returns the byte size of the action's own reply. A revalidating action
 * re-renders the caller's page into that reply (the 1.6 MB case in AGENTS.md); this one must not.
 * `settle: false` returns once the press has landed and the sheet is shut, without waiting for
 * the action's reply (handed back as a promise), for the flip-then-press timing.
 */
async function press(page, width, name, { settle = true } = {}) {
  const close = await rack(page, width);
  const reply = page.waitForResponse(
    (r) => r.request().method() === "POST" && Boolean(r.request().headers()["next-action"]),
    { timeout: 15_000 },
  );
  await onPageRole(page, "radio", name).filter({ visible: true }).first().click();
  if (!settle) {
    await close();
    return { reply: reply.then(async (r) => (await r.body()).length).catch(() => null) };
  }
  const bytes = await reply.then(async (r) => (await r.body()).length).catch(() => null);
  await page.waitForTimeout(300);
  await close();
  return bytes;
}

/** Presses the first commander row and times it to the detail page's heading, in ms. */
async function openFirstRow(page) {
  const row = onPage(page, 'li a[href^="/commanders/"]').filter({ visible: true }).first();
  await row.waitFor({ timeout: 30_000 });
  const t0 = Date.now();
  await row.click();
  await page.waitForURL(/\/commanders\/[^/?]+/, { timeout: 30_000 });
  await onPage(page, "h1").first().waitFor({ timeout: 30_000 });
  return Date.now() - t0;
}

const search = (page) => new URL(page.url()).searchParams.get("a");

await clerkSetup();
const branch = (await pool.query(`select current_setting('neon.branch_id', true) as id`)).rows[0]?.id;
// The environment too, as `probe-notices-open.mjs` checks it: a recreated production branch gets a
// new id, and the list above would no longer name it.
if (!branch || REFUSED_BRANCHES.includes(branch) || process.env.VERCEL_ENV === "production") {
  throw new Error(`Refusing to write a preference on branch ${branch ?? "(unknown)"}.`);
}
const browser = await chromium.launch();
let captured;
let userId;

try {
  for (const vp of VIEWPORTS) {
    console.log(`\n${vp.label}px`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    userId = await signIn(page);
    await clearAboutSheet(page, userId);
    if (captured === undefined) captured = await saved(userId);
    // A fresh start: an account that has never chosen.
    await pool.query(`update user_prefs set commanders_avail = null where user_id = $1`, [userId]);

    await open(page, "/commanders");
    report(`${vp.label} never chosen: opens in ${ALL}`, (await mode(page, vp.width)) === "all");

    const bytes = await press(page, vp.width, FREE);
    report(`${vp.label} the action's reply is small: it re-renders no page`, bytes !== null && bytes < 2_000,
      `${bytes ?? "no reply"} bytes`);
    report(`${vp.label} the press writes a=free`, search(page) === "free", `a=${search(page)}`);
    report(`${vp.label} the press saves free`, await savedBecomes(userId, "free"), `saved ${await saved(userId)}`);

    await open(page, "/commanders");
    report(`${vp.label} a fresh load opens in the saved ${FREE}`, (await mode(page, vp.width)) === "free");
    report(`${vp.label} ...with no a= in the address bar`, search(page) === null, `a=${search(page)}`);

    await open(page, "/commanders?a=all");
    report(`${vp.label} ?a=all wins over a saved free`, (await mode(page, vp.width)) === "all");
    await page.waitForTimeout(1_000);
    report(`${vp.label} ...and visiting it saves nothing`, (await saved(userId)) === "free", `saved ${await saved(userId)}`);

    await open(page, "/commanders");
    await press(page, vp.width, ALL);
    report(`${vp.label} pressing back to ${ALL} writes a=all over a saved free`, search(page) === "all", `a=${search(page)}`);
    report(`${vp.label} ...and saves all`, await savedBecomes(userId, "all"), `saved ${await saved(userId)}`);

    await open(page, "/commanders");
    report(`${vp.label} the next fresh load opens in ${ALL}, with no a=`,
      (await mode(page, vp.width)) === "all" && search(page) === null, `a=${search(page)}`);

    // A pending action slows the next one badly (fa, 2026-09-27: ~800ms), so a flip followed at
    // once by a press on a commander must open at its normal speed. The first open compiles the
    // detail route on a dev server, so it is thrown away; the baseline is the better of two.
    await open(page, "/commanders");
    await openFirstRow(page);
    const base = [];
    for (let i = 0; i < 2; i += 1) {
      await open(page, "/commanders");
      base.push(await openFirstRow(page));
    }
    await open(page, "/commanders");
    // The press and the sheet's close are awaited (a row pressed through an open sheet lands on
    // its scrim); the action's reply is not, so the row is pressed while the write is in flight.
    const { reply } = await press(page, vp.width, FREE, { settle: false });
    let landed = false;
    reply.then(() => { landed = true; });
    await Promise.resolve();
    const inFlight = !landed;
    const flipped = await openFirstRow(page);
    await reply;
    const baseline = Math.min(...base);
    report(`${vp.label} a press straight after a flip opens at its normal speed`, flipped - baseline < 400,
      `baseline ${baseline}ms, after a flip ${flipped}ms, write ${inFlight ? "still in flight" : "already answered"} at the press`);

    await context.close();
  }
} catch (error) {
  failures += 1;
  console.error(error);
} finally {
  if (userId && captured !== undefined) {
    await pool.query(`update user_prefs set commanders_avail = $2 where user_id = $1`, [userId, captured]);
    console.log(`restored commanders_avail to ${captured ?? "null"}`);
  }
  await browser.close();
  await pool.end();
}

console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
