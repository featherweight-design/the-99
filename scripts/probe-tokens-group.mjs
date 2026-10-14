// probe:tokens-group — the deck's Tokens group folds and draws tiles in Card view, in a real browser at 1300x900
// and 390x844 (Hugh, 2026-10-14).
//
// WHAT IT PROVES, per width, on a deck whose cards make three fixture tokens:
//  - OPEN BY DEFAULT: List view draws the three as rows and no tiles; the heading's control says `aria-expanded`.
//  - ONE PREFERENCE, ALL DECKS: pressing the heading folds the group (no rows, the header and its note stay) and
//    writes the fold once; a SECOND deck sharing a maker draws the group folded, from the same preference.
//  - CARD VIEW: with the deck's stored view on Card, the same three are tiles in the deck's grid (two across on
//    a phone, the 178px floor from md), each with its art and name, its two presses and its makers fold, and
//    nothing is wider than the page.
//  - `Tokens ›`: from a maker's card details it opens the FOLDED group for the visit, focuses the heading and
//    leaves the stored preference folded.
//  - SHOPPING: the Shopping view still draws its own Tokens group (`TokensShoppingGroup`), untouched by the fold.
//
// The fixture is three tokens, their printings (art borrowed from cards) and `card_tokens` links to cards two of
// the account's decks hold, plus a `token_reads` marker if the account has none; all of it deleted in a
// `finally`. Needs a server with DECK_TOKENS_ENABLED=true on local-dev or a scratch branch. Refuses staging and
// production by `neon.branch_id`.
//
//   DECK_TOKENS_ENABLED=true pnpm dev -p 3611      PROBE_BASE=http://localhost:3611 pnpm probe:tokens-group
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(DATABASE_URL);
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";
const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
if (!branch || branch === PRODUCTION || branch === STAGING) throw new Error(`refusing branch ${branch ?? "(unknown)"}`);

const FOLD_KEY = "the99:deck-tokens-fold";
const VIEW_KEY = "the99:deck-view";
const WIDTHS = [{ width: 1300, height: 900 }, { width: 390, height: 844 }];
let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
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
        let attempt = email.includes("+clerk_test") ? await signIn.create({ identifier: email }) : await signIn.create({ identifier: email, password });
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
  return page.evaluate(() => window.Clerk.user?.id ?? null);
}

const made = { tokens: [], reads: false };
let userId = null;

/** Two of the account's decks sharing at least one card, and three cards (the shared one first) to make tokens. */
async function pickDecks() {
  const rows = await sql`
    select a.deck_id as a, b.deck_id as b, a.oracle_id as shared
    from deck_cards a join deck_cards b on b.oracle_id = a.oracle_id and b.deck_id <> a.deck_id
    join decks da on da.id = a.deck_id and da.user_id = ${userId}
    join decks db on db.id = b.deck_id and db.user_id = ${userId}
    where (select count(*) from deck_cards x where x.deck_id = a.deck_id) >= 3
    order by a.deck_id, b.deck_id limit 1`;
  if (rows.length === 0) throw new Error("no two decks of this account share a card");
  const { a, b, shared } = rows[0];
  const more = await sql`select dc.oracle_id from deck_cards dc where dc.deck_id = ${a} and dc.oracle_id <> ${shared} order by dc.oracle_id limit 2`;
  if (more.length < 2) throw new Error("the first deck needs two more cards");
  const [art] = await sql`select image_uri from cards where image_uri is not null limit 1`;
  return { a, b, makers: [shared, ...more.map((r) => r.oracle_id)], art: art.image_uri };
}

async function seed(makers, art, deckA) {
  const names = ["Probe Goblin", "Probe Soldier", "Probe Treasure"];
  for (let i = 0; i < 3; i += 1) {
    const id = randomUUID();
    made.tokens.push(id);
    await sql`insert into tokens (oracle_id, name, type_line, colors, power, toughness, layout) values (${id}, ${names[i]}, ${"Token Creature — Probe"}, ${i === 2 ? [] : ["R"]}, ${"1"}, ${"1"}, ${"token"})`;
    await sql`insert into token_printings (scryfall_id, token_oracle_id, set_code, collector_number, image_uri, image_uri_small, finishes) values (${randomUUID()}, ${id}, ${"tprb"}, ${String(i + 1)}, ${art}, ${art}, ${["nonfoil"]})`;
    await sql`insert into card_tokens (card_oracle_id, token_oracle_id) values (${makers[i]}, ${id})`;
  }
  // One token on the first deck's Shopping list, so that view has a Tokens group to keep.
  await sql`insert into deck_token_joins (deck_id, token_oracle_id, user_id) values (${deckA}, ${made.tokens[0]}, ${userId})`;
  const [read] = await sql`select 1 from token_reads where user_id = ${userId}`;
  if (!read) {
    await sql`insert into token_reads (user_id) values (${userId})`;
    made.reads = true;
  }
}

