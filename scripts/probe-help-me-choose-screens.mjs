// probe:help-me-choose-screens — the Help me choose results at 1300x900 and 390x844, reading
// what jsdom cannot lay out.
//
//   1. The first page draws at most twelve candidates (best fits included), and draws some: a run over an empty page
//      measures nothing and FAILS.
//   2. Every row's trial settles: each ownership line leaves `pending` for `ready` or
//      `failed` within a minute. A row left pending is a batch that never answered.
//   3. No `·` is the first or the last box on its line (the commander row's rule, read by
//      geometry). Each segment leads with its own separator inside a clipped gutter, so the one
//      that would start a line is clipped away. It was once left at a line's end, then at a line's
//      head in every best-fit tile.
//   4. No row overflows its own box or the page.
//   5. Nothing moves (the STATES invariant): no running animation once the page settles.
//   6. Find commanders, Change answers and Start over, each pressed.
//
// Needs a server with HELP_ME_CHOOSE_ENABLED=true. It makes no writes. Point it at local-dev.
//
//   E2E_AUDIT_USER_EMAIL=... PROBE_BASE=http://localhost:3210 node scripts/probe-help-me-choose-screens.mjs
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

const ROUTES = [
  ["theme", "/decks/new/choose?w=dinosaurs+that+stomp%2C+lots+of+little+tokens+under+%24200&v=submit"],
  ["owned", "/decks/new/choose?c=g&v=results"],
];

