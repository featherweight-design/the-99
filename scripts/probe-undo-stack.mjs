// Undo stacks across several removals (H29) — the deck page's receipts, several
// standing at once, each in its own card's place with no row shifts.
//
// Three things only a browser answers, at 390x844 and 1300x900:
//
//  1. Removing three cards from one group leaves three receipts, each drawn
//     where its own card's row was — every OTHER row's top edge is unchanged,
//     in list view and in card view.
//  2. Undoing the middle receipt puts that card back and leaves the other two
//     standing; navigating away and back clears every receipt.
//  3. Under Shopping sorted by price, removing the most expensive card leaves
//     its receipt at its own price's place rather than sorting it last — the
//     H29 reversal of the old "ranked as drawn" rule — so no row below it
//     shifts.
//
// Each scenario gets its own deck, built directly (never through the UI, which
// would spend a minute of clicks per width) and deleted in a `finally`. The
// price scenario needs UNOWNED cards with live prices; the fixture account on
// `local-dev` tends to own everything (see
// `reference_probing_buy_tags_locally.md`), so this script lifts the chosen
// cards' `collection_items` rows out for the run and puts them back in the
// `finally`, the same rule `probe:review`'s basics block follows.
//
// Point it at `local-dev`, NEVER production. Run by hand against a local
// `pnpm dev`:
//   node scripts/probe-undo-stack.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon, neonConfig } from "@neondatabase/serverless";
import { chromium } from "playwright";
import ws from "ws";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

neonConfig.webSocketConstructor = ws;

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
// Same shape as `probe-undo-removal.mjs` and `probe-commit-offer.mjs`: a
// `+clerk_test` fixture address takes the email-code path and has no
// password, so `requireEnv` cannot demand this one.
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const sql = neon(DATABASE_URL);

const VIEWPORTS = [
  { label: "390x844", width: 390, height: 844 },
  { label: "1300x900", width: 1300, height: 900 },
];

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
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

/**
 * A commander for the fixture decks. Any legendary creature does: every body
 * card below is a COLORLESS artifact, which fits any identity, and these
 * decks are written straight into `deck_cards` rather than through the add
 * flow, so identity is never checked against it either way.
 */
async function pickCommander() {
  const [row] = await sql`
    select oracle_id from cards
     where type_line ilike '%Legendary%' and type_line ilike '%Creature%'
     order by oracle_id limit 1`;
  if (!row) throw new Error("The catalog holds no legendary creature.");
  return row.oracle_id;
}

/**
 * `n` distinct, non-land, non-creature artifacts — one group under `By type`.
 * An ARTIFACT CREATURE also matches `%Artifact%` but groups under Creatures,
 * not Artifacts (`By type` reads the primary type, Creature over Artifact),
 * which would split the fixture across two groups and break the "no row
 * shifts" measurement's assumption that every card sits in one group.
 */
async function pickArtifacts(n, exclude = []) {
  const rows = await sql`
    select oracle_id, name from cards
     where type_line ilike '%Artifact%' and type_line not ilike '%Land%'
       and type_line not ilike '%Creature%'
       and color_identity = '{}'::text[]
       and not (oracle_id = any(${exclude}::uuid[]))
     order by name limit ${n}`;
  if (rows.length < n) {
    throw new Error(`The catalog holds ${rows.length} usable artifacts; the fixture needs ${n}.`);
  }
  return rows;
}

/** The same shape, ranked by their newest live price, dearest first. */
async function pickPricedArtifacts(n, exclude = []) {
  const rows = await sql`
    with newest as (select max(as_of) as t from printing_prices)
    select c.oracle_id, c.name, max(pp.price_cents) as price_cents
      from cards c
      join printings p on p.oracle_id = c.oracle_id
      join printing_prices pp on pp.scryfall_id = p.scryfall_id, newest
     where c.type_line ilike '%Artifact%' and c.type_line not ilike '%Land%'
       and c.type_line not ilike '%Creature%'
       and c.color_identity = '{}'::text[]
       and pp.as_of = newest.t and pp.price_cents is not null
       and not (c.oracle_id = any(${exclude}::uuid[]))
     group by c.oracle_id, c.name
    having count(*) > 0
     order by price_cents desc, c.name
     limit ${n}`;
  if (rows.length < n) {
    throw new Error(
      `The catalog's price feed holds ${rows.length} usable artifacts; the fixture needs ${n}.`,
    );
  }
  return rows;
}

