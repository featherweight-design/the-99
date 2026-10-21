// probe:welcome-strip — Home's welcome-credits strip, its `Where credits work` sheet and the /credits Welcome cell,
// pressed in a real browser at 390x844 and 1300x900 (welcome credits D2, plan `2026-10-21-welcome-credits.md`, PR 2;
// handoff `design_handoff_the99_welcome_credits`, R2).
//
// What jsdom cannot see, and the unit tests therefore do not prove:
//   - The strip is in the page, above the fold at both widths, on the first-run Home and on the dashboard.
//   - `Where they work` opens the sheet in the shipped SocialModal, by deck state: before a collection the lock line and
//     no Try it; cards and no deck, Help me choose first with Try it and the reason line once. The teaser draws from Home.
//   - The /credits Welcome cell names the date and opens the same sheet WITHOUT the teaser.
//   - ✕ hides the strip, writes `user_prefs.welcome_strip_dismissed_at`, and a reload draws none; the cell still opens
//     the sheet after it.
//
// FIXTURES: a fresh Clerk test user on the DEVELOPMENT instance, made for the run, with a welcome lot (15 credits,
// expiring in 30 days) inserted for it, then a handful of collection rows for the dashboard states. Nothing of any other
// account is read or written. Everything the run wrote for its user, and the user itself, is removed in a `finally`,
// unless WELCOME_PROBE_KEEP=1, which leaves the user for a contact sheet and prints its address
// (WELCOME_PROBE_STAGE=first-run stops before the collection rows). `WELCOME_PROBE_CLEAN=<address>` removes a kept one.
//
// The database is the worktree's `.env` DATABASE_URL: local-dev or a scratch branch of it, never staging or production
// (checked by `neon.branch_id`). The server: a dev or `next start` of this worktree, with the sheet's rows switched on:
//   ABOUT_SHEET_ENABLED=true (About's line on Home, not the legacy gate's redirect) PAYMENTS_ENABLED=true TUNING_ENABLED=true HELP_ME_CHOOSE_ENABLED=true PROPOSED_CUTS_ENABLED=true
//   SWAP_TOOLS_ENABLED=true FIND_A_DECK_READ_ENABLED=true ANALYSIS_TAB_ENABLED=true
//
//   PROBE_BASE=http://localhost:3311 pnpm probe:welcome-strip
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { CLERK_SECRET_KEY, DATABASE_URL } = requireEnv(["CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "" || u.pathname !== "/") {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback server with a port only (http://localhost:3311)`);
  }
}
if (!CLERK_SECRET_KEY.startsWith("sk_test_")) throw new Error("refusing: CLERK_SECRET_KEY is not a development instance's");
const sql = neon(DATABASE_URL);
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";
const KEEP = process.env.WELCOME_PROBE_KEEP === "1";
const STAGE = process.env.WELCOME_PROBE_STAGE ?? "all";

const STRIP = "section[aria-label='Welcome credits']";
const DIALOG = "[role=dialog][aria-modal=true]";
const DAY = 86_400_000;
const WIDTHS = [
  { name: "390", width: 390, height: 844 },
  { name: "1300", width: 1300, height: 900 },
];

let failures = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
};

async function clerk(method, path, body) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Clerk ${method} ${path}: ${res.status}`);
  return res.json();
}

async function signIn(page, email) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        if (!factor?.emailAddressId) return `${email} offers no usable email_code first factor.`;
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, email);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

/** Every row the run's user holds, then the user. Only ever this run's own account. */
async function removeUser(userId) {
  const tables = await sql`select table_name from information_schema.columns where table_schema = 'public' and column_name = 'user_id'`;
  const left = [];
  for (const { table_name: t } of tables) {
    const [{ n }] = await sql.query(`select count(*)::int as n from "${t}" where user_id = $1`, [userId]);
    if (n > 0) {
      await sql.query(`delete from "${t}" where user_id = $1`, [userId]);
      left.push(`${t} ${n}`);
    }
  }
  console.log(`INFO  removed the probe account's rows: ${left.join(", ") || "none"}`);
  await clerk("DELETE", `/users/${userId}`);
}

