// #364: colour identity is the union of both commanders. The primary alone
// lacks white, so a white card is illegal in its deck; the partner adds white,
// so paired the same card is addable. That gap is the bug this feature exists
// to fix — half the motivating deck's cards were unaddable to the deck they
// were in.
//
// Builds a pair deck and a single-commander deck through the picker, searches
// the add field of each for the same white card, and reports whether it is
// offered. Offered in the pair and absent from the single is the pass.
//
// The handle is structural: the results are the list items under the builder's
// own add field. No class name is stable.
//
// Run by hand: `node scripts/probe-partner-union.mjs`.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

const PAIRS = "Atreus, Impulsive Son";
const PARTNER = "Kratos, Stoic Father";
// Mono-white, and in the fixture collection — so the only thing that can keep
// it out of the panel is the deck's colour identity. The primary lacks white
// and the partner brings it, which is what makes this the card the union rule
// turns on.
const WHITE = "Swords to Plowshares";

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
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor?.emailAddressId,
          });
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

async function createDeck(page, partner, label) {
  await page.goto(`${BASE}/decks/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.fill('input[placeholder*="Search" i], input[type="search"]', "Atreus");
  await page.waitForTimeout(350);
  await page.locator(`li button:has-text("${PAIRS}"):visible`).first().click();
  await page.waitForTimeout(250);
  if (partner) {
    await page.locator('button[aria-label^="Add a partner"]:visible').first().click();
    await page.waitForTimeout(350);
    await page.locator(`li button:has-text("${PARTNER}"):visible`).first().click();
    await page.waitForTimeout(300);
  }
  const name = `Probe union ${label} ${Date.now()}`;
  await page.locator('input#picker-deck-name, input[type="text"]:visible').first().fill(name);
  await page.locator("button:visible").filter({ hasText: /create deck/i }).first().click();
  await page.waitForURL(/\/decks\/[0-9a-f-]{8,}/, { timeout: 40_000 });
  await page.waitForTimeout(2500);
  return page.url();
}

async function searchAddPanel(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  // The add field is always on the builder — addPanelCopy.field.placeholder.
  const box = page.locator('input[placeholder*="Add a card" i]:visible').first();
  if ((await box.count()) === 0) return "no add field on this deck";
  await box.fill(WHITE);
  await page.waitForTimeout(1400);
  return page.evaluate((wanted) => {
    // The innermost match, so the report is the one row rather than the panel
    // that contains it — and its whole text, because an out-of-identity card may
    // be listed with a refusal beside it rather than filtered out.
    const hits = [...document.querySelectorAll("li, button")].filter(
      (n) =>
        n.textContent?.includes(wanted) &&
        ![...n.querySelectorAll("li, button")].some((k) => k.textContent?.includes(wanted)),
    );
    if (hits.length === 0) return `${wanted} absent`;
    return `${wanted} listed as: ${hits.map((n) => n.innerText.replace(/\n/g, " · ")).join(" | ")}`;
  }, WHITE);
}

const browser = await clerkSetup().then(() => chromium.launch());
const context = await browser.newContext({ viewport: { width: 1300, height: 950 } });
const page = await context.newPage();
page.on("pageerror", (e) => console.log(`  [pageerror] ${String(e).slice(0, 300)}`));

await signIn(page);

for (const [label, partner, want] of [
  ["pair (union has white)", PARTNER, "offered"],
  ["single (no white)", null, "absent"],
]) {
  const url = await createDeck(page, partner, label.split(" ")[0]);
  console.log(`\n${label}: ${await searchAddPanel(page, url)} (want ${want})`);
}

await browser.close();
