// probe:tour — the first-run tour (discovery R3·1b), run through in a real browser at 390x844 and 1300x900.
//
// It proves what jsdom cannot: every step's cutout sits on its real control (the ring's box is the control's box plus
// its room), nothing under the scrim takes a press (the app is inert, so a click on a locked slot opens no note), the
// tour is spent once as step 1 appears (`tour_seen_at` written, and a reload shows nothing), a theme selected at step 5
// survives a skip, and step 6 stands centred with no cutout when Home draws no About line (R3 gap 6).
//
// FIXTURE. The dedicated empty account on Clerk's development instance (`onboard-probe+clerk_test@the99.app`), which
// first-run Home is drawn for. The server must run with FIRST_RUN_TOUR_ENABLED=true and ABOUT_SHEET_ENABLED=true. Each width resets the account's
// `tour_seen_at` to null and writes nothing else of the account's but its About seen-state, which it captures first and
// restores after. It refuses staging and production by `neon.branch_id`, and refuses an account that holds cards or
// decks (`assertDisposableAccount`), whose first run it would not see.
//
// PROBE_SHOTS=<dir> also photographs every step at each width, and step 6's fallback: the tour's contact sheet, since
// the shared one signs in as an account with data, which never sees a first run.
//
//   PROBE_BASE=http://localhost:3311 pnpm probe:tour
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertDisposableAccount, ONBOARD_PROBE_EMAIL } from "./lib/probe-account.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { DATABASE_URL } = requireEnv(["DATABASE_URL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const sql = neon(DATABASE_URL);
const SHOTS = process.env.PROBE_SHOTS;
const shot = async (page, vp, name) => SHOTS && page.screenshot({ path: `${SHOTS}/tour-${name}-${vp.width < 768 ? "phone" : "desktop"}.png` });
const REFUSED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess"]);

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
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
  }, ONBOARD_PROBE_EMAIL);
  if (result.error) throw new Error(`Clerk sign-in failed: ${result.error}`);
  return result.userId;
}

const seenAt = async (userId) => (await sql`select tour_seen_at from user_prefs where user_id = ${userId}`)[0]?.tour_seen_at ?? null;
/** The stamp once it has committed: the tour spends itself without waiting on the write, so step 1 can show first. */
async function committedSeenAt(userId, ms = 10_000) {
  for (const end = Date.now() + ms; ; ) {
    const at = await seenAt(userId);
    if (at || Date.now() > end) return at;
    await new Promise((r) => setTimeout(r, 250));
  }
}

/**
 * Each step's real control at this width, and the room its cutout keeps around it. At 390 step 1 lights the card's
 * controls under the fan, and the header's account button is its 38px square inside a 3px pad (1px past the button).
 */
const controls = (phone) => ({
  collection: phone ? { sel: "[data-step1-controls]", pad: 8 } : { sel: "[data-step1-card]", pad: 8 },
  // The slots by their own label, not by the target they register, so a target on the wrong slot fails here.
  commanders: { sel: '[data-locked-slot="Commanders"]', pad: 5 },
  decks: { sel: '[data-locked-slot="Decks"]', pad: 5 },
  buying: { sel: '[data-locked-slot="Decks"]', pad: 5 },
  // The account button has one target, a box over the button (`TargetBox`).
  look: { sel: '[data-target="tour:account"]', pad: phone ? 1 : 4 },
  whatsNew: { sel: "[data-arrivals-banner] section", pad: 8 },
});

/** The ring's box against the first drawn match of the step's control, padded by its room. */
async function ringOnControl(page, key, phone) {
  const { sel, pad } = controls(phone)[key];
  // The ring glides for 240ms; read it settled.
  await page.waitForTimeout(400);
  return page.evaluate(
    ({ sel, pad }) => {
      const ring = document.querySelector("[data-tour-ring]")?.getBoundingClientRect();
      const el = [...document.querySelectorAll(sel)].find((e) => e.checkVisibility() && !e.closest("[data-tour]"));
      if (!ring || !el) return { ok: false, why: ring ? "no control drawn" : "no ring" };
      const r = el.getBoundingClientRect();
      const off = Math.max(Math.abs(ring.x - (r.x - pad)), Math.abs(ring.y - (r.y - pad)), Math.abs(ring.width - (r.width + pad * 2)), Math.abs(ring.height - (r.height + pad * 2)));
      return { ok: off <= 2, why: `off by ${off.toFixed(1)}px` };
    },
    { sel, pad },
  );
}

