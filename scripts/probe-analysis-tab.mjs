// The Analysis tab, measured in a real browser at 1300x900 and 390x844.
//
// TWO RULINGS, one flag, and the flag is why this probe exists rather than a unit test.
//
// THE TAB IS SECOND, AND THE ROW STILL FITS. Round 0's ruling is a POSITION rather than a
// presence, and `builder-tab-specs.test.ts` pins the order of the array — what only a browser
// can say is what a FIFTH cell does to the row at 390px. The tablist is a plain flex row with
// no `overflow-x` anywhere on it or its ancestors, so a cell that does not fit does not scroll
// away: it overflows the viewport or wraps. The check is therefore on the LAST cell's right
// edge, not on Analysis's own — Analysis sits at x≈98 and would pass at any width, while the
// cells it pushes are Games and Versions.
//
// THE MIX STRIP MOVED, rather than being drawn twice. Round 0 pays for the tab with roughly
// 150px of net vertical above the tabs, all of it the strip's — so a build that renders the
// strip in the panel while leaving it in the spine has paid nothing and looks correct in every
// screenshot of either surface alone. The check is that exactly ONE strip exists, on the right
// side of the tab row.
//
// IT ASSERTS AGAINST A STATED EXPECTATION, never against what it finds. `PROBE_ANALYSIS_EXPECT`
// is `on` (default) or `off`, and the run fails when the server disagrees with it. Reading the
// flag's state off the page and then checking "the layout matches whatever I found" would pass
// on a deployment where the tab silently failed to render — it would simply assert the off
// layout and report a clean run. So the expectation comes from outside, and the two layouts are
// both real, checkable states:
//
//   ANALYSIS_TAB_ENABLED=true  pnpm dev          → PROBE_ANALYSIS_EXPECT=on   (the drawn layout)
//   pnpm dev                                      → PROBE_ANALYSIS_EXPECT=off  (today's layout)
//
// Makes no writes. Signs in through Clerk's dev instance — see the local-auth note in memory.
// Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3010 node scripts/probe-analysis-tab.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, PAGE } from "./lib/surface.mjs";

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
// RETURNS `ok`, and that is load-bearing rather than a convenience. The first version of this
// file copied a `report` that returned nothing and then wrote `if (!report(...)) continue` to
// bail when the tab was missing — which is always true of `undefined`, so every run skipped
// every check after the first and printed `All checks passed.` over two readings.
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
  return ok;
}

const EXPECT = process.env.PROBE_ANALYSIS_EXPECT ?? "on";
if (!["on", "off"].includes(EXPECT)) {
  throw new Error(`PROBE_ANALYSIS_EXPECT must be "on" or "off", got ${EXPECT}.`);
}

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];

/**
 * The decks to consider, found by asking the page rather than by an id.
 *
 * PREFERRING ONE WITH A VERSION, because the row's widest state is the one worth measuring: a
 * brew draws no Versions cell, so a fixture that happens to be one exercises FOUR cells and the
 * fifth-cell overflow — the only thing a new tab can break at 390px — never happens. The first
 * version of this probe measured exactly that and reported the row fits.
 */
async function findDeck(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  await page
    .waitForFunction(
      (scope) => {
        const root = document.querySelector(scope);
        const links = [...(root?.querySelectorAll("a[href^='/decks/']") ?? [])]
          .map((a) => a.getAttribute("href"))
          .filter((h) => h && h.split("/").length === 3 && !["new", "import"].includes(h.split("/")[2]));
        return links.length > 0 || Boolean(root?.textContent?.includes("No decks"));
      },
      PAGE,
      { timeout: 15_000 },
    )
    .catch(() => {});
  return page.evaluate((scope) => {
    const root = document.querySelector(scope);
    return [...(root?.querySelectorAll("a[href^='/decks/']") ?? [])]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && h.split("/").length === 3 && !["new", "import"].includes(h.split("/")[2]));
  }, PAGE);
}

/** Opens each candidate until one draws a Versions cell — the widest row. */
async function pickWidestDeck(page, hrefs) {
  for (const href of hrefs.slice(0, 6)) {
    await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(500);
    const cells = await readTabs(page);
    if (cells.some((c) => /version/i.test(c.label) || /version/i.test(c.aria))) {
      return { href, widest: true };
    }
  }
  return { href: hrefs[0] ?? null, widest: false };
}

/** Every tab cell's label and box, in document order. */
const readTabs = (page) =>
  page.evaluate((scope) => {
    const root = document.querySelector(scope);
    return [...(root?.querySelectorAll('[role="tab"]') ?? [])].map((t) => {
      const r = t.getBoundingClientRect();
      return {
        label: (t.textContent ?? "").trim().slice(0, 24),
        aria: t.getAttribute("aria-label") ?? "",
        selected: t.getAttribute("aria-selected") === "true",
        x: Math.round(r.x),
        w: Math.round(r.width),
      };
    });
  }, PAGE);

/** Where the Recommended mix strip is, relative to the tab row. */
const readStrip = (page) =>
  page.evaluate((scope) => {
    const root = document.querySelector(scope);
    const strips = [...(root?.querySelectorAll('section[aria-label="Recommended mix"]') ?? [])];
    const tablist = root?.querySelector('[role="tablist"]');
    const tabTop = tablist ? tablist.getBoundingClientRect().top : null;
    return {
      count: strips.length,
      // Which side of the tab row each strip sits on. The spine is above it; the panel below.
      sides: strips.map((s) => {
        const r = s.getBoundingClientRect();
        return { top: Math.round(r.top), height: Math.round(r.height), above: tabTop !== null && r.top < tabTop };
      }),
      tabTop: tabTop === null ? null : Math.round(tabTop),
    };
  }, PAGE);

