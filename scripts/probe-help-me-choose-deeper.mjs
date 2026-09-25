// probe:help-me-choose-deeper — the deeper look's panel in a real browser at 1300x900 and 390x844,
// against the stub (`INTAKE_STUB=wider`, which adds the Tokens theme, and
// `INTAKE_STUB_DELAY_MS=4000`, which holds each reply long enough to press Stop). Per width:
//
//   1. The offer: one credit named first in the button's accessible name, inside the bar.
//   2. A Stop pressed while the look runs: the panel returns to the offer, the results un-dim, and
//      the ledger holds NO spent unit for it. Pressed, never simulated.
//   3. A delivered look: the address names the read (`r`) and marks what it added (`d`), the panel
//      reads done with no second press, the added chip is drawn DASHED (a resolved style, which a
//      class list cannot prove), and the ledger holds exactly one spent unit.
//   4. Nothing moves, and the panel stays inside its bar.
//
// It reads the ledger, so it needs the database the server uses, and it deletes the intake rows it
// made, by the read ids it saw (each Stop's body and each delivered address), in a `finally`. That database must be local-dev or a scratch branch: it refuses staging
// and production, and a branch it cannot read.
//
//   PROBE_TARGET_URL=<scratch> E2E_AUDIT_USER_EMAIL=... PROBE_BASE=http://localhost:3220 \
//     node scripts/probe-help-me-choose-deeper.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { PAGE } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, PROBE_TARGET_URL: TARGET } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "PROBE_TARGET_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
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

const WORDS = "dinosaurs that stomp";
const panel = (page) => page.locator(`${PAGE} [data-testid='deeper-look']`);
const phase = (page) => panel(page).getAttribute("data-phase");
// Scoped to the signed-in fixture account: another account's presses during the run neither move
// these counts nor get deleted by the cleanup.
const players = new Set();
// The reads this run made, by id: each Stop's body names one, and a delivered look's address names
// another. Cleanup deletes exactly these, so a session sharing the account keeps its own rows.
const readIds = new Set();
const units = async (since, userId) =>
  (await sql`select status, count(*)::int as n from model_calls where feature = 'intake' and user_id = ${userId} and created_at >= ${since} group by status`)
    .reduce((m, r) => ({ ...m, [r.status]: r.n }), {});

// Words of its own per width: an ask already read is answered from the store, uncharged, and the
// second width would otherwise measure that rather than a look.
async function toResults(page, width) {
  await page.goto(`${BASE}/decks/new/choose`, { waitUntil: "networkidle" });
  await page.locator(`${PAGE} textarea`).fill(`${WORDS} ${width} ${Date.now()}`);
  await page.locator(`${PAGE} button:visible`, { hasText: "Find commanders" }).first().click();
  await panel(page).waitFor({ timeout: 90_000 });
  // The bar draws before the results stream in: wait for the rows, or the look dims a skeleton.
  await page.locator(`${PAGE} [data-testid='order-line']`).waitFor({ timeout: 90_000 });
}

