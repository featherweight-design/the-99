// Home's search panel (tool discovery E1), in a browser at 390 and at 1300: the panel's field takes the typing and
// answers in place on a desktop (one field, the rail draws none), a starter types its question there, Esc closes it back
// to the panel; on a phone the field press opens the sheet and a starter arrives typed.
//
//   PROBE_BASE=http://localhost:3492 pnpm probe:home-search
//
// Writes no database row (the About gate is marked seen and put back). Fails on main: Home has no panel there.

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

async function run(page, wide, tag) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const there = await panel(page).waitFor({ timeout: 15_000 }).then(() => true, () => false);
  if (!report(`${tag} Home draws the search panel`, there)) return;
  report(`${tag} the panel names itself`, /Not sure where to go\?/.test(await panel(page).innerText()));
  const h = await homeField(page).evaluate((el) => Math.round(el.closest("label")?.getBoundingClientRect().height ?? el.getBoundingClientRect().height));
  report(`${tag} the field is 52px`, h === 52, `${h}px`);
  const starters = panel(page).locator("[data-home-starters] button");
  await starters.first().waitFor({ timeout: 15_000 });
  report(`${tag} starters are drawn`, (await starters.count()) >= 1);

  if (wide) {
    await homeField(page).click();
    await page.locator("[data-home-search-field] [data-card-search-add-several]").first().waitFor({ timeout: 10_000 }).catch(() => {});
    const inPlace = await page.locator("[data-home-search-field] [data-card-search-add-several]").count();
    report(`${tag} a press opens the answers in place, under the panel's field`, inPlace >= 1);
    report(`${tag} the rail draws no second field`, (await page.getByRole("combobox").count()) === 1);
    await homeField(page).fill("where can my spare cards go");
    await page.locator("[data-home-search-field] [data-ask-tool]").first().waitFor({ timeout: 15_000 });
    report(`${tag} a question is answered by a tool in place`, (await page.locator("[data-home-search-field] [data-ask-tool]").count()) >= 1);
    await page.keyboard.press("Escape"); // clears the query
    await page.keyboard.press("Escape"); // closes
    report(`${tag} Esc closes it back to the panel`, (await page.locator("[data-home-search-field] [data-card-search-add-several]").count()) === 0);
    const q = (await starters.first().innerText()).trim();
    await starters.first().click();
    report(`${tag} a starter types into the panel's field`, (await homeField(page).inputValue()) === q, q);
  } else {
    await homeField(page).click();
    report(`${tag} a press opens the sheet`, await sheet(page).waitFor({ timeout: 5_000 }).then(() => true, () => false));
    await page.keyboard.press("Escape");
    await sheet(page).waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
    const q = (await starters.first().innerText()).trim();
    await starters.first().click();
    await sheet(page).waitFor({ timeout: 5_000 });
    report(`${tag} a starter arrives typed in the sheet`, (await sheet(page).getByRole("combobox").inputValue()) === q, q);
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