/**
 * A deck holding exactly `cards`, each one row in `deck_cards`. Registered
 * with `onDeck` the instant it exists, before the body rows, so a throw while
 * inserting those still leaves the `finally` an id to clean up.
 */
async function buildDeck(userId, commander, cards, onDeck, name) {
  const [deck] = await sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${userId}, ${name}, ${commander}) returning id`;
  onDeck(deck.id);
  for (const c of cards) {
    await sql`insert into deck_cards (deck_id, oracle_id, quantity, auto)
              values (${deck.id}, ${c.oracle_id}, 1, false)`;
  }
  return deck.id;
}

/**
 * Takes the named cards OUT of this user's collection for the run, so they
 * draw as unowned on the Shopping list, and hands back the exact rows to put
 * back — which the `finally` does, in the same order it deleted them.
 */
async function lendAsUnowned(userId, oracleIds) {
  const rows = await sql`
    delete from collection_items
     where user_id = ${userId} and oracle_id = any(${oracleIds}::uuid[])
     returning *`;
  return rows;
}

async function restoreCollection(rows) {
  for (const r of rows) {
    await sql`insert into collection_items
                (user_id, oracle_id, quantity, set_code, scryfall_id, collector_number, finish, condition)
              values (${r.user_id}, ${r.oracle_id}, ${r.quantity}, ${r.set_code}, ${r.scryfall_id},
                      ${r.collector_number}, ${r.finish}, ${r.condition})`;
  }
}

/**
 * Every named card's row TOP, scoped to `<main>` and read through the one
 * marker a row carries in whichever state it is in: `Remove {name}` live,
 * `Undo removing {name}` as an undone-able receipt, or the bare `{name}
 * removed` text on a receipt whose undo was withdrawn.
 *
 * The row itself is found by climbing from that marker to its own row
 * wrapper — `[data-decklist-row]` in list view (`decklist-row.tsx`: the same
 * marker on a live row and on `UndoRow`, named for exactly this), or the
 * nearest `<li>` in card view (`deck-card-tile.tsx` and
 * `deck-card-undo-tile.tsx` both wrap their root in one). NOT a sibling-count
 * heuristic: a fixture that spans two `By type` groups (an Artifact Creature
 * grouping under Creatures, not Artifacts) breaks any guess keyed on how many
 * cards a container holds, and a stable marker does not care how many
 * siblings it has.
 */
function readRowTops(main, [names]) {
  function climb(el) {
    return el.closest("[data-decklist-row]") ?? el.closest("li") ?? el;
  }
  function marker(name) {
    const remove = [...main.querySelectorAll('button[aria-label^="Remove "]')]
      .find((b) => b.getAttribute("aria-label") === `Remove ${name}`);
    if (remove) return remove;
    const undo = [...main.querySelectorAll('button[aria-label^="Undo removing "]')]
      .find((b) => b.getAttribute("aria-label") === `Undo removing ${name}`);
    if (undo) return undo;
    return (
      [...main.querySelectorAll("span,p")].find((el) => el.textContent.trim() === `${name} removed`) ??
      null
    );
  }
  const tops = {};
  for (const name of names) {
    const found = marker(name);
    tops[name] = found ? Math.round(climb(found).getBoundingClientRect().top) : null;
  }
  return tops;
}

function hasReceipt(main, name) {
  return [...main.querySelectorAll("span,p")].some((el) => el.textContent.trim() === `${name} removed`);
}

/**
 * `a` and `b` as the same row top, within 1px. `getBoundingClientRect().top`
 * is a float Math.round()-ed in `readRowTops`, and at the desktop 34px row
 * height a true sub-pixel difference between a solid live-row border and a
 * receipt's dashed one can round to adjacent integers — measured as a
 * one-off 1px delta on two of five receipts at 1300x900 and nowhere at
 * 390x844, where the 44-52px rows swamp it. "No row shifts" is about the
 * list not reflowing, not about CSS borders rasterizing identically.
 */
const samePlace = (a, b) => a !== null && b !== null && Math.abs(a - b) <= 1;

const failures = [];
const note = (line) => console.log(`  ${line}`);
const check = (label, ok, detail) => {
  note(`${ok ? "ok" : "FAIL"} — ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
};

