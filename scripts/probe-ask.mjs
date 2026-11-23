// Ask in the card search (tool discovery D), in a browser at 390 and at 1300: the field takes a question, a starter
// types one, a tool answers above the cards (↓ ↵ lands it), a card name stays a card lookup, and a question nothing
// answers is never a dead end.
//
//   PROBE_BASE=http://localhost:3472 pnpm probe:ask
//
// Writes no database row (the About gate is marked seen and put back). Fails on main: there is no starter, no tool
// group and no nothing-matches state there.

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

const sheet = (page) => page.getByRole("dialog", { name: "Search all cards" });
const opener = (page, wide) =>
  wide ? page.locator('aside button[aria-label="Search all cards"]') : page.getByRole("button", { name: "Search all cards", exact: true });

async function open(page, wide) {
  await opener(page, wide).click();
  await sheet(page).waitFor({ timeout: 5_000 });
}
const field = (page) => sheet(page).getByRole("combobox");
const type = async (page, text) => {
  await field(page).fill("");
  await field(page).fill(text);
};

// Ask in the card search (tool discovery D): the field takes a question, starters type one, tools answer above the
// cards, a card name stays a card lookup, and nothing-matching is never a dead end.
async function ask(page, wide, tag) {
  await page.goto(`${BASE}/collection`, { waitUntil: "networkidle" });
  await open(page, wide);

  report(`${tag} the field invites a question`, (await field(page).getAttribute("placeholder")) === "Search cards, or ask a question");

  // Starters: under the field, 44px on the phone and 34px in the dropdown, and a press types the question.
  const starters = sheet(page).locator("[data-ask-starter]");
  await starters.first().waitFor({ timeout: 10_000 });
  const n = await starters.count();
  report(`${tag} starters are drawn`, n >= 1 && n <= 4, `${n} starters`);
  const h = await starters.first().evaluate((el) => Math.round(el.getBoundingClientRect().height));
  report(`${tag} a starter is ${wide ? 34 : 44}px tall`, h === (wide ? 34 : 44), `${h}px`);
  const q = (await starters.first().innerText()).trim();
  await starters.first().click();
  report(`${tag} a starter types its question into the field`, (await field(page).inputValue()) === q, q);
  await sheet(page).locator("[data-ask-tool]").first().waitFor({ timeout: 10_000 });
  report(`${tag} the typed starter is answered by a tool`, (await sheet(page).locator("[data-ask-tool]").count()) >= 1);

  // A question about spare cards: Find a deck answers, under "Tools for this", and ↓ ↵ lands it.
  await type(page, "where can my spare cards go");
  const tool = sheet(page).locator('[data-ask-tool="find-a-deck"]');
  await tool.waitFor({ timeout: 10_000 });
  const group = await sheet(page).getByRole("group", { name: "Tools for this" }).count();
  report(`${tag} tools are their own labelled group of the one listbox`, group === 1 && (await sheet(page).getByRole("listbox").count()) === 1);
  const boxH = await tool.evaluate((el) => Math.round(el.getBoundingClientRect().height));
  report(`${tag} a tool answer keeps the search row's frame (min ${wide ? 58 : 72}px)`, boxH >= (wide ? 58 : 72), `${boxH}px`);
  await field(page).press("ArrowDown");
  const active = await field(page).getAttribute("aria-activedescendant");
  const activeIsTool = await sheet(page).locator(`[id="${active}"][data-ask-tool]`).count();
  report(`${tag} ↓ moves onto the first tool`, activeIsTool === 1, String(active));
  // The landing consumes its own marker and may tidy the address, so the press is proved by the request it makes.
  const landed = page.waitForRequest((r) => r.url().includes("avail=free"), { timeout: 10_000 }).then(() => true, () => false);
  await field(page).press("Enter");
  report(`${tag} ↵ on a tool lands where it says (Collection, spare cards)`, await landed);
  report(`${tag} pressing a tool closes the search`, await sheet(page).waitFor({ state: "hidden", timeout: 5_000 }).then(() => true, () => false));

  // A card name is a card lookup: no tool answers one word.
  await page.goto(`${BASE}/collection`, { waitUntil: "networkidle" });
  await open(page, wide);
  await type(page, "sol");
  await sheet(page).getByRole("option").first().waitFor({ timeout: 15_000 });
  report(`${tag} a card name draws no tool`, (await sheet(page).locator("[data-ask-tool]").count()) === 0);

  // Nothing matches: the state, the starters and the way into every tool, never a dead end.
  await type(page, "zzqx blorp wibble");
  await sheet(page).locator("[data-ask-none-state]").waitFor({ timeout: 15_000 });
  const about = sheet(page).locator("[data-ask-about]");
  report(`${tag} nothing-matches names itself`, /Nothing here answers that yet/.test(await sheet(page).locator("[data-ask-none-state]").innerText()));
  report(`${tag} nothing-matches links Every tool, in About`, (await about.getAttribute("href")) === "/about");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
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
  await ask(page, wide, tag);
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
