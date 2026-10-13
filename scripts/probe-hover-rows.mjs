// Where the hover preview is, and is not (Hugh, 2026-10-12), in a real browser at 1300x900 and 390x844.
//
//  - A TILE draws no preview: the art on it is already about the size of one. Walked on the deck's Card view, the
//    collection grid, a set's grid and an open precon's Card view. Each is paired with a CONTROL on the same page or a
//    sibling surface that does preview, so "nothing opened" cannot be a probe that never hovered anything.
//  - A token row previews on its image and its name, not on the rules text and makers line under them, and shows the
//    token's own printing.
//  - Card details opened from a token pages through the deck's tokens: Next and Previous reach the neighbor.
//  - A proposed cut's reason is `probe:cuts-panel`'s (it owns the stored-result fixture).
//
// The preview box is `md:block` only, so the hover checks run at 1300; the phone walk is the token paging and the
// tile press, with no overflow. Makes no writes. Needs a server with DECK_TOKENS_ENABLED and PRECONS_ENABLED on and a
// database holding the token catalog, the precons and a deck that makes tokens (a `pull:staging` copy on a scratch
// branch). The precon is `PROBE_PRECON` (default CallingAllAngels_FDC); its list-row control names three of ITS cards.
//
//   PROBE_BASE=http://localhost:3731 PROBE_SHOTS=<dir> node scripts/probe-hover-rows.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS;
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 }, desktop: true },
  { label: 390, viewport: { width: 390, height: 844 }, desktop: false },
];

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${JSON.stringify(detail)}`);
  if (!ok) failures += 1;
}

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
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const boxOpen = (page) => page.evaluate(() => document.querySelector('[data-testid="hover-preview"]') !== null);
const boxStyle = (page) => page.evaluate(() => document.querySelector('[data-testid="hover-preview"]')?.getAttribute("style") ?? null);

/** Hover one element from a clean pointer, wait out the open delay, and say whether a box opened. */
async function hoverOpens(page, locator) {
  await page.mouse.move(2, 2);
  await page.waitForTimeout(250);
  await locator.hover();
  await page.waitForTimeout(700);
  return boxOpen(page);
}

/** Hover the first `tries` elements of `locator`; true when ANY of them opened a box. */
async function anyOpens(page, locator, tries = 6) {
  const n = Math.min(tries, await locator.count());
  for (let i = 0; i < n; i++) if (await hoverOpens(page, locator.nth(i))) return true;
  return false;
}

async function deckHrefs(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  await onPage(page, "li article").first().waitFor({ timeout: 15_000 }).catch(() => {});
  return page.evaluate(() => [
    ...new Set(
      [...document.querySelectorAll('main li article a[href^="/decks/"]')]
        .map((a) => a.getAttribute("href"))
        .filter((h) => /^\/decks\/[^/]+$/.test(h ?? "")),
    ),
  ]);
}

const TOKENS = 'section[aria-labelledby="deck-tokens-heading"]';

/** The first deck whose Tokens group lists at least two tokens, or null. */
async function deckWithTokens(page, hrefs) {
  for (const href of hrefs.slice(0, 20)) {
    await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    if ((await onPage(page, `${TOKENS} li`).count()) >= 2) return href;
  }
  return null;
}

async function seeCardView(page) {
  await onPageRole(page, "button", /^Card view$/).first().click({ timeout: 15_000 });
  await page.waitForTimeout(700);
}

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: w.viewport });
    const page = await ctx.newPage();
    await page.addInitScript("window.__name = (f) => f;");
    // /collection reads the whole collection and a cold dev compile of a route is slow: 30s is not enough on a first visit.
    page.setDefaultNavigationTimeout(120_000);
    await signIn(page);
    await clearAboutSheet(page, await page.evaluate(() => window.Clerk.user.id));
    const shot = (name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/hover-rows-${name}-${w.label}.png` }) : Promise.resolve());

    const hrefs = await deckHrefs(page);
    report(`${w.label} a deck to walk`, hrefs.length > 0, { decks: hrefs.length });
    const tokenDeck = await deckWithTokens(page, hrefs);
    report(`${w.label} a deck that makes two or more tokens`, tokenDeck !== null, tokenDeck);
    if (tokenDeck === null) continue;

    // ---- the deck: list rows preview (control), Card view tiles do not ----
    await page.goto(`${BASE}${tokenDeck}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    if (w.desktop) {
      const listOpens = await anyOpens(page, onPage(page, "section li button:not([aria-hidden]):not([aria-expanded])"), 10);
      report(`${w.label} control: a decklist row previews`, listOpens, { listOpens });
    }
    await seeCardView(page);
    await shot("deck-card-view");
    const tiles = onPage(page, 'li:has([class*="min-h-[50px]"]) button');
    const tileCount = await tiles.count();
    report(`${w.label} deck Card view draws tiles`, tileCount > 0, { tileCount });
    if (w.desktop && tileCount > 0) {
      report(`${w.label} deck Card view: no tile previews`, !(await anyOpens(page, tiles, 6)), null);
    }
    await onPageRole(page, "button", /^List view$/).first().click({ timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(500);

    // ---- tokens: preview on the image and the name only; details page through them ----
    const names = await onPage(page, `${TOKENS} li button:not([aria-hidden]):not([aria-expanded])`).allInnerTexts();
    const tokenNames = names.map((n) => n.trim()).filter(Boolean);
    report(`${w.label} token rows have a name to press`, tokenNames.length >= 2, tokenNames);
    await onPage(page, TOKENS).first().scrollIntoViewIfNeeded();
    await shot("tokens");
    if (w.desktop) {
      const row = onPage(page, `${TOKENS} li`).first();
      const name = row.locator("button:not([aria-hidden]):not([aria-expanded])").first();
      const art = row.locator("button[aria-hidden]").first();
      const prose = row.locator("span.font-mono").last();
      // The token the first row draws may have no picture; look down the rows for one that previews.
      let rowIndex = -1;
      const rows = onPage(page, `${TOKENS} li`);
      for (let i = 0; i < Math.min(6, await rows.count()) && rowIndex < 0; i++) {
        if (await hoverOpens(page, rows.nth(i).locator("button:not([aria-hidden]):not([aria-expanded])").first())) rowIndex = i;
      }
      report(`${w.label} a token's name previews its printing`, rowIndex >= 0, { rowIndex });
      if (rowIndex >= 0) {
        const r = rows.nth(rowIndex);
        const style = await boxStyle(page);
        await shot("token-hover");
        report(`${w.label} the box draws the token's normal-size image`, /scryfall|\.jpg|\.png/.test(style ?? "") && !/\/small\//.test(style ?? ""), (style ?? "").slice(0, 160));
        report(`${w.label} the token's image previews`, await hoverOpens(page, r.locator("button[aria-hidden]").first()), null);
        report(`${w.label} the rules and makers line under it do not`, !(await hoverOpens(page, r.locator("span.font-mono").last())), null);
        report(`${w.label} nor does the row's empty space`, !(await hoverOpens(page, r.locator("div").first())), null);
      }
      void name; void art; void prose;
    }

    // Press the first token's name, then page Next and Previous.
    await page.mouse.move(2, 2);
    await onPage(page, `${TOKENS} li button:not([aria-hidden]):not([aria-expanded])`).first().click();
    const dialog = page.getByRole("dialog").last();
    await dialog.waitFor({ timeout: 15_000 });
    await page.waitForTimeout(1200);
    const textOf = () => dialog.innerText();
    report(`${w.label} the token's details open on it`, (await textOf()).includes(tokenNames[0]), tokenNames[0]);
    const next = dialog.getByRole("button", { name: "Next card" }).first();
    report(`${w.label} Next is offered`, (await next.count()) > 0 && (await next.isEnabled()), null);
    await shot("token-details");
    if ((await next.count()) > 0) {
      await next.click();
      await page.waitForTimeout(1500);
      report(`${w.label} Next reaches the second token`, (await textOf()).includes(tokenNames[1]), tokenNames[1]);
      const prev = dialog.getByRole("button", { name: "Previous card" }).first();
      await prev.click();
      await page.waitForTimeout(1500);
      report(`${w.label} Previous comes back to the first`, (await textOf()).includes(tokenNames[0]), tokenNames[0]);
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    report(`${w.label} no horizontal overflow`, !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), null);

    // ---- the other tile views ----
    await page.goto(`${BASE}/collection?view=grid`, { waitUntil: "domcontentloaded" });
    const gridButtons = onPage(page, 'button:has(div[style*="aspect-ratio"])');
    await gridButtons.first().waitFor({ timeout: 25_000 }).catch(() => {});
    report(`${w.label} /collection grid draws tiles`, (await gridButtons.count()) > 0, { n: await gridButtons.count() });
    await shot("collection-grid");
    if (w.desktop) {
      report(`${w.label} /collection grid: no tile previews`, !(await anyOpens(page, gridButtons, 6)), null);
      await page.goto(`${BASE}/collection?view=rows`, { waitUntil: "domcontentloaded" });
      const rowButtons = onPage(page, "button[aria-busy][aria-label]");
      await rowButtons.first().waitFor({ timeout: 25_000 }).catch(() => {});
      report(`${w.label} control: a /collection row previews`, await anyOpens(page, rowButtons, 8), { rows: await rowButtons.count() });
    }

    await page.goto(`${BASE}/collection/sets`, { waitUntil: "domcontentloaded" });
    await onPage(page, 'a[href^="/collection/sets/"]').first().waitFor({ timeout: 25_000 }).catch(() => {});
    const setHref = await page.evaluate(() => [...document.querySelectorAll('main a[href^="/collection/sets/"]')].map((a) => a.getAttribute("href")).find(Boolean) ?? null);
    report(`${w.label} a set to open`, setHref !== null, setHref);
    if (setHref) {
      await page.goto(`${BASE}${setHref}`, { waitUntil: "domcontentloaded" });
      const cells = onPage(page, "[data-set-grid] button");
      await cells.first().waitFor({ timeout: 20_000 }).catch(() => {});
      report(`${w.label} the set grid draws cells`, (await cells.count()) > 0, { n: await cells.count() });
      await shot("set-grid");
      if (w.desktop) report(`${w.label} set grid: no cell previews`, !(await anyOpens(page, cells, 6)), null);
    }

    await page.goto(`${BASE}/decks/precons`, { waitUntil: "domcontentloaded" });
    await onPage(page, 'a[href^="/decks/precons/"]').first().waitFor({ timeout: 25_000 }).catch(() => {});
    const preconFile = process.env.PROBE_PRECON ?? "CallingAllAngels_FDC";
    const preconHref = await page.evaluate((file) => [...document.querySelectorAll('main a[href^="/decks/precons/"]')].map((a) => a.getAttribute("href")).find((h) => h === `/decks/precons/${file}`) ?? null, preconFile);
    report(`${w.label} a precon to open`, preconHref !== null, preconHref);
    if (preconHref) {
      await page.goto(`${BASE}${preconHref}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(4000);
      if (w.desktop) {
        await onPageRole(page, "button", /^List view$/).first().click({ timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(700);
        await shot("precon-list-view");
        // The rows' names, by their text: a row here is not a list item. These are three cards of the default precon
        // (`PROBE_PRECON`); a different precon needs its own names.
        const rowNames = onPage(page, "text=/^(Giada, Font of Hope|Angel of Finality|Angel of Vitality)$/");
        const rowOpens = await anyOpens(page, rowNames, 3);
        report(`${w.label} control: an open precon's list row previews`, rowOpens, { names: await rowNames.count() });
      }
      await seeCardView(page).catch(() => {});
      const pt = onPage(page, '[data-testid="read-only-card-tile"] button');
      report(`${w.label} the precon's Card view draws tiles`, (await pt.count()) > 0, { n: await pt.count() });
      await shot("precon-card-view");
      if (w.desktop) report(`${w.label} precon Card view: no tile previews`, !(await anyOpens(page, pt, 6)), null);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
