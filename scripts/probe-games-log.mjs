// probe:games-log — the Games tab around logging a game, at 1300x900 and 390x844.
//
// Two of Hugh's reports (2026-09-27), both facts about painted frames and laid-out
// geometry, which jsdom has neither of:
//
// 1. LOGGING THE FIRST GAME FLASHES THE EMPTY STATE. The save resolves, the form
//    collapses, and the empty state's pitch paints again under a collapsed CTA until
//    the route's revalidated payload brings the game in. A frame sampler installed
//    before Save records every frame; a frame that shows the empty heading AND the
//    collapsed `Log your first game` CTA after the press is the flash. The fix holds
//    the form in its saving state until the game is on the page, so that count is 0,
//    and the run FAILS when no game row ever arrives (a sampler that never saw the
//    list proves nothing).
// 2. THE LOG IS SQUISHED AT 390. With games carrying marks and a note, every history
//    row is read for overflow and for the slots the handoff fixes.
//
// It writes one deck per width under the account it signs in as, and its games, and
// deletes the decks in a `finally` (games and marks cascade). Point it at `local-dev`,
// never production.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { requireEnv } from "./lib/env.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { onPageRole } from "./lib/surface.mjs";

neonConfig.webSocketConstructor = ws;

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? null;

const VIEWPORTS = [
  { label: 1300, width: 1300, height: 900 },
  { label: 390, width: 390, height: 844 },
];
const EMPTY_HEADING = "Three games is a pattern.";
const FIRST_CTA = "Log your first game";

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

async function openGames(page, deckId) {
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "networkidle" });
  // The Games tab is client state, not a URL parameter, so the probe presses it.
  await onPageRole(page, "tab", /^Games/).click({ timeout: 60_000 });
}

await clerkSetup();
const pool = new Pool({ connectionString: DATABASE_URL });
const browser = await chromium.launch();
const decks = [];

