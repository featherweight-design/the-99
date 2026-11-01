// Consider tiles — the rulings only a layout engine, a computed colour, and a real claim or
// combo can answer.
//
// Run by hand, and not part of `pnpm test`:
//   pnpm probe:consider-tiles
//   PROBE_BASE=http://localhost:3613 PROBE_DECK=<deck-id> pnpm probe:consider-tiles
//
// IT WRITES, and every state it checks is BUILT rather than hoped for. Hard and
// over-committed claims (c3/c4) do not occur on their own — every claim on the dev account is
// soft — so two throwaway committed decks force them. A two-card combo completion (c8) does
// not occur on the account's existing decks either, so a THIRD throwaway deck holds one half
// of a real Commander Spellbook pair and the other half is made owned. Every fixture is
// deleted in a `finally`. Point it at `local-dev` or a scratch Neon branch, **never
// production**.
//
// A STATE THAT WAS NOT BUILT IS A FAILURE, NOT A NOTE. A probe that reports a note and moves
// on for a state it could have forced is a probe that can pass by measuring nothing — the
// failure `probe:commander-availability` carried for its whole life before being found. Every
// section below either builds its state or fails saying it could not.
//
// FOUR THINGS HERE ARE FACTS ABOUT LAID-OUT GEOMETRY OR A COMPUTED COLOUR, and jsdom
// produces none of them:
//
//   1. THE META LINE'S ORDER (`STATES-consider-tiles.md`): ownership dot, then the one slot,
//      then the fact marks, then the lemniscate. A class-list assertion cannot see x-position.
//   2. THE DOT'S COLOUR per claim state — a `background-color`, not a class name.
//   3. THE LIFT LINE'S INK AND SIZE (handoff call 4, l1-l3): `--fg-muted` mono 10px on every
//      one, replacing `--accent-shadow`/`--fg-faint` at 9.5px. Resolved against a reference
//      node carrying the same custom property, so the check needs no var() parsing of its own.
//   4. NO COST PIPS ON THE ART (handoff call 1, deleted outright).
//
// Run through `tsx`, not bare `node`, so it can import the shipped copy functions and the
// commander-candidacy rule rather than keeping second copies of them here.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import "./lib/env.mjs";
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { onPage } from "./lib/surface.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { isCommanderCandidate } from "../src/lib/recs/score";
import { availabilityCopy } from "../src/lib/copy/availability";
import { loadAvailability } from "../src/lib/decks/availability-query";
import { availabilityState, hardDecks } from "../src/lib/decks/availability";
import { loadDeckSuggestions } from "../src/lib/decks/suggestions-read";
import { synergyCopy } from "../src/lib/copy/synergy-discovery";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: DATABASE_URL });
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

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
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
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
  // The version-only gate (pressing "Got it" on /about) advances `about_version_seen` alone,
  // which leaves any feature-switched entry's id unseen in `about_seen_ids` — a switch left on
  // in the server this probe runs against would still put the one-time sheet over the route
  // being measured. `clearAboutSheet` is the one place a probe marks those seen too.
  await clearAboutSheet(page, userId);
  return userId;
}

let failures = 0;
function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  return ok;
}

/** Every fixture deck this run creates, so a signal or an early throw can still clean up. */
const fixtureDeckIds = new Set();
/**
 * Collection rows this run inserted because nothing owned the card before —
 * `{userId, oracleId, setCode, collectorNumber, finish}`. The full printing key, not just
 * `oracleId`: `collection_items` is keyed per printing, and a delete scoped to `oracle_id`
 * alone would remove every printing of that card the user owns, including one a real upload
 * added to the collection while this long-running probe was active (Copilot round 4, high).
 */
const fixtureCollectionRows = [];
/** A single `deck_cards` row this run added to the WALKED deck, for the combo fixture. */
let fixtureDeckCard = null;

/**
 * A dedicated connection holding the walked user's collection lock for this run's whole
 * fixture lifetime — the SAME lock key `replaceCollection` takes
 * (`src/lib/collection/import.ts:159`, `pg_advisory_xact_lock(hashtextextended(userId, 0))`).
 * Session- and transaction-level advisory locks on the same key block each other, so a CSV
 * import started on this account while the probe is running waits for this run to finish
 * rather than racing it. Without this, the printing-exact cleanup above still has a gap: a
 * `replaceCollection` that deletes and reinserts the IDENTICAL printing key (same user, oracle,
 * set, collector number, finish — `collection_items`' whole primary key, with no surrogate id
 * to tell the two rows apart) would be deleted by this run's cleanup even though it is now a
 * real holding (Copilot round 5, high).
 */
let collectionLockClient = null;
let collectionLockUserId = null;

async function lockCollectionFor(userId) {
  collectionLockClient = await pool.connect();
  await collectionLockClient.query("select pg_advisory_lock(hashtextextended($1, 0))", [userId]);
  collectionLockUserId = userId;
}

