// A combo notification opens the COMBO's sheet, not just one card's details (Hugh, 2026-11-15). A push tap lands on Home with
// `push-card`, `push-combo=1` and `push-variant` in the address; the feed's See the combo opens through the same provider call, so
// this probe presses the landing: the combo's sheet (`[data-card-combo=<variant>]`) must be on screen with no press, and the address
// must be stripped. A negative control drops `push-variant` and must show NO sheet (the card's details alone).
// The landing mounts only with the reader's PUSH_ENABLED on, so the probe writes ONE user-scoped override row for the signed-in account
// (marked `probe-combo-landing`, deleted in its `finally`); it refuses production and staging by `neon.branch_id` before that write.
// Needs a two-card variant in the catalog (read-only query).
//
// Run by hand against a dev server on a free port: `PROBE_BASE=http://localhost:3413 node scripts/probe-combo-landing.mjs`.
// Needs a browser, `DATABASE_URL`, the audit user (`E2E_AUDIT_USER_*`) and `CLERK_SECRET_KEY`; never production.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertNotSharedBranch } from "./lib/scratch-branch.mjs";
import { waitOutSwitchMemo } from "./lib/switch-memo.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3002";
const sql = neon(DATABASE_URL);
const MARK = "probe-combo-landing";
const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
assertNotSharedBranch(branch, "probe:combo-landing");

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
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

const WINDOWS = [
  { label: "phone 390x844", viewport: { width: 390, height: 844 }, touch: true },
  { label: "desktop 1280x800", viewport: { width: 1280, height: 800 }, touch: false },
];

// The card in the most two-card variants; its VARIANT is read off its own combo block (the card details list only the variants the
// bracket system counts, so a variant picked from the table alone may not be listed).
const [pick] = await sql`
  select vc.oracle_id::text as oracle_id
  from spellbook_variant_cards vc
  where vc.variant_id in (select variant_id from spellbook_variant_cards group by variant_id having count(*) = 2)
  group by vc.oracle_id
  order by count(*) desc
  limit 1`;
if (!pick) throw new Error("no two-card variant in this catalog");
const CARD = pick.oracle_id;
let VARIANT = null;

async function land(browser, win, search) {
  const variant = VARIANT;
  const ctx = await browser.newContext({ viewport: win.viewport, hasTouch: win.touch, isMobile: win.touch, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await signIn(page);
  const userId = await page.evaluate(() => window.Clerk.user.id);
  await sql`delete from flag_overrides where switch = 'PUSH_ENABLED' and scope = 'user' and user_id = ${userId}`;
  await sql`insert into flag_overrides (switch, scope, user_id, value, note, updated_by) values ('PUSH_ENABLED', 'user', ${userId}, 'on', ${MARK}, ${MARK})`;
  // The server memoises the switch snapshot, served stale past its window while it refreshes: wait it out so the
  // override just written is the one read.
  await waitOutSwitchMemo(page, BASE);
  await page.goto(`${BASE}/${search}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForSelector("#card-modal-title, [data-card-combo]", { state: "attached", timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const seen = await page.evaluate((variant) => ({
    sheet: variant !== null && document.querySelector(`[data-card-combo="${CSS.escape(variant)}"]`) !== null,
    card: document.getElementById("card-modal-title")?.textContent ?? null,
    search: location.search,
    path: location.pathname,
    lines: [...document.querySelectorAll("[data-combo-line]")].map((e) => e.getAttribute("data-combo-line")).slice(0, 8),
    h1: document.querySelector('h1')?.textContent?.slice(0, 40) ?? null,
    first: document.querySelector('main')?.innerText.slice(0, 80) ?? null,
  }), variant);
  if (process.env.PROBE_DEBUG) console.log("debug", JSON.stringify(seen));
  await ctx.close();
  return seen;
}

const results = [];
function check(ok, label, detail) {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

await clerkSetup();
const browser = await chromium.launch();
try {
  // The control first: the card opened for its combo with no variant shows its block, and the first line names the variant to land on.
  const control = await land(browser, WINDOWS[1], `?push-card=${CARD}&push-combo=1`);
  VARIANT = control.lines[0] ?? null;
  check(VARIANT !== null && !control.sheet && control.card !== null, "control: without push-variant the card's details open with their combo block and no sheet", `variant ${VARIANT} sheet ${control.sheet} card ${control.card}`);
  if (VARIANT !== null) {
    for (const win of WINDOWS) {
      const m = await land(browser, win, `?push-card=${CARD}&push-combo=1&push-variant=${encodeURIComponent(VARIANT)}`);
      check(m.sheet, `${win.label}: the combo's sheet is on screen with no press`, `sheet ${m.sheet} card ${m.card}`);
      check(m.search === "", `${win.label}: the landing's address is stripped`, `search "${m.search}"`);
    }
  }
} finally {
  await sql`delete from flag_overrides where switch = 'PUSH_ENABLED' and scope = 'user' and updated_by = ${MARK}`;
  await browser.close();
}
process.exit(results.every(Boolean) ? 0 : 1);