const deckIds = [];
let collectionRows = [];
let userId = null;
let browser = null;

try {
  await clerkSetup();
  browser = await chromium.launch();
  const commander = await pickCommander();

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    userId = await signIn(page);

    // ── 1 & 2: list view and card view, three removals, one undo, a nav away ──
    for (const view of ["List view", "Card view"]) {
      const owned = await pickArtifacts(6);
      const deckId = await buildDeck(userId, commander, owned, (id) => deckIds.push(id), `probe · undo stack ${view} ${vp.label}`);
      const names = owned.map((c) => c.name);
      const toRemove = [names[1], names[2], names[3]]; // the middle three
      const anchors = [names[0], names[4], names[5]]; // kept live throughout

      await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "networkidle" });
      const groupBtn = onPage(page, "button:visible").filter({ hasText: "By type" }).first();
      if ((await groupBtn.count()) > 0) await groupBtn.click();
      const toggle = onPage(page, `button[aria-label="${view}"]`).first();
      if ((await toggle.count()) > 0) await toggle.click();
      await onPage(page, `button[aria-label="Remove ${names[0]}"]`).first().waitFor({ timeout: 15_000 });

      // `getBoundingClientRect().top` is viewport-relative: a click that
      // scrolls its row into view (which a tap does, on a control near a
      // keyboard-safe area) moves every reading after it by the same
      // amount, which reads exactly like the rows themselves shifting.
      // Pinning the scroll position before each snapshot is what isolates
      // layout from scroll.
      await page.evaluate(() => window.scrollTo(0, 0));
      const before = await page.locator("main").evaluate(readRowTops, [names]);

      for (const name of toRemove) {
        await onPage(page, `button[aria-label="Remove ${name}"]`).first().click();
        await onPage(page, `button[aria-label="Undo removing ${name}"]`).first().waitFor({ timeout: 10_000 });
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      const afterRemove = await page.locator("main").evaluate(readRowTops, [names]);

      note(`${vp.label} · ${view}: before ${JSON.stringify(before)}`);
      note(`${vp.label} · ${view}: after removing 3 ${JSON.stringify(afterRemove)}`);

      for (const name of anchors) {
        check(
          `${vp.label} · ${view}: ${name}'s row top is unchanged by the removals`,
          samePlace(afterRemove[name], before[name]),
          `before ${before[name]}, after ${afterRemove[name]}`,
        );
      }
      for (const name of toRemove) {
        check(
          `${vp.label} · ${view}: ${name}'s receipt lands where its row was`,
          samePlace(afterRemove[name], before[name]),
          `before ${before[name]}, receipt ${afterRemove[name]}`,
        );
      }

      // Undo the MIDDLE one. The other two stand.
      const middle = names[2];
      const others = [names[1], names[3]];
      await onPage(page, `button[aria-label="Undo removing ${middle}"]`).first().click();
      await onPage(page, `button[aria-label="Remove ${middle}"]`).first().waitFor({ timeout: 10_000 });

      const main = page.locator("main");
      for (const name of others) {
        check(
          `${vp.label} · ${view}: ${name}'s receipt still stands after undoing ${middle}`,
          await main.evaluate((el, n) => el.textContent.includes(`${n} removed`), name),
        );
      }
      check(
        `${vp.label} · ${view}: ${middle} is back as a live row`,
        (await onPage(page, `button[aria-label="Remove ${middle}"]`).count()) > 0,
      );

      // Navigate away and back: nothing stands.
      await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
      await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "networkidle" });
      await onPage(page, `button[aria-label="Remove ${names[0]}"]`).first().waitFor({ timeout: 15_000 });
      for (const name of [...others]) {
        check(
          `${vp.label} · ${view}: ${name}'s receipt is gone after leaving and returning`,
          !(await main.evaluate(hasReceipt, name)),
        );
      }
    }

    // ── 3: Shopping, sorted by price, removing the most expensive card ──
    {
      const priced = await pickPricedArtifacts(5);
      collectionRows = collectionRows.concat(
        await lendAsUnowned(userId, priced.map((c) => c.oracle_id)),
      );
      const deckId = await buildDeck(
        userId,
        commander,
        priced,
        (id) => deckIds.push(id),
        `probe · undo stack price ${vp.label}`,
      );
      const names = priced.map((c) => c.name);

      await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "networkidle" });
      const groupBtn = onPage(page, "button:visible").filter({ hasText: "By type" }).first();
      if ((await groupBtn.count()) > 0) await groupBtn.click();
      await onPage(page, "button:visible").filter({ hasText: /^Shopping/ }).first().click();

      // Shopping opens on Price · Highest by default (#629) — the trigger's own
      // accessible name always carries the live selection (`"Sort the deck
      // list, {selection}, collapsed"`, never the bare "collapsed" the copy
      // constant alone would suggest), so match on the PREFIX rather than the
      // exact string, and only open the panel if the default ever changes.
      const sortTrigger = onPage(page, 'button[aria-label^="Sort the deck list"]:visible').first();
      await sortTrigger.waitFor({ timeout: 15_000 });
      const sortLabel = (await sortTrigger.textContent()) ?? "";
      if (!sortLabel.includes("Price")) {
        await sortTrigger.click();
        await page.getByRole("option", { name: /^Price/ }).click();
      }
      await onPage(page, `button[aria-label="Remove ${names[0]}"]`).first().waitFor({ timeout: 15_000 });

      // The rendered order, read rather than assumed — robust to a changed default direction.
      const renderedOrder = await page.locator("main").evaluate((main, candidates) => {
        const texts = [...main.querySelectorAll("button")]
          .map((b) => b.getAttribute("aria-label") ?? "")
          .filter((a) => a.startsWith("Remove "))
          .map((a) => a.slice("Remove ".length));
        return candidates.filter((n) => texts.includes(n)).sort((a, b) => texts.indexOf(a) - texts.indexOf(b));
      }, names);
      if (renderedOrder.length < names.length) {
        failures.push(`${vp.label} · shopping/price: only ${renderedOrder.length} of ${names.length} rows drew a Remove control`);
      }
      const dearest = renderedOrder[0];
      const rest = names.filter((n) => n !== dearest);

      await page.evaluate(() => window.scrollTo(0, 0));
      const before = await page.locator("main").evaluate(readRowTops, [names]);
      await onPage(page, `button[aria-label="Remove ${dearest}"]`).first().click();
      await onPage(page, `button[aria-label="Undo removing ${dearest}"]`).first().waitFor({ timeout: 10_000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      const after = await page.locator("main").evaluate(readRowTops, [names]);

      note(`${vp.label} · shopping/price: dearest ${dearest}; before ${JSON.stringify(before)}; after ${JSON.stringify(after)}`);

      check(
        `${vp.label} · shopping/price: ${dearest}'s receipt lands at its own price's place`,
        samePlace(after[dearest], before[dearest]),
        `before ${before[dearest]}, receipt ${after[dearest]}`,
      );
      for (const name of rest) {
        check(
          `${vp.label} · shopping/price: ${name}'s row top is unchanged`,
          samePlace(after[name], before[name]),
          `before ${before[name]}, after ${after[name]}`,
        );
      }
    }

    await context.close();
  }
} finally {
  try {
    for (const id of deckIds) {
      await sql`delete from decks where id = ${id} and user_id = ${userId}`;
    }
    note(`${deckIds.length} fixture deck(s) deleted`);
  } catch (error) {
    failures.push(`could not delete every fixture deck — some may still exist (${error?.message ?? error})`);
  }
  try {
    await restoreCollection(collectionRows);
    note(`${collectionRows.length} collection row(s) restored`);
  } catch (error) {
    failures.push(
      `could not restore ${collectionRows.length} collection row(s) this run removed (${error?.message ?? error})`,
    );
  }
  if (browser) await browser.close();
}

if (failures.length > 0) {
  console.log(`\n${failures.length} failure(s):`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log("\nEvery removal leaves its own receipt, in its own card's place, with no row shifts.");