async function walk(browser, vp) {
  console.log(`\n${vp.label}`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const userId = await signIn(page);
  await assertDisposableAccount(sql, { email: ONBOARD_PROBE_EMAIL, userId, what: "probe:tour" });
  const [{ cards }] = await sql`select count(*)::int as cards from collection_items where user_id = ${userId}`;
  if (cards > 0) throw new Error(`probe:tour: ${ONBOARD_PROBE_EMAIL} holds ${cards} cards, so Home is not its first run`);
  const about = await captureAboutSeen(userId, sql);
  try {
    // About's line stays on Home for step 6; the cookie keeps its sheet from opening over the page first.
    // A brand-new account's About state, so Home draws About's first-run line for step 6 (the server must run with
    // ABOUT_SHEET_ENABLED=true; off, the proxy sends a reader with unread About to /about first). Restored in the `finally`.
    await sql`update user_prefs set tour_seen_at = null, about_version_seen = 0, about_seen_ids = '{}' where user_id = ${userId}`;
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const card = page.locator("[data-tour-card]");
    report("the tour opens on a first-run Home", await card.waitFor({ timeout: 15_000 }).then(() => true, () => false));
    const first = await committedSeenAt(userId);
    report("tour_seen_at is written as step 1 appears", first !== null);
    // The card is hidden until measured; focus must still land on Next once it shows, so Enter advances at once.
    await page.waitForTimeout(300);
    report("Next holds focus as step 1 appears", await page.evaluate(() => document.activeElement?.closest("[data-tour-card]") !== null && document.activeElement?.textContent === "Next"));
    report("the app is inert under the scrim", await page.evaluate(() => document.querySelector("main")?.closest("[inert]") !== null));

    for (const key of ["collection", "commanders", "decks", "buying", "look", "whatsNew"]) {
      await page.waitForFunction((k) => document.querySelector(`[data-tour-card="${k}"]`), key, { timeout: 5_000 });
      const at = await ringOnControl(page, key, vp.width < 768);
      await shot(page, vp, key);
      if (key === "collection" && vp.width < 768) {
        // At 390 the page scrolls so the lit controls clear the docked card.
        const clear = await page.evaluate(() => {
          const ring = document.querySelector("[data-tour-ring]")?.getBoundingClientRect();
          const box = document.querySelector("[data-tour-card]")?.getBoundingClientRect();
          return !!ring && !!box && ring.bottom <= box.top;
        });
        report("step 1 at 390: the lit controls clear the docked card", clear);
      }
      report(`step ${key}: the cutout sits on its control`, at.ok, at.why);
      if (key === "commanders") {
        // A press where the locked slot is: the scrim and the inert app take nothing, so no note opens.
        const slot = page.locator('[data-locked-slot="Commanders"]').filter({ visible: true }).first();
        const box = await slot.boundingBox();
        if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        report("a press under the scrim does nothing", (await page.locator('[data-lock-note="open"]').count()) === 0 && (await card.count()) === 1);
      }
      if (key === "look") {
        const pick = card.getByRole("radio", { name: /^Canopy/ });
        await pick.click();
        report("step 5 applies a theme at once", (await page.evaluate(() => document.documentElement.dataset.theme)) === "ixalan");
        // The tallest step on a short screen (a phone on its side): the card stays on screen and scrolls inside.
        await page.setViewportSize({ width: vp.width, height: 375 });
        await page.waitForTimeout(300);
        const fits = await page.evaluate(() => {
          const el = document.querySelector("[data-tour-card]");
          const r = el?.getBoundingClientRect();
          return !!r && r.top >= 0 && r.bottom <= window.innerHeight && (el.scrollHeight <= el.clientHeight || getComputedStyle(el).overflowY === "auto");
        });
        report("on a 375-tall screen the card stays on screen and scrolls inside", fits);
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(300);
      }
      if (key !== "whatsNew") await card.getByRole("button", { name: "Next", exact: true }).click();
    }
    // Skip from step 6; the theme chosen at step 5 stays.
    await card.getByRole("button", { name: "Skip the tour" }).click();
    report("✕ ends the tour", (await card.count()) === 0);
    report("a theme selected then skipped keeps the theme", (await page.evaluate(() => document.documentElement.dataset.theme)) === "ixalan");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2_000);
    report("a reload shows no tour", (await page.locator("[data-tour-card]").count()) === 0);
    const after = await seenAt(userId);
    report("tour_seen_at is written once", after !== null && first !== null && after.getTime() === first.getTime());

    // Home with no About line: step 6 stands centred with no cutout.
    await sql`update user_prefs set tour_seen_at = null where user_id = ${userId}`;
    await clearAboutSheet(page, userId);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await card.waitFor({ timeout: 15_000 });
    for (let i = 0; i < 5; i++) await card.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForTimeout(300);
    await shot(page, vp, "whatsNew-fallback");
    report("with no About line, step 6 lights nothing", (await page.locator("[data-tour-ring]").count()) === 0 && (await page.locator('[data-tour-card="whatsNew"]').count()) === 1);
    await page.keyboard.press("Escape");
    report("Esc ends the tour", (await card.count()) === 0);
  } finally {
    await restoreAboutSeen(about, sql);
    await context.close();
  }
}

const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
if (!branch || REFUSED.has(branch)) throw new Error(`probe:tour refuses branch ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev or a scratch branch.`);
await clerkSetup();
const browser = await chromium.launch();
try {
  await walk(browser, { label: "desktop 1300x900", width: 1300, height: 900 });
  await walk(browser, { label: "phone 390x844", width: 390, height: 844 });
} finally {
  await browser.close();
}
console.log(failures === 0 ? "\nprobe:tour passed" : `\nprobe:tour: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
