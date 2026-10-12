// Opening the Analysis tab, in a real browser at 1300x900 and 390x844 (Analysis tab handoff §8,
// state 8a).
//
// The defect: the tab starts `idle` and asks for the stored reading only after it has painted, so
// an analyzed deck flashed the "not analyzed" empty state for a round trip and then swapped to its
// reading. The fix draws the opening loader instead, gated on the header's stored permits, and
// times it: nothing for 150ms, then the loader, held at least 400ms.
//
// No unit test can see this. The flash is one or two frames between an effect and a server
// action's reply. So the probe SLOWS that reply (every Server Action POST from the deck page is
// held for PROBE_PEEK_DELAY_MS, default 800) and records every DOM mutation in the tabpanel from
// the press on, then reads the timeline.
//
// WHAT IT PROVES, per width:
//  - An analyzed deck: the empty state is NEVER drawn; the loader is drawn, no sooner than the
//    150ms delay, and (on a second, quick answer of 260ms) held at least 400ms; while it is drawn the tabpanel draws nothing else (no
//    mix; the body is mounted behind it, hidden, since #1025) and is `aria-busy`; the header's bracket chip stays drawn throughout.
//  - An unanalyzed deck: the empty state is drawn at once (inside the delay) and the loader never
//    (Hugh, 2026-10-11: the hold is only for a deck with a reading to load).
//
// It makes no writes. It needs one account deck with a `deck_profiles` row and one without, and
// FAILS when either is missing rather than passing over nothing. Needs a server with
// ANALYSIS_TAB_ENABLED=true. Point it at `local-dev`.
//
//   PROBE_BASE=http://localhost:3049 node scripts/probe-tab-opening.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPageRole, PAGE } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const DELAY = Number(process.env.PROBE_PEEK_DELAY_MS ?? 800);
// Answers just after the loader is drawn, so only the HOLD keeps it up for 400ms. The long delay
// cannot prove the hold: a fetch that outlasts 400ms holds the loader by itself.
const SHORT_DELAY = 260;
let delay = DELAY;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(DATABASE_URL);

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
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
  return ok;
}

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];

/** One analyzed deck and one unanalyzed, from the decks the page lists for this account. */
async function findDecks(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`${PAGE} a[href^='/decks/']`, { timeout: 20_000 }).catch(() => {});
  const ids = await page.evaluate((scope) => {
    const root = document.querySelector(scope);
    return [...new Set([...(root?.querySelectorAll("a[href^='/decks/']") ?? [])]
      .map((a) => a.getAttribute("href").split("/")[2])
      .filter((id) => /^[0-9a-f-]{36}$/.test(id)))];
  }, PAGE);
  if (ids.length === 0) return { analyzed: null, bare: null };
  const rows = await sql`
    select d.id, exists (select 1 from deck_profiles p where p.deck_id = d.id) as analyzed
    from decks d where d.id = any(${ids}::uuid[]) order by d.id`;
  return {
    analyzed: rows.find((r) => r.analyzed)?.id ?? null,
    bare: rows.find((r) => !r.analyzed)?.id ?? null,
  };
}

/**
 * Presses the Analysis tab and records the tabpanel's state on every mutation until it has an
 * answer and 1.5s more have passed. Times are ms since the press.
 */
async function openAndRecord(page, deckId) {
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  const tab = onPageRole(page, "tab", /analysis/i).first();
  await tab.waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const drawn = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
    const log = [];
    window.__opening = { log, start: 0 };
    const snap = () => {
      const panel = document.getElementById("panel-analysis");
      const loader = panel?.querySelector("[data-opening-loader]");
      const chip = [...document.querySelectorAll('[data-testid="bracket-chip"]')].some(drawn);
      log.push({
        t: performance.now() - window.__opening.start,
        panel: !!panel,
        empty: drawn(panel?.querySelector('[data-testid="analysis-empty"]')),
        loader: loader?.getAttribute("data-opening-loader") ?? null,
        busy: panel?.getAttribute("aria-busy") === "true",
        // While the loader is up nothing else is DRAWN in the panel. Since #1025 the tab's body is
        // mounted behind the loader (hidden), so its text is in the DOM; what counts is a leaf with
        // text that paints, outside the loader. A 1px box is the screen reader's live region.
        extra: !!loader && [...panel.querySelectorAll("*")].some((el) =>
          !loader.contains(el) && !el.contains(loader) && el.childElementCount === 0
          && (el.textContent ?? "").trim() !== "" && drawn(el)
          && el.getBoundingClientRect().width > 1 && el.getBoundingClientRect().height > 1),
        chip,
        // Each mark's painted opacity, while the loader is drawn.
        ops: loader?.getAttribute("data-opening-loader") === "drawn"
          ? [...loader.querySelectorAll("[data-testid=opening-ring] .anim-at-wave")].map((m) => Number(getComputedStyle(m).opacity))
          : null,
      });
    };
    window.__opening.snap = snap;
    new MutationObserver(snap).observe(document.body, { subtree: true, childList: true, attributes: true });
  });
  await page.evaluate(() => { window.__opening.start = performance.now(); });
  await tab.click();
  await page.waitForFunction(() => {
    const p = document.getElementById("panel-analysis");
    return p && p.getAttribute("aria-busy") !== "true" && !p.querySelector("[data-opening-loader]");
  }, null, { timeout: 30_000 });
  await page.waitForTimeout(1500);
  return page.evaluate(() => window.__opening.log);
}

