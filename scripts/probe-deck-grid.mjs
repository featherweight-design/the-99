// The decks grid, measured in a real browser at 1300x900 and 390x844.
//
// Two rulings here are facts about laid-out geometry, and jsdom lays nothing
// out, so the unit suite can assert a class list and nothing further.
//
// TILES END LEVEL. A tile's footer draws a detail line only where there is a
// figure or a real last-played date to put in it, so one tile in a row carries
// `13 to buy · $14.84` and the two beside it carry nothing — and the two beside
// it stopped short, because the `<li>` stretched to the grid row and the tile
// inside it sat at its own content height. Three tiles ending at three different
// heights reads as three different kinds of thing.
//
// THE LAST TILE CLEARS THE TAB BAR. The shell reserves exactly `--tabbar-h`
// under `<main>`, so a list with no bottom padding of its own ends flush against
// the phone's bar: the tile's edge and the bar's edge with nothing between them.
//
// Makes no writes. Signs in through Clerk's dev instance — see the local-auth
// note in memory. Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3010 node scripts/probe-deck-grid.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { PAGE } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

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
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
          });
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

// Counted here rather than at each call site, for `probe-commander-availability`'s
// reason: a check that forgot to count printed ` FAIL ` and then `All checks
// passed.` over the top, with the exit code agreeing with the wrong half.
let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

/**
 * Every tile's box, grouped into the grid ROWS they actually occupy.
 *
 * Grouped by measured `top` rather than by index: the row count is a function of
 * the viewport, and a probe that divided the list into threes would compare tiles
 * from two different rows the moment the grid reflowed. Tiles sharing a top edge
 * are a row wherever the grid put them.
 */
const ROWS = (page) => {
  const tiles = [...document.querySelectorAll(`${page} li article`)]
    .map((t) => t.getBoundingClientRect())
    .filter((r) => r.width > 0);
  const rows = new Map();
  for (const r of tiles) {
    // Rounded to the pixel: sub-pixel layout leaves two tiles in one row a
    // hundredth apart, and an exact key would call each of them its own row.
    const key = Math.round(r.top);
    rows.set(key, [...(rows.get(key) ?? []), r]);
  }
  return [...rows.values()].map((row) => ({
    count: row.length,
    // The spread within one row. Zero is the ruling; anything else is a tile
    // that stopped at its own content.
    spread: Math.max(...row.map((r) => r.bottom)) - Math.min(...row.map((r) => r.bottom)),
  }));
};

/** The gap between the last tile's bottom edge and the top of the fixed tab bar. */
const TAB_GAP = (page) => {
  const tiles = [...document.querySelectorAll(`${page} li article`)]
    .map((t) => t.getBoundingClientRect())
    .filter((r) => r.width > 0);
  const bar = document.querySelector("nav.fixed.inset-x-0.bottom-0")
    ?? [...document.querySelectorAll("nav")].find((n) => getComputedStyle(n).position === "fixed");
  if (tiles.length === 0 || !bar) return null;
  const last = tiles.reduce((a, b) => (a.bottom > b.bottom ? a : b));
  return { gap: bar.getBoundingClientRect().top - last.bottom, tiles: tiles.length };
};

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();

  try {
    for (const width of [1300, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
      const page = await context.newPage();
      await signIn(page);
      await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
      await page.waitForTimeout(3_000);
      // The list scrolls to its foot first: the gap under the LAST tile is only
      // measurable against the bar once the list has actually been scrolled to
      // it, and a short list is already there.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      const rows = await page.evaluate(ROWS, PAGE);
      // A multi-tile ROW is the subject. A run whose every row holds one tile has
      // nothing to compare and passes on a broken build, so it fails instead:
      // the fixture account is meant to own several decks.
      const shared = rows.filter((r) => r.count > 1);
      if (width === 390) {
        report(
          `${width}px · the grid is one tile per row`,
          shared.length === 0,
          `${rows.length} rows, ${shared.length} of them sharing — the phone stacks`,
        );
      } else {
        report(
          `${width}px · tiles in a row end level`,
          shared.length > 0 && shared.every((r) => r.spread <= 1),
          shared.length === 0
            ? "no row holds two tiles — a one-deck account, or a page this probe did not"
              + " reach. NOT a pass: the ruling is about tiles beside each other."
            : `${shared.length} shared rows, worst spread`
              + ` ${Math.round(Math.max(...shared.map((r) => r.spread)) * 100) / 100}px`,
        );
      }

      if (width === 390) {
        const m = await page.evaluate(TAB_GAP, PAGE);
        report(
          `${width}px · the last tile clears the tab bar`,
          // A floor rather than an exact figure: the list pays 14px and the ruling
          // is that the two edges do not touch. 8 leaves room for a future
          // respacing without leaving room for a flush edge.
          m !== null && m.gap >= 8,
          m === null
            ? "no tile or no tab bar was found — a page this probe did not reach"
            : `${m.tiles} tiles, ${Math.round(m.gap * 100) / 100}px between the last one and the bar`,
        );
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run();