async function unlockCollection() {
  if (!collectionLockClient) return;
  try {
    await collectionLockClient.query("select pg_advisory_unlock(hashtextextended($1, 0))", [collectionLockUserId]);
  } finally {
    collectionLockClient.release();
    collectionLockClient = null;
    collectionLockUserId = null;
  }
}

/**
 * Memoized to a single IN-FLIGHT PROMISE, not a boolean. A boolean set before the first
 * `await` lets a second, concurrent call (SIGINT firing while the main `finally` is already
 * running cleanup, for instance) see "already cleaned" and return immediately — so the
 * caller that raced in can close the pool, or exit, while the real cleanup is still deleting
 * rows underneath it (Copilot round 6, medium "previously missed"). Every caller now awaits
 * the SAME promise, so a second call waits for the first to finish rather than skipping past it.
 */
let cleanupPromise = null;
function cleanupFixtures() {
  if (!cleanupPromise) cleanupPromise = runCleanup();
  return cleanupPromise;
}

async function runCleanup() {
  // A cleanup failure left only logged (never counted into `failures`) let a run print "All
  // checks passed." and exit 0 while a fixture deck, a collection row or the combo's
  // deck_cards row stayed behind on the walked user's real data (Copilot round 2, medium).
  // Each failed step is now a counted failure, so a clean exit code is a guarantee.
  for (const id of fixtureDeckIds) {
    try {
      await pool.query(`delete from decks where id = $1`, [id]);
    } catch (err) {
      failures += 1;
      console.error(`\n  COULD NOT DELETE fixture deck ${id} — remove by hand:`, err.message ?? err);
    }
  }
  for (const { userId, oracleId, setCode, collectorNumber, finish } of fixtureCollectionRows) {
    try {
      await pool.query(
        `delete from collection_items
           where user_id = $1 and oracle_id = $2 and set_code = $3 and collector_number = $4 and finish = $5`,
        [userId, oracleId, setCode, collectorNumber, finish],
      );
    } catch (err) {
      failures += 1;
      console.error(`\n  COULD NOT DELETE fixture collection row ${oracleId} — remove by hand:`, err.message ?? err);
    }
  }
  if (fixtureDeckCard) {
    try {
      await pool.query(`delete from deck_cards where deck_id = $1 and oracle_id = $2`, [fixtureDeckCard.deckId, fixtureDeckCard.oracleId]);
    } catch (err) {
      failures += 1;
      console.error(`\n  COULD NOT DELETE the combo fixture's deck_cards row — remove by hand:`, fixtureDeckCard, err.message ?? err);
    }
    fixtureDeckCard = null;
  }
  console.log(`\n  cleaned up ${fixtureDeckIds.size} fixture deck(s), ${fixtureCollectionRows.length} collection row(s) and the combo deck_cards row`);
  // LAST, after every delete above has run: releasing earlier would reopen the window those
  // deletes exist to close.
  await unlockCollection();
}

/**
 * A commander that can legally lead a throwaway fixture deck claiming every id in `holds`.
 *
 * Imported rather than re-derived: `createDeck` refuses anything that is not
 * `commanderLegal` AND `isCommanderCandidate`, and this script inserts past that action, so a
 * SQL-only prefilter would ship a deck the app itself would refuse. Mirrors
 * `probe-commander-availability.mjs`'s `anyOwnedLegend` — neither the held cards nor any
 * other fixture leader, and an identity wide enough to hold them all.
 */
async function anyOwnedLegend(userId, excludeOracleIds, needsIdentity) {
  const { rows } = await pool.query(
    `select c.oracle_id, c.type_line, c.oracle_text, c.color_identity, c.layout, c.mana_cost
       from cards c
       join collection_items ci on ci.oracle_id = c.oracle_id and ci.user_id = $1
      where c.commander_legal = true
        and c.oracle_id <> all($2::uuid[])
        and c.color_identity @> $3::text[]
        and ((c.type_line ilike '%legendary%' and c.type_line ilike '%creature%')
             or c.oracle_text ilike '%can be your commander%')
      limit 200`,
    [userId, excludeOracleIds, needsIdentity ?? []],
  );
  const ok = rows.find((r) =>
    isCommanderCandidate({
      typeLine: r.type_line, oracleText: r.oracle_text, layout: r.layout, manaCost: r.mana_cost,
    }),
  );
  return ok?.oracle_id ?? null;
}