const READ = (scope) => {
  const root = document.querySelector(scope) ?? document.body;
  const rows = [...root.querySelectorAll("[data-testid='result-row']")];
  const lines = [...root.querySelectorAll("[data-testid='ownership-line']")];
  const main = root.getBoundingClientRect();
  // A separator is either wholly inside the line's box, with a segment before it on its own line,
  // or wholly in the clipped gutter left of it. Never the first box drawn on a line, never partly
  // cut, and never the last (each one leads an unbreakable segment, checked by what follows it).
  const dangling = [];
  let seps = 0;
  for (const line of lines) {
    // Hit-testing needs the line on screen. A clipped separator is not hit, so the browser, not the
    // geometry, says whether it is painted: a gutter left unclipped still paints, outside the box.
    line.scrollIntoView({ block: "center" });
    const box = line.getBoundingClientRect();
    const segs = [...line.querySelectorAll("[data-sep]")].map((el) => ({ el, sep: el.getBoundingClientRect(), seg: el.parentElement.getBoundingClientRect() }));
    for (const { el, sep, seg } of segs) {
      seps += 1;
      // Every layer at the point, not the top one: the row's own link is stretched over it.
      const painted = document.elementsFromPoint(sep.left + sep.width / 2, sep.top + sep.height / 2).includes(el);
      if (!painted) {
        // Clipped away, which is right only for the segment that starts its line.
        if (sep.right > box.left + 0.5) dangling.push(`hidden inside the line at x ${sep.left.toFixed(0)}`);
        continue;
      }
      if (sep.left < box.left - 0.5) { dangling.push(`painted outside the line at x ${sep.left.toFixed(0)}`); continue; }
      const before = segs.some((o) => Math.abs(o.seg.top - sep.top) < 6 && o.seg.right <= sep.left + 1 && o.seg.right > box.left + 1);
      if (!before) dangling.push(`first on its line at x ${sep.left.toFixed(0)}`);
      // Its content may be a bare text node, so the segment's own box says whether anything follows.
      if (seg.right <= sep.right + 1 || seg.bottom - seg.top > (sep.bottom - sep.top) * 1.8) dangling.push("last on its line");
    }
  }
  const overflow = rows
    .map((r) => { const b = r.getBoundingClientRect(); return { over: r.scrollWidth - r.clientWidth, right: b.right - main.right }; })
    .filter((o) => o.over > 1 || o.right > 1);
  return {
    rows: rows.length,
    states: lines.map((l) => l.dataset.trial),
    dangling,
    seps,
    overflow,
    animations: document.getAnimations().filter((a) => a.playState === "running").length,
  };
};

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    for (const width of [1300, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
      const page = await context.newPage();
      await signIn(page);
      for (const [name, url] of ROUTES) {
        await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
        await page.locator(`${PAGE} [data-testid='result-row']`).first().waitFor({ state: "attached", timeout: 90_000 });
        const settled = await page
          .waitForFunction(
            (scope) => [...(document.querySelector(scope) ?? document).querySelectorAll("[data-testid='ownership-line']")]
              .every((l) => l.dataset.trial !== "pending"),
            PAGE,
            { timeout: 60_000, polling: 500 },
          )
          .then(() => true, () => false);
        await page.waitForTimeout(500);
        const r = await page.evaluate(READ, PAGE);
        const at = `${name} @ ${width}`;
        // The best fits are rows of the same page: twelve candidates in all, counted by ownership line.
        report(`${at}: the first page draws 1 to 12 candidates`, r.states.length > 0 && r.states.length <= 12, `${r.states.length} candidates, ${r.rows} under the best fits`);
        const tally = r.states.reduce((m, s) => ({ ...m, [s]: (m[s] ?? 0) + 1 }), {});
        report(`${at}: every trial settles`, settled && !r.states.includes("pending"), JSON.stringify(tally));
        report(`${at}: no separator starts or ends a line`, r.seps > 0 && r.dangling.length === 0, r.dangling.length ? r.dangling.slice(0, 3).join("; ") : `${r.seps} separators on ${r.states.length} lines`);
        report(`${at}: no row overflows`, r.overflow.length === 0, r.overflow.length ? JSON.stringify(r.overflow.slice(0, 3)) : "none");
        report(`${at}: nothing moves`, r.animations === 0, `${r.animations} running animation(s)`);
      }
      // 6. The three presses, as a player makes them (plan, PR 5 gates): Find commanders lands on
      //    the results with the words resolved, Change answers returns the form holding them, and
      //    Start over returns it blank. Pressed, never reached by address.
      {
        const at = `presses @ ${width}`;
        const findButton = () => page.locator(`${PAGE} button:visible`, { hasText: "Find commanders" }).first();
        // Idle first: typed before hydration, the box shows the words and the form's state holds
        // none, so the press submits a blank form. That is the probe racing React, not the app.
        await page.goto(`${BASE}/decks/new/choose`, { waitUntil: "networkidle" });
        await page.locator(`${PAGE} textarea`).fill("dinosaurs that stomp");
        await findButton().click();
        await page.locator(`${PAGE} [data-testid='order-line']`).waitFor({ timeout: 90_000 });
        const landed = new URL(page.url());
        report(`${at}: Find commanders lands on the results with the words resolved`,
          landed.searchParams.get("v") === "results" && (landed.searchParams.get("t") ?? "").includes("dinosaurs"),
          landed.search);
        await page.locator(`${PAGE} a:visible`, { hasText: "Change answers" }).first().click();
        await page.locator(`${PAGE} textarea`).waitFor({ timeout: 60_000 });
        const kept = await page.locator(`${PAGE} textarea`).inputValue();
        report(`${at}: Change answers returns the form holding the words`, kept === "dinosaurs that stomp", JSON.stringify(kept));
        await findButton().click();
        await page.locator(`${PAGE} [data-testid='order-line']`).waitFor({ timeout: 90_000 });
        await page.locator(`${PAGE} a:visible`, { hasText: "Start over" }).first().click();
        await page.waitForURL((u) => u.pathname === "/decks/new/choose" && u.search === "", { timeout: 60_000 });
        await page.locator(`${PAGE} textarea`).waitFor({ timeout: 60_000 });
        const blank = await page.locator(`${PAGE} textarea`).inputValue();
        report(`${at}: Start over returns the form blank`, blank === "", JSON.stringify(blank));
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