try {
  const commander = await pool.query(
    `select oracle_id from cards where type_line ilike '%Legendary Creature%' order by oracle_id limit 1`,
  );
  if (commander.rowCount === 0) throw new Error("No legendary creature in `cards`: seed first.");

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const userId = await signIn(page);
    await clearAboutSheet(page, userId);
    const { rows } = await pool.query(
      `insert into decks (user_id, name, commander_oracle_id) values ($1, $2, $3) returning id`,
      [userId, `Probe · games log ${vp.label}`, commander.rows[0].oracle_id],
    );
    const deckId = rows[0].id;
    decks.push(deckId);

    // ---- 1. The first game: no frame of the empty state after Save ----------------
    await openGames(page, deckId);
    await onPageRole(page, "heading", EMPTY_HEADING).waitFor({ timeout: 30_000 });
    await onPageRole(page, "button", FIRST_CTA).click();
    await onPageRole(page, "radio", "Won").click();
    await page.evaluate(
      ([heading, cta]) => {
        const main = document.querySelector("main");
        const seen = (el) => Boolean(el) && el.getClientRects().length > 0;
        const frames = [];
        window.__gameFrames = frames;
        window.__stopFrames = false;
        const tick = () => {
          const h = [...main.querySelectorAll("h3")].find((n) => n.textContent.trim() === heading);
          const c = [...main.querySelectorAll("button")].find((n) => n.textContent.trim() === cta);
          const rows = main.querySelectorAll("#panel-games li").length;
          frames.push({ empty: seen(h), collapsed: seen(c), rows });
          if (!window.__stopFrames) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      [EMPTY_HEADING, FIRST_CTA],
    );
    await onPageRole(page, "button", "Save this game").click();
    const arrived = await page
      .waitForFunction(() => (window.__gameFrames ?? []).some((f) => f.rows > 0), null, { timeout: 20_000 })
      .then(() => true, () => false);
    await page.waitForTimeout(300);
    const frames = await page.evaluate(() => {
      window.__stopFrames = true;
      return window.__gameFrames;
    });
    const flashed = frames.filter((f) => f.empty && f.collapsed).length;
    report(`${vp.label} first game: the game row arrives`, arrived, `${frames.length} frames sampled`);
    report(`${vp.label} first game: no frame of the empty state after Save`, arrived && flashed === 0,
      `${flashed} of ${frames.length} frames drew the empty pitch under a collapsed CTA`);

    // ---- 2. The log with games in it --------------------------------------------------
    const note = "Stalled on three lands until turn five, then the dinosaurs ran away with it.";
    for (const [result, days, text] of [["loss", 1, note], ["win", 2, null], ["draw", 3, null]]) {
      const g = await pool.query(
        `insert into deck_games (deck_id, user_id, result, pod_size, played_at, note)
         values ($1, $2, $3, 4, now() - ($4 || ' days')::interval, $5) returning id`,
        [deckId, userId, result, String(days), text],
      );
      await pool.query(
        `insert into deck_game_axes (game_id, axis, polarity) values ($1, 'card_flow', 'worked'), ($1, 'mana', 'hurt'), ($1, 'interaction', 'worked'), ($1, 'closing', 'worked')`,
        [g.rows[0].id],
      );
    }
    await openGames(page, deckId);
    await page.locator("#panel-games li").nth(3).waitFor({ timeout: 30_000 });
    const layout = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("#panel-games li")].filter((li) => li.querySelector("[data-marks]"));
      const over = (el) => el.scrollWidth - el.clientWidth;
      return {
        docOver: document.documentElement.scrollWidth - window.innerWidth,
        rows: rows.map((li) => {
          const box = li.getBoundingClientRect();
          const result = li.querySelector("span").getBoundingClientRect();
          const marks = li.querySelector("[data-marks]").getBoundingClientRect();
          const del = li.querySelector("button").getBoundingClientRect();
          return {
            over: over(li),
            // The screen-reader copy is a 1px clipped box by design, never a clipped slot.
            clipped: [...li.querySelectorAll("*")]
              .filter((n) => n.children.length === 0 && !n.closest(".sr-only") && over(n) > 1).length,
            marksBelow: marks.top >= result.bottom - 0.5,
            marksShare: marks.width / (box.width - 26),
            delOnFirst: Math.abs(del.top + del.height / 2 - (result.top + result.height / 2)) < 2,
            delAtEnd: box.right - del.right,
          };
        }),
      };
    });
    report(`${vp.label} log: nothing wider than the page`, layout.docOver <= 0, `${layout.docOver}px`);
    report(`${vp.label} log: no row overflows`, layout.rows.length >= 4 && layout.rows.every((r) => r.over <= 0 && r.clipped === 0),
      `${layout.rows.length} rows; ` + layout.rows.map((r) => `over ${r.over} clipped ${r.clipped}`).join(" | "));
    // The handoff's phone row: result and meta on line one, chips on line two across the row's
    // width. From md, one line.
    const phone = vp.width < 768;
    report(`${vp.label} log: the marks ${phone ? "wrap onto line two, full width" : "share line one"}`,
      layout.rows.every((r) => (phone ? r.marksBelow && r.marksShare > 0.9 : !r.marksBelow)),
      layout.rows.map((r) => `${r.marksBelow ? "below" : "beside"} ${Math.round(r.marksShare * 100)}%`).join(" | "));
    report(`${vp.label} log: delete sits on line one at the row's end`,
      layout.rows.every((r) => r.delOnFirst && r.delAtEnd < 16),
      layout.rows.map((r) => `${r.delOnFirst ? "line one" : "moved"}, ${Math.round(r.delAtEnd)}px from the end`).join(" | "));
    if (SHOTS) await page.locator("#panel-games").screenshot({ path: `${SHOTS}/games-${vp.label}.png` });
    await context.close();
  }
} catch (error) {
  failures += 1;
  console.error(error);
} finally {
  if (decks.length) await pool.query(`delete from decks where id = any($1::uuid[])`, [decks]);
  console.log(`${decks.length} fixture deck(s) deleted`);
  await browser.close();
  await pool.end();
}

console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
