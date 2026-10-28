// measure:cuts-notice — a deck over 99: from pressing the Proposed cuts notice to the first scroll
// movement, to the tool's panel being in view, and to its content being drawn (CUTS_PRESS_PROBE, in the
// page). Median of MEASURE_RUNS (default 7) cold loads of the deck at 390x844 and 1300x900.
//
// Against `next start` on a scratch branch (never `next dev`), the server started with the Tuning hub's
// switches on (TUNING_ENABLED, TUNING_HUB_ENABLED, PROPOSED_CUTS_ENABLED, ANALYSIS_TAB_ENABLED). It writes
// nothing of its own; the pages it loads write what any visit writes, so it refuses production, staging and
// local-dev by `neon.branch_id`.
//
//   MEASURE_BASE=http://localhost:3411 MEASURE_DECK_ID=<deck id> pnpm measure:cuts-notice
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { PRODUCTION_BRANCH, STAGING_BRANCH, LOCAL_DEV_BRANCH } from "./lib/scratch-branch.mjs";
import { CUTS_PRESS_PROBE } from "./lib/press-probe.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, CLERK_SECRET_KEY, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.MEASURE_BASE ?? "http://localhost:3411";
const u = new URL(BASE);
if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "") throw new Error(`refusing MEASURE_BASE ${BASE}: a loopback server with a port only`);
if (!CLERK_SECRET_KEY.startsWith("sk_test_")) throw new Error("refusing: CLERK_SECRET_KEY is not a development instance's");
const RUNS = Number(process.env.MEASURE_RUNS ?? 7);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;

const [{ branch }] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
const refused = new Map([[PRODUCTION_BRANCH, "production"], [STAGING_BRANCH, "staging"], [LOCAL_DEV_BRANCH, "local-dev"]]);
if (!branch || refused.has(branch)) throw new Error(`refusing ${refused.get(branch) ?? "an unknown branch"} (${branch}): point DATABASE_URL at a scratch branch`);

const WIDTHS = [{ name: "390", width: 390, height: 844 }, { name: "1300", width: 1300, height: 900 }];
const median = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); return s.length ? Math.round(s[Math.floor(s.length / 2)]) : null; };

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
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) { return error?.errors?.[0]?.longMessage ?? String(error); }
  }, [EMAIL, PASSWORD ?? ""]);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

await clerkSetup({ secretKey: CLERK_SECRET_KEY });
const browser = await chromium.launch();
console.log(`branch ${branch}, ${RUNS} runs, ${BASE}`);
console.log("| width | press→scroll | press→panel in view | press→content | jump (px) | scrolled? |\n|---|---|---|---|---|---|");
for (const w of WIDTHS) {
  const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: false });
  const page = await context.newPage();
  await signIn(page);
  const samples = [];
  for (let i = 0; i < RUNS; i += 1) {
    await page.goto(`${BASE}/decks/${process.env.MEASURE_DECK_ID}`, { waitUntil: "load" });
    const press = page.locator('main button[aria-label="Proposed cuts"]:visible').first();
    await press.waitFor({ state: "visible", timeout: 30_000 });
    await page.waitForTimeout(1500);
    await page.evaluate(CUTS_PRESS_PROBE);
    await press.click();
    await page.waitForFunction(() => window.__cuts?.drew != null, null, { timeout: 30_000 }).catch(() => {});
    const s = await page.evaluate(() => ({ ...window.__cuts, y: Math.round(scrollY) }));
    if (s.at == null) continue;
    samples.push({ scroll: s.scroll != null ? s.scroll - s.at : null, shown: s.shown != null ? s.shown - s.at : null, drew: s.drew != null ? s.drew - s.at : null, jump: s.drewTop != null && s.shownTop != null ? Math.round(s.drewTop - s.shownTop) : null, y: s.y });
  }
  console.log(`| ${w.name} | ${median(samples.map((s) => s.scroll))} ms | ${median(samples.map((s) => s.shown))} ms | ${median(samples.map((s) => s.drew))} ms | ${median(samples.map((s) => s.jump))} | ${samples.filter((s) => s.scroll != null).length}/${samples.length} |`);
  console.log(`  raw ${w.name}: ${JSON.stringify(samples)}`);
  await context.close();
}
await browser.close();
