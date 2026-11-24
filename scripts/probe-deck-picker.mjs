// Search follow-ups R12 (Q21, G28): an answer that several of the reader's decks can use swaps the listbox for a deck
// picker in the same box (`‹ Answers`, the line, the heading, one row per deck, last touched first); a deck press opens
// that deck with the row Opening; Arrows, Enter and Backspace work; the picker's rows are 64px on the phone and 54px in
// the dropdown. At 390 from the sheet and 1300 from Home's popover.
//
//   PROBE_BASE=http://localhost:3517 pnpm probe:deck-picker
//
// Writes no database row (the About gate is marked seen and put back); needs a signed-in account with two or more decks a
// tool fits (the local-dev fixture). Fails on main: no answer reads `Pick a deck`, so there is no picker to press.
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
  await homeField(page).click();
  let field;
  let scope;
  if (wide) {
    field = homeField(page);
    scope = page.locator("[data-home-search-field]");
  } else {
    await sheet(page).waitFor({ timeout: 5_000 });
    field = sheet(page).getByRole("combobox");
    scope = sheet(page);
  }
  await field.fill(QUESTION);
  await scope.locator("[data-ask-tool]").first().waitFor({ timeout: 15_000 });
  return { scope, field };
}

/** The first answer whose foot offers a picker, or null. */
async function pickerRow(scope) {
  const rows = scope.locator("[data-ask-tool]");
  const n = await rows.count();
  for (let i = 0; i < n; i += 1) {
    const text = await rows.nth(i).innerText();
    if (/Pick a deck · \d+ can use it/.test(text)) return rows.nth(i);
  }
  return null;
}

async function holdNavigation(page) {
  let open;
  const gate = new Promise((r) => (open = r));
  await page.route("**/*", async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (req.headers()["rsc"] === "1" && u.pathname !== "/" && !u.pathname.startsWith("/api/")) await gate;
    await route.continue().catch(() => {});
  });
  return { release: () => open() };
}

async function run(page, wide, tag) {
  const { scope, field } = await openAndAsk(page, wide);
  const row = await pickerRow(scope);
  if (!report(`${tag} an answer offers "Pick a deck · n can use it"`, !!row)) return;
  const toolId = await row.getAttribute("data-ask-tool");
  await row.click();
  const picker = scope.locator("[data-ask-pick]");
  report(`${tag} a press swaps the answers for the picker`, await picker.waitFor({ timeout: 3_000 }).then(() => true, () => false));
  report(`${tag} the answers are gone from the box`, (await scope.locator("[data-ask-tool]").count()) === 0);
  report(`${tag} the line reads "Which deck? n of yours can use it."`, /Which deck\? \d+ of yours can use it\./.test(await picker.innerText()));
  report(`${tag} the heading reads "Your decks, last touched first"`, (await picker.innerText()).toLowerCase().includes("your decks, last touched first"));
  const decks = picker.locator("[data-ask-pick-deck]");
  const count = await decks.count();
  report(`${tag} the picker lists two or more decks`, count >= 2, `${count}`);
  const want = wide ? 54 : 64;
  const box = await decks.first().boundingBox();
  report(`${tag} a deck row is ${want}px`, !!box && Math.abs(box.height - want) < 1, `${box?.height}`);
  report(`${tag} the field keeps focus`, await field.evaluate((e) => e === document.activeElement));
  const sel = () => decks.evaluateAll((els) => els.findIndex((e) => e.getAttribute("aria-selected") === "true"));
  report(`${tag} the first deck is active`, (await sel()) === 0);
  await page.keyboard.press("ArrowDown");
  report(`${tag} ArrowDown moves to the next deck`, (await sel()) === 1);
  await page.keyboard.press("ArrowUp");
  report(`${tag} ArrowUp moves back`, (await sel()) === 0);

  // Backspace goes back to the answers, on the answer it left.
  await page.keyboard.press("Backspace");
  const back = await scope.locator(`[data-ask-tool="${toolId}"]`).waitFor({ timeout: 3_000 }).then(() => true, () => false);
  report(`${tag} Backspace goes back to the answers`, back && (await picker.count()) === 0);
  await row.click();
  await picker.waitFor({ timeout: 3_000 });
  await picker.locator("[data-ask-pick-back]").click();
  report(`${tag} "‹ Answers" goes back too`, await scope.locator(`[data-ask-tool="${toolId}"]`).waitFor({ timeout: 3_000 }).then(() => true, () => false));

  // A deck press opens that deck, the row Opening.
  await scope.locator(`[data-ask-tool="${toolId}"]`).click();
  await picker.waitFor({ timeout: 3_000 });
  const hold = await holdNavigation(page);
  const second = decks.nth(1);
  const id = await second.getAttribute("data-ask-pick-deck");
  await second.click();
  const opening = await page.waitForFunction((d) => document.querySelector(`[data-ask-pick-deck="${d}"]`)?.hasAttribute("data-ask-pending"), id, { timeout: 3_000 }).then(() => true, () => false);
  report(`${tag} a deck press leaves that row Opening`, opening);
  report(`${tag} the other deck is not Opening`, !(await decks.first().evaluate((e) => e.hasAttribute("data-ask-pending"))));
  hold.release();
  const landed = await page.waitForFunction((d) => location.pathname === `/decks/${d}` && location.search.includes("tool="), id, { timeout: 15_000 }).then(() => true, () => false);
  report(`${tag} the page lands on /decks/{id} with the tool`, landed, page.url().replace(BASE, ""));
  await page.unroute("**/*");
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