async function run() {
  const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`probe:help-me-choose-deeper refuses branch ${branch ?? "(unknown)"}; point PROBE_TARGET_URL at local-dev or a scratch branch.`);
  }
  const [{ t0 }] = await sql`select now() as t0`;
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    for (const width of [1300, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
      const page = await context.newPage();
      await signIn(page);
      const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
      if (!userId) throw new Error("no signed-in user id to scope the ledger to");
      players.add(userId);
      page.on("request", (req) => {
        if (!req.url().endsWith("/decks/new/choose/stop") || req.method() !== "POST") return;
        try { const id = JSON.parse(req.postData() ?? "{}").readId; if (typeof id === "string") readIds.add(id.toLowerCase()); } catch {}
      });
      const at = (s) => `${s} @ ${width}`;

      // 1. The offer.
      await toResults(page, width);
      const button = page.locator(`${PAGE} button`, { hasText: "Look deeper" });
      report(at("the offer names one credit first"), (await button.getAttribute("aria-label")) === "1 credit. Look deeper." && (await phase(page)) === "offer",
        `${await button.getAttribute("aria-label")} / ${await phase(page)}`);
      const inside = await page.evaluate((scope) => {
        const p = document.querySelector(`${scope} [data-testid='deeper-look']`);
        const bar = p?.closest("section");
        if (!p || !bar) return null;
        const a = p.getBoundingClientRect();
        const b = bar.getBoundingClientRect();
        return a.left >= b.left - 0.5 && a.right <= b.right + 0.5 && p.scrollWidth <= p.clientWidth + 1;
      }, PAGE);
      report(at("the panel sits inside the bar and does not overflow"), inside === true, String(inside));

      // 2. Stop while it runs.
      const beforeStop = await units(t0, userId);
      await button.click();
      await page.waitForFunction((scope) => document.querySelector(`${scope} [data-testid='deeper-look']`)?.dataset.phase === "looking", PAGE);
      const dimmed = await page.locator(`${PAGE} [data-testid='results-dim']`).getAttribute("data-looking");
      // The rows dim and the labels do not: read as resolved opacity, which a class cannot prove.
      const dimRead = await page.evaluate((scope) => {
        const root = document.querySelector(scope);
        const rows = [...root.querySelectorAll("ol[data-dim]")].map((el) => getComputedStyle(el).opacity);
        const heads = [...root.querySelectorAll("[data-testid='order-line'], #best-fits")].map((el) => getComputedStyle(el).opacity);
        return { rows, heads };
      }, PAGE);
      await page.locator(`${PAGE} button`, { hasText: "Stop" }).click();
      await page.waitForFunction((scope) => document.querySelector(`${scope} [data-testid='deeper-look']`)?.dataset.phase === "offer", PAGE, { timeout: 30_000 });
      await page.waitForTimeout(6_000); // let the held reply land and settle, so the ledger is final
      const afterStop = await units(t0, userId);
      report(at("a Stop while it runs returns the offer and un-dims the results"),
        dimmed === "true" && (await page.locator(`${PAGE} [data-testid='results-dim']`).getAttribute("data-looking")) === null,
        `dimmed while looking: ${dimmed}`);
      report(at("while it looks the rows dim to 0.45, and the order line and labels do not"),
        dimRead.rows.length > 0 && dimRead.rows.every((o) => o === "0.45") && dimRead.heads.length > 0 && dimRead.heads.every((o) => o === "1"),
        JSON.stringify(dimRead));
      report(at("and spends nothing"), (afterStop.spent ?? 0) === (beforeStop.spent ?? 0) && !afterStop.reserved,
        `before ${JSON.stringify(beforeStop)}, after ${JSON.stringify(afterStop)}`);

      // 3. A delivered look.
      await button.click();
      await page.waitForURL((u) => u.searchParams.has("r"), { timeout: 60_000 });
      await panel(page).waitFor();
      const url = new URL(page.url());
      if (url.searchParams.get("r")) readIds.add(url.searchParams.get("r").toLowerCase());
      const deeperChip = page.locator(`${PAGE} [data-testid='answer-chip'][data-deeper]`);
      const chipStyle = (await deeperChip.count()) === 1
        ? await deeperChip.evaluate((el) => ({ style: getComputedStyle(el).borderTopStyle, text: el.textContent }))
        : null;
      report(at("a delivered look names its read and marks what it added"),
        (url.searchParams.get("d") ?? "").split(",").includes("t:tokens") && (await phase(page)) === "done"
          && (await page.locator(`${PAGE} [data-testid='results-dim']`).getAttribute("data-looking")) === null,
        `d=${url.searchParams.get("d")} phase ${await phase(page)}`);
      report(at("the added chip is drawn dashed, and tagged"), chipStyle?.style === "dashed" && /Tokens.*deeper/.test(chipStyle.text ?? ""),
        JSON.stringify(chipStyle));
      report(at("offered once: no second press"), (await page.locator(`${PAGE} button`, { hasText: "Look deeper" }).count()) === 0, "none drawn");
      const afterDone = await units(t0, userId);
      report(at("and spends exactly one credit"), (afterDone.spent ?? 0) === (afterStop.spent ?? 0) + 1,
        `after the stop ${JSON.stringify(afterStop)}, after the look ${JSON.stringify(afterDone)}`);

      // 4. Nothing moves.
      const moving = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
      report(at("nothing moves"), moving === 0, `${moving} running animation(s)`);
      await context.close();
    }
  } finally {
    await browser.close();
    const ids = [...readIds];
    for (const id of players) {
      if (ids.length === 0) continue;
      const calls = (await sql`select model_call_id from intake_reads where user_id = ${id} and id = any(${ids}::uuid[])`).map((r) => r.model_call_id);
      await sql`delete from intake_read_stops where user_id = ${id} and read_id = any(${ids}::uuid[])`;
      await sql`delete from intake_reads where user_id = ${id} and id = any(${ids}::uuid[])`;
      if (calls.length > 0) await sql`delete from model_calls where user_id = ${id} and id = any(${calls}::uuid[])`;
    }
    console.log(`cleaned up ${ids.length} read(s) this run made`);
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
