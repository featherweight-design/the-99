// Pips never overlap, on any surface that draws a cost, at either width.
//
// They did, and by design: the cost track was 40px, which cannot hold three 12px pips at a
// 3px gap, so every pip past the second stepped 5px into its neighbour. Five fitted exactly
// and were unreadable — a reader could not tell two black pips from one, which on this app's
// rows is the difference between a two-drop and a four-drop.
//
// jsdom lays nothing out, so the unit tests can assert the absence of a negative margin and
// nothing more: whether two discs actually overlap on screen is a question for a layout
// engine. This walks every row surface that draws a cost and measures the horizontal gap
// between each neighbouring pair.
//
// `/collection` is visited with `?view=rows` explicitly: its desktop default is the grid,
// which draws no pips, and a run that measured the default would report a clean sweep of
// nothing at the one width the defect was reported on.
//
// Run by hand, and not part of `pnpm test`:
//   node scripts/probe-pip-gap.mjs
//   PROBE_BASE=http://localhost:3600 PROBE_DECK=<uuid> node scripts/probe-pip-gap.mjs
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

function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  return ok;
}

/**
 * The gap a pair of neighbouring pips must clear. The component draws a 3px gap, so a run
 * measuring 0 is as broken as one measuring -5 — it is just broken in a way a
 * non-overlap assertion cannot see.
 */
const MIN_GAP = 3;

/**
 * Every neighbouring pair of pips inside one run, measured.
 *
 * Grouped by parent rather than by a class on the run: the run's own className is the
 * caller's, and four surfaces pass four different ones. Two pips sharing a parent are a run
 * wherever they were drawn.
 */
const MEASURE = (page) => {
  const pips = [...document.querySelectorAll(`${page} span.rounded-full`)]
    .filter((p) => p.getBoundingClientRect().width > 0);
  const byParent = new Map();
  for (const pip of pips) byParent.set(pip.parentElement, [...(byParent.get(pip.parentElement) ?? []), pip]);
  let runs = 0;
  let pairs = 0;
  let worst = Infinity;
  for (const [, group] of byParent) {
    if (group.length < 2) continue;
    runs += 1;
    const rects = group.map((p) => p.getBoundingClientRect());
    for (let i = 1; i < rects.length; i++) {
      pairs += 1;
      worst = Math.min(worst, rects[i].left - rects[i - 1].right);
    }
  }
  // RAW, not rounded. `Math.round(-0.4)` is `-0`, which compares `>= 0` — so a real overlap
  // of less than half a pixel would have passed the check that exists to catch overlaps. The
  // rounding belongs in the sentence, not in the measurement.
  return { pips: pips.length, runs, pairs, worst: worst === Infinity ? null : worst };
};

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  let failures = 0;

  try {
    for (const width of [1300, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await signIn(page);

      const deck = process.env.PROBE_DECK
        ? `/decks/${process.env.PROBE_DECK}`
        : await (async () => {
          await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
          await page.waitForTimeout(2_500);
          return page.evaluate(() => [...document.querySelectorAll('a[href^="/decks/"]')]
            .map((a) => a.getAttribute("href"))
            .find((h) => h && !/\/(import|new)$/.test(h)) ?? null);
        })();
      if (deck === null) {
        failures += !report(`${width}px · a deck to read`, false, "the account owns none");
        await context.close();
        continue;
      }

      for (const route of [deck, `${deck}/changes`, "/collection?view=rows"]) {
        await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(4_000);
        // Scoped through `lib/surface.mjs`'s own `PAGE`, never a selector of this probe's:
        // the shell wraps `<main>` and draws pips of its own in the rail, and a probe that
        // wrote its own boundary would drift from the one every other script uses.
        const m = await page.evaluate(MEASURE, PAGE);
        // A surface with no run measured nothing, and says so rather than passing: every
        // route here draws costs, so an empty sweep is a probe that did not reach the page.
        failures += !report(
          `${width}px · ${route}`,
          m.runs > 0 && m.worst !== null && m.worst >= MIN_GAP - 0.5,
          m.runs === 0
            ? `no run of two or more pips was drawn — a collection of single-pip costs, or a`
              + ` page this probe did not reach. NOT a pass: pick a fuller fixture, or a deck`
              + ` with a multi-coloured card, with PROBE_DECK.`
            : `${m.runs} runs, ${m.pairs} neighbouring pairs, tightest gap`
              + ` ${Math.round(m.worst * 100) / 100}px against a ${MIN_GAP}px floor`,
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