/** A cleanup that fails leaves fixtures behind on a shared database: report it, and keep deleting the rest. */
async function tidy(label, run) {
  try {
    await run();
  } catch (error) {
    report(`cleanup: ${label}`, false, String(error?.message ?? error));
  }
}

async function cleanup() {
  for (const id of made.tokens) {
    await tidy(`joins of ${id}`, () => sql`delete from deck_token_joins where token_oracle_id = ${id}`);
    await tidy(`ownership of ${id}`, () => sql`delete from token_ownership where token_oracle_id = ${id}`);
    await tidy(`links of ${id}`, () => sql`delete from card_tokens where token_oracle_id = ${id}`);
    await tidy(`printings of ${id}`, () => sql`delete from token_printings where token_oracle_id = ${id}`);
    await tidy(`token ${id}`, () => sql`delete from tokens where oracle_id = ${id}`);
  }
  if (made.reads) await tidy("read marker", () => sql`delete from token_reads where user_id = ${userId}`);
}

const HEADING = "#deck-tokens-heading button";
/** PROBE_SHOTS=<dir>: the group as drawn at each state, one image apiece. */
const shot = (page, width, name) =>
  process.env.PROBE_SHOTS ? page.locator("section[aria-labelledby='deck-tokens-heading']").first().screenshot({ path: `${process.env.PROBE_SHOTS}/tokens-${name}-${width}.png` }) : null;
// Only THIS run's fixture tokens (named `Probe …`): a populated catalog may already give the deck tokens of its own.
const PROBE_TOKEN = /Probe (Goblin|Soldier|Treasure)/;
const rows = (page) => page.locator("main li[data-token-state]:not([data-token-tile])").filter({ hasText: PROBE_TOKEN }).count();
const tiles = (page) => page.locator("main [data-token-tile]").filter({ hasText: PROBE_TOKEN }).count();