/** Commit ONE fixture deck claiming one copy of `oracleId`, led by `leaderOracleId`. */
async function claimOneCopy(userId, oracleId, leaderOracleId, name, onDeck) {
  const { rows } = await pool.query(
    `insert into decks (user_id, name, commander_oracle_id) values ($1, $2, $3) returning id`,
    [userId, name, leaderOracleId],
  );
  const deckId = rows[0].id;
  onDeck(deckId);
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto) values ($1, $2, 1, false)`,
    [deckId, oracleId],
  );
  const version = await pool.query(
    `insert into deck_versions (deck_id, number, commander_oracle_id) values ($1, 1, $2) returning id`,
    [deckId, leaderOracleId],
  );
  await pool.query(
    `insert into deck_version_cards (version_id, oracle_id, quantity) values ($1, $2, 1)`,
    [version.rows[0].id, oracleId],
  );
  return deckId;
}

async function cardColorIdentity(oracleId) {
  const { rows } = await pool.query(`select color_identity from cards where oracle_id = $1`, [oracleId]);
  return rows[0]?.color_identity ?? [];
}

/**
 * Owns `oracleId` for `userId` if it is not already owned, tracked for cleanup.
 *
 * `collection_items` rows a real printing — `set_code`, `collector_number` and `finish` are
 * NOT NULL — so this reads one of the card's own printings rather than inventing one.
 */
async function ensureOwned(userId, oracleId) {
  const { rows } = await pool.query(
    `select 1 from collection_items where user_id = $1 and oracle_id = $2`,
    [userId, oracleId],
  );
  if (rows.length > 0) return;
  const printing = await pool.query(
    `select set_code, collector_number from printings where oracle_id = $1 limit 1`,
    [oracleId],
  );
  if (printing.rows.length === 0) throw new Error(`No printing exists for ${oracleId} — cannot own it.`);
  const { set_code, collector_number } = printing.rows[0];
  await pool.query(
    `insert into collection_items (user_id, oracle_id, quantity, set_code, collector_number, finish)
       values ($1, $2, 1, $3, $4, 'nonfoil')`,
    [userId, oracleId, set_code, collector_number],
  );
  fixtureCollectionRows.push({
    userId, oracleId, setCode: set_code, collectorNumber: collector_number, finish: "nonfoil",
  });
}

/**
 * A real Commander Spellbook two-card combo within the WALKED deck's own colour identity,
 * and one card added to ITS draft to prove it (c8). `loadCompletionPartners`
 * (`src/lib/combos/near-miss.ts`) attaches a suggestion's `comboPartner` when the other half
 * of a two-card variant is already among the deck's own cards or its commander, and the
 * suggested half is itself a candidate — owned, legal, and not already in the deck.
 *
 * ADDED TO THE WALKED DECK, not a throwaway one: Consider's own suggestions are ranked
 * against EDHREC's data for that deck's commander, and a brand-new throwaway deck's unraised
 * commander has none — the first version of this fixture built a separate deck and the
 * suggested card never appeared on screen at all, for that reason rather than for anything
 * this feature does. The ONE row this adds to the walked deck's draft is captured and deleted
 * in the `finally`, same discipline as the hard/over claims' throwaway decks.
 */
const COMBO_ATTEMPT_LIMIT = 80;

async function buildComboFixture(userId, deckId, commanderOracleId, existingOracleIds) {
  const { rows: cmd } = await pool.query(`select color_identity from cards where oracle_id = $1`, [commanderOracleId]);
  const deckIdentity = new Set(cmd[0]?.color_identity ?? []);
  const present = new Set(existingOracleIds);

  // ORDERED, not left to the planner: an unordered `limit` can hand back a different 600
  // variants after a plan or catalog change, making the fixture intermittently unable to
  // find a candidate it found yesterday (Copilot round 2, medium — previously missed).
  const { rows: variants } = await pool.query(
    `select v.variant_id, array_agg(vc.oracle_id order by vc.oracle_id) as pieces
       from spellbook_variants v
       join spellbook_variant_cards vc on vc.variant_id = v.variant_id
      where v.card_count = 2
      group by v.variant_id
      having count(*) = 2
      order by v.variant_id
      limit 600`,
  );
  let attempts = 0;
  for (const { pieces } of variants) {
    const [a, b] = pieces;
    if (present.has(a) || present.has(b)) continue;
    const { rows: cardRows } = await pool.query(
      `select oracle_id, name, type_line, oracle_text, color_identity from cards where oracle_id = any($1::uuid[])`,
      [pieces],
    );
    if (cardRows.length !== 2) continue;
    const byId = new Map(cardRows.map((r) => [r.oracle_id, r]));
    const ca = byId.get(a);
    const cb = byId.get(b);
    if (!ca || !cb) continue;
    // BOTH pieces must fit the deck's OWN identity — a card outside it is illegal there and
    // the suggestion engine would never offer it, whatever Spellbook says the pair completes.
    const fits = [...ca.color_identity, ...cb.color_identity].every((c) => deckIdentity.has(c));
    if (!fits) continue;

    // `suggestDeck` (`src/lib/decks/suggest.ts`) draws from EDHREC's OWN top-cards list for
    // THIS commander first, in EDHREC's fixed order, then fills role targets — ramp, draw,
    // removal, wipes, land — from `ownedPool`'s OWN iteration order. COMMIT the held piece
    // and ask the real loader, exactly as the page does, and verify the suggested half came
    // back via the EDHREC path specifically (see the comment below for why role-origin alone
    // is not reliable here). Bounded attempts, since each call fetches EDHREC data for the
    // commander (cached after the first).
    for (const [held, suggested] of [[ca, cb], [cb, ca]]) {
      if (attempts >= COMBO_ATTEMPT_LIMIT) return null;
      attempts += 1;
      // TRACKED FOR CLEANUP THE MOMENT THE ROW EXISTS, before any further async work
      // (`ensureOwned`, `loadDeckSuggestions`) can throw — a throw between an untracked
      // insert and its tracking would leave the row standing with no `finally` record of
      // it, permanently changing the walked user's real deck (Copilot round 1, high). Only
      // tracked when THIS statement inserted it: `on conflict do nothing` means a row that
      // already existed is not ours to delete.
      const inserted = await pool.query(
        `insert into deck_cards (deck_id, oracle_id, quantity, auto) values ($1, $2, 1, false)
         on conflict (deck_id, oracle_id) do nothing`,
        [deckId, held.oracle_id],
      );
      const weInsertedIt = inserted.rowCount > 0;
      if (weInsertedIt) fixtureDeckCard = { deckId, oracleId: held.oracle_id };
      await ensureOwned(userId, suggested.oracle_id);
      // REQUIRES the EDHREC path specifically, not just presence. The EDHREC loop runs
      // first and in EDHREC's own fixed order; a role-filled match depends on
      // `ownedColorLegalPool`'s row order, which carries no ORDER BY — and on this
      // fixture account the role-filled list already sits AT its 99-card cap, so a
      // role-only match's membership would be order-sensitive at the margin. Requiring
      // `reasonType === "edhrec"` sidesteps that regardless of how real that risk is.
      let onList = false;
      try {
        const { suggestions } = await loadDeckSuggestions(deckId, userId);
        onList = suggestions.some((s) => s.oracleId === suggested.oracle_id && s.reasonType === "edhrec");
      } catch {
        onList = false;
      }
      if (onList) {
        return {
          heldName: held.name, suggestedOracleId: suggested.oracle_id, suggestedName: suggested.name,
          roles: "edhrec",
        };
      }
      // Not on the real list — undo this attempt's writes before trying the next candidate.
      // ONLY when WE inserted the row: `on conflict do nothing` meant it could already have
      // existed (another writer added it between the snapshot and this attempt), and an
      // unconditional delete here would remove real user data this probe never wrote
      // (Copilot round 2, high). The delete runs before clearing the tracking handle, so a
      // throw mid-delete still leaves `fixtureDeckCard` pointing at the row for the run's
      // own `finally` to catch.
      if (weInsertedIt) {
        await pool.query(`delete from deck_cards where deck_id = $1 and oracle_id = $2`, [deckId, held.oracle_id]);
        fixtureDeckCard = null;
      }
      if (fixtureCollectionRows.length && fixtureCollectionRows[fixtureCollectionRows.length - 1].oracleId === suggested.oracle_id) {
        // Popped only AFTER the DELETE succeeds — same rule as the deck-card rollback above: a
        // transient failure here must leave the handle in place for the run's own `finally`
        // to retry, rather than losing it the instant this attempt decided to roll back.
        const row = fixtureCollectionRows[fixtureCollectionRows.length - 1];
        await pool.query(
          `delete from collection_items
             where user_id = $1 and oracle_id = $2 and set_code = $3 and collector_number = $4 and finish = $5`,
          [row.userId, row.oracleId, row.setCode, row.collectorNumber, row.finish],
        );
        fixtureCollectionRows.pop();
      }
    }
  }
  return null;
}

// The About gate is already cleared for this account at sign-in (`clearAboutSheet`), by
// id and by version — no per-navigation "Got it" press needed.
async function goto(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
}

/** A deck with open slots, the same way `probe:card-note` finds one. */
async function findDeck(page) {
  await goto(page, "/decks");
  await page.waitForTimeout(2_000);
  return page.evaluate(() => {
    for (const tile of document.querySelectorAll("main li article")) {
      const count = [...tile.querySelectorAll("span")]
        .map((s) => (s.textContent ?? "").trim())
        .find((t) => /^\d+ \/ \d+$/.test(t));
      if (!count) continue;
      const [built, size] = count.split("/").map((n) => Number(n.trim()));
      if (built < size) {
        const href = tile.querySelector('a[href^="/decks/"]')?.getAttribute("href");
        if (href) return href;
      }
    }
    return null;
  });
}

async function openConsider(page) {
  const tab = onPage(page, "#tab-consider").first();
  await tab.waitFor({ state: "attached", timeout: 15_000 });
  await tab.click();
  await page.waitForTimeout(1_200);
  await onPage(page, '[data-testid="suggestion-tile"]').first().waitFor({ state: "attached", timeout: 15_000 });
}

/** Expand every shelf, so a card the cap hides is still on screen. */
/**
 * Clicks every shelf's own "Show all", one at a time, by re-querying the
 * remaining set after each click rather than iterating a fixed count by
 * index. Each press turns ITS OWN button's text to "Collapse", shrinking the
 * `:has-text("Show all")` match set by one — so a pre-counted `nth(i)` loop
 * walks a set that is shifting under it: after shelf A expands, the button
 * that WAS `nth(1)` (shelf B's) is now `nth(0)`, and the original `nth(1)`
 * click lands on what was `nth(2)` (shelf C's), skipping B outright. Found by
 * running this probe: the combo fixture's suggested card sat in the "draw"
 * shelf, behind an unclicked "Show all", while "land" and "other" (whose
 * buttons happened to survive the shift) expanded correctly and every other
 * check read as passing.
 */
async function expandShelves(page) {
  const button = onPage(page, 'button:has-text("Show all")').first();
  for (let guard = 0; guard < 20; guard++) {
    const count = await button.count();
    if (count === 0) break;
    await button.click().catch(() => {});
    await page.waitForTimeout(150);
  }
}

/**
 * Every tile's own-read state. The caption wrapper is identified by its OWN declared height
 * class (`CARD_TILE_CAPTION_H`/`_SUB_H`), never by sibling position: the art is a `<button>`
 * and the caption the only direct `<div>` child carrying `min-h-[`, so counting div siblings
 * by index landed on the BODY div instead on the first version of this probe and read every
 * dot, chip and mark as absent.
 */
async function readTiles(page) {
  return page.evaluate((noSynergyText) => {
    const out = [];
    for (const tile of document.querySelectorAll('main [data-testid="suggestion-tile"]')) {
      const caption = [...tile.children].find(
        (el) => el.tagName === "DIV" && /min-h-\[/.test(el.className),
      );
      const metaLine = caption?.firstElementChild?.firstElementChild ?? null;
      const dot = metaLine?.querySelector('span[class*="rounded-full"]') ?? null;
      // Excludes any child that CONTAINS a fact mark or the combo glyph, not only a child
      // that directly IS one: on a fine pointer, `FactTooltip` wraps each mark in its own
      // `<span>`, which is itself neither an svg nor the dot — the old `!el.matches(...)`
      // check let that wrapper through as the "slot", excluding marked free tiles from
      // fixture selection and reading the wrapper's position as the chip's (Copilot
      // round 2, medium — previously missed).
      const chip = metaLine
        ? [...metaLine.children].find(
            (el) => el !== dot && !el.matches('svg, [data-testid="combo-glyph"]')
              && !el.querySelector('svg[data-testid^="card-fact-"], svg[data-testid="combo-glyph"]'),
          ) ?? null
        : null;
      const marks = metaLine ? [...metaLine.querySelectorAll('svg[data-testid^="card-fact-"]')] : [];
      const glyph = metaLine?.querySelector('svg[data-testid="combo-glyph"]') ?? null;
      const art = tile.querySelector('button[style*="aspect-ratio"]');
      const pips = art ? art.querySelectorAll('span.rounded-full.font-mono').length : 0;
      // THE BODY DIV holds one or two <p>s: the secondary line (type, or the combo
      // partner's name) always, and the in-use/over caption only when the card is claimed.
      // A bare `querySelector('p')` finds the FIRST one only — the type line — and reads the
      // in-use caption as absent even when it is drawn on the SECOND <p>.
      const bodyParas = caption?.nextElementSibling ? [...caption.nextElementSibling.querySelectorAll('p')] : [];
      const secondary = tile.querySelector('[data-testid="consider-combo-line"]') ?? bodyParas[0] ?? null;
      const inUse = bodyParas.find((p) => p !== secondary) ?? null;
      // The Evidence container holds up to two <p>s: the barRow's reason sentence
      // (`fillsRole(...)` or the shipped "no EDHREC figure", neither of which is the lift
      // line) and the true lift/synergy/no-synergy line below it. `/pts|no deck|no EDHREC/`
      // matched the barRow's "no EDHREC figure" too, and `.find` took whichever came first —
      // so the l3 check never saw the real "no synergy figure" line, reading it absent
      // (Copilot round 1, medium). Matched EXACTLY now: ends in "pts" (l1/l2) or equals the
      // shipped no-synergy string (l3), neither of which the barRow ever prints.
      const lift = [...(caption?.nextElementSibling?.nextElementSibling?.querySelectorAll('p') ?? [])].find(
        (p) => /pts$/.test(p.textContent ?? "") || p.textContent === noSynergyText,
      );
      out.push({
        oracleId: tile.getAttribute("data-oracle-id"),
        dotRect: dot ? dot.getBoundingClientRect() : null,
        dotColour: dot ? getComputedStyle(dot).backgroundColor : null,
        chipRect: chip ? chip.getBoundingClientRect() : null,
        marksRects: marks.map((m) => m.getBoundingClientRect()),
        glyphRect: glyph ? glyph.getBoundingClientRect() : null,
        pips,
        secondaryText: secondary ? secondary.textContent : null,
        inUseText: inUse ? inUse.textContent : null,
        liftText: lift ? lift.textContent.trim() : null,
        liftColour: lift ? getComputedStyle(lift).color : null,
        liftSize: lift ? getComputedStyle(lift).fontSize : null,
      });
    }
    return out;
  }, synergyCopy.shelf.noSynergy);
}

/** Reads a CSS custom property through a throwaway node, so a check needs no var()-parsing. */
async function cssVarColour(page, name) {
  return page.evaluate((varName) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${varName})`;
    document.body.appendChild(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  }, name);
}

