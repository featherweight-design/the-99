// probe:strategy-focus — a deck's focus is picked from the strategy block's legend and cleared by Keep it balanced,
// in a real browser, at both widths, and each press survives a reload (the write landed, not only the optimistic draw).
//
// The block draws only over a reading, so SF_DECK must be an analyzed deck of the signed-in account with a strategy
// (the strategy-focus inventory's SF_NOFOCUS_DECK). It WRITES that deck's `strategy_focus` and puts the value it found
// back in a `finally`: run it on a scratch branch off local-dev, never production or staging.
//
//   node node_modules/next/dist/bin/next dev -p 3417
//   PROBE_BASE=http://localhost:3417 SF_DECK=<deck id> pnpm probe:strategy-focus
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECK = process.env.SF_DECK;
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!DECK) throw new Error("Set SF_DECK to an analyzed deck with a strategy.");
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
if (/the-99\.dev|vercel\.app/.test(BASE)) throw new Error(`refusing ${BASE}: this probe writes`);
// The presses write through the SERVER's database, which the probe cannot ask. It checks the database this checkout's
// \`.env\` names, the one a server started here reads, and refuses anything but a scratch branch: run the server from
// the same worktree. Refused before the first press.
const [{ branch }] = await neon(DATABASE_URL)`select current_setting('neon.branch_id') as branch`;
assertScratchBranch(branch, "probe:strategy-focus");

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} - ${detail}`);
  if (!ok) failures += 1;
}

async function signIn(page) {
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



/** The legend's rows and which one is checked, read off the page. */
async function legend(page) {
  const radios = onPage(page, "[data-strategy-block] [role=radio]");
  await radios.first().waitFor({ state: "visible", timeout: 30_000 });
  return radios.evaluateAll((els) => els.map((el) => ({ key: el.getAttribute("data-strategy"), checked: el.getAttribute("aria-checked") === "true", outside: el.textContent.includes("your focus") })));
}

async function openBlock(page) {
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded" });
  await onPage(page, "[role=tab]").filter({ hasText: "Analysis" }).first().click();
  await onPage(page, "[data-strategy-block]").first().scrollIntoViewIfNeeded({ timeout: 30_000 });
}

await clerkSetup();
const browser = await chromium.launch();
let original;
let page;
/** Set once a press may have written, so the finally restores even a deck that started with no focus. */
let touched = false;
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  page = await context.newPage();
  await signIn(page);
  for (const width of [390, 1300]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await openBlock(page);
    const rows = await legend(page);
    if (original === undefined) {
      const stored = rows.find((r) => r.checked);
      // A stored focus outside the top five is drawn only while it is the focus: once the probe picks another row, the
      // legend no longer offers it, so the finally could not put it back. Refused before any write.
      if (stored?.outside) throw new Error(`SF_DECK's focus ${stored.key} is outside its top five: pick a deck whose focus is in it, or none`);
      original = stored?.key ?? null;
    }
    const target = rows.find((r) => !r.checked);
    if (!target) throw new Error("every row is checked: the deck has one strategy");
    touched = true;
    await onPage(page, `[data-strategy-block] [role=radio][data-strategy="${target.key}"]`).first().click();
    const drawn = await legend(page);
    report(`press picks ${target.key} at ${width}`, drawn.filter((r) => r.checked).map((r) => r.key).join() === target.key, JSON.stringify(drawn.filter((r) => r.checked)));
    await page.waitForTimeout(1500);
    await openBlock(page);
    const stored = await legend(page);
    report(`the pick survives a reload at ${width}`, stored.find((r) => r.key === target.key)?.checked === true, JSON.stringify(stored.filter((r) => r.checked)));
    await onPage(page, "[data-strategy-block] button").filter({ hasText: "Keep it balanced" }).first().click();
    report(`Keep it balanced clears it at ${width}`, (await legend(page)).every((r) => !r.checked), "no row checked");
    await page.waitForTimeout(1500);
    await openBlock(page);
    report(`the clear survives a reload at ${width}`, (await legend(page)).every((r) => !r.checked), "no row checked");
  }
} finally {
  // Put the deck's focus back as found.
  if (page && touched) {
    await openBlock(page).catch(() => {});
    const restore = original
      ? onPage(page, `[data-strategy-block] [role=radio][data-strategy="${original}"]`).first()
      : onPage(page, "[data-strategy-block] button").filter({ hasText: "Keep it balanced" }).first();
    // With no focus to restore and none drawn, Keep it balanced is absent and there is nothing to do.
    if (await restore.count().catch(() => 0)) await restore.click().catch(() => {});
    await page.waitForTimeout(1500);
    // Verified, not assumed: a restore that did not persist fails the run.
    const after = await openBlock(page).then(() => legend(page)).catch(() => null);
    const now = after?.find((r) => r.checked)?.key ?? null;
    report("the deck's focus is put back", after !== null && now === original, `found ${original ?? "none"}, left ${now ?? "none"}`);
  }
  await browser.close();
}
console.log(failures === 0 ? "\nall ok" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
