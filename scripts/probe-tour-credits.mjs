// probe:tour-credits — the first-run tour's Credits stop (welcome credits addendum onboarding, PR 2), in a real browser at
// 390x844 and 1300x900.
//
// What jsdom cannot see, and the unit tests therefore do not prove:
//   - With a live welcome lot and the strip drawn, the tour has seven stops and the fifth, `5 of 7 · Credits`, lights the
//     strip: the ring is the strip's own box plus the banner's 8px of room, and the card lists the six rows.
//   - At 390 the stop brings the strip to 14px under the top, and the docked card sits under it, never over it.
//   - With the strip closed (`welcome_strip_dismissed_at` set) the same tour has six stops, its foot says `Six stops`, and
//     there is no Credits stop and no centred card with nothing lit.
//
// FIXTURE: a kept `pnpm probe:welcome-strip` account (WELCOME_PROBE_KEEP=1 WELCOME_PROBE_STAGE=first-run), named in
// TOUR_CREDITS_EMAIL: a fresh Clerk test user on the DEVELOPMENT instance with a live welcome lot and no cards. The tour
// is asked for again (`/?tour=1`), which writes no stamp of its own. The one write is that account's
// `welcome_strip_dismissed_at`, set for the closed leg and put back to null in a `finally`. The database is the
// worktree's `.env` (a scratch branch or local-dev; production and staging refused by `neon.branch_id`). The server needs
// WELCOME_CREDITS_ENABLED and PAYMENTS_ENABLED on (flag_overrides rows).
//
//   TOUR_CREDITS_EMAIL=<address> [TOUR_CREDITS_DASHBOARD_EMAIL=<address>] PROBE_BASE=http://localhost:3377 PROBE_SHOTS=<dir> pnpm probe:tour-credits
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { CLERK_SECRET_KEY, DATABASE_URL } = requireEnv(["CLERK_SECRET_KEY", "DATABASE_URL"]);
const EMAIL = process.env.TOUR_CREDITS_EMAIL;
if (!EMAIL || !EMAIL.endsWith("+clerk_test@the99.app")) throw new Error("TOUR_CREDITS_EMAIL: the kept probe account's address (+clerk_test@the99.app)");
// Optional: an account with cards and a live welcome lot, for the dashboard replay leg.
const DASHBOARD_EMAIL = process.env.TOUR_CREDITS_DASHBOARD_EMAIL;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "" || u.pathname !== "/") {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback server with a port only (http://localhost:3377)`);
  }
}
if (!CLERK_SECRET_KEY.startsWith("sk_test_")) throw new Error("refusing: CLERK_SECRET_KEY is not a development instance's");
const sql = neon(DATABASE_URL);
const REFUSED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess"]);
const SHOTS = process.env.PROBE_SHOTS;
const WIDTHS = [
  { name: "390", width: 390, height: 844, phone: true },
  { name: "1300", width: 1300, height: 900, phone: false },
];

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures += 1;
};

async function signIn(page, email = EMAIL) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 90_000 });
  const result = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return { error: `sign-in status: ${attempt.status}` };
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return { userId: window.Clerk.user?.id };
    } catch (error) {
      return { error: error?.errors?.[0]?.longMessage ?? String(error) };
    }
  }, email);
  if (result.error) throw new Error(`Clerk sign-in failed: ${result.error}`);
  return result.userId;
}

const card = (page) => page.locator("[data-tour-card]");
const kicker = async (page) => (await card(page).locator("span.uppercase").first().textContent())?.trim();
const next = (page) => card(page).getByRole("button", { name: "Next", exact: true }).click();

/** The ring's box against the strip's, padded by the banner's 8px; the ring glides for 240ms, so read it settled. */
async function ringOnStrip(page) {
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const ring = document.querySelector("[data-tour-ring]")?.getBoundingClientRect();
    const el = document.querySelector("[data-welcome-strip]");
    if (!ring || !el) return { ok: false, why: ring ? "no strip" : "no ring" };
    const r = el.getBoundingClientRect();
    const off = Math.max(Math.abs(ring.x - (r.x - 8)), Math.abs(ring.y - (r.y - 8)), Math.abs(ring.width - (r.width + 16)), Math.abs(ring.height - (r.height + 16)));
    return { ok: off <= 2, why: `off by ${off.toFixed(1)}px`, top: r.top, bottom: r.bottom };
  });
}