async function homeStrip(page, w, label) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const strip = onPage(page, STRIP);
  await strip.waitFor({ timeout: 60_000 });
  // The date is drawn after hydration; the line is invisible until then.
  await page.waitForFunction((sel) => {
    const p = document.querySelector(`main ${sel} p`);
    return p && getComputedStyle(p).visibility === "visible";
  }, STRIP, { timeout: 30_000 });
  const box = await strip.boundingBox();
  check(box !== null && box.y + box.height <= w.height, `${w.name} ${label}: the strip is above the fold`, box ? `bottom ${Math.round(box.y + box.height)} of ${w.height}` : "no box");
  return strip;
}

async function openSheetFrom(page, scope) {
  await scope.getByRole("button", { name: "Where they work" }).click();
  const dialog = onPage(page, DIALOG);
  await dialog.waitFor({ timeout: 10_000 });
  await page.waitForTimeout(250);
  return dialog;
}

async function firstRun(browser, w, email) {
  const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height } });
  const page = await ctx.newPage();
  try {
    await signIn(page, email);
    const strip = await homeStrip(page, w, "first-run Home");
    const text = (await strip.textContent()) ?? "";
    check(text.includes("15 welcome credits to try the tools, until"), `${w.name} first-run: the held line`, text.slice(0, 80));
    const dialog = await openSheetFrom(page, strip);
    check((await dialog.getAttribute("aria-labelledby")) !== null && (await dialog.textContent()).includes("Where credits work"), `${w.name} first-run: Where they work opens the sheet`, "dialog");
    check(await dialog.locator("[data-welcome-line=lock]").count() === 1, `${w.name} first-run: the lock line once`, `${await dialog.locator("[data-welcome-line]").count()} line(s)`);
    check(await dialog.locator("[data-welcome-try]").count() === 0, `${w.name} first-run: no Try it`, `${await dialog.locator("[data-welcome-try]").count()}`);
    check(await dialog.locator("[data-welcome-teaser]").count() === 1, `${w.name} first-run: the teaser at the foot`, "teaser");
    check(await dialog.locator("[data-welcome-row]").count() === 5, `${w.name} first-run: five rows`, `${await dialog.locator("[data-welcome-row]").count()}`);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached", timeout: 5_000 });
    check(true, `${w.name} first-run: Escape closes the sheet`, "closed");
  } finally {
    await ctx.close();
  }
}

