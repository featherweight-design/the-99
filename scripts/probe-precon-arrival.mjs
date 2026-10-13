// probe:precon-arrival — the precon list's art arrives in reading order, row by row, top down, in a real
// browser at 1300x900 and 390x844, in both its views (tiles and rows).
//
// Every piece of art that fades in (`data-arrival` turning `in`) is stamped with the page-relative top of its box
// at that moment; reading the stamps in release order, an INVERSION is a pair where a later release sits more
// than 4px (the queue's row tolerance) ABOVE an earlier one: a lower row faded in before an upper one. The queue
// (`ui/arrival-queue.tsx`) lets a lower row go early only at its cap, so the count is what the cap costs.
//
// Rows are what the small-art cap fixes (`ARRIVAL_SMALL_CAP_MS`). Measured 2026-10-13 with the view named in the
// address (`?view=`), inversions / pairs over 3 runs a batch: deployed staging before the cap (80ms) rows 1300
// 15/234, rows 390 7/135, tiles 1300 0/570, tiles 390 4/84; a local production build with the cap (1,000ms) rows
// 1300 0/234 and 0/234, rows 390 0/135, tiles 1300 0/570 and 0/570, tiles 390 6/84 and 0/84. TILES keep the
// first-screen cap that Hugh's LCP ruling set (80ms), so a slow first row is let go past: 0 inversions in most
// runs and a few pairs in some, before and after, which is why the tiles' bar is looser than the rows'. (An
// earlier version of this probe set the view in storage, which applies only after hydration, so its rows
// samples mixed both layouts; its figures are not comparable and are not quoted.)
//
// Needs PRECONS_ENABLED=true and a database holding the precons (`pnpm db:seed:precons`). Reads only.
//   local:  PROBE_BASE=http://localhost:3612 pnpm probe:precon-arrival      (a `next start`, local-dev)
//   staging: MEASURE_DEPLOYED=1 PROBE_BASE=https://staging.the-99.dev pnpm probe:precon-arrival
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertDeployedBase, lookupUserId, mintSignInToken } from "./lib/measure-deployed.mjs";

const DEPLOYED = process.env.MEASURE_DEPLOYED === "1";
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const RUNS = Math.max(1, Number(process.env.PROBE_RUNS ?? 3));
/** The queue's own row tolerance: boxes whose tops are this close are one row. */
const ROW_PX = 4;
const CASES = [[1300, 900, "tiles"], [390, 844, "tiles"], [1300, 900, "rows"], [390, 844, "rows"]];
/** Rows may not lose more than this share of their pairs to the cap (measured 0 at 1,000ms); tiles, still on the LCP caps, more. */
const ROWS_MAX_SHARE = Number(process.env.PROBE_ROWS_MAX_SHARE ?? 0.01);
const TILES_MAX_SHARE = Number(process.env.PROBE_TILES_MAX_SHARE ?? 0.08);

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

let EMAIL, PASSWORD, SECRET, AUDIT;
if (DEPLOYED) {
  assertDeployedBase(BASE);
  ({ THE_99_CLERK_SECRET_KEY_STAGING: SECRET, THE_99_E2E_AUDIT_USER_EMAIL: AUDIT } = requireEnv(["THE_99_CLERK_SECRET_KEY_STAGING", "THE_99_E2E_AUDIT_USER_EMAIL"]));
} else {
  ({ E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]));
  PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
  if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
}
async function signInLocal(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test") ? await signIn.create({ identifier: email }) : await signIn.create({ identifier: email, password });
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
  return page.evaluate(() => window.Clerk.user?.id ?? null);
}
async function signInDeployed(page) {
  const expected = await lookupUserId(SECRET, AUDIT);
  const ticket = await mintSignInToken(SECRET, expected);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  await page.evaluate(async (t) => {
    const a = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket: t });
    if (a.status !== "complete") throw new Error(`sign-in status ${a.status}`);
    await window.Clerk.setActive({ session: a.createdSessionId });
  }, ticket);
}
const signIn = (page) => (DEPLOYED ? signInDeployed(page) : signInLocal(page));

/** Armed before the document: every art `data-arrival` turning `in`, with its page-relative top at that moment. */
const OBSERVE = () => {
  const log = [];
  window.__arrivals = log;
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.attributeName === "data-arrival" && m.target.dataset.arrival === "in") {
        log.push(Math.round(m.target.getBoundingClientRect().top + window.scrollY));
      }
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-arrival"] });
};

function inversions(tops) {
  let bad = 0;
  let pairs = 0;
  for (let a = 0; a < tops.length; a += 1) {
    for (let b = a + 1; b < tops.length; b += 1) {
      pairs += 1;
      if (tops[b] < tops[a] - ROW_PX) bad += 1;
    }
  }
  return { bad, pairs };
}

const browser = await chromium.launch();
try {
  if (!DEPLOYED) await clerkSetup();
  for (const [width, height, view] of CASES) {
    let bad = 0;
    let pairs = 0;
    const per = [];
    for (let run = 0; run < RUNS; run += 1) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      try {
        await signIn(page);
        await page.addInitScript(OBSERVE);
        // The view is named in the address, so the server and the hydrated client draw the same layout from the
        // first paint: a stored view applies only after hydration, and the observer would sample both layouts.
        await page.goto(`${BASE}/decks/precons?view=${view}`, { waitUntil: "load" });
        await page.waitForSelector("main img", { timeout: 30_000 });
        await page.waitForTimeout(6000);
        const tops = await page.evaluate(() => window.__arrivals);
        const r = inversions(tops);
        bad += r.bad;
        pairs += r.pairs;
        per.push(`${r.bad}/${r.pairs}`);
      } finally {
        await context.close();
      }
    }
    const share = pairs === 0 ? 0 : bad / pairs;
    const tag = `${view} @${width}`;
    report(`${tag}: art arrives top down`, pairs > 0 && share <= (view === "tiles" ? TILES_MAX_SHARE : ROWS_MAX_SHARE), `${bad} of ${pairs} pairs out of order (${(share * 100).toFixed(1)}%; per run ${per.join(", ")})`);
  }
} catch (error) {
  console.error(error);
  failures += 1;
} finally {
  await browser.close();
}
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
