// probe:deck-tokens-status — the deck's status line draws a Tokens segment and its press lands on the Tokens box, in a
// real browser at 390, 768 and 1300 wide (deck tokens PR 2, handoff #3400).
//
// WHAT IT PROVES, per width, on a deck whose cards make three fixture tokens:
//  - DRAWN: the status line carries `[data-tokens-segment]` after the combos segment, saying `N tokens from M cards`
//    (the deck's own read, so N and M are at least the fixture's three), in List view and in Card view, with nothing
//    wider than the page.
//  - FROM SHOPPING: pressing it on the Shopping view returns to the deck panel and lands on `#deck-tokens-heading`
//    (box open, heading focused, in view).
//  - FROM A FOLDED BOX: with the group folded (the one stored preference), pressing it opens the box for the visit,
//    focuses the heading and leaves the stored preference folded.
//  - A press moves no figure: the segment is a button with no `aria-haspopup`.
// On main there is no segment, so every leg fails there.
//
// The fixture is three tokens, their printings and `card_tokens` links to cards one of the account's decks holds,
// plus a `token_reads` marker if the account has none; all deleted in a `finally`. Needs a server on local-dev or a
// scratch branch. Refuses staging and production by `neon.branch_id`.
//
//   pnpm dev -p 3611      PROBE_BASE=http://localhost:3611 node scripts/probe-deck-tokens-status.mjs
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
const WIDTHS = [{ width: 1300, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }];
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

/** One of the account's decks, and three of its cards to make tokens. */
async function pickDecks() {
  const rows = await sql`
    select dc.deck_id as a, dc.oracle_id as shared
    from deck_cards dc join decks d on d.id = dc.deck_id and d.user_id = ${userId}
    where (select count(*) from deck_cards x where x.deck_id = dc.deck_id) >= 3
    order by dc.deck_id, dc.oracle_id limit 1`;
  if (rows.length === 0) throw new Error("no deck of this account holds three cards");
  const { a, shared } = rows[0];
  const more = await sql`select dc.oracle_id from deck_cards dc where dc.deck_id = ${a} and dc.oracle_id <> ${shared} order by dc.oracle_id limit 2`;
  if (more.length < 2) throw new Error("the first deck needs two more cards");
  const [art] = await sql`select image_uri from cards where image_uri is not null limit 1`;
  return { a, makers: [shared, ...more.map((r) => r.oracle_id)], art: art.image_uri };
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
const SEGMENT = "[data-tokens-segment]";
const PROBE_TOKEN = /Probe (Goblin|Soldier|Treasure)/;

async function landed(page) {
  return page.evaluate((k) => ({
    open: document.querySelector("#deck-tokens-heading button")?.getAttribute("aria-expanded"),
    focus: document.activeElement?.id,
    stored: localStorage.getItem(k),
    top: Math.round(document.getElementById("deck-tokens-heading")?.getBoundingClientRect().top ?? -1),
  }), FOLD_KEY);
}

async function leg(browser, size, deckA) {
  const tag = `@${size.width}`;
  const context = await browser.newContext({ viewport: size });
  const page = await context.newPage();
  try {
    await signIn(page);
    await page.addInitScript(([f, v]) => { try { if (!sessionStorage.getItem("__seeded")) { localStorage.removeItem(f); localStorage.removeItem(v); sessionStorage.setItem("__seeded", "1"); } } catch { /* blocked */ } }, [FOLD_KEY, VIEW_KEY]);
    for (const view of ["list", "card"]) {
      await page.goto(`${BASE}/decks/${deckA}`, { waitUntil: "domcontentloaded" });
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [VIEW_KEY, view]);
      await page.goto(`${BASE}/decks/${deckA}`, { waitUntil: "domcontentloaded" });
      const segment = page.locator(SEGMENT).first();
      const drawn = await segment.waitFor({ timeout: 60_000 }).then(() => true, () => false);
      const text = drawn ? (await segment.textContent())?.trim() : "";
      const m = text?.match(/^(\d+) tokens? from (\d+) cards?/);
      const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      report(`${tag} ${view}: the status line draws "N tokens from M cards" (at least the fixture's three), nothing wider than the page`, !!m && Number(m[1]) >= 3 && Number(m[2]) >= 3 && !wide, `"${text}", wide ${wide}`);
      if (!drawn) continue;
      report(`${tag} ${view}: a plain button, not a dialog`, (await segment.evaluate((e) => e.tagName)) === "BUTTON" && (await segment.getAttribute("aria-haspopup")) === null, "button, no aria-haspopup");
      if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/tokens-status-${view}-${size.width}.png` });
    }

    // From Shopping.
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [VIEW_KEY, "list"]);
    await page.evaluate((k) => localStorage.removeItem(k), FOLD_KEY);
    await page.goto(`${BASE}/decks/${deckA}`, { waitUntil: "domcontentloaded" });
    await page.locator(SEGMENT).first().waitFor({ timeout: 60_000 });
    await onPageRole(page, "tab", /^Shopping/).first().click();
    await page.waitForTimeout(800);
    const shopSegment = page.locator(SEGMENT).first();
    const onShopping = await shopSegment.isVisible().catch(() => false);
    if (onShopping) await shopSegment.click();
    await page.waitForTimeout(1200);
    const fromShopping = await landed(page);
    report(`${tag}: pressed from Shopping, it lands on the Tokens box and focuses its heading`, onShopping && fromShopping.open === "true" && fromShopping.focus === "deck-tokens-heading" && fromShopping.top >= 0 && fromShopping.top < size.height, JSON.stringify({ onShopping, ...fromShopping }));

    // From a folded box.
    await page.locator(HEADING).first().click();
    await page.waitForTimeout(300);
    const foldedStored = await page.evaluate((k) => localStorage.getItem(k), FOLD_KEY);
    await page.evaluate(() => window.scrollTo(0, 0));
    const stillFolded = (await page.locator(HEADING).first().getAttribute("aria-expanded")) === "false";
    await page.locator(SEGMENT).first().click();
    await page.waitForTimeout(1200);
    const fromFolded = await landed(page);
    report(`${tag}: pressed with the box folded, it opens for the visit, focuses the heading and leaves the preference folded`, stillFolded && foldedStored === "closed" && fromFolded.open === "true" && fromFolded.focus === "deck-tokens-heading" && fromFolded.stored === "closed" && fromFolded.top >= 0 && fromFolded.top < size.height, JSON.stringify({ stillFolded, foldedStored, ...fromFolded }));
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
  await seed(picked.makers, picked.art, picked.a);
  for (const size of WIDTHS) await leg(browser, size, picked.a);
} catch (error) {
  console.error(error);
  failures += 1;
} finally {
  await cleanup();
  await browser.close();
}
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
