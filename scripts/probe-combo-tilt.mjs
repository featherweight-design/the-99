// The combo sheet's pair leans the way the drawn design does (small items 12, call 1): the FIRST plate's card art turns
// counter-clockwise (rotate -2.5deg) and the SECOND clockwise (+2.5deg), so the pair reads as the mock's. It reads the computed
// transform of each plate's art at 390x844 and 1300x800 and checks the sign and the 2.5 degree magnitude, and that no plate text sits in
// a rotated box. The landing needs the reader's PUSH_ENABLED on, so the probe writes ONE user-scoped override row for the signed-in
// account (marked `probe-combo-tilt`, deleted in its `finally`); it refuses shared branches by `neon.branch_id` before that write.
//
// Run by hand against a dev server on a free port: `PROBE_BASE=http://localhost:3413 node scripts/probe-combo-tilt.mjs`.
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
const MARK = "probe-combo-tilt";
const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
assertNotSharedBranch(branch, "probe:combo-tilt");

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
  { label: "desktop 1300x800", viewport: { width: 1300, height: 800 }, touch: false },
];

// A card in a two-card variant; the landing opens that variant's sheet.
const [pick] = await sql`
  select vc.oracle_id::text as oracle_id
  from spellbook_variant_cards vc
  where vc.variant_id in (select variant_id from spellbook_variant_cards group by variant_id having count(*) = 2)
  group by vc.oracle_id
  order by count(*) desc
  limit 1`;
if (!pick) throw new Error("no two-card variant in this catalog");
const CARD = pick.oracle_id;

async function measure(browser, win, search) {
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
  await page.waitForSelector("[data-card-combo]", { state: "attached", timeout: 60_000 }).catch(() => {});
  await page.waitForSelector("[data-plate]", { state: "attached", timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const seen = await page.evaluate(() => {
    const angle = (el) => {
      const m = getComputedStyle(el).transform;
      if (m === "none") return 0;
      const [a, b] = m.slice(m.indexOf("(") + 1, -1).split(",").map(Number);
      return Math.round((Math.atan2(b, a) * 180) / Math.PI * 100) / 100;
    };
    const plates = [...document.querySelectorAll("[data-plate]")];
    return {
      angles: plates.map((p) => {
        const art = [...p.querySelectorAll("span")].find((s) => getComputedStyle(s).transform !== "none");
        return art ? angle(art) : null;
      }),
      // Which bottom corner each art turns about: "right" / "left" when the origin sits on that edge of its own box, else "other".
      origins: plates.map((p) => {
        const art = [...p.querySelectorAll("span")].find((s) => getComputedStyle(s).transform !== "none");
        if (!art) return null;
        const [ox, oy] = getComputedStyle(art).transformOrigin.split(" ").map(parseFloat);
        
        const bottom = Math.abs(oy - art.offsetHeight) < 1.5;
        return bottom && Math.abs(ox - art.offsetWidth) < 1.5 ? "bottom right" : bottom && ox < 1.5 ? "bottom left" : "other";
      }),
      leaked: plates.flatMap((p) => [...p.querySelectorAll("*")].filter((e) => getComputedStyle(e).transform !== "none" && e.textContent.trim() !== "")).length,
    };
  });
  if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/combo-tilt-${win.label.split(" ")[0]}.png` });
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
  // The landing needs a variant; the card's own details name it, so read it off a first load as the landing probe does.
  const first = await (async () => {
    const ctx = await browser.newContext({ viewport: WINDOWS[1].viewport });
    const page = await ctx.newPage();
    await signIn(page);
    const userId = await page.evaluate(() => window.Clerk.user.id);
    await sql`delete from flag_overrides where switch = 'PUSH_ENABLED' and scope = 'user' and user_id = ${userId}`;
    await sql`insert into flag_overrides (switch, scope, user_id, value, note, updated_by) values ('PUSH_ENABLED', 'user', ${userId}, 'on', ${MARK}, ${MARK})`;
    await waitOutSwitchMemo(page, BASE);
    await page.goto(`${BASE}/?push-card=${CARD}&push-combo=1`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.waitForSelector("[data-combo-line]", { state: "attached", timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const line = await page.evaluate(() => document.querySelector("[data-combo-line]")?.getAttribute("data-combo-line") ?? null);
    await ctx.close();
    return line;
  })();
  if (first === null) throw new Error("no combo line on the card's details");
  for (const win of WINDOWS) {
    const m = await measure(browser, win, `?push-card=${CARD}&push-combo=1&push-variant=${encodeURIComponent(first)}`);
    const [left, right] = m.angles;
    check(left === -2.5 && right === 2.5, `${win.label}: the first plate leans -2.5deg and the second +2.5deg, as drawn`, `angles ${JSON.stringify(m.angles)}`);
    check(m.origins[0] === "bottom right" && m.origins[1] === "bottom left", `${win.label}: the plates turn about their inner bottom corners, as drawn`, `origins ${JSON.stringify(m.origins)}`);
    check(m.leaked === 0, `${win.label}: no plate text sits inside a rotated box`, `leaked ${m.leaked}`);
  }
} finally {
  await sql`delete from flag_overrides where switch = 'PUSH_ENABLED' and scope = 'user' and updated_by = ${MARK}`;
  await browser.close();
}
process.exit(results.every(Boolean) ? 0 : 1);
