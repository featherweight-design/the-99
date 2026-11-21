// probe:guided-run — the guided build's run window and the deck page's line, at 390 and 1300 (guided build PR C).
//
// Claims: a deck whose newest guided run is going draws the line `Sharpening toward Tokens` on its page; pressing it opens a dialog
// (aria-modal, a `status` wait region), Escape closes it; a failed run draws an alert line, its window offers `Try again` and
// `Open the deck` (at least 44px tall at 390) and the retry is never pressed here (a paid press); nothing scrolls sideways at either width.
// The tile (G6): /decks draws the run in the tile's detail row (the clock ticks; short and failed in words) with the tile's height unchanged, and Home's
// resume row carries the running clock in its stamp.
// Seeds (with a PRECON_UPGRADE_ENABLED user override for the fixture account) three fixture decks and deletes them in a `finally`.
// Writes: point it at `local-dev` or a scratch branch, never production or staging.
//
//   PROBE_BASE=http://localhost:3470 node scripts/probe-guided-run.mjs          (seed, probe, clear)
//   node scripts/probe-guided-run.mjs seed | clear                              (the contact sheet's fixture)
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { GUIDED_RUN_DECKS, clearFixture, seedFixture, userIdOf } from "./lib/guided-run-fixture.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL, CLERK_SECRET_KEY } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const mode = process.argv[2];

