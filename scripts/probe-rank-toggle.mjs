// Gate 2 for #43 Task 6: the `Build from` toggle, driven rather than read.
//
// Four things a component test cannot settle, because each of them is a fact
// about the real page rather than about a render:
//
//   1. The desktop toolbar is now three controls wide. It fits at 1300px or it
//      does not, and #227's decklist-row width contest is the warning.
//   2. Filtering must NOT renumber; a re-rank MUST. Both invariants are about
//      numerals drawn down a page, so both want the numerals read back.
//   3. The mode must survive the next colour pip click, and the flip must not
//      navigate: both rankings ship in one render, so the page keeps its
//      identity across the toggle. A reload here is the regression (#285).
//   4. The receipt line renders in BOTH modes, so the second clause has to be
//      visible under `All my cards`, which is the view most players never
//      leave.
//
// Run by hand: `node scripts/probe-rank-toggle.mjs`. Not part of `pnpm test` —
// it needs a browser and a signed-in session. Set PROBE_BASE if dev is not on
// 3000.
//
// To force the degraded read, make `loadAvailability` throw for the length of
// the run. That seam is deliberately NOT committed: it would be a test hook on
// a production path, and this probe reports the disabled segment clearly enough
// that a temporary two-line edit is the cheaper trade.
//
// A caveat that cost a full diagnosis pass: `commander_scores` is invalidated
// only by a CONFIRMED CSV upload, so a fixture account seeded by direct SQL
// serves a `colorPoolSize` computed against a collection it no longer has. The
// receipt then reads `20 of your cards fit · 117 already in use`, which looks
// like a bug in the two clauses and is not one. If the numbers contradict each
// other, check `csv_uploads` for that user before touching the code.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole, openSheet } from "./lib/surface.mjs";

// Mirrored from `src/components/ui/filter-chassis.tsx`, which a .mjs probe
// cannot import. Kept as a named constant so the next reader sees what it is.
const CHASSIS_WIDE_MIN_PX = 1000;

// CLERK_SECRET_KEY is asserted but not bound: `clerkSetup()` reads it from the
// environment itself.
const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } =
  requireEnv([
    "E2E_AUDIT_USER_EMAIL",
    "E2E_AUDIT_USER_PASSWORD",
    "CLERK_SECRET_KEY",
  ]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
];

// Lifted verbatim from `scripts/probe-availability-ui.mjs`, which documents at
// length why the hosted portal cannot be driven unattended and `window.Clerk` can.
async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, {
    timeout: 30_000,
  });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find(
            (f) => f.strategy === "email_code",
          );
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor?.emailAddressId,
          });
          attempt = await signIn.attemptFirstFactor({
            strategy: "email_code",
            code: "424242",
          });
        }
        if (attempt.status !== "complete")
          return `sign-in status: ${attempt.status}`;
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

// The rank numeral drawn on each visible row, in page order. This is the whole
// evidence for both numbering invariants, so it reads the DOM rather than a
// prop: a numeral that is correct in state and wrong on screen is the bug.
async function ranks(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("li")]
      .filter((li) => !li.querySelector("button[aria-label^='Show ']"))
      .map((li) => {
        const m = (li.textContent ?? "").match(/^\s*(\d+)/);
        return m ? Number(m[1]) : null;
      })
      .filter((n) => n !== null),
  );
}

// The numerals alone cannot show a re-rank — they read 1..N in both modes,
// which is the invariant, not the evidence. The ORDER OF NAMES is the evidence.
async function order(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("li a[href^='/commanders/']")]
      .map((a) => a.getAttribute("href"))
      .filter((h, i, all) => all.indexOf(h) === i)
      .slice(0, 6),
  );
}

async function receipts(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("p")]
      .map((n) => (n.textContent ?? "").trim())
      .filter((t) => /of your cards (fit|are free|is free)/.test(t))
      .slice(0, 4),
  );
}

async function toolbar(page) {
  return page.evaluate(() => {
    const group = [...document.querySelectorAll("[role='radiogroup']")]
      .map((n) => {
        const r = n.getBoundingClientRect();
        return {
          w: Math.round(r.width),
          h: Math.round(r.height),
          top: Math.round(r.top),
        };
      })
      .filter((b) => b.w > 0);
    return {
      group,
      docOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

async function segments(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("[role='radio']")].map((n) => ({
      label: n.getAttribute("aria-label"),
      checked: n.getAttribute("aria-checked"),
      disabled: n.getAttribute("aria-disabled"),
      line: getComputedStyle(n).textDecorationLine,
    })),
  );
}

// `free` ranking only, and only where the score moved. A run that reports none
// is not automatically a pass — it may mean nothing the player owns is claimed.
async function deltas(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("span, p")]
      .map((n) => (n.textContent ?? "").trim())
      .filter((t) => /^↓\d+( from \d+)?$/.test(t))
      .slice(0, 6),
  );
}

const subtitle = (page) =>
  page.evaluate(
    () => document.querySelector("p.font-mono")?.textContent?.trim() ?? null,
  );