async function run() {
  // Global setup, once, before any page gets a testing token — the bot-protection bypass
  // needs the frontend API URL and throws without it.
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: WIDTHS[0].viewport });
    const page = await context.newPage();
    await signIn(page);
    const hrefs = await findDeck(page);
    if (hrefs.length === 0) {
      report("a deck to walk", false, "this account owns no decks — the fixture is missing");
      return;
    }
    const { href, widest } = await pickWidestDeck(page, hrefs);
    // A NOTE rather than a pass: the run says plainly which row it measured, so a green over
    // the four-cell case is never read as a green over the five-cell one.
    console.log(
      widest
        ? `       (walking ${href} — it draws a Versions cell, so the row is at its widest)`
        : `       (NOTE: no deck of ${hrefs.length} draws a Versions cell — the FIVE-cell row is not measured)`,
    );
    await context.close();

    for (const { label, viewport } of WIDTHS) {
      const ctx = await browser.newContext({ viewport });
      const p = await ctx.newPage();
      await signIn(p);
      await p.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
      // A SWALLOWED WAIT IS HOW THE `off` RUN MEASURES NOTHING. With `.catch(() => {})` a page
      // that never rendered — a 500, a half-failed sign-in, the wrong port — yields no tabs, and
      // "no Analysis tab, as the flag says" then reports `absent` and passes. The failure is
      // reported instead, and the width is abandoned rather than asserted over.
      const tablist = await p
        .waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
      if (!report(`${label}px · the deck page rendered its tab row`, tablist,
          tablist ? "tablist is up" : "no tablist — the page did not render")) {
        await ctx.close();
        continue;
      }
      await p.waitForTimeout(800);

      const tabs = await readTabs(p);
      const analysisAt = tabs.findIndex((t) => /analysis/i.test(t.label) || /analysis/i.test(t.aria));

      // THE EXPECTATION DECIDES, not the page. See the header.
      if (EXPECT === "off") {
        report(`${label}px · no Analysis tab, as the flag says`, analysisAt === -1,
          analysisAt === -1 ? "absent" : `drawn at position ${analysisAt + 1}`);
        const strip = await readStrip(p);
        report(`${label}px · the mix strip stays in the spine`,
          strip.count === 1 && strip.sides[0]?.above === true,
          `${strip.count} strip(s), ${strip.sides[0]?.above ? "above" : "below"} the tabs`);
        await ctx.close();
        continue;
      }

      if (!report(`${label}px · the Analysis tab is drawn`, analysisAt !== -1,
          analysisAt === -1 ? "absent — is ANALYSIS_TAB_ENABLED set on this server?" : "present")) {
        await ctx.close();
        continue;
      }

      // SECOND, and measured rather than counted: a cell can be in the document and scrolled
      // off a phone's tab row, which is the failure Round 0's "fifth position" argument names.
      report(`${label}px · it is the SECOND cell`, analysisAt === 1,
        `position ${analysisAt + 1} of ${tabs.length}`);
      const first = tabs[0];
      const analysis = tabs[analysisAt];
      report(`${label}px · and it sits after the first cell`,
        analysis.w > 0 && analysis.x > first.x,
        `x=${analysis.x} w=${analysis.w}`);

      // THE CELLS THE FIFTH TAB PUSHES. Analysis is second and fits at any width by
      // construction; what a new cell can break is the far end of the row, and this row has no
      // scroller to absorb it.
      const last = tabs[tabs.length - 1];
      report(`${label}px · the whole row fits the viewport`,
        last.x + last.w <= viewport.width,
        `last cell ends at ${last.x + last.w} of ${viewport.width}`);

      // Before the press: the strip must not be in the spine, and the panel is not up yet.
      const before = await readStrip(p);
      report(`${label}px · the strip has LEFT the spine`,
        before.sides.every((s) => !s.above),
        `${before.count} strip(s) above the tabs: ${before.sides.filter((s) => s.above).length}`);

      await onPage(p, '[role="tab"]').nth(analysisAt).click();
      await p.waitForTimeout(600);

      const panel = await p.evaluate((scope) =>
        Boolean(document.querySelector(scope)?.querySelector("#panel-analysis")), PAGE);
      report(`${label}px · pressing it opens the Analysis panel`, panel,
        panel ? "panel-analysis is in the document" : "no panel");

      const after = await readStrip(p);
      // EXACTLY ONE. A build that draws the strip in the panel while leaving it in the spine
      // has paid none of the vertical the tab costs, and looks right in a screenshot of either.
      report(`${label}px · exactly one mix strip exists`, after.count === 1,
        `${after.count} strip(s)`);
      report(`${label}px · and it is below the tab row, in the panel`,
        after.count === 1 && after.sides[0]?.above === false,
        after.count === 1 ? `top ${after.sides[0].top} vs tabs ${after.tabTop}` : "not measurable");
      if (after.count === 1) {
        console.log(`       (the strip is ${after.sides[0].height}px — the vertical it vacated)`);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

await run();
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
