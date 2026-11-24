// Search fixes (tool discovery follow-up): a press on a tool row lands where the row says (Try it on a card, See your
// decks on Stats) from Home's popover at 1300 and from the phone sheet at 390, and "No card names match." never shows
// under tool rows.
//
//   PROBE_BASE=http://localhost:3517 pnpm probe:search-fixes
//
// Writes no database row (the About gate is marked seen and put back). Fails on main: a press closes the search and
// stays on Home, and the no-cards line draws under the tools.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const panel = (page) => page.locator("[data-home-search-panel]");
const homeField = (page) => panel(page).getByRole("combobox");
const sheet = (page) => page.getByRole("dialog", { name: "Search all cards" });
const QUESTION = "How do I make my deck better?";

async function openAndAsk(page, wide) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await panel(page).waitFor({ timeout: 15_000 });
  let field;
  let scope;
  if (wide) {
    await homeField(page).click();
    field = homeField(page);
    scope = page.locator("[data-home-search-field]");
  } else {
    await homeField(page).click();
    await sheet(page).waitFor({ timeout: 5_000 });
    field = sheet(page).getByRole("combobox");
    scope = sheet(page);
  }
  await field.fill(QUESTION);
  await scope.locator("[data-ask-tool]").first().waitFor({ timeout: 15_000 });
  return scope;
}

async function run(page, wide, tag) {
  const scope = await openAndAsk(page, wide);
  const ids = await scope.locator("[data-ask-tool]").evaluateAll((els) => els.map((e) => e.getAttribute("data-ask-tool")));
  report(`${tag} the question answers with tool rows`, ids.length >= 1, ids.join(", "));
  const noCards = await scope.getByText("No card names match.").count();
  report(`${tag} no "No card names match." under tool rows`, noCards === 0, `${noCards} drawn`);
  for (const id of ids) {
    const row = (await openAndAsk(page, wide)).locator(`[data-ask-tool="${id}"]`);
    const where = (await row.locator("span.font-mono").first().innerText()).replace(/\s*›$/, "").trim();
    const before = new URL(page.url()).pathname;
    await row.click();
    const moved = await page.waitForFunction((b) => location.pathname !== b, before, { timeout: 8_000 }).then(() => true, () => false);
    await page.waitForTimeout(1_000);
    const after = new URL(page.url()).pathname;
    report(`${tag} pressing ${id} ("${where}") lands off Home and stays there`, moved && after !== before && after !== "/", `${before} -> ${after}`);
  }
}

let aboutPrior = null;

async function leg(browser, wide) {
  const tag = wide ? "1300:" : "390:";
  const context = await browser.newContext(
    wide ? { viewport: { width: 1300, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  );
  const page = await context.newPage();
  await signIn(page);
  const userId = await page.evaluate(() => window.Clerk?.user?.id ?? null);
  if (!userId) throw new Error("Signed in, but Clerk reports no user.");
  aboutPrior ??= await captureAboutSeen(userId);
  await clearAboutSheet(page, userId);
  await run(page, wide, tag);
  await context.close();
}

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    await leg(browser, false);
    await leg(browser, true);
  } finally {
    if (aboutPrior) await restoreAboutSeen(aboutPrior).catch((e) => console.error("could not restore About:", e));
    await browser.close();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