const live = (page) =>
  page.evaluate(
    () =>
      document.querySelector("[aria-live='polite']")?.textContent?.trim() ??
      null,
  );

await clerkSetup();
const browser = await chromium.launch();

// Everything past the launch runs inside a `finally`. The control check below is
// deliberately fatal, and a throw between here and `browser.close()` left the
// browser and its contexts alive — the probe hung on exactly the failure the
// guard exists to report.
try {
  for (const { label, width, height } of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await signIn(page);
    console.log(`\n########## ${label}`);

    // Opened in FREE mode, because the flip below is to `All my cards` and every
  // assertion after it is labelled `(all)`. Visiting the default and then
  // clicking the default's own segment is a no-op: the click lands on the radio
  // that is already checked, nothing re-ranks, and the twelve readings past it
  // describe the state the page loaded in. That was true before this rename too
  // — the old locator simply matched nothing and skipped instead.
  await page.goto(`${BASE}/commanders?a=free`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);

    const bar = await toolbar(page);
    console.log(`  toolbar: ${JSON.stringify(bar)}`);
    for (const s of await segments(page))
      console.log(`  segment: ${JSON.stringify(s)}`);
    console.log(`  ranks (default):    ${JSON.stringify(await ranks(page))}`);
    console.log(`  order (default):    ${JSON.stringify(await order(page))}`);
    console.log(
      `  receipts (default): ${JSON.stringify(await receipts(page))}`,
    );
    console.log(
      `  subtitle:           ${JSON.stringify(await subtitle(page))}`,
    );
    console.log(
      `  order line present: ${await onPage(page, "*").getByText("Order: Fit ↓ · fixed").count()}`,
    );

    // A colour filter hides rows and leaves a GAP: the numerals are global Fit
    // ranks and mean nothing if they renumber under a filter.
    const pip = onPageRole(page, "switch", /^White$/).first();
    if ((await pip.count()) > 0) {
      await pip.click();
      await page.waitForTimeout(1200);
      console.log(`  ranks (filtered):   ${JSON.stringify(await ranks(page))}`);
      console.log(`  url after filter:   ${page.url()}`);
      await pip.click();
      await page.waitForTimeout(1200);
    }

    // The flip, away from the default. Unlike the filter this changes the score,
    // so the numerals MUST move, the window MUST reset, and the live region MUST
    // say so — all without a navigation, which the stamp below is the evidence for.
    await page.evaluate(() => {
      window.__probeStamp = true;
    });
    // Below the chassis's wide breakpoint the owned lane's controls live in the
    // filter sheet, which renders null until the trigger is pressed — so on the
    // phone this locator matched nothing whatever it was called, and every
    // assertion past it was skipped on one of the two widths this probe advertises.
    // Opening the sheet first is what makes the compact run measure the flip.
    //
    // The figure is `CHASSIS_WIDE_MIN_PX` from `filter-chassis.tsx`, not a round
    // 1024: between 1000 and 1023 the rack is already wide and mounts no sheet, so
    // a probe that guessed would open a sheet that does not exist.
    if (width < CHASSIS_WIDE_MIN_PX) await openSheet(page);

    // Through `onPageRole`, never `page.getByRole`: the shell mounts its own
    // controls before `<main>`, and `scripts/lib/surface.mjs` is the single
    // definition of what "the page" means.
    //
    // A MISS IS FATAL. This read `/everything you own/` — the name the control
    // carried before the 2026-09-14 rename — and a locator that finds nothing
    // simply logged a line and fell through, so the twelve checks below stopped
    // running while the probe went on printing a successful-looking run. A rename
    // cannot be allowed to quietly disable a check.
    const other = onPageRole(page, "radio", /all my cards/i).first();
    if ((await other.count()) === 0) {
      throw new Error(
        "No `All my cards` segment on /commanders. The control was renamed out from under this probe, " +
          "and everything below this line measures the flip.",
      );
    } else {
      await other.click();
      await page.waitForTimeout(2500);
      console.log(`  url after flip:     ${page.url()}`);
      console.log(
        `  survived flip (no reload): ${await page.evaluate(() => window.__probeStamp === true)}`,
      );
      console.log(`  ranks (all):        ${JSON.stringify(await ranks(page))}`);
      console.log(`  order (all):        ${JSON.stringify(await order(page))}`);
      console.log(
        `  receipts (all):     ${JSON.stringify(await receipts(page))}`,
      );
      console.log(
        `  deltas (all):       ${JSON.stringify(await deltas(page))}`,
      );
      console.log(`  announced:          ${JSON.stringify(await live(page))}`);
      console.log(
        `  subtitle:           ${JSON.stringify(await subtitle(page))}`,
      );
      for (const s of await segments(page))
        console.log(`  segment: ${JSON.stringify(s)}`);

      // The serializeParams trap: the mirror effect runs on every pip click, and a
      // colours-only version drops the mode right here.
      if ((await pip.count()) > 0) {
        await pip.click();
        await page.waitForTimeout(1500);
        console.log(`  url after pip in all mode: ${page.url()}`);
      }
    }

    await context.close();
  }
} finally {
  await browser.close();
}
