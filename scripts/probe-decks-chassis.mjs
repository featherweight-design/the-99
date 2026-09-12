// Gate for the filter chassis on `/decks`. JSDOM applies no CSS and lays nothing
// out, so the unit tests can assert which classes a row carries but never the
// three things this round actually promises:
//
//   1. The sidebar is gone and the grid took its width.
//   2. Row 1 never wraps — at 1000px, at 1440px, and at the phone width.
//   3. Row 2 does not change height when the first filter goes on, which is the
//      invariant the whole frame rests on and the one three separate defects
//      have already broken.
//
// Anchored to structure (`[data-chassis-*]`), never to pixel positions, and it
// is expected to be wrong before the build is.
//
// Run by hand, like its siblings:
//   node scripts/probe-decks-chassis.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

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
          // Named here rather than left to Clerk: an undefined emailAddressId
          // fails inside prepareFirstFactor with an error that says nothing
          // about the account being unable to take a code.
          if (!factor?.emailAddressId) {
            const offered = (attempt.supportedFirstFactors ?? []).map((f) => f.strategy).join(", ");
            return `${email} offers no usable email_code first factor (offered: ${offered || "none"}). The probe user must be a +clerk_test address.`;
          }
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


const WIDTHS = [
  { name: "phone", width: 390, height: 900, wide: false },
  { name: "at-the-switch", width: 1000, height: 900, wide: true },
  { name: "desktop", width: 1440, height: 900, wide: true },
];

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

async function measure(page) {
  return page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    const controls = q("[data-chassis-row='controls']");
    const chips = q("[data-chassis-row='chips']");
    const grid = document.querySelector("ul");
    if (!controls || !chips) return null;
    // Measure the CONTROLS, not the row's three structural children. The
    // leading group, the hairline and the sort wrapper have deliberately
    // different heights, so their `top` values differ even on one line — the
    // first version of this probe compared those and could both fail a correct
    // row and pass a wrapped one. What wraps is a control inside the leading
    // group, so that is what gets measured, with the sort trigger alongside it.
    const leading = controls.firstElementChild;
    const trailing = controls.lastElementChild;
    const items = [...(leading?.children ?? []), ...(trailing?.children ?? [])];
    // Centres, not tops: two controls of different heights on one line share a
    // centre and not a top.
    const centres = items.map((c) => {
      const r = c.getBoundingClientRect();
      return Math.round(r.top + r.height / 2);
    });
    // Tolerate a pixel of rounding, then count distinct lines.
    const lineSet = centres.reduce((acc, y) => {
      if (!acc.some((seen) => Math.abs(seen - y) <= 2)) acc.push(y);
      return acc;
    }, []);
    const tops = lineSet;
    return {
      lines: tops.length,
      controlCount: items.length,
      chipsHeight: Math.round(chips.getBoundingClientRect().height),
      gridWidth: grid ? Math.round(grid.getBoundingClientRect().width) : null,
      hasColumn: Boolean(q("[data-filter-column]")),
      hasHairline: Boolean(q("[data-chassis-hairline]")),
      form: q("[data-chassis-form]")?.getAttribute("data-chassis-form") ?? null,
    };
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: WIDTHS[2] });
await clerkSetup({ publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY });
await signIn(page);

for (const vp of WIDTHS) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-chassis-row='controls']", { timeout: 15_000 });

  const before = await measure(page);
  if (!before) { failures.push(`${vp.name}: no chassis on /decks`); continue; }

  check(!before.hasColumn, `${vp.name}: the filter sidebar is still in the DOM`);
  check(before.hasHairline, `${vp.name}: sort is not separated by a hairline`);
  check(before.lines === 1, `${vp.name}: the control row wrapped onto ${before.lines} lines`);
  check(
    before.controlCount > 0,
    `${vp.name}: measured no controls — the probe is anchored to the wrong element`,
  );
  check(
    before.form === (vp.wide ? "wide" : "compact"),
    `${vp.name}: form is ${before.form}, expected ${vp.wide ? "wide" : "compact"}`,
  );

  // Turn one filter on and re-measure. The chip row must not move the grid.
  await page.goto(`${BASE}/decks?status=Draft`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-chassis-row='chips']", { timeout: 15_000 });
  const after = await measure(page);
  check(
    after.chipsHeight === before.chipsHeight,
    `${vp.name}: the chip row grew from ${before.chipsHeight}px to ${after.chipsHeight}px when a filter went on`,
  );
  check(after.lines === 1, `${vp.name}: the control row wrapped with a filter on`);

  await page.screenshot({ path: `/tmp/probe-decks-chassis-${vp.name}.png`, fullPage: false });
  console.log(
    `${vp.name.padEnd(14)} form=${before.form} controls=${before.controlCount} lines=${before.lines} chips=${before.chipsHeight}px grid=${before.gridWidth}px`,
  );
}

await browser.close();
if (failures.length) {
  console.error("\nFAIL");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log("\nPASS — sidebar gone, row 1 unwrapped at every width, chip row height held.");
