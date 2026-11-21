// Presses Undo on the life tracker's Result screen (addendum, Undo a mistaken ending: U1, U2) at phone and tablet
// width, against a real table on a real database, and checks what happened on the screen AND on the server.
//
// For each width it opens /friends/table/<id>/play, starts a game, and then ends it the way the device would have:
// it appends one lethal change (Colin −40 life) to the game this device holds and reloads, so the Result screen comes
// up and saves the table result through the shipped action. Then it checks:
//   - the Undo row is under the winner and names the change ("Colin −40 life, to 0 · round 1"),
//   - the result rows exist on the server once the save lands,
//   - pressing Undo closes the Result, raises "Game back on" with "Undid …", and moves focus to Colin's name,
//   - the result rows are gone from the server, and the device's game is running again.
// On main there is no Undo row, so the first check fails.
//
// It WRITES (a table result, then its removal), so it refuses staging, production and local-dev by `neon.branch_id`
// (`assertScratchBranch`). Run it against a dev server whose DATABASE_URL is a scratch branch made from local-dev,
// seeded by `scripts/seed-rule-zero-fixture.mts` for the audit account; the env file must name the same branch.
//
//   PROBE_BASE=http://localhost:3058 pnpm probe:tracker-undo-ui
// Optional: UNDO_TABLE (default the fixture's T5, you and Colin), SHOTS=<dir> to keep a photograph of each state.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");
const TABLE = process.env.UNDO_TABLE ?? "7a0e0000-0000-4000-8000-000000000005";
const SHOTS = process.env.SHOTS;
const WIDTHS = [
  { label: "phone 390x844", width: 390, height: 844 },
  { label: "tablet 1180x820", width: 1180, height: 820 },
];

const sql = neon(DATABASE_URL);
const [{ b }] = await sql`select current_setting('neon.branch_id', true) as b`;
assertScratchBranch(b, "probe-tracker-undo-ui");
const resultRows = async () => (await sql`select count(*)::int as n from rule_zero_result_seats where table_id = ${TABLE}`)[0].n;

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

// The audit account is a `+clerk_test` address: Clerk's fixed 424242 code, through `window.Clerk` on the app's origin
// (as `probe-rollup-ui.mjs`, which says why the hosted portal cannot be driven).
async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const shot = async (page, name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const { label, width, height } of WIDTHS) {
    console.log(`\n## ${label}`);
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
    const page = await context.newPage();
    await signIn(page);
    const play = `${BASE}/friends/table/${TABLE}/play`;
    await page.goto(play, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Start", exact: true }).click({ timeout: 20_000 });
    await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 });

    // End the game as a tap would: one lethal change on Colin, appended to the game this device holds.
    const ended = await page.evaluate((id) => {
      const key = `the99.tracker.${id}`;
      const held = JSON.parse(window.localStorage.getItem(key) ?? "null");
      const colin = held?.game?.config?.snapshot?.players?.find((p) => p.name === "Colin");
      if (!colin) return false;
      held.game.log.push({ t: "life", seat: colin.seat, delta: -40 });
      window.localStorage.setItem(key, JSON.stringify(held));
      return true;
    }, TABLE);
    check("the device holds a started game with Colin seated", ended);
    await page.reload({ waitUntil: "networkidle" });

    const result = page.getByTestId("tracker-result");
    await result.waitFor({ timeout: 15_000 });
    const undo = result.getByTestId("result-undo");
    const there = await undo.count();
    check("U1: the Result offers Undo", there === 1);
    if (!there) {
      await shot(page, `${width}-no-undo`);
      await context.close();
      continue;
    }
    // The row waits for the save (clarification 3): pressable once aria-disabled clears.
    await page.waitForFunction(() => !document.querySelector('[data-testid="result-undo"]')?.hasAttribute("aria-disabled"), null, { timeout: 20_000 });
    const text = (await undo.textContent()) ?? "";
    check("U1: the row names the change that ended the game", text.endsWith("Colin −40 life, to 0 · round 1"), text);
    const order = await page.evaluate(() => {
      const hero = document.querySelector('[data-testid="result-hero"]');
      const row = document.querySelector('[data-testid="result-undo"]');
      return hero && row ? hero.getBoundingClientRect().bottom <= row.getBoundingClientRect().top : false;
    });
    check("U1: the row sits under the winner", order);
    const box = await undo.boundingBox();
    check("U1: the row is a 44px target at least", (box?.height ?? 0) >= 44, `${box?.height}px`);
    const before = await resultRows();
    check("the table result is saved on the server", before > 0, `${before} rows`);
    await shot(page, `${width}-u1`);

    await undo.click();
    await result.waitFor({ state: "detached", timeout: 15_000 });
    const toast = page.getByRole("status").filter({ hasText: "Game back on" });
    await toast.waitFor({ timeout: 10_000 });
    const toastText = (await toast.textContent()) ?? "";
    check("U2: the toast says the game is back on and what was undone", toastText.includes("Undid Colin −40 life, to 0 · round 1"), toastText);
    const focused = await page.evaluate(() => document.activeElement?.closest('[data-testid="tracker-panel"]')?.querySelector('[data-testid="panel-name"]')?.textContent ?? document.activeElement?.textContent ?? "");
    check("U2: focus lands on the panel that came back", focused.includes("Colin"), focused);
    await shot(page, `${width}-u2`);
    const after = await resultRows();
    check("the table result is gone from the server", after === 0, `${after} rows`);
    const running = await page.evaluate((id) => {
      const held = JSON.parse(window.localStorage.getItem(`the99.tracker.${id}`) ?? "null");
      return held?.game?.log?.length === 0;
    }, TABLE);
    check("the device's game is running again, without the lethal change", running);
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nall checks passed");
process.exit(failed ? 1 : 0);