async function open(browser, w, email = EMAIL) {
  const context = await browser.newContext({ viewport: { width: w.width, height: w.height } });
  const page = await context.newPage();
  const userId = await signIn(page, email);
  await page.goto(`${BASE}/?tour=1`, { waitUntil: "domcontentloaded" });
  await card(page).waitFor({ timeout: 30_000 });
  return { context, page, userId };
}

async function run() {
  const branch = (await sql`select current_setting('neon.branch_id', true) as id`)[0]?.id;
  if (!branch || REFUSED.has(branch)) throw new Error(`refusing: this database is ${branch ?? "unidentified"}, not local-dev or a scratch branch`);
  const browser = await chromium.launch();
  let userId = null;
  try {
    for (const w of WIDTHS) {
      // With the strip: seven stops, the fifth lights it.
      const { context, page, userId: id } = await open(browser, w);
      userId = id;
      check((await kicker(page)) === "1 of 7 · Collection", `${w.name} strip drawn: seven stops`, String(await kicker(page)));
      check((await card(page).textContent())?.includes("Seven stops") ?? false, `${w.name} step 1's foot says Seven stops`);
      for (let i = 0; i < 4; i++) await next(page);
      check((await kicker(page)) === "5 of 7 · Credits", `${w.name} the fifth stop is Credits`, String(await kicker(page)));
      check((await card(page).locator("[data-tour-credits] li").count()) === 6, `${w.name} the card lists six rows`);
      const ring = await ringOnStrip(page);
      check(ring.ok, `${w.name} the ring is the strip's box plus its room`, ring.why);
      if (w.phone) {
        check(Math.abs(ring.top - 14) <= 2, `${w.name} the strip is 14px under the top`, `${ring.top}`);
        const cardTop = await card(page).evaluate((el) => el.getBoundingClientRect().top);
        check(cardTop >= ring.bottom, `${w.name} the docked card sits under the strip`, `card ${cardTop} vs strip ${ring.bottom}`);
      }
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/tour-credits-${w.name}.png` });
      await next(page);
      check((await kicker(page)) === "6 of 7 · Your look", `${w.name} Next leaves Credits for Your look`, String(await kicker(page)));
      await context.close();
    }
    // The tour taken again on a dashboard (an account with cards and a live lot, DASHBOARD_EMAIL): the same stop.
    if (DASHBOARD_EMAIL) {
      for (const w of WIDTHS) {
        const { context, page } = await open(browser, w, DASHBOARD_EMAIL);
        for (let i = 0; i < 4; i++) await next(page);
        check((await kicker(page)) === "5 of 7 · Credits", `${w.name} dashboard replay: the fifth of seven is Credits`, String(await kicker(page)));
        const ring = await ringOnStrip(page);
        check(ring.ok, `${w.name} dashboard replay: the ring is the strip's box plus its room`, ring.why);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/tour-credits-dashboard-${w.name}.png` });
        await context.close();
      }
    }
    // The strip closed: the same tour is six stops with no Credits stop.
    await sql`update user_prefs set welcome_strip_dismissed_at = now() where user_id = ${userId}`;
    for (const w of WIDTHS) {
      const { context, page } = await open(browser, w);
      check((await kicker(page)) === "1 of 6 · Collection", `${w.name} strip closed: six stops`, String(await kicker(page)));
      check((await card(page).textContent())?.includes("Six stops") ?? false, `${w.name} step 1's foot says Six stops`);
      for (let i = 0; i < 4; i++) await next(page);
      check((await kicker(page)) === "5 of 6 · Your look", `${w.name} no Credits stop between Buying and Your look`, String(await kicker(page)));
      await context.close();
    }
  } finally {
    if (userId) await sql`update user_prefs set welcome_strip_dismissed_at = null where user_id = ${userId}`;
    await browser.close();
  }
  if (failures > 0) {
    console.log(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
}

await clerkSetup({ secretKey: CLERK_SECRET_KEY });
await run();
