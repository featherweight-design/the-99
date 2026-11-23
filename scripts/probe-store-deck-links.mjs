// probe:store-deck-links — store choice UI-3a (handoff design_handoff_the99_store_choice, call 6): a reader on a store
// with no cart opens a deck's Export dialog and its Shopping tab draws no whole-list link. Pressed in Chromium at
// 390x844 and 1300x900, where the phone sheet and the desktop dialog are separate subtrees.
//
// What jsdom cannot prove, and this does: on the real deck page, the reader's store reaches the dialog through the
// page's StoreProvider; the Shopping tab, PRESSED, lists cards to buy; and no `Buy these at Mana Pool` link paints
// beside them, while the copy button still does.
// Then Mana Balance's Improve my mana, opened and a color picked: a staple's buy link is labelled for TCGplayer and,
// PRESSED, opens TCGplayer's search for it (answered locally).
// Fails on main: main draws `Buy these at Mana Pool` whenever the Shopping tab lists a card, whatever the store (the
// probe first checks that it lists one), and every staple's link goes to Mana Pool.
//
// FIXTURE (read only): a scratch branch of local-dev, which the dev server reads, where the audit account has a user
// STORE_PREFERENCE_ENABLED override 'on' and user_prefs.preferred_store = 'tcgplayer', and owns PROBE_DECK (default:
// its "HD - Gishath" deck) with at least one card to buy and a staple to offer in Improve my mana.
//
//   PROBE_BASE=http://localhost:3158 PROBE_DECK=<deck uuid> pnpm probe:store-deck-links
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECK = process.env.PROBE_DECK ?? "441286bb-f632-4d1e-af0f-aa7282bbb40f";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname)) {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback dev server only`);
  }
}

const WIDTHS = [
  { name: "390", width: 390, height: 844 },
  { name: "1300", width: 1300, height: 900 },
];

let failures = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test") || !password
          ? await signIn.create({ identifier: email })
          : await signIn.create({ identifier: email, password });
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
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const visible = (locator) => locator.evaluateAll((nodes) => nodes.filter((n) => n.getBoundingClientRect().width > 0).length);

async function run(size) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
    // Answer every store request locally: the press is measured by where it goes, never by reaching the store.
    await context.route(/^https:\/\/(www\.)?(tcgplayer|manapool|cardkingdom)\.com\//, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title>" }));
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded" });
    const exportButton = page.getByRole("button", { name: /Export/ }).filter({ visible: true }).first();
    // The header paints before hydration, so a first press on a cold server can land on no handler: the retry is the wait.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await exportButton.click({ timeout: 60_000 });
      const opened = await page.waitForSelector('[role="dialog"]', { timeout: 10_000 }).then(() => true, () => false);
      if (opened) break;
      if (attempt === 2) throw new Error("the Export dialog never opened");
    }
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.getByRole("button", { name: "Shopping list" }).filter({ visible: true }).first().click();
    await page.waitForTimeout(500);

    // The tab's count line, `N cards · to buy`: the probe means nothing over an empty list.
    const counts = await dialog.getByText(/^\d+ cards · to buy$/).evaluateAll((nodes) =>
      nodes.filter((n) => n.getBoundingClientRect().width > 0).map((n) => n.textContent));
    const toBuy = counts.length === 1 ? Number.parseInt(counts[0], 10) : 0;
    check(toBuy > 0, `${size.name} the Shopping tab lists cards to buy`, JSON.stringify(counts));
    const link = await visible(dialog.getByRole("link", { name: /Buy these at/ }));
    check(link === 0, `${size.name} no whole-list link for a store with no cart`, `${link} painted`);
    const mana = await visible(dialog.getByRole("link", { name: /Mana Pool/ }));
    check(mana === 0, `${size.name} no Mana Pool link in the dialog`, `${mana} painted`);
    const copy = await visible(dialog.getByRole("button", { name: /Copy/ }));
    check(copy > 0, `${size.name} the copy button still draws`, `${copy} painted`);

    // Improve my mana: the Try it landing opens Analysis with the Tuning hub.
    await page.goto(`${BASE}/decks/${DECK}?tool=mana-balance`, { waitUntil: "domcontentloaded" });
    // The landing draws the Tuning hub; Mana Balance's own tile opens the tool.
    await page.getByRole("button", { name: /^Mana Balance/ }).filter({ visible: true }).first().click({ timeout: 60_000 });
    await page.getByRole("button", { name: "Improve my mana" }).filter({ visible: true }).first().click({ timeout: 60_000 });
    const radios = page.getByRole("radio").filter({ visible: true });
    await radios.first().waitFor({ timeout: 20_000 });
    const buy = page.getByRole("link", { name: /^Buy .+ at [A-Za-z ]+, opens in a new tab$/ }).filter({ visible: true });
    const picks = await radios.count();
    for (let i = 0; i < picks; i += 1) {
      const radio = page.getByRole("radio").filter({ visible: true }).nth(i);
      if (await radio.isDisabled()) continue;
      await radio.click();
      const found = await buy.first().waitFor({ timeout: 20_000 }).then(() => true, () => false);
      if (found) break;
      const change = page.getByRole("button", { name: /^Change/ }).filter({ visible: true });
      if (await change.count()) await change.first().click();
    }
    const names = await buy.evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-label")));
    check(names.length > 0 && names.every((n) => / at TCGplayer, /.test(n)), `${size.name} each staple's buy link names TCGplayer`, JSON.stringify(names));
    if (names.length > 0) {
      const target = buy.first();
      await target.scrollIntoViewIfNeeded();
      const [popup] = await Promise.all([context.waitForEvent("page", { timeout: 15_000 }), target.click()]);
      await popup.waitForURL(/^https:/, { timeout: 10_000 });
      const url = popup.url();
      check(url.startsWith("https://www.tcgplayer.com/search/magic/product?"), `${size.name} pressing it opens TCGplayer's search`, url);
      await popup.close();
    }
  } finally {
    await browser.close();
  }
}

await clerkSetup();
for (const size of WIDTHS) await run(size);
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
