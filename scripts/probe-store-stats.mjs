// probe:store-stats — store choice UI-1b (handoff design_handoff_the99_store_choice): a reader on another store
// sees every money figure on /decks and Home in that store. Pressed in Chromium at 390x844 and 1300x900.
//
// What jsdom cannot prove, and this does:
//   - Opening Stats' "What each deck is worth" and "Your collection" cards on the real page draws the store's
//     caption ("TCGplayer market prices, …"), and no "Mana Pool" caption.
//   - The /decks cart entry, Home's To buy row and the all-decks cart (already store-aware) print one figure: no
//     surface still totals in Mana Pool while another totals in the reader's store.
// Fails on main: both captions read "Mana Pool prices", and /decks and Home total in Mana Pool while the cart does not.
//
// FIXTURE (read only): a scratch branch of local-dev, which the worktree's env DATABASE_URL and the dev server both
// read, where the audit account has a user STORE_PREFERENCE_ENABLED override 'on', user_prefs.preferred_store =
// 'tcgplayer', printing_store_prices rows for tcgplayer priced apart from Mana Pool's, and decks with cards to buy.
//
//   PROBE_BASE=http://localhost:3158 pnpm probe:store-stats
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

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
const dollars = (text) => text?.match(/\$[\d,]+\.\d{2}/)?.[0] ?? null;

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


/** Opens a Stats card by pressing its header, then returns its caption line (the last line naming prices). */
async function caption(page, id) {
  const card = onPage(page, `[data-stats-card="${id}"]`).first();
  await card.waitFor({ timeout: 30_000 });
  const button = card.locator(":scope > button");
  if ((await button.getAttribute("aria-expanded")) !== "true") {
    await button.scrollIntoViewIfNeeded();
    await button.click();
  }
  const line = card.locator("span", { hasText: / prices, / }).last();
  await line.waitFor({ timeout: 15_000 });
  return (await line.textContent())?.trim() ?? "";
}

async function run(size) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
    const page = await context.newPage();
    await signIn(page);

    await page.goto(`${BASE}/decks?view=stats`, { waitUntil: "domcontentloaded" });
    for (const id of ["worth", "collection"]) {
      const text = await caption(page, id);
      check(/(^| · )TCGplayer market prices, /.test(text) && !text.includes("Mana Pool"), `${size.name} Stats ${id} caption names TCGplayer market prices`, JSON.stringify(text));
    }

    await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
    const entry = onPage(page, "a[href='/decks/shopping']").first();
    await entry.waitFor({ timeout: 30_000 });
    const decksFigure = dollars(await entry.innerText());

    await page.goto(`${BASE}/decks/shopping`, { waitUntil: "domcontentloaded" });
    const checkout = onPage(page, "[data-cart-checkout]").first();
    await checkout.waitFor({ timeout: 30_000 });
    const cartFigure = dollars(await checkout.innerText());

    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const commitments = onPage(page, "[data-commitments]").first();
    await commitments.waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1500); // the CountUp settles on its figure
    const homeFigure = dollars(await commitments.innerText());

    check(cartFigure !== null, `${size.name} the all-decks cart prints a total`, cartFigure);
    check(decksFigure === cartFigure, `${size.name} the /decks cart entry totals in the cart's store`, `${decksFigure} vs cart ${cartFigure}`);
    check(homeFigure === cartFigure, `${size.name} Home's To buy totals in the cart's store`, `${homeFigure} vs cart ${cartFigure}`);
  } finally {
    await browser.close();
  }
}

await clerkSetup();
for (const size of WIDTHS) await run(size);
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