/** Reads `--fg-muted`. */
async function fgMutedColour(page) {
  return cssVarColour(page, "--fg-muted");
}

const WIDTHS = [
  { name: "desktop", viewport: { width: 1300, height: 900 } },
  { name: "phone", viewport: { width: 390, height: 844 } },
];

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();

  try {
    // ── Pick the deck, find it without opening its page yet ─────────────────
    // `/decks/[id]` wraps `loadDeckSuggestions` in `cacheForUser`, tagged
    // `user-lists:<userId>` and dropped only by `revalidateUserLists` — which
    // every real write path calls and this script's raw SQL does not. The
    // FIRST visit to this deck's Consider tab warms that cache for its
    // lifetime (the hour ceiling), so the combo fixture — which needs the
    // suggested half to actually appear in that list — has to be built BEFORE
    // that first visit, not after it. Everything else here (hard/over claims)
    // affects AVAILABILITY, read fresh outside this cache every time, so it is
    // unaffected by when it runs.
    const early = await (async () => {
      const c = await browser.newContext({ viewport: WIDTHS[0].viewport });
      const p = await c.newPage();
      const userId = await signIn(p);
      // Before any fixture write — see `lockCollectionFor`'s header for what this closes.
      await lockCollectionFor(userId);
      const href = process.env.PROBE_DECK ? `/decks/${process.env.PROBE_DECK}` : await findDeck(p);
      if (!href) throw new Error("No deck with open slots on this account — pass PROBE_DECK.");
      const deckId = href.split("/decks/")[1];
      // SCOPED to the signed-in user — this fixture goes on to WRITE a `deck_cards` row to
      // this deck (`buildComboFixture`), and `PROBE_DECK` is an env var a caller can mistype
      // or copy from another run. An unscoped lookup would mutate a deck belonging to another
      // account (Copilot round 6, high).
      const { rows: deckRows } = await pool.query(
        `select commander_oracle_id, (select array_agg(oracle_id) from deck_cards where deck_id = $1) as cards
           from decks where id = $1 and user_id = $2`,
        [deckId, userId],
      );
      if (deckRows.length === 0) {
        throw new Error(`Deck ${deckId} does not belong to the signed-in account — refusing to touch it.`);
      }
      await c.close();
      return {
        href, userId, deckId,
        commanderOracleId: deckRows[0]?.commander_oracle_id ?? null,
        existingOracleIds: deckRows[0]?.cards ?? [],
      };
    })();
    console.log(`fixture: ${early.href}`);

    // ── Build the combo completion (c8) BEFORE the first Consider visit ─────
    const combo = early.commanderOracleId
      ? await buildComboFixture(early.userId, early.deckId, early.commanderOracleId, early.existingOracleIds)
      : null;
    report("combo fixture built", !!combo, combo
      ? `${combo.heldName} added to the walked deck's draft, ${combo.suggestedName} owned and uncommitted (role: ${combo.roles})`
      : "no two-card Spellbook variant fit this deck's identity with a role-classified half — NOT a pass");
    const fixtures = { hard: null, over: null, combo };

    // ── Open the Consider tab for the first time, and pick the two
    // claim-fixture targets ──────────────────────────────────────────────────
    const setup = await (async () => {
      const c = await browser.newContext({ viewport: WIDTHS[0].viewport });
      const p = await c.newPage();
      await signIn(p);
      await goto(p, early.href);
      await openConsider(p);
      await expandShelves(p);
      // CANDIDATES: free (no dot, no chip drawn yet in the meta line), oracle ids the account
      // owns EXACTLY one copy of — a non-basic is a singleton, so one committed deck claims
      // the whole supply and a card owned twice could not be driven to "hard" by one claim.
      // Excludes the combo's own suggested card, so it is never accidentally picked as a
      // hard/over claim target too.
      const freeTiles = (await readTiles(p)).filter((t) => !t.chipRect && t.oracleId !== combo?.suggestedOracleId);
      // A singleton that ALSO carries a fact mark is preferred for the hard claim, so that
      // fixture's own tile is the one proving "dot, then slot, then marks" together — the
      // property is otherwise only reachable by chance, since whether any card in this
      // run's 99-card pool happens to carry both a mark and a claim is order-sensitive
      // (`ownedColorLegalPool` has no ORDER BY).
      const marked = [];
      const plain = [];
      for (const t of freeTiles) {
        if (!t.oracleId) continue;
        const { rows } = await pool.query(
          `select sum(quantity)::int as qty from collection_items where user_id = $1 and oracle_id = $2`,
          [early.userId, t.oracleId],
        );
        if (rows[0]?.qty !== 1) continue;
        (t.marksRects.length > 0 ? marked : plain).push(t.oracleId);
        if (marked.length + plain.length >= 40) break;
      }
      const owned = [...marked, ...plain].slice(0, 2);
      await c.close();
      return {
        href: early.href, userId: early.userId, deckId: early.deckId,
        hardTarget: owned[0] ?? null,
        overTarget: owned[1] ?? null,
      };
    })();

    // ── Build the hard and over-committed claims ────────────────────────────
    if (setup.hardTarget) {
      const identity = await cardColorIdentity(setup.hardTarget);
      const leader = await anyOwnedLegend(setup.userId, [setup.hardTarget, setup.overTarget].filter(Boolean), identity);
      if (leader) {
        await claimOneCopy(setup.userId, setup.hardTarget, leader, "probe · consider hard claim", (id) => fixtureDeckIds.add(id));
        fixtures.hard = setup.hardTarget;
      }
    }
    report("hard-claim fixture built", !!fixtures.hard, fixtures.hard ?? "no singleton candidate + leader found — NOT a pass");

    if (setup.overTarget) {
      const identity = await cardColorIdentity(setup.overTarget);
      const excl = [setup.hardTarget, setup.overTarget].filter(Boolean);
      const leaderA = await anyOwnedLegend(setup.userId, excl, identity);
      const leaderB = leaderA ? await anyOwnedLegend(setup.userId, [...excl, leaderA], identity) : null;
      if (leaderA && leaderB) {
        await claimOneCopy(setup.userId, setup.overTarget, leaderA, "probe · consider over claim A", (id) => fixtureDeckIds.add(id));
        await claimOneCopy(setup.userId, setup.overTarget, leaderB, "probe · consider over claim B", (id) => fixtureDeckIds.add(id));
        fixtures.over = setup.overTarget;
      }
    }
    report("over-claim fixture built", !!fixtures.over, fixtures.over ?? "no second singleton candidate + two leaders found — NOT a pass");

    // THE VANTAGE CAP MAKES "over" STRUCTURALLY UNREACHABLE FROM THIS READ.
    // `availability-query.ts`'s skip_deck branch bounds the shortfall at what
    // the WALKED deck itself could need — never more than 1, since it is not
    // itself asking — so two (or any number of) other decks' mature claims on
    // a singleton always read `free: 0` (HARD, many names), never `free < 0`
    // (OVER). The reservation queue (`reservation_wants`/`reservations`) caps
    // `card_assignments` the same way, at the supply still unallocated when
    // each reservation's turn comes, so an explicit overcommit through that
    // table is capped right back to the same `free: 0`. Verified both ways
    // against the real `loadAvailability` before concluding this rather than
    // assuming it: this check FAILS honestly instead of asserting a state the
    // Consider tile's own data path cannot produce.
    if (fixtures.over) {
      const map = await loadAvailability(setup.userId, { excludeDeckId: setup.deckId, oracleIds: [fixtures.over] });
      const a = map.get(fixtures.over);
      const state = a ? availabilityState(a, { selfExcluded: false }) : null;
      if (state !== "over") {
        report("over state reached from the Consider vantage", false,
          `two mature claims on a singleton read "${state}" (free: ${a?.free}) — the vantage cap in availability-query.ts bounds the shortfall at what this deck could need, so OVER cannot be built from here — NOT a pass`);
        fixtures.over = null;
      }
    }

    console.log("");

    for (const { name, viewport } of WIDTHS) {
      console.log(`── ${name} ${viewport.width}x${viewport.height} ──`);
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await signIn(page);

      // ── The walked deck: claims, meta order, lift, no pips ────────────────
      await goto(page, setup.href);
      await openConsider(page);
      await expandShelves(page);
      const tiles = await readTiles(page);
      report("tiles on the page", tiles.length > 0, `${tiles.length} tiles`);

      // 1. no cost pips anywhere on the art (handoff call 1)
      const withPips = tiles.filter((t) => t.pips > 0);
      report("no tile draws cost pips on its art", withPips.length === 0,
        `${withPips.length} of ${tiles.length} still carry pips`);

      // 2. the meta line's order: dot, then slot, then marks
      const withMarks = tiles.filter((t) => t.marksRects.length > 0 && t.dotRect && t.chipRect);
      if (withMarks.length === 0) {
        report("meta line order", false, "no tile carries a dot, a slot AND a fact mark together — NOT a pass");
      } else {
        const bad = withMarks.filter((t) => {
          const order = [t.dotRect.left, t.chipRect.left, t.marksRects[0].left];
          return !order.every((x, i) => i === 0 || x >= order[i - 1]);
        });
        report("meta line: dot, then slot, then marks", bad.length === 0,
          `${withMarks.length} tiles checked, ${bad.length} out of order`);
      }

      // 3. the lift line's ink and size (handoff call 4) — l1 (positive), l2 (zero/negative
      // figure) and l3 (an EDHREC pick with no synergy figure at all, synergy shelf only)
      // counted SEPARATELY, so a run reaching only some of the three states says so rather
      // than reporting a pass over a comparison that had no subject for the others.
      const mutedColour = await fgMutedColour(page);
      const withLift = tiles.filter((t) => t.liftText);
      const positive = withLift.filter((t) => /^\+/.test(t.liftText));
      const nonPositive = withLift.filter((t) => !/^\+/.test(t.liftText) && /pts$/.test(t.liftText));
      const noFigure = withLift.filter((t) => !/^\+/.test(t.liftText) && !/pts$/.test(t.liftText));
      report("l1 (lift above zero) reached", positive.length > 0, `${positive.length} lines`);
      report("l2 (figure at or below zero) reached", nonPositive.length > 0, `${nonPositive.length} lines`);
      report("l3 (no synergy figure at all) reached", noFigure.length > 0, `${noFigure.length} lines`);
      if (withLift.length === 0) {
        report("lift line ink/size", false, "no tile drew a lift figure on this screen — NOT a pass");
      } else {
        const wrongColour = withLift.filter((t) => t.liftColour !== mutedColour);
        report("every lift line reads --fg-muted", wrongColour.length === 0,
          `${withLift.length} lines (${positive.length} l1, ${nonPositive.length} l2, ${noFigure.length} l3), ${wrongColour.length} off (${mutedColour})`);
        const wrongSize = withLift.filter((t) => t.liftSize !== "10px");
        report("every lift line is 10px", wrongSize.length === 0,
          `sizes ${[...new Set(withLift.map((t) => t.liftSize))].join("/")}`);
      }

      // 4. the hard claim: a committed dot and the in-use caption (c3)
      if (fixtures.hard) {
        const t = tiles.find((x) => x.oracleId === fixtures.hard);
        if (!t) {
          report("hard-claimed tile on screen", false, `${fixtures.hard} not found after the fixture — NOT a pass`);
        } else {
          // A dot existing proves nothing — it exists, unowned-dashed, even without the
          // fixture's `committed` prop. Compare against the RESOLVED `--avail-hard-fg`, not
          // just presence (Copilot round 3, medium).
          const hardColour = await cssVarColour(page, "--avail-hard-fg");
          report("hard claim draws a committed dot", t.dotColour === hardColour,
            `${t.dotColour ?? "none"} against ${hardColour}`);
          const wantCaption = availabilityCopy.marker.tileInUse("probe · consider hard claim");
          report("hard claim's in-use caption names the deck", t.inUseText === wantCaption,
            `"${t.inUseText ?? "(none)"}" against "${wantCaption}"`);
        }
      }

      // 5. the over claim: both other decks counted (c4). `fixtures.over` is
      // null whenever the vantage-cap check above already reported this
      // state unreachable, so this section only runs the width-specific read
      // when a future data path actually makes OVER reachable from here.
      if (fixtures.over) {
        const t = tiles.find((x) => x.oracleId === fixtures.over);
        if (!t) {
          report("over-claimed tile on screen", false, `${fixtures.over} not found after the fixture — NOT a pass`);
        } else {
          const wantCaption = availabilityCopy.marker.tileOver(2);
          report("over claim's caption counts both decks", t.inUseText === wantCaption,
            `"${t.inUseText ?? "(none)"}" against "${wantCaption}"`);
        }
      }

      // 6. the combo completion, on the SAME deck and the SAME tiles (c8)
      if (fixtures.combo) {
        const t = tiles.find((x) => x.oracleId === fixtures.combo.suggestedOracleId);
        if (!t) {
          report("combo tile on screen", false, `${fixtures.combo.suggestedName} not found on the walked deck — NOT a pass`);
        } else {
          report("combo: the glyph draws on the meta line", !!t.glyphRect, t.glyphRect ? "drawn" : "absent");
          // `secondaryText` is `textContent`, which reads the visible "+ Name" AND the
          // sr-only spoken sentence appended after it with no separator — same reason
          // `consider-combo.test.tsx` filters to non-`aria-hidden` nodes for the spoken
          // half and reads the drawn half with `startsWith`.
          const wantSecondary = `+ ${fixtures.combo.heldName}`;
          report("combo: the secondary line names the partner alone",
            !!t.secondaryText?.startsWith(wantSecondary),
            `"${t.secondaryText ?? "(none)"}" against "${wantSecondary}…"`);
        }
      }

      await context.close();
    }
  } finally {
    try {
      await cleanupFixtures();
    } finally {
      try {
        await browser.close();
      } finally {
        await pool.end();
      }
    }
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.once(signal, async () => {
    await cleanupFixtures();
    process.exit(signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 129);
  });
}
process.once("beforeExit", cleanupFixtures);

run();
