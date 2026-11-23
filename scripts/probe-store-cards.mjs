// probe:store-cards — store choice UI-2 (handoff design_handoff_the99_store_choice): a reader on another store opens a
// card's details and buys at THAT store. Pressed in Chromium at 390x844 and 1300x900.
//
// What jsdom cannot prove, and this does:
//   - The real card details, opened from /collection, draws `Buy any printing at TCGplayer` and no Mana Pool link,
//     at both widths (the phone sheet and the desktop modal are separate subtrees).
//   - PRESSING it opens TCGplayer's name search for the card in a new tab (the request is answered locally, so the
//     probe never reaches the store).
//   - `· market price` paints beside the figure, and the tag's spoken sentence names TCGplayer's market price.
// Fails on main: the link reads `Buy any printing at Mana Pool` and opens manapool.com, and there is no note.
//
// FIXTURE (read only): a scratch branch of local-dev, which the dev server reads, where the audit account has a user
// STORE_PREFERENCE_ENABLED override 'on', user_prefs.preferred_store = 'tcgplayer', printing_store_prices rows for
// tcgplayer, owns PROBE_CARD (default `Aggravated Assault`) with a TCGplayer figure, and has price-drop on in user_prefs.feed_kinds and a price-drop feed item with data.store 'tcgplayer'
// for PROBE_FEED_CARD (default `Smothering Tithe`). Home's press is checked the same way.
//
//   PROBE_BASE=http://localhost:3158 pnpm probe:store-cards
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const CARD = process.env.PROBE_CARD ?? "Aggravated Assault";
const FEED_CARD = process.env.PROBE_FEED_CARD ?? "Smothering Tithe";
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

async function openCard(page) {
  await page.goto(`${BASE}/collection?view=rows&q=${encodeURIComponent(CARD)}`, { waitUntil: "domcontentloaded" });
  const pattern = new RegExp(`^${CARD.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},`);
  const row = page.getByRole("button", { name: pattern }).first();
  // The row paints before hydration, so a first press on a cold server can land on no handler: the retry is the wait.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await row.click();
    const opened = await page.waitForSelector('[role="dialog"]', { timeout: 10_000 }).then(() => true, () => false);
    if (opened) break;
    if (attempt === 2) throw new Error(`the modal never opened for ${CARD}`);
  }
  // The price rides the card's own fetch, after the dialog opens: wait for a painted tag.
  await page.waitForFunction(
    () => [...document.querySelectorAll('[data-testid^="modal-price-"]')].some((n) => n.getBoundingClientRect().width > 0),
    null,
    { timeout: 20_000 },
  );
}

async function run(size) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
    // Answer every store request locally: the press is measured by where it goes, never by reaching the store.
    await context.route(/^https:\/\/(www\.)?(tcgplayer|manapool|cardkingdom)\.com\//, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title>" }));
    const page = await context.newPage();
    await signIn(page);
    await openCard(page);
    const dialog = page.locator('[role="dialog"]').first();
    // The phone sheet opens as a teaser; its link sits at the end of the full sheet, reached by All details.
    if (size.width < 768) {
      await dialog.locator("button", { hasText: "All details" }).filter({ visible: true }).first().click({ timeout: 20_000 });
      await page.waitForTimeout(800);
    }

    const visible = (locator) => locator.evaluateAll((nodes) => nodes.filter((n) => n.getBoundingClientRect().width > 0).length);
    const link = dialog.getByRole("link", { name: /^Buy any printing at TCGplayer/ });
    const shown = await visible(link);
    check(shown > 0, `${size.name} card details links TCGplayer`, `${shown} painted`);
    const mana = await visible(dialog.getByRole("link", { name: /Mana Pool/ }));
    check(mana === 0, `${size.name} no Mana Pool link in card details`, `${mana} painted`);

    const note = dialog.locator('[data-testid^="modal-market-note-"]');
    const noteText = await note.evaluateAll((nodes) => nodes.filter((n) => n.getBoundingClientRect().width > 0).map((n) => n.textContent));
    check(noteText.length === 1 && noteText[0] === "· market price", `${size.name} \`· market price\` beside the figure`, JSON.stringify(noteText));

    const spoken = await dialog.locator(".sr-only", { hasText: /TCGplayer market price, last checked/ }).count();
    check(spoken > 0, `${size.name} the tag speaks TCGplayer's market price`, `${spoken} sentence(s)`);

    if (shown > 0) {
      const target = link.filter({ visible: true }).first();
      await target.scrollIntoViewIfNeeded();
      const [popup] = await Promise.all([context.waitForEvent("page", { timeout: 15_000 }), target.click()]);
      await popup.waitForURL(/^https:/, { timeout: 10_000 });
      const url = popup.url();
      const q = new URL(url).searchParams.get("q");
      check(url.startsWith("https://www.tcgplayer.com/search/magic/product?") && q === CARD, `${size.name} pressing it opens TCGplayer's search for the card`, url);
      await popup.close();
    }

    // Home's price drop: its press names the reader's store and goes there.
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    // A lone item draws as the lead story, a list item as a feed row: either way its press is a link named for it.
    const press = page.locator("[data-feed-lead] a, [data-feed-press]").filter({ visible: true }).filter({ hasText: /^Buy at / });
    const pressed = await press.first().waitFor({ timeout: 30_000 }).then(() => true, () => false);
    const label = pressed ? (await press.first().innerText()).trim()
      : `none; presses: ${JSON.stringify(await page.locator("[data-feed-press]").allInnerTexts())}, lead: ${JSON.stringify(await page.locator("[data-feed-lead]").allInnerTexts())}`;
    check(label.startsWith("Buy at TCGplayer"), `${size.name} Home's price drop reads Buy at TCGplayer`, JSON.stringify(label));
    if (pressed) {
      await press.first().scrollIntoViewIfNeeded();
      const [popup] = await Promise.all([context.waitForEvent("page", { timeout: 15_000 }), press.first().click()]);
      await popup.waitForURL(/^https:/, { timeout: 10_000 });
      const url = popup.url();
      check(url.startsWith("https://www.tcgplayer.com/search/magic/product?") && new URL(url).searchParams.get("q") === FEED_CARD, `${size.name} pressing it opens TCGplayer's search for ${FEED_CARD}`, url);
    }
  } finally {
    await browser.close();
  }
}

await clerkSetup();
for (const size of WIDTHS) await run(size);
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
