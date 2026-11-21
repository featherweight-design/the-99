// probe:modal-close-focus — ModalChrome's focus at open and its ✕'s focus ring, pressed in a real browser at 390x844
// and 1300x820 (Hugh, 2026-11-21: the survey prompt opened with focus on its ✕, and the ✕'s ring was cut off by the
// panel's rounded corner). It opens About > Report a problem, which is drawn in the same `ModalChrome` as the survey
// check-in, and asserts:
//   1. focus at open is NOT the ✕ (it is the sheet's heading);
//   2. Tab from there puts keyboard focus on the ✕, and its ring's box (the button's box moved by outline-offset and
//      outline-width) lies inside the panel's visible box, corner arc included.
// Its one write: About draws the Report row only with FEEDBACK_ENABLED on for the reader, so the run adds a per-user
// `flag_overrides` row for the signed-in account (marked `updated_by = probe:modal-close-focus`, and only when that
// account has no row of its own) and deletes exactly that row in `finally`, counted back as a check. Production and
// staging are refused by `neon.branch_id` first. About's index records no visit (only `/about/[area]` does), and the
// form closes unsent. DATABASE_URL must be the database the dev server reads.
//
//   PROBE_BASE=http://localhost:3291 node scripts/probe-modal-close-focus.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertNotSharedBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL"]);
const sql = neon(DATABASE_URL);
const MARK = "probe:modal-close-focus";
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
  try {
    await switchOn(await signIn(page), page);
    await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    const press = page.locator("[data-about-report] button");
    await press.waitFor({ timeout: 30_000 }).catch(async (e) => { throw new Error(`no Report row at ${page.url()} (${(await page.locator("main").innerText().catch(() => "")).slice(0, 160).replace(/\s+/g, " ")}): ${e.message.split("\n")[0]}`); });
    // A press before hydration does nothing (the server-drawn button has no handler yet), so press until it opens.
    const dialog = page.locator('[data-testid="receipt-modal"]');
    for (let i = 0; ; i += 1) {
      await press.click();
      if (await dialog.waitFor({ timeout: 5_000 }).then(() => true, () => false)) break;
      if (i === 11) throw new Error("Report a problem never opened");
    }
    // The open's focus effect runs after the paint; let it.
    await page.waitForTimeout(300);

    const atOpen = await page.evaluate(() => {
      const a = document.activeElement;
      const close = document.querySelector('[data-testid="receipt-modal"] button[aria-label="Close"]');
      return { isClose: a === close, tag: a?.tagName ?? null, label: a?.getAttribute("aria-label") ?? a?.textContent?.slice(0, 40) ?? null };
    });
    report(L("focus at open is not the ✕"), !atOpen.isClose, `${atOpen.tag} "${atOpen.label}"`);

    // Keyboard focus on the ✕, so :focus-visible draws its ring. Tab until it is focused (it is the next stop from the
    // heading; from the ✕ itself on main, Shift+Tab then Tab comes back to it).
    let onClose = false;
    for (let i = 0; i < 4 && !onClose; i += 1) {
      await page.keyboard.press(atOpen.isClose && i === 0 ? "Shift+Tab" : "Tab");
      onClose = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Close");
    }
    if (!report(L("Tab reaches the ✕"), onClose)) return;

    const ring = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="receipt-modal"]');
      const close = panel.querySelector('button[aria-label="Close"]');
      const cs = getComputedStyle(close);
      const pc = getComputedStyle(panel);
      const b = close.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      const visible = close.matches(":focus-visible") && cs.outlineStyle !== "none";
      const grow = (parseFloat(cs.outlineOffset) || 0) + (parseFloat(cs.outlineWidth) || 0);
      const r = { left: b.left - grow, top: b.top - grow, right: b.right + grow, bottom: b.bottom + grow };
      const radius = parseFloat(pc.borderTopRightRadius) || 0;
      // The outline follows the button's own radius, grown (or shrunk) by the same amount as its box.
      const ringRadius = Math.max(0, (parseFloat(cs.borderTopRightRadius) || 0) + grow);
      return { visible, grow, r, ringRadius, p: { left: p.left, top: p.top, right: p.right, bottom: p.bottom }, radius, offset: cs.outlineOffset, width: cs.outlineWidth };
    });
    report(L("the ✕ draws a focus ring"), ring.visible, `offset ${ring.offset}, width ${ring.width}`);
    const E = 0.5;
    const inBox = ring.r.left >= ring.p.left - E && ring.r.top >= ring.p.top - E && ring.r.right <= ring.p.right + E && ring.r.bottom <= ring.p.bottom + E;
    // The ring's top-right corner against the panel's rounded top-right corner (overflow-hidden clips outside the arc).
    const cx = ring.p.right - ring.radius;
    const cy = ring.p.top + ring.radius;
    // The ring's own top-right corner is an arc of `ringRadius`; it is inside when that arc's far edge is within the panel's.
    const rx = ring.r.right - ring.ringRadius;
    const ry = ring.r.top + ring.ringRadius;
    const inCorner = ring.r.right <= cx || ring.r.top >= cy || Math.hypot(Math.max(0, rx - cx), Math.max(0, cy - ry)) + ring.ringRadius <= ring.radius + E;
    report(
      L("the ✕'s ring sits inside the visible panel"),
      inBox && inCorner,
      `ring ${[ring.r.left, ring.r.top, ring.r.right, ring.r.bottom].map((n) => n.toFixed(1)).join(",")} panel ${[ring.p.left, ring.p.top, ring.p.right, ring.p.bottom].map((n) => n.toFixed(1)).join(",")} radius ${ring.radius}, ring radius ${ring.ringRadius}`,
    );
    // PROBE_SHOTS=<dir>: the focused ✕ as drawn, for the contact sheet.
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/modal-close-focus-${width.label}.png` });
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
