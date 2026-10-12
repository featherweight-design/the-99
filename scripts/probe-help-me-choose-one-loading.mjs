// probe:help-me-choose-one-loading — a read press on Help me choose shows the loading skeleton at most
// ONCE, in a real browser at 1300x900 and 390x844. Hugh saw loading, then the dimmed list under the
// reading panel, then loading AGAIN, then the results: the settled read remounted the results'
// Suspense. Per width it presses the credit press, samples the page every 40ms until the panel reads
// done, and fails when the skeleton (`results-searching`) returns after the list has drawn. It also
// checks the dimmed list was seen while reading (7d), and records a video of the press.
//
// Run it against a dev server with the stub held long enough to see the reading phase
// (`INTAKE_STUB_DELAY_MS=5000`, `HELP_ME_CHOOSE_ENABLED=true`). It writes reads to the server's
// database, so that must be local-dev or a scratch branch; it deletes the reads it made.
//
//   PROBE_TARGET_URL=<scratch> E2E_AUDIT_USER_EMAIL=... PROBE_BASE=http://localhost:3417 \
//     PROBE_VIDEO_DIR=<dir> node scripts/probe-help-me-choose-one-loading.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { PAGE } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, PROBE_TARGET_URL: TARGET } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "PROBE_TARGET_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const VIDEO = process.env.PROBE_VIDEO_DIR;
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(TARGET);

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

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
}

/** One sample of what the reader sees: the skeleton, the list, the panel's tag, and the dim. */
function sample(scope) {
  const root = document.querySelector(scope);
  return {
    skeleton: !!root?.querySelector("[data-testid='results-searching']"),
    list: !!root?.querySelector("[data-testid='order-line']"),
    phase: root?.querySelector("[data-testid='read-panel']")?.dataset.phase ?? null,
    dim: root?.querySelector("[data-testid='results-dim']")?.dataset.reading === "true",
  };
}

const readIds = new Set();
const markers = new Set();

/**
 * Proves the server reads PROBE_TARGET_URL before anything is pressed. A marker deck is written to
 * the target (already refused if it is staging or production) and the server must draw it; a server
 * on any other database draws no such deck, and the run stops having written nothing there.
 */
async function assertServerReadsTarget(page, userId) {
  const [any] = await sql`select commander_oracle_id from decks where user_id = ${userId} limit 1`;
  const [card] = any ? [any] : await sql`select oracle_id as commander_oracle_id from cards where type_line like 'Legendary Creature%' limit 1`;
  const name = `probe-one-loading ${Date.now()}`;
  const [{ id }] = await sql`insert into decks (user_id, name, commander_oracle_id) values (${userId}, ${name}, ${card.commander_oracle_id}) returning id`;
  markers.add(id);
  const res = await page.goto(`${BASE}/decks/${id}`, { waitUntil: "networkidle" });
  // In the document at all: a phone draws the name in one place and keeps the desktop's hidden.
  const drawn = res?.status() === 200 && (await page.getByText(name).count()) > 0;
  if (!drawn) throw new Error("the server does not draw a deck written to PROBE_TARGET_URL: it reads another database. Nothing was pressed.");
}
const SETTLED = new Set(["done", "nothing", "failed", "stopped"]);

async function run() {
  const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`probe:help-me-choose-one-loading refuses branch ${branch ?? "(unknown)"}; point PROBE_TARGET_URL at local-dev or a scratch branch.`);
  }
  await clerkSetup();
  const browser = await chromium.launch();
  let userId = null;
  try {
    for (const width of [1300, 390]) {
      const size = { width, height: width === 390 ? 844 : 900 };
      const context = await browser.newContext({ viewport: size, ...(VIDEO ? { recordVideo: { dir: VIDEO, size } } : {}) });
      const page = await context.newPage();
      await signIn(page);
      userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
      if (!userId) throw new Error("no signed-in user id");
      await assertServerReadsTarget(page, userId);
      await page.goto(`${BASE}/decks/new/choose`, { waitUntil: "networkidle" });
      await page.locator(`${PAGE} textarea`).fill(`big dumb lizards that stomp ${width} ${Date.now()}`);
      const t0 = Date.now();
      const timeline = [];
      await page.getByRole("button", { name: /^1 credit\. Find commanders/ }).first().click();
      let done = null;
      while (Date.now() - t0 < 60_000) {
        let s;
        try { s = await page.evaluate(sample, PAGE); } catch { continue; } // a navigation in flight
        const last = timeline.at(-1);
        if (!last || last.skeleton !== s.skeleton || last.list !== s.list || last.phase !== s.phase || last.dim !== s.dim) timeline.push({ ms: Date.now() - t0, ...s });
        if (done === null && SETTLED.has(s.phase) && s.list) done = Date.now();
        if (done !== null && Date.now() - done > 2_500) break;
        await page.waitForTimeout(40);
      }
      const r = new URL(page.url()).searchParams.get("r");
      if (r) readIds.add(r.toLowerCase());
      // Belt and braces: the read itself is in the target too.
      const [{ n }] = r ? await sql`select count(*)::int as n from intake_reads where id = ${r}::uuid` : [{ n: 0 }];
      if (n !== 1) throw new Error(`read ${r ?? "(none)"} is not in PROBE_TARGET_URL: the server writes to another database.`);
      const at = (s) => `${s} @ ${width}`;
      console.log(`  timeline @ ${width}: ${timeline.map((t) => `${t.ms}ms ${t.skeleton ? "SKELETON" : ""}${t.list ? "list" : ""}${t.dim ? "(dim)" : ""} ${t.phase ?? "-"}`).join(" | ")}`);
      const firstList = timeline.findIndex((t) => t.list);
      const back = firstList < 0 ? [] : timeline.slice(firstList).filter((t) => t.skeleton);
      report(at("the read settled"), done !== null, `final phase ${timeline.at(-1)?.phase}`);
      report(at("the dimmed list was drawn under the reading panel"), timeline.some((t) => t.list && t.dim), "");
      report(at("the skeleton never returns once the list has drawn"), firstList >= 0 && back.length === 0,
        back.length ? `skeleton again at ${back.map((t) => `${t.ms}ms`).join(", ")}` : "no second skeleton");
      await context.close();
      if (VIDEO) console.log(`  video @ ${width}: ${await page.video()?.path()}`);
    }
  } finally {
    await browser.close();
    if (markers.size > 0) await sql`delete from decks where id = any(${[...markers]}::uuid[])`;
    const ids = [...readIds];
    if (userId && ids.length > 0) {
      const calls = (await sql`select model_call_id from intake_reads where user_id = ${userId} and id = any(${ids}::uuid[])`).map((x) => x.model_call_id);
      await sql`delete from intake_read_stops where user_id = ${userId} and read_id = any(${ids}::uuid[])`;
      await sql`delete from intake_reads where user_id = ${userId} and id = any(${ids}::uuid[])`;
      if (calls.length > 0) await sql`delete from model_calls where user_id = ${userId} and id = any(${calls}::uuid[])`;
      console.log(`  cleaned up ${ids.length} read(s)`);
    }
  }
}

await run();
if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
