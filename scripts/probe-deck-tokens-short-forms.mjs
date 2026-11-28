// probe:deck-tokens-short-forms — below `md` the deck's status strip draws its short forms and stays on one line; from `md`
// up it draws the full wording; each press keeps the full sentence as its accessible name (deck tokens PR 3, handoff #3400).
//
// WHAT IT PROVES, at 390, 767, 768, 769 and 1300 wide, on a deck whose cards make three fixture tokens:
//  - BELOW 768 (390, 767): what is DRAWN (innerText, so a `hidden` form does not count) is `N tokens` for the tokens segment,
//    `N near combos` for the combos segment (when the deck has one) and `vN · <date>` without "committed" for the version
//    (when the deck is committed).
//  - FROM 768 (768, 769, 1300): the full wording is drawn: `N tokens from M cards`, `N combos one piece away`, `committed`.
//  - EVERY width: the press's aria-label is the full sentence, and the strip's segments sit on ONE row at 390 and 767.
//  - nothing wider than the page.
// On main the short forms do not exist, so the below-768 legs fail there.
//
// Same fixture as probe:deck-tokens-status (three tokens, links, read marker), all deleted in a `finally`. Needs a server
// on local-dev or a scratch branch. Refuses staging and production by `neon.branch_id`.
//
//   pnpm dev -p 3611      PROBE_BASE=http://localhost:3611 node scripts/probe-deck-tokens-short-forms.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

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
const WIDTHS = [1300, 769, 768, 767, 390].map((width) => ({ width, height: 900 }));
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
  // The art is a real token's image (never a card's), picked in a fixed order so every run draws the same one; the
  // probe's own printings (set `tprb`) are left out so a leftover from a failed run cannot be picked.
  const [art] = await sql`select image_uri from token_printings where image_uri is not null and set_code <> ${"tprb"} order by scryfall_id limit 1`;
  if (!art) throw new Error("the catalog holds no token printing to borrow art from");
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

const SEGMENT = "[data-tokens-segment]";
const COMBOS = "[data-combos-close]";

async function leg(browser, size, deckA) {
  const tag = `@${size.width}`;
  const phone = size.width < 768;
  const context = await browser.newContext({ viewport: size });
  const page = await context.newPage();
  try {
    await signIn(page);
    await page.addInitScript(([f, v]) => { try { if (!sessionStorage.getItem("__seeded")) { localStorage.removeItem(f); localStorage.setItem(v, "list"); sessionStorage.setItem("__seeded", "1"); } } catch { /* blocked */ } }, [FOLD_KEY, VIEW_KEY]);
    await page.goto(`${BASE}/decks/${deckA}`, { waitUntil: "domcontentloaded" });
    const segment = page.locator(SEGMENT).first();
    const drawn = await segment.waitFor({ timeout: 60_000 }).then(() => true, () => false);
    if (!drawn) return report(`${tag}: the tokens segment draws`, false, "no [data-tokens-segment]");

    const read = await page.evaluate(([s, c]) => {
      const text = (el) => el?.innerText.replace(/\s+/g, " ").trim() ?? null;
      const tokens = document.querySelector(s);
      const combos = document.querySelector(c);
      const foot = tokens.closest("[data-todo-foot]");
      const segs = [...foot.querySelectorAll(":scope > [data-foot-segment]")];
      const tops = new Set(segs.map((e) => Math.round(e.getBoundingClientRect().top)));
      const version = segs.map((e) => text(e)).find((t) => /^(· )?v\d+ /.test(t ?? ""));
      return {
        tokens: text(tokens), tokensName: tokens.getAttribute("aria-label"),
        combos: text(combos), combosName: combos?.getAttribute("aria-label") ?? null,
        version: version ?? null, rows: tops.size, segments: segs.length,
        wide: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    }, [SEGMENT, COMBOS]);

    const tokensOk = phone ? /^\d+ tokens? ›$/.test(read.tokens ?? "") : /^\d+ tokens? from \d+ cards? ›$/.test(read.tokens ?? "");
    report(`${tag}: the tokens segment draws ${phone ? "the short form" : "the full wording"}`, tokensOk, `"${read.tokens}"`);
    report(`${tag}: the tokens press is named by the full sentence`, /^\d+ tokens? from \d+ cards?$/.test(read.tokensName ?? ""), `"${read.tokensName}"`);
    report(`${tag}: the deck draws a combos segment and a version, so those legs are exercised`, read.combos !== null && read.version !== null, `combos ${read.combos !== null}, version ${read.version !== null}`);
    if (read.combos !== null) {
      report(`${tag}: the combos segment draws ${phone ? "the short form" : "the full wording"}`, phone ? /^\d+ near combos? ›$/.test(read.combos) : /^\d+ combos? one piece away ›$/.test(read.combos), `"${read.combos}"`);
      report(`${tag}: the combos press is named by the full sentence`, /^\d+ combos? one piece away$/.test(read.combosName ?? ""), `"${read.combosName}"`);
    }
    if (read.version !== null) {
      report(`${tag}: the version draws ${phone ? "short, without \"committed\"" : "the full wording with \"committed\""}`, phone ? !/committed/.test(read.version) : /committed/.test(read.version), `"${read.version}"`);
    }
    if (phone) report(`${tag}: every segment sits on one row`, read.rows === 1, `${read.segments} segments on ${read.rows} row(s)`);
    report(`${tag}: nothing wider than the page`, !read.wide, `wide ${read.wide}`);
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/tokens-short-forms-${size.width}.png` });
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
