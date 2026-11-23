// probe:store-collection — store choice UI-3b-2 (handoff design_handoff_the99_store_choice): a reader on another store
// sees their collection priced at THAT store. Pressed in Chromium at 390x844 and 1300x900, in both views.
//
// What jsdom cannot prove, and this does: the real /collection page, sorted by price, in rows and in the grid, speaks
// every priced card at the reader's store and none at Mana Pool, and pressing a priced card opens its details buying
// at that store. Fails on main: every spoken price says "at Mana Pool".
//
// FIXTURE (read only): a scratch branch of local-dev, which the dev server reads, where the audit account has a user
// STORE_PREFERENCE_ENABLED override 'on', user_prefs.preferred_store = 'tcgplayer' and printing_store_prices rows
// for tcgplayer.
//
//   PROBE_BASE=http://localhost:3161 pnpm probe:store-collection
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
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

const painted = (locator) => locator.evaluateAll((nodes) => nodes.filter((n) => n.getBoundingClientRect().width > 0).length);

async function run(size) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
    // Answer every store request locally: the probe never reaches a store.
    await context.route(/^https:\/\/(www\.)?(tcgplayer|manapool|cardkingdom)\.com\//, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title>" }));
    const page = await context.newPage();
    await signIn(page);

    for (const view of ["rows", "grid"]) {
      const label = `${size.name} ${view}`;
      // The view is the reader's last choice (localStorage, mirrored to a cookie the server reads), never a URL param.
      await page.evaluate((v) => localStorage.setItem("the99:collection-view", v), view);
      await context.addCookies([{ name: "collection_view", value: view, url: BASE }]);
      await page.goto(`${BASE}/collection?sort=price&dir=desc`, { waitUntil: "domcontentloaded" });
      // A card's accessible name: the row's aria-label, or the tile's own text (its spoken price is an sr-only span).
      // Only priced cards are read, so a control elsewhere that names a store can neither pass nor fail the checks.
      const cards = page.locator("main button").filter({ hasText: /\$/ });
      await cards.first().waitFor({ state: "attached", timeout: 60_000 }).catch(() => {});
      const named = await page.locator("main button").evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute("aria-label") ?? n.textContent ?? "").filter((name) => /\$\d/.test(name)));
      const mana = named.filter((l) => /Mana Pool/.test(l));
      const tcg = named.filter((l) => /at TCGplayer/.test(l));
      check(mana.length === 0, `${label} no card speaks Mana Pool`, `${mana.length}: ${JSON.stringify(mana.slice(0, 2))}`);
      check(tcg.length > 0, `${label} cards speak TCGplayer`, `${tcg.length}: ${JSON.stringify(tcg.slice(0, 2))}`);
    }

    // Press a priced card: its details buy at the reader's store.
    const cell = page.getByRole("button", { name: /\$[\d,.]+.* at TCGplayer/ }).filter({ visible: true }).first();
    let opened = false;
    if ((await cell.count()) > 0) {
      await cell.scrollIntoViewIfNeeded();
      for (let attempt = 0; attempt < 3 && !opened; attempt += 1) {
        await cell.click();
        opened = await page.waitForSelector('[role="dialog"]', { timeout: 10_000 }).then(() => true, () => false);
      }
    }
    check(opened, `${size.name} pressing a priced card opens card details`, opened ? "dialog" : "none");
    if (opened) {
      const dialog = page.locator('[role="dialog"]').first();
      if (size.width < 768) {
        await dialog.locator("button", { hasText: "All details" }).filter({ visible: true }).first().click({ timeout: 20_000 }).catch(() => {});
        await page.waitForTimeout(800);
      }
      const buy = dialog.getByRole("link", { name: /^Buy any printing at TCGplayer/ });
      await buy.first().waitFor({ state: "attached", timeout: 20_000 }).catch(() => {});
      const shown = await painted(buy);
      check(shown > 0, `${size.name} the card's details buy at TCGplayer`, `${shown} painted`);
    }
  } finally {
    await browser.close();
  }
}

await clerkSetup();
for (const size of WIDTHS) await run(size);
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