if (mode === "clear") { await clearFixture(DATABASE_URL); console.log("cleared"); process.exit(0); }
if (mode === "seed") { await seedFixture(DATABASE_URL, await userIdOf(EMAIL, CLERK_SECRET_KEY)); console.log("seeded", GUIDED_RUN_DECKS); process.exit(0); }
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const sql = neon(DATABASE_URL);
let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async ([email, password]) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = email.includes("+clerk_test") ? await signIn.create({ identifier: email }) : await signIn.create({ identifier: email, password });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        if (!factor?.emailAddressId) return "no email_code first factor";
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) { return error?.errors?.[0]?.longMessage ?? String(error); }
  }, [EMAIL, PASSWORD ?? ""]);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  const userId = await page.evaluate(() => window.Clerk.user.id);
  const { version } = JSON.parse(readFileSync(new URL("../src/lib/copy/about.version.json", import.meta.url), "utf8"));
  await sql`insert into user_prefs (user_id, about_version_seen) values (${userId}, ${version})
    on conflict (user_id) do update set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  await clearAboutSheet(page, userId);
  return userId;
}

/** A dev server's first compile can abort the first navigation: once more, then it is a failure. */
async function go(page, url) {
  const opts = { waitUntil: "domcontentloaded", timeout: 180_000 };
  await page.goto(url, opts).catch(() => page.goto(url, opts));
}

const WIDTHS = [{ label: 1300, viewport: { width: 1300, height: 900 } }, { label: 390, viewport: { width: 390, height: 844 } }];

async function walk(browser, w) {
  const ctx = await browser.newContext({ viewport: w.viewport });
  const page = await ctx.newPage();
  const tag = (s) => `${w.label} ${s}`;
  const noSideScroll = async (s) => report(tag(`${s}: no sideways scroll`), await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "scrollWidth");
  try {
    await signIn(page);

    // Running: the line, the dialog, Escape. The run is stamped again just before the load: a cold dev compile outlasts the reaper's five minutes.
    await sql`update guided_builds set status = 'pending', created_at = now(), finished_at = null, error_class = null, refunded = false where deck_id = ${GUIDED_RUN_DECKS.running}`;
    await go(page, `${BASE}/decks/${GUIDED_RUN_DECKS.running}`);
    const line = page.getByTestId("guided-run-line");
    const up = await line.waitFor({ timeout: 30_000 }).then(() => true, () => false);
    report(tag("running: the line is drawn"), up, up ? (await line.innerText()).replace(/\s+/g, " ") : "no line (is PRECON_UPGRADE_ENABLED on for the account?)");
    if (up) {
      report(tag("running: says Sharpening toward Tokens"), /Sharpening toward Tokens/.test(await line.innerText()), "text");
      await noSideScroll("running line");
      await line.getByRole("button").click();
      const dlg = page.getByRole("dialog", { name: /Guided run probe/ });
      const open = await dlg.waitFor({ timeout: 8000 }).then(() => true, () => false);
      report(tag("running: the window opens as a modal dialog"), open && (await dlg.getAttribute("aria-modal")) === "true", "role=dialog aria-modal");
      if (open) {
        report(tag("running: a status region holds the wait"), (await dlg.getByRole("status").count()) > 0, "role=status");
        await noSideScroll("running window");
        await page.keyboard.press("Escape");
        report(tag("running: Escape closes it"), await dlg.waitFor({ state: "detached", timeout: 4000 }).then(() => true, () => false), "dialog gone");
      }
    }

    // The tile. Direct writes to guided_builds do not move the stamp on a database without migration 0259, so the decks rows are touched too.
    await sql`update guided_builds set status = 'pending', created_at = now(), finished_at = null, error_class = null, refunded = false where deck_id = ${GUIDED_RUN_DECKS.running}`;
    await sql`update decks set name = name where id = any(${Object.values(GUIDED_RUN_DECKS)}::uuid[])`;
    await go(page, `${BASE}/decks`);
    const tile = (id) => page.locator(`article:has(a[href="/decks/${id}"])`);
    const detailText = async (id) => (await tile(id).locator("[data-deck-detail]").innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    const tileHeights = {};
    for (const [key, id] of Object.entries(GUIDED_RUN_DECKS)) {
      const there = await tile(id).first().waitFor({ timeout: 30_000 }).then(() => true, () => false);
      report(tag(`tile ${key}: drawn on /decks`), there, "article");
      if (!there) continue;
      const want = key === "running" ? /Sharpening toward Tokens · \d+:\d\d/ : key === "failed" ? /guided build toward Tokens didn.t come through/ : /found fewer than 12 cards/;
      await page.waitForFunction(() => true).catch(() => {});
      await page.waitForTimeout(1200);
      const text = await detailText(id);
      report(tag(`tile ${key}: the detail row says the run`), want.test(text), text);
      tileHeights[key] = (await tile(id).first().boundingBox())?.height ?? 0;
    }
    if (tileHeights.running) {
      const first = await detailText(GUIDED_RUN_DECKS.running);
      await page.waitForTimeout(2200);
      const later = await detailText(GUIDED_RUN_DECKS.running);
      report(tag("tile running: the clock ticks"), first !== later, `${first} -> ${later}`);
    }
    const heights = Object.values(tileHeights);
    const spread = heights.length ? Math.max(...heights) - Math.min(...heights) : 0;
    report(tag("tiles: the three run tiles are one height"), heights.length === 3 && spread < 1, heights.join("/"));
    await noSideScroll("/decks with run tiles");
    await go(page, `${BASE}/`);
    const row = page.locator(`a[href="/decks/${GUIDED_RUN_DECKS.running}"] [data-resume-stamp]`).first();
    const rowUp = await row.waitFor({ timeout: 30_000 }).then(() => true, () => false);
    report(tag("home: the running deck's resume row is drawn"), rowUp, "stamp");
    if (rowUp) {
      await page.waitForTimeout(1500);
      const t = (await row.innerText()).trim();
      report(tag("home: the stamp is the running clock"), /^Sharpening · \d+:\d\d$/.test(t), t);
    }
    await noSideScroll("Home with a run row");

    // Failed: an alert line, Try again and Open the deck, both tall enough. Retry is never pressed (a paid run).
    await go(page, `${BASE}/decks/${GUIDED_RUN_DECKS.failed}`);
    const fl = page.getByTestId("guided-run-line");
    const fup = await fl.waitFor({ timeout: 30_000 }).then(() => true, () => false);
    report(tag("failed: the line is drawn"), fup, "line");
    if (fup) {
      report(tag("failed: the line is an alert"), (await fl.getByRole("alert").count()) === 1, "role=alert");
      await fl.getByRole("button").click();
      const dlg = page.getByRole("dialog", { name: /Guided run probe/ });
      await dlg.waitFor({ timeout: 8000 }).catch(() => {});
      const retry = dlg.getByRole("button", { name: /Try again/ });
      const open = dlg.getByRole("link", { name: /Open the deck/ });
      report(tag("failed: Try again and Open the deck are there"), (await retry.count()) === 1 && (await open.count()) === 1, "controls");
      if ((await retry.count()) && (await open.count())) {
        const hs = [(await retry.boundingBox())?.height ?? 0, (await open.boundingBox())?.height ?? 0];
        report(tag("failed: both presses tall enough"), hs.every((h) => h >= (w.label === 390 ? 44 : 40)), hs.join("/"));
      }
      await noSideScroll("failed window");
    }
  } finally { await ctx.close(); }
}

let browser;
try {
  await clerkSetup();
  await seedFixture(DATABASE_URL, await userIdOf(EMAIL, CLERK_SECRET_KEY));
  browser = await chromium.launch();
  for (const w of WIDTHS) await walk(browser, w);
} finally {
  await browser?.close();
  await clearFixture(DATABASE_URL);
}
console.log(failures ? `\n${failures} FAILED` : "\nall ok");
process.exit(failures ? 1 : 0);
