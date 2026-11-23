// probe:store-change — store choice UI-4a (handoff design_handoff_the99_store_choice, calls 1 and 2): Change store trails
// the provenance line on a deck's Shopping strip and on the all-decks cart, and lands on Settings' Store section,
// first on the page and washed; pressing a store there saves it. Pressed in Chromium at 390x844 and 1300x900.
//
// What jsdom cannot prove, and this does:
//   - The real pages draw the link, named for the reader's store, on both surfaces, and pressing it navigates to
//     /settings#settings-store with the section in view and washed.
//   - The Store section is the page's first section, and a pressed store survives a reload (the server action saved
//     it); the probe then presses the reader's starting store back and checks that survives a reload too.
// Fails on main: no `[data-store-door]` link and no `#settings-store` section exist.
//
// FIXTURE: a scratch branch of local-dev, which the worktree's `.env` DATABASE_URL and the dev server both read, where
// the audit account has a user STORE_PREFERENCE_ENABLED override 'on' and PROBE_DECK is one of its decks with cards to
// buy. It WRITES the audit account's user_prefs.preferred_store through the page, and puts the starting store back.
//
//   PROBE_BASE=http://localhost:3158 PROBE_DECK=<deck id> pnpm probe:store-change
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
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
// Mirrors STORE_INFO's names in src/lib/stores/info.ts.
const NAMES = { manapool: "Mana Pool", tcgplayer: "TCGplayer", cardkingdom: "Card Kingdom" };

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

/** Presses Change store inside `scope` and checks the landing. Returns the store the section shows checked. */
async function pressDoor(page, scope, where) {
  const door = scope.locator("[data-store-door]").first();
  const drawn = (await door.count()) > 0;
  check(drawn, `${where}: Change store trails the provenance line`, drawn ? "present" : "absent");
  if (!drawn) return null;
  const line = (await door.evaluate((a) => a.closest("p")?.textContent ?? "")).trim();
  check(/ · Change store$/.test(line), `${where}: the line ends " · Change store"`, JSON.stringify(line.slice(-40)));
  const name = await door.getAttribute("aria-label");
  await door.scrollIntoViewIfNeeded();
  await door.click();
  await page.waitForURL(/\/settings#settings-store$/, { timeout: 30_000 });
  const section = page.locator("#settings-store");
  await section.waitFor({ timeout: 30_000 });
  const washed = await page
    .waitForFunction(() => document.getElementById("settings-store")?.hasAttribute("data-washed"), null, { timeout: 5_000 })
    .then(() => true, () => false);
  check(washed, `${where}: lands on /settings#settings-store with the section washed`, page.url());
  const box = await section.boundingBox();
  const vh = page.viewportSize().height;
  check(box && box.y >= 0 && box.y < vh, `${where}: the section is in view`, box ? `top ${Math.round(box.y)} of ${vh}` : "no box");
  const checked = await section.locator("input[type=radio]:checked").getAttribute("value");
  check(name === `Change store, now ${NAMES[checked]}`, `${where}: the link names the store Settings shows checked`, `${name} / ${checked}`);
  return checked;
}

/** Reloads Settings and reads the store its section shows checked. */
async function chosen(page) {
  await page.goto(`${BASE}/settings`, { waitUntil: "load" });
  const section = page.locator("#settings-store");
  await section.waitFor({ timeout: 30_000 });
  return section.locator("input[type=radio]:checked").getAttribute("value");
}

async function pressStore(page, store) {
  const section = page.locator("#settings-store");
  // The press must reach the hydrated page: before hydration a label click only ticks the native radio and saves
  // nothing. So wait for the server action's POST, then for the rows to come back (one write at a time).
  const posted = page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers(), { timeout: 30_000 });
  await section.locator(`[data-store-row=${store}]`).click();
  await posted;
  await page.waitForFunction(
    () => [...document.querySelectorAll("#settings-store input[type=radio]")].every((r) => !r.hasAttribute("aria-disabled")),
    null,
    { timeout: 15_000 },
  );
  const toast = await page.getByRole("alert").filter({ hasText: "couldn" }).count();
  check(toast === 0, `pressing ${store} raises no failure toast`, `${toast} alert(s)`);
}

async function run(size) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
    const page = await context.newPage();
    await signIn(page);

    await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded" });
    await onPageRole(page, "tab", /^Shopping/).first().click({ timeout: 30_000 });
    const strip = onPage(page, "[data-price-strip]").first();
    await strip.waitFor({ timeout: 30_000 });
    const start = await pressDoor(page, strip, `${size.name} deck Shopping strip`);

    await page.goto(`${BASE}/decks/shopping`, { waitUntil: "domcontentloaded" });
    const checkout = onPage(page, "[data-cart-checkout]").first();
    await checkout.waitFor({ timeout: 30_000 });
    await pressDoor(page, checkout, `${size.name} all-decks cart`);

    const first = await page.evaluate(() => document.querySelector("h1")?.parentElement?.querySelector("section")?.id ?? null);
    check(first === "settings-store", `${size.name}: Store is Settings' first section`, String(first));

    if (!start) return;
    const other = start === "cardkingdom" ? "tcgplayer" : "cardkingdom";
    try {
      await pressStore(page, other);
      const saved = await chosen(page);
      check(saved === other, `${size.name}: the pressed store survives a reload`, String(saved));
    } finally {
      // Reload first (a throw may have left another page open); a press on the store already checked saves nothing.
      if ((await chosen(page)) !== start) await pressStore(page, start);
      const back = await chosen(page);
      check(back === start, `${size.name}: the starting store is put back`, String(back));
    }
  } finally {
    await browser.close();
  }
}

// It writes the audit account's store through the dev server, which reads the same DATABASE_URL: refuse production,
// staging and local-dev by `neon.branch_id` before the first page.
{
  const [row] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
  assertScratchBranch(row?.branch, "probe:store-change");
}
await clerkSetup();
for (const size of WIDTHS) await run(size);
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
