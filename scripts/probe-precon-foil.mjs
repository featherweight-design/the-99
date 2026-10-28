// probe:precon-foil — a precon's box foils animate in its card details (Hugh, 2026-10-28).
//
// At 1300 and 390 this opens /decks/precons/<file>, presses every List row the box marks foil and checks the details
// face draws the large foil film, then presses a plain row and checks it draws none. The face used to read foil only
// from the reader's own holdings, so a box foil the reader did not hold (or held plain) opened flat.
//
//   PROBE_BASE=http://localhost:3190 [PROBE_PRECON=MiracleWorker_DSC] node scripts/probe-precon-foil.mjs
//
// Read-only but for the probe account's About row, which it restores. Needs a database whose precon_cards mark at
// least one all-foil card in the file.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const FILE = process.env.PROBE_PRECON ?? "MiracleWorker_DSC";
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname)) throw new Error(`PROBE_BASE must be a local server, not ${BASE}.`);
const [{ branch }] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
if (!branch || branch === PRODUCTION || branch === STAGING) throw new Error(`Refusing branch ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev or a scratch branch.`);

let failures = 0;
const fail = (m) => {
  failures++;
  console.log(`  FAIL ${m}`);
};
const ok = (m) => console.log(`  ok   ${m}`);

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
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
  return page.evaluate(() => window.Clerk.user.id);
}


/** Presses a row and reads whether the open details face draws the large film, then closes it. */
async function filmOf(page, row) {
  await row.click();
  await page.locator("#card-modal-title").waitFor({ timeout: 30_000 });
  await page.waitForTimeout(700);
  const name = await page.locator("#card-modal-title").textContent();
  const film = await page.locator('[role=dialog] [data-foil][data-foil-size="large"]').evaluateAll((els) =>
    els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getAttribute("data-foil")));
  await page.keyboard.press("Escape");
  await page.locator("#card-modal-title").waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
  return { name: name?.trim(), film };
}

await clerkSetup();
const browser = await chromium.launch();
let aboutCapture = null;
try {
  const auth = await browser.newContext();
  const userId = await signIn(await auth.newPage());
  const state = await auth.storageState();
  await auth.close();
  aboutCapture = await captureAboutSeen(userId);
  for (const [label, viewport] of [["1300", { width: 1300, height: 900 }], ["390", { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ storageState: state, viewport });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/decks/precons/${FILE}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await clearAboutSheet(page, userId);
    await onPage(page, "[data-decklist-row]").first().waitFor({ timeout: 60_000 }).catch(async () => {
      throw new Error(`${label}: no decklist rows at ${page.url()}: ${(await page.locator("main").innerText().catch(() => "")).slice(0, 200)}`);
    });
    const rows = onPage(page, "[data-decklist-row]").filter({ visible: true });
    const foilRows = rows.filter({ has: page.locator("[data-testid=foil-mark]") });
    const n = await foilRows.count();
    if (n === 0) fail(`${label}: no row marked foil in ${FILE}; the database marks none`);
    for (let i = 0; i < n; i++) {
      const r = await filmOf(page, foilRows.nth(i));
      if (!r.film.includes("foil")) fail(`${label}: ${r.name}, a box foil, opened with no foil film (${JSON.stringify(r.film)})`);
      else ok(`${label}: ${r.name}, a box foil, draws the large foil film`);
    }
    const plain = rows.filter({ hasNot: page.locator("[data-testid=foil-mark]") }).nth(3);
    const p = await filmOf(page, plain);
    if (p.film.length) fail(`${label}: ${p.name}, a plain box card, drew a film (${JSON.stringify(p.film)})`);
    else ok(`${label}: ${p.name}, a plain box card, draws none`);
    await ctx.close();
  }
} finally {
  try {
    if (aboutCapture) await restoreAboutSeen(aboutCapture);
  } finally {
    await browser.close();
  }
}
console.log(failures ? `\n${failures} failure(s)` : "\nall checks passed");
process.exit(failures ? 1 : 0);