async function leg(browser, size, deckA, deckB, makerName) {
  const tag = `@${size.width}`;
  const context = await browser.newContext({ viewport: size });
  const page = await context.newPage();
  try {
    await signIn(page);
    // A clean browser: neither the fold nor the view is set.
    await page.addInitScript(([f, v]) => { try { if (!sessionStorage.getItem("__seeded")) { localStorage.removeItem(f); localStorage.removeItem(v); sessionStorage.setItem("__seeded", "1"); } } catch { /* blocked */ } }, [FOLD_KEY, VIEW_KEY]);
    await page.goto(`${BASE}/decks/${deckA}`, { waitUntil: "domcontentloaded" });
    await page.locator(HEADING).first().waitFor({ timeout: 60_000 });
    const toggle = page.locator(HEADING).first();
    report(`${tag}: List view, open by default, three rows and no tiles`, (await toggle.getAttribute("aria-expanded")) === "true" && (await rows(page)) === 3 && (await tiles(page)) === 0, `${await rows(page)} rows, ${await tiles(page)} tiles`);

    await shot(page, size.width, "list-open");
    await toggle.click();
    await page.waitForTimeout(300);
    await shot(page, size.width, "folded");
    const folded = await page.evaluate((k) => localStorage.getItem(k), FOLD_KEY);
    report(`${tag}: the heading folds the group and writes the one preference`, (await toggle.getAttribute("aria-expanded")) === "false" && (await rows(page)) === 0 && folded === "closed", `expanded ${await toggle.getAttribute("aria-expanded")}, rows ${await rows(page)}, stored ${folded}`);
    const noteShown = await page.locator("main").getByText(/not in the 99 · from/).count();
    report(`${tag}: a folded group still says what it is`, noteShown > 0, `${noteShown} note(s)`);

    await page.goto(`${BASE}/decks/${deckB}`, { waitUntil: "domcontentloaded" });
    await page.locator(HEADING).first().waitFor({ timeout: 60_000 });
    report(`${tag}: another deck's group is folded by the same preference`, (await page.locator(HEADING).first().getAttribute("aria-expanded")) === "false" && (await rows(page)) === 0, `expanded ${await page.locator(HEADING).first().getAttribute("aria-expanded")}`);

    // Card view, expanded: tiles.
    await page.locator(HEADING).first().click();
    await page.evaluate((k) => localStorage.setItem(k, "card"), VIEW_KEY);
    await page.goto(`${BASE}/decks/${deckA}`, { waitUntil: "domcontentloaded" });
    await page.locator("main [data-token-tile]").filter({ hasText: PROBE_TOKEN }).first().waitFor({ timeout: 60_000 });
    // Art waits to come near the viewport (`HydratedImg`), so bring the group there first.
    await page.locator("main [data-token-tile]").filter({ hasText: PROBE_TOKEN }).first().scrollIntoViewIfNeeded();
    const artLoaded = await page.waitForFunction(
      () => {
        const imgs = [...document.querySelectorAll("main [data-token-tile]")].filter((t) => /Probe (Goblin|Soldier|Treasure)/.test(t.textContent)).map((t) => t.querySelector("img"));
        return imgs.length === 3 && imgs.every((i) => i && i.complete && i.naturalWidth > 0);
      },
      null, { timeout: 20_000 },
    ).then(() => true, () => false);
    report(`${tag}: each tile's art loads`, artLoaded, artLoaded ? "3 of 3" : "not loaded in 20s");
    await page.waitForTimeout(500);
    const geo = await page.evaluate(() => {
      const ts = [...document.querySelectorAll("main [data-token-tile]")].filter((t) => /Probe (Goblin|Soldier|Treasure)/.test(t.textContent));
      const boxes = ts.map((t) => { const r = t.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width) }; });
      const tops = [...new Set(boxes.map((b) => b.t))];
      const firstRow = boxes.filter((b) => b.t === tops[0]).length;
      return {
        n: ts.length, w: boxes[0]?.w, firstRow,
        art: ts.every((t) => !!t.querySelector("img")),
        names: ts.map((t) => t.textContent.includes("Probe")).every(Boolean),
        wide: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        rowsLeft: [...document.querySelectorAll("main li[data-token-state]:not([data-token-tile])")].filter((r) => /Probe (Goblin|Soldier|Treasure)/.test(r.textContent)).length,
      };
    });
    report(`${tag}: Card view draws the three as tiles with art and names, no rows, nothing wider than the page`, geo.n === 3 && geo.art && geo.names && geo.rowsLeft === 0 && !geo.wide, JSON.stringify(geo));
    if (size.width < 500) report(`${tag}: two across on a phone`, geo.firstRow === 2, `${geo.firstRow} in the first row, tiles ${geo.w}px`);
    else report(`${tag}: the deck's 178px floor from md`, geo.w >= 178, `${geo.w}px`);
    await shot(page, size.width, "card-open");
    const controls = await page.locator("main [data-token-tile]").filter({ hasText: PROBE_TOKEN }).first().getByRole("button").count();
    report(`${tag}: a tile keeps its presses and makers fold`, controls >= 3, `${controls} buttons`);

    // `Tokens ›` on a folded group.
    await page.locator(HEADING).first().click();
    await page.waitForTimeout(200);
    const stored = await page.evaluate((k) => localStorage.getItem(k), FOLD_KEY);
    const detailsTrigger = page.getByRole("button", { name: `View details for ${makerName}` }).first();
    await detailsTrigger.scrollIntoViewIfNeeded();
    await detailsTrigger.click();
    // A phone opens the card as a collapsed sheet: the deck's box is behind "All details".
    if (size.width < 500) await page.getByRole("button", { name: /^All details/ }).first().click({ timeout: 10_000 });
    const link = page.getByRole("button", { name: "Show this deck’s tokens" });
    await link.waitFor({ timeout: 30_000 });
    await link.click();
    await page.waitForTimeout(800);
    const landed = await page.evaluate((k) => ({
      open: document.querySelector("#deck-tokens-heading button")?.getAttribute("aria-expanded"),
      focus: document.activeElement?.id,
      stored: localStorage.getItem(k),
      top: Math.round(document.getElementById("deck-tokens-heading")?.getBoundingClientRect().top ?? -1),
    }), FOLD_KEY);
    report(`${tag}: Tokens › opens the folded group, focuses its heading and leaves the preference folded`, stored === "closed" && landed.open === "true" && landed.focus === "deck-tokens-heading" && landed.stored === "closed" && landed.top >= 0 && landed.top < size.height, JSON.stringify({ stored, ...landed }));

    // Shopping keeps its own Tokens group.
    await page.evaluate((k) => localStorage.removeItem(k), FOLD_KEY);
    await onPageRole(page, "button", /^Shopping/).first().click();
    await page.waitForTimeout(800);
    const shopTokens = await page.locator("main").getByText("Probe Goblin").count();
    report(`${tag}: Shopping still draws its own Tokens group (the joined token)`, shopTokens > 0, `${shopTokens} mention(s)`);
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch();
try {
  await clerkSetup();
  const setup = await (await browser.newContext()).newPage();
  userId = await signIn(setup);
  const picked = await pickDecks();
  const [makerRow] = await sql`select name from cards where oracle_id = ${picked.makers[0]}`;
  await seed(picked.makers, picked.art, picked.a);
  for (const size of WIDTHS) await leg(browser, size, picked.a, picked.b, makerRow.name);
} catch (error) {
  console.error(error);
  failures += 1;
} finally {
  await cleanup();
  await browser.close();
}
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