async function dashboard(browser, w, email) {
  const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height } });
  const page = await ctx.newPage();
  try {
    await signIn(page, email);
    const strip = await homeStrip(page, w, "dashboard");
    const greeting = await onPage(page, "h1").first().boundingBox();
    const box = await strip.boundingBox();
    check(Boolean(greeting && box && box.y > greeting.y), `${w.name} dashboard: the strip sits under the page head`, `${Math.round(box?.y ?? -1)} > ${Math.round(greeting?.y ?? -1)}`);
    const dialog = await openSheetFrom(page, strip);
    const first = await dialog.locator("[data-welcome-row]").first().getAttribute("data-welcome-row");
    check(first === "help-me-choose", `${w.name} dashboard, no deck: Help me choose leads`, String(first));
    check(await dialog.locator("[data-welcome-try=help-me-choose]").count() === 1, `${w.name} dashboard, no deck: Help me choose has Try it`, "try");
    check(await dialog.locator("[data-welcome-line=reason]").count() === 1, `${w.name} dashboard, no deck: the reason line once`, "reason");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached", timeout: 5_000 });
    // The dialog pushed a history entry to close on Back, and steps back over it as it closes: let that land first.
    await page.waitForTimeout(800);

    // /credits: the cell's date, and the same sheet without the teaser.
    await page.goto(`${BASE}/credits`, { waitUntil: "domcontentloaded" });
    const cell = onPage(page, "[data-cell=welcome]");
    await cell.waitFor({ timeout: 60_000 });
    await page.waitForFunction(() => {
      const e = document.querySelector("main [data-cell=welcome] [data-welcome-expires]");
      return e && getComputedStyle(e).visibility === "visible";
    }, null, { timeout: 30_000 });
    const line = (await cell.locator("[data-welcome-expires]").textContent()) ?? "";
    check(/^expire [A-Z][a-z]{2} \d{1,2}$/.test(line), `${w.name} /credits: the Welcome cell names the date`, line);
    const fromCell = await openSheetFrom(page, cell);
    check(await fromCell.locator("[data-welcome-teaser]").count() === 0, `${w.name} /credits: the sheet has no teaser`, "no teaser");
    await page.keyboard.press("Escape");
    await fromCell.waitFor({ state: "detached", timeout: 5_000 });
    await page.waitForTimeout(800);

    // ✕: hidden on the press, written, and gone after a reload.
    const again = await homeStrip(page, w, "dashboard, before ✕");
    await again.getByRole("button", { name: "Dismiss" }).click();
    await onPage(page, STRIP).waitFor({ state: "detached", timeout: 5_000 });
    check(true, `${w.name} ✕ hides the strip`, "hidden");
    let at = null;
    for (let i = 0; i < 20 && !at; i += 1) {
      [{ at } = { at: null }] = await sql`select welcome_strip_dismissed_at as at from user_prefs where user_id = ${await userIdOf(email)}`;
      if (!at) await page.waitForTimeout(250);
    }
    check(at !== null, `${w.name} ✕ writes the dismissal`, String(at));
    await page.reload({ waitUntil: "domcontentloaded" });
    await onPageRole(page, "heading", /Welcome back|Your collection|Home/).first().waitFor({ timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    check(await onPage(page, STRIP).count() === 0, `${w.name} a reload draws no strip`, `${await onPage(page, STRIP).count()}`);
  } finally {
    await ctx.close();
  }
}

const ids = new Map();
async function userIdOf(email) {
  if (!ids.has(email)) {
    const [user] = await clerk("GET", `/users?email_address=${encodeURIComponent(email)}`);
    ids.set(email, user.id);
  }
  return ids.get(email);
}

const [{ id: branch }] = await sql`select current_setting('neon.branch_id', true) as id`;
if (!branch || branch === PRODUCTION || branch === STAGING) {
  throw new Error(`refusing to write fixtures to ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev or a scratch branch of it`);
}

if (process.env.WELCOME_PROBE_CLEAN) {
  const email = process.env.WELCOME_PROBE_CLEAN;
  if (!/^welcome-strip-\d+\+clerk_test@the99\.app$/.test(email)) throw new Error(`refusing to clean ${email}: not a probe account`);
  await removeUser(await userIdOf(email));
  process.exit(0);
}

await clerkSetup();
const browser = await chromium.launch();
const email = `welcome-strip-${Date.now()}+clerk_test@the99.app`;
const userId = (await clerk("POST", "/users", { email_address: [email], skip_password_requirement: true })).id;
ids.set(email, userId);
try {
  // The lot as `grantWelcome` writes it: 15 credits, expiring 30 days out. Clerk's webhook does not reach a local server.
  await sql`insert into credit_grants (user_id, source, units, expires_at) values (${userId}, 'welcome', 15, ${new Date(Date.now() + 30 * DAY)})`;
  for (const w of WIDTHS) await firstRun(browser, w, email);
  if (STAGE !== "first-run") {
    // Cards in, no deck: the dashboard. Twelve catalog cards with a printing, owned once each.
    await sql`insert into collection_items (user_id, oracle_id, quantity, set_code, collector_number)
              select ${userId}, p.oracle_id, 1, p.set_code, p.collector_number
              from (select distinct on (oracle_id) oracle_id, set_code, collector_number from printings order by oracle_id, set_code) p
              limit 12`;
    for (const w of WIDTHS) {
      await dashboard(browser, w, email);
      // Back to undismissed for the next width (and for a kept account's contact sheet).
      await sql`update user_prefs set welcome_strip_dismissed_at = null where user_id = ${userId}`;
    }
  }
} finally {
  await browser.close();
  if (KEEP) console.log(`INFO  kept ${email} (${userId}); remove it with WELCOME_PROBE_CLEAN=${email}`);
  else await removeUser(userId);
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