/** The spans of time the loader was DRAWN, from the log. */
function drawnSpans(log) {
  const spans = [];
  let from = null;
  for (const e of log) {
    if (e.loader === "drawn" && from === null) from = e.t;
    if (e.loader !== "drawn" && from !== null) { spans.push([from, e.t]); from = null; }
  }
  return spans;
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ viewport: WIDTHS[0].viewport })).newPage();
    await signIn(page);
    const { analyzed, bare } = await findDecks(page);
    if (!report("an analyzed deck", analyzed !== null, analyzed ?? "none")) return;
    if (!report("an unanalyzed deck", bare !== null, bare ?? "none")) return;
    // Every Server Action from the deck page is held, which slows the peek the tab makes on open.
    await page.route("**/decks/**", async (route) => {
      const req = route.request();
      if (req.method() === "POST" && req.headers()["next-action"]) await new Promise((r) => setTimeout(r, delay));
      await route.continue();
    });
    // Reduced motion: the loader is the ring, so its marks hold still at full ink like the reading ring's.
    {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const still = (await openAndRecord(page, analyzed)).filter((e) => e.ops).flatMap((e) => e.ops);
      report("reduced motion: the loader's marks hold at full ink", still.length > 0 && still.every((o) => Math.abs(o - 1) < 0.01), still.length ? `${[...new Set(still)].join(", ")}` : "never drawn");
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
    for (const width of WIDTHS) {
      await page.setViewportSize(width.viewport);
      const tag = `${width.label}`;

      const log = await openAndRecord(page, analyzed);
      const spans = drawnSpans(log);
      const firstDrawn = spans[0]?.[0] ?? null;
      const held = spans[0] ? spans[0][1] - spans[0][0] : 0;
      report(`${tag} analyzed: the empty state never flashes`, !log.some((e) => e.empty), `${log.filter((e) => e.empty).length} frames with it`);
      report(`${tag} analyzed: the loader is drawn`, spans.length === 1, `${spans.length} spans`);
      report(`${tag} analyzed: not before the 150ms delay`, firstDrawn !== null && firstDrawn >= 140, `first drawn at ${Math.round(firstDrawn ?? -1)}ms`);
      report(`${tag} analyzed: nothing else drawn beside it`, !log.some((e) => e.loader && e.extra), `${log.filter((e) => e.loader && e.extra).length} frames with more`);
      report(`${tag} analyzed: the tabpanel is aria-busy while it loads`, log.some((e) => e.loader && e.busy) && !log.some((e) => e.loader === "drawn" && !e.busy), "busy with the loader");
      // The loader is the reading ring: five marks, each on the wave.
      const firstOps = log.find((e) => e.ops)?.ops ?? [];
      // The fifth mark waits 0.64s for its wave: it must wait FAINT, not at full ink.
      report(`${tag} analyzed: the loader draws the ring's five marks, a waiting one faint`, firstOps.length === 5 && firstOps[4] <= 0.3, `${firstOps.length} marks, mark 5 at ${firstOps[4]}`);
      report(`${tag} analyzed: the header chip stays drawn`, log.every((e) => e.chip), log.every((e) => e.chip) ? "drawn throughout" : "dropped");

      // The hold, on a fetch that answers soon after the loader appears.
      delay = SHORT_DELAY;
      const quick = drawnSpans(await openAndRecord(page, analyzed));
      delay = DELAY;
      const heldFor = quick[0] ? quick[0][1] - quick[0][0] : 0;
      report(`${tag} analyzed, a quick answer: the loader holds at least 400ms`, quick.length === 1 && heldFor >= 390, quick.length ? `${Math.round(heldFor)}ms` : "never drawn");

      const bareLog = await openAndRecord(page, bare);
      const firstEmpty = bareLog.find((e) => e.empty)?.t ?? null;
      report(`${tag} unanalyzed: no loader`, !bareLog.some((e) => e.loader), `${bareLog.filter((e) => e.loader).length} frames with one`);
      report(`${tag} unanalyzed: the empty state at once`, firstEmpty !== null && firstEmpty < 140, `at ${Math.round(firstEmpty ?? -1)}ms`);
    }
  } finally {
    await browser.close();
  }
}

try {
  await run();
} catch (error) {
  console.error(error);
  failures += 1;
}
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
