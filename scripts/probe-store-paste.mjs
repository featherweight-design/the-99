// probe:store-paste — store choice UI-1a (handoff design_handoff_the99_store_choice, call 6): a reader whose store has
// no whole-list link gets "Copy the list" and a link to the store's paste page in place of the Mana Pool cart link, on
// the deck's Shopping strip and on the all-decks cart. Pressed in Chromium at 390x844 and 1300x900.
//
// What jsdom cannot prove, and this does:
//   - The real page, read on the reader's store (readerStore on the request's switches), draws the paste row and no
//     manapool.com link, on both surfaces.
//   - Pressing Copy the list puts the list on the real clipboard as `<quantity> <name>` lines, swaps the label to
//     Copied and announces it.
//   - The paste link opens a new tab at the store's paste page.
// Fails on main: no `[data-copy-list]` control exists, and the strip still links to Mana Pool.
//
// FIXTURE (read only; it writes nothing but the browser's clipboard): a scratch branch of local-dev, which the
// worktree's `.env` DATABASE_URL and the dev server both read, where the audit account has a user
// STORE_PREFERENCE_ENABLED override 'on', user_prefs.preferred_store = PROBE_STORE, and printing_store_prices rows for
// that store (no store ingest has run anywhere yet). PROBE_DECK is one of its decks with cards to buy.
//
//   PROBE_BASE=http://localhost:3158 PROBE_STORE=tcgplayer PROBE_DECK=<deck id> pnpm probe:store-paste
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname)) {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback dev server only`);
  }
}
const DECK = process.env.PROBE_DECK;
if (!DECK) throw new Error("Set PROBE_DECK to a deck of the audit account with cards to buy.");
// Mirrors PASTE_URLS in src/lib/stores/info.ts: the probe checks the drawn link against the constant's value.
const PASTE = {
  tcgplayer: { url: "https://www.tcgplayer.com/massentry", name: "Mass Entry" },
  cardkingdom: { url: "https://www.cardkingdom.com/builder", name: "Deck Builder" },
};
const STORE = process.env.PROBE_STORE ?? "tcgplayer";
if (!PASTE[STORE]) throw new Error(`PROBE_STORE must be one of ${Object.keys(PASTE).join(", ")}`);

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

/** Checks one surface's paste row, then presses Copy the list. `scope` is the locator the row must sit inside. */
async function pressCopy(page, scope, where) {
  const row = scope.locator("[data-store-paste]").first();
  const drawn = (await row.count()) > 0;
  check(drawn, `${where}: the paste row is drawn for ${STORE}`, drawn ? "present" : "absent");
  const manapool = await scope.locator("a[href*='manapool.com']").count();
  check(manapool === 0, `${where}: no Mana Pool link`, `${manapool} manapool.com link(s)`);
  if (!drawn) return;

  const link = row.getByRole("link", { name: new RegExp(`^Open ${PASTE[STORE].name}`) });
  const href = (await link.count()) ? await link.getAttribute("href") : null;
  const target = href ? await link.getAttribute("target") : null;
  check(href === PASTE[STORE].url && target === "_blank", `${where}: Open ${PASTE[STORE].name} opens ${PASTE[STORE].url} in a new tab`, `${href} target=${target}`);

  await page.evaluate(() => navigator.clipboard.writeText(""));
  const button = row.locator("[data-copy-list]");
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await page.waitForTimeout(200);
  const text = await page.evaluate(() => navigator.clipboard.readText());
  const lines = text.split("\n").filter(Boolean);
  const shaped = lines.length > 0 && lines.every((l) => /^\d+ \S/.test(l));
  check(shaped, `${where}: Copy the list puts "<quantity> <name>" lines on the clipboard`, `${lines.length} line(s), first ${JSON.stringify(lines[0] ?? "")}`);
  const label = (await button.textContent())?.trim();
  check(label?.endsWith("Copied") && !label.includes("Copy the list"), `${where}: the label swaps to ✓ Copied`, JSON.stringify(label));
  const status = (await row.getByRole("status").textContent().catch(() => ""))?.trim();
  check(status === "Copied", `${where}: the press is announced`, JSON.stringify(status));
}

async function run(size) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    await signIn(page);

    await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded" });
    await onPageRole(page, "tab", /^Shopping/).first().click({ timeout: 30_000 });
    const strip = onPage(page, "[data-price-strip]").first();
    await strip.waitFor({ timeout: 30_000 });
    await pressCopy(page, strip, `${size.name} deck Shopping strip`);

    await page.goto(`${BASE}/decks/shopping`, { waitUntil: "domcontentloaded" });
    const checkout = onPage(page, "[data-cart-checkout]").first();
    await checkout.waitFor({ timeout: 30_000 });
    await pressCopy(page, checkout, `${size.name} all-decks cart`);
  } finally {
    await browser.close();
  }
}

await clerkSetup();
for (const size of WIDTHS) await run(size);
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
