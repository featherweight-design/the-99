// Commander availability — the rulings only a layout engine can answer.
//
// Run by hand, and not part of `pnpm test`:
//   pnpm probe:commander-availability
//   PROBE_BASE=http://localhost:3600 PROBE_SLUG=<slug> pnpm probe:commander-availability
//
// IT WRITES. The slot's marker only draws for a card that is owned with no free
// copy, and no such claim exists on the dev account — every claim there is soft —
// so the state has to be BUILT: one deck, its `deck_cards`, and a committed
// version, deleted in a `finally`. Point it at `local-dev` or a scratch Neon
// branch, **never production**. It creates nothing else and deletes nothing it
// did not create.
//
// Run through `tsx`, not bare `node`, so it can import the application's own
// commander-candidacy rule rather than keeping a second copy of it in SQL.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { onPage, onPageRole } from "./lib/surface.mjs";
// The APPLICATION'S rule, imported rather than restated. `/decks` refuses a
// commander that fails this, so a fixture deck led by one would be a claim state
// no reader can produce — and a second copy of the rule written here drifts from
// it a round at a time, which is the whole argument against re-deriving the
// commander from its slug a few lines below.
import { isCommanderCandidate, wholeTarget } from "../src/lib/recs/score";
// The group heads' wording, imported for the same reason: the check compares the page with the
// shipped function rather than with a copy of its rules.
import { recommendationsCopy } from "../src/lib/copy/recommendations";

// A MEASURED SENTINEL for the page's commander (How it works §5.4b). local-dev carries no role
// figures, so without one every head reads the fallback and the measured wording is asserted by
// nobody. Every head is compared with the shipped wording for its own count, so the check holds
// whichever of short, at or past a head lands on; WHICH it lands on depends on what the account
// owns (ramp 4.4 rounds to 4, draw 9.6 to 10), and the run prints the outcomes it reached. Wipes 0
// is the one outcome the sentinel guarantees, and it must read as never short.
const SENTINEL = { ramp: 4.4, draw: 9.6, removal: 2, wipes: 0 };
let heldTargets = null;
async function restoreTargets() {
  if (!heldTargets) return;
  const h = heldTargets;
  try {
    await pool.query(
      `update commander_support set avg_ramp = $2, avg_draw = $3, avg_removal = $4, avg_wipes = $5
        where commander_oracle_id = $1`,
      [h.oracle_id, h.avg_ramp, h.avg_draw, h.avg_removal, h.avg_wipes],
    );
    // Cleared only once the row is back, so a failed restore leaves the handle for the next door
    // (a signal, or `beforeExit`) to try again.
    heldTargets = null;
    console.log(`\n  put the commander's role figures back (${h.oracle_id})`);
  } catch (err) {
    console.error(`\n  COULD NOT RESTORE the role figures on ${h.oracle_id} — they were`, h, err);
  }
}

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
  return userId;
}

/**
 * THE CLAIM FIXTURE, and the reason this probe needed one.
 *
 * Every claim on the dev account is SOFT — a brew claims softly by design — so
 * the slot's marker states simply do not occur, and the run reported a `note`
 * saying it measured nothing. A `note` is honest and it is still not a check.
 *
 * `hard` is SLEEVED rather than full: a deck with a committed version claims
 * whatever its size (`availability-query.ts`, `mature` is `cd.sleeved`), so this
 * needs no 99-row body. Holding every copy the account owns takes the card's
 * free count to zero, which is the `hard` reading.
 *
 * `onDeck` is called the instant the deck row exists, before the rows that hang
 * off it — a helper returning only at the end would strand a half-built deck
 * whenever a later insert threw, because the call site's assignment never runs
 * and the `finally` deletes nothing. `probe-build-from` learned that first.
 */
async function sleeveEveryCopy(userId, oracleId, commanderOracleId, onDeck) {
  // `filled` LEFT AT ITS DEFAULT. The column means a fill run has happened, and
  // this deck holds one hand-inserted card — writing true would be a deck state
  // the app never produces, and a concurrent reader would draw fill-complete UI
  // over it. The claim does not need it: a hard claim is a COMMITTED VERSION, and
  // that is what the rows below build.
  const { rows } = await pool.query(
    `insert into decks (user_id, name, commander_oracle_id)
       values ($1, $2, $3) returning id`,
    [userId, "probe · commander availability", commanderOracleId],
  );
  const deckId = rows[0].id;
  onDeck(deckId);
  // ONE COPY, because a non-basic is a singleton in Commander and the app
  // enforces it — a repeat add is a no-op in `decks/actions.ts`. A fixture
  // sleeving four would be a deck no reader can build, measuring a claim state
  // that does not occur. The card is chosen with exactly one copy owned instead,
  // so this single row still claims the whole supply.
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto) values ($1, $2, 1, false)`,
    [deckId, oracleId],
  );
  const version = await pool.query(
    `insert into deck_versions (deck_id, number, commander_oracle_id)
       values ($1, 1, $2) returning id`,
    [deckId, commanderOracleId],
  );
  await pool.query(
    `insert into deck_version_cards (version_id, oracle_id, quantity) values ($1, $2, 1)`,
    [version.rows[0].id, oracleId],
  );
  return deckId;
}

/**
 * Resolve a card the PAGE is showing, by the name it drew.
 *
 * By name rather than by re-deriving the commander from its slug: slug
 * resolution spans three rankings (`resolve-slug.ts`), and a second copy of it
 * written in SQL here would drift from the real one a round at a time. That is
 * the mistake `probe-build-from` took three review rounds to stop making. The
 * page already knows which cards it is drawing; this only asks the database how
 * many of one the account holds.
 *
 * A NAME IS NOT A KEY, and the ambiguity test runs against the CATALOG rather
 * than the collection. Two different cards can carry one name — the catalog holds
 * them and `card-search-row.tsx` exists because of it. Testing only the owned
 * rows misses the case that matters: the account owns one of the two, the page
 * drew the OTHER, and a lookup narrowed to the collection sees a single row and
 * calls it unambiguous. So the count is over `cards`, and an ambiguous name is
 * REFUSED rather than guessed — the caller treats that as "no fixture", which is
 * an honest skip instead of a silent mismeasurement.
 *
 * EXACTLY ONE COPY OWNED, not "between one and four". A non-basic is a singleton
 * in Commander, so one deck can claim one copy; a card owned three times would
 * need three decks to read hard, and sleeving three into one would be a state the
 * app refuses. One copy owned means one deck claims the whole supply.
 *
 * NEVER A BASIC LAND. `loadAvailability` omits basics from its owned CTE by
 * design, so a basic has NO availability row at all — sleeving one would claim
 * nothing, the row would draw no marker, and the check below would report a
 * failure against a perfectly healthy build. A false failure is worse than the
 * silent pass this whole PR exists to remove, because it sends the next reader
 * looking for a defect in the component.
 */
async function resolveOwnedCard(userId, name) {
  const { rows: catalog } = await pool.query(
    `select oracle_id, type_line, color_identity from cards where name = $1`,
    [name],
  );
  if (catalog.length !== 1) return { card: null, ambiguous: catalog.length > 1, basic: false };
  if (/\bBasic\b/.test(catalog[0].type_line)) {
    return { card: null, ambiguous: false, basic: true };
  }
  const { rows } = await pool.query(
    `select c.oracle_id, c.color_identity, sum(ci.quantity)::int as owned
       from cards c
       join collection_items ci on ci.oracle_id = c.oracle_id and ci.user_id = $1
      where c.oracle_id = $2
      group by c.oracle_id, c.color_identity
      having sum(ci.quantity) = 1`,
    [userId, catalog[0].oracle_id],
  );
  return { card: rows[0] ?? null, ambiguous: false, basic: false };
}

/**
 * A commander the account owns that could actually lead the fixture deck.
 *
 * The deck exists ONLY to hold a hard claim on the card under test, so which
 * commander leads it is immaterial — but it is not arbitrary. Three exclusions,
 * each of which would otherwise measure something the app cannot produce:
 *
 *   THE HELD CARD ITSELF. A legendary support card chosen as leader would be
 *   recorded BOTH as the deck's commander and as a list row, so its claim folds
 *   to a different quantity than the single held copy this fixture is for.
 *
 *   THE COMMANDER WHOSE PAGE IS UNDER TEST. Leading the fixture deck with it
 *   makes that commander built, which changes what the page under measurement
 *   draws. An earlier revision claimed the page excluded it through `notBuiltBy`;
 *   it does not — that filter runs over the rendered lists and has no bearing on
 *   this query — so it is excluded here, by the name the page itself printed.
 *
 *   A COMMANDER WHOSE IDENTITY CANNOT HOLD THE CARD. A deck's cards must fit its
 *   commander's colour identity, so a leader picked without that test builds an
 *   illegal deck. The claim model does not read identity, so this changes no
 *   figure measured here — it keeps the fixture to decks the app would accept,
 *   which is the same rule that took `filled` and the singleton quantity out.
 *
 *   A CARD THAT CANNOT LEAD. `createDeck` refuses anything that is not
 *   `commanderLegal` and `isCommanderCandidate`, and this script inserts past
 *   that action. The candidacy half is the app's own function, imported: it reads
 *   the FRONT FACE only, which is why Westvale Abbey is not a commander despite
 *   its back face (#79), and no SQL written here would have remembered that.
 *
 * The SQL narrows to plausible leaders before limiting, and the imported rule
 * then decides. Limiting first was the defect: a collection holds far more than
 * 200 format-legal cards that lead nothing, so the first 200 could contain no
 * commander at all while the account owned several, and the fixture would skip
 * itself for no reason a reader could see.
 */
async function anyOwnedLegend(userId, excludeOracleId, excludeName, needsIdentity) {
  const { rows } = await pool.query(
    `select c.oracle_id, c.type_line, c.oracle_text, c.color_identity, c.layout, c.mana_cost
       from cards c
       join collection_items ci on ci.oracle_id = c.oracle_id and ci.user_id = $1
      where c.commander_legal = true
        and c.oracle_id <> $2
        and c.name <> $3
        and c.color_identity @> $4::text[]
        and ((c.type_line ilike '%legendary%' and c.type_line ilike '%creature%')
             or c.oracle_text ilike '%can be your commander%')
      limit 200`,
    [userId, excludeOracleId, excludeName ?? "", needsIdentity ?? []],
  );
  // The SQL only NARROWS; this decides. Its predicate reads the joined type line,
  // so a back-face-only DFC reaches here — and is then refused, because the
  // imported rule reads the front face alone. That is the split on purpose: a
  // loose prefilter costs a row of JavaScript, a loose final test ships a deck
  // the app would not have made.
  const ok = rows.find((r) =>
    isCommanderCandidate({
      typeLine: r.type_line, oracleText: r.oracle_text, layout: r.layout, manaCost: r.mana_cost,
    }),
  );
  return ok?.oracle_id ?? null;
}

/**
 * Every check goes through here, and a FAIL counts ITSELF.
 *
 * The count used to live beside the checks, so each call site had to remember a
 * separate `fail()` on the same condition it had just passed in. One that forgot
 * printed ` FAIL ` and then `All checks passed.` over it — a probe whose own
 * output cannot be read, and the exit code agreed with the wrong half. There is
 * no longer a second thing to remember.
 */
let failures = 0;

/**
 * The fixture deck, reachable from a SIGNAL handler as well as from `finally`.
 *
 * A `finally` covers a throw. It does not cover Ctrl-C, which is how a probe that
 * takes half a minute over a browser actually gets stopped — and the process
 * exits with the deck still on a SHARED fixture account, where it goes on
 * claiming a card and quietly changing every availability reading taken
 * afterwards, including the next run of this script. A write-enabled probe has to
 * clean up on the way out the door it is most likely to leave by.
 */
let fixtureDeckId = null;

function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  return ok;
}

/**
 * Commander availability — the rulings only a layout engine can answer.
 *
 * Four of this feature's decisions are invisible to jsdom, and two of them are
 * the ones review kept asking about:
 *
 *   1. THE CHIP WRAP (readiness D1). The chip declares a fixed 28px with no
 *      floor and its name shipped as a bare span, so the marker's measured
 *      69-89px made a long name wrap and break the pill. A unit test can assert
 *      the `whitespace-nowrap` class and nothing about whether the line held.
 *   2. THE MARKER'S RESOLVED TYPE. Left to inherit, it paints in the page's sans
 *      base — half again the size of the figure beside it — while every class
 *      assertion passes.
 *   3. THE KEY'S PIP BASELINE. `LegendPip` carried inline offsets that `KeyPip`
 *      reproduces; whether the two atoms sit on the same baseline is a question
 *      about laid-out boxes, and Design flagged it unverified.
 *   4. THE SYNERGY SLOT holding its width, so the toggle column does not walk
 *      up and down the list as a reader scans it.
 *
 * It WRITES one deck to build the claim check 2b needs — see the file header for
 * what and why. `local-dev` or a scratch branch, never production.
 *
 *   pnpm probe:commander-availability
 *   PROBE_BASE=http://localhost:3600 PROBE_SLUG=<slug> pnpm probe:commander-availability
 */

const WIDTHS = [
  { name: "desktop", viewport: { width: 1300, height: 900 } },
  { name: "phone", viewport: { width: 390, height: 844 } },
];

/** The chip's own declared height. A wrapped name is what breaks it. */
const CHIP_HEIGHT = 28;

/** The synergy slot's width, by value — the column is sized to its widest
    occupant rather than to its content, so it is a constant and not a floor. */
const SLOT_PX = 88;

/** §4.4's ruling, by value at each geometry. */
const MARKER_PX = { chip: 10.5, row: 11.5 };

/**
 * Press through the About interstitial if it is standing in the way.
 *
 * `ABOUT_VERSION` gates every route: bump it and the next request from an
 * account that has not acknowledged the new version is redirected to
 * `/about?next=<where you were going>`. That is the feature working — a bump is
 * meant to put the page in front of every reader once more — but it means ANY
 * browser probe run in the same round as a bump lands on About instead of the
 * surface it meant to measure, and reports whatever it finds there.
 *
 * This one hit exactly that: the round that added the commander-availability
 * entry is the round this probe was written in.
 */
async function clearAboutGate(page) {
  if (!page.url().includes("/about")) return false;
  const got = onPageRole(page, "button", /got it/i).first();
  await got.waitFor({ state: "visible", timeout: 15_000 });
  await Promise.all([page.waitForLoadState("domcontentloaded"), got.click()]);
  return true;
}

async function goto(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  if (await clearAboutGate(page)) {
    // The form returns the reader to `next`, which is where we were going — but
    // land on it explicitly rather than trusting the redirect to be exact.
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  }
}

/** The chip, by the geometry it declares rather than by a composed class list. */
const CHIP = 'button[class*="h-[28px]"]';

/** The synergy slot, by the width it declares. */
// `88px`, not `width: 88px`. React serialises an inline style without spaces in
// server-rendered markup (`width:7px;height:7px`) and the CSSOM re-serialises it
// WITH one after hydration, so a selector naming either spelling matches for only
// part of the page's life — which is how this check reported ten slots on one run
// and none on the next against an unchanged build. Nothing else on a synergy row
// carries an inline 88px.
const SLOT = 'li span[style*="88px"]';

/**
 * A commander whose Role Coverage actually draws chips.
 *
 * The first row on `/commanders` is not good enough: Role Coverage is built from
 * the OWNED pool, so a commander the player owns nothing for renders the panel's
 * empty state and every chip reading below measures nothing. The first fixture
 * this probe picked was exactly that, and reported three failures that were
 * about the fixture rather than the build.
 */
async function findCommanderSlug(page) {
  if (process.env.PROBE_SLUG) return process.env.PROBE_SLUG;
  await goto(page, "/commanders");
  // `evaluateAll` does not wait, and this list paints client-side — so wait for
  // one row before collecting them all, or the sweep reads an empty document and
  // reports "no commanders" on a page that has them.
  await onPage(page, 'a[href^="/commanders/"]').first().waitFor({ state: "attached", timeout: 30_000 });
  const hrefs = await onPage(page, 'a[href^="/commanders/"]').evaluateAll((els) =>
    els.map((e) => e.getAttribute("href")).filter(Boolean),
  );
  const slugs = [...new Set(hrefs.map((h) => h.split("/commanders/")[1].split("?")[0]))].filter(Boolean);
  if (slugs.length === 0) throw new Error("No commander row on /commanders — cannot pick a fixture.");
  for (const slug of slugs.slice(0, 8)) {
    await goto(page, `/commanders/${slug}`);
    // The loop reuses ONE page, and a locator resolves against whatever document
    // is current — so without this the chips of the PREVIOUS commander satisfy
    // the wait and the loop returns a slug whose own page has none. That is
    // exactly what it did: it picked a commander with zero chips and then
    // reported three failures about the build.
    await page.waitForURL((u) => u.pathname === `/commanders/${slug}`, { timeout: 30_000 });
    await onPage(page, "h1").first().waitFor({ state: "attached", timeout: 30_000 });
    // WAIT for a chip rather than counting immediately: the panels paint after
    // the heading, so an instant count returns 0 on a page that has 48 of them
    // and the loop walks past a perfectly good fixture.
    // BOTH panels, not just the chips. A commander EDHREC does not index draws
    // Role Coverage and an empty synergy list, and this probe measures the slot
    // as well — so a chips-only fixture reports "the synergy panel did not
    // render" and blames the build for what the fixture chose.
    try {
      await onPage(page, CHIP).first().waitFor({ state: "attached", timeout: 8_000 });
      await onPage(page, SLOT).first().waitFor({ state: "attached", timeout: 8_000 });
      return slug;
    } catch {
      continue;
    }
  }
  throw new Error(
    `None of the first ${Math.min(8, slugs.length)} commanders draws BOTH a Role Coverage ` +
      `chip AND a synergy slot. Either this account owns nothing in their roles (Role Coverage ` +
      `is built from the owned pool) or EDHREC does not index them (no synergy rows). Both are ` +
      `fixture facts, not build facts. Pass PROBE_SLUG for a commander with both.`,
  );
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  let heldDeckId = null;

  try {
    const { slug, userId, commanderName } = await (async () => {
      const c = await browser.newContext({ viewport: WIDTHS[0].viewport });
      const p = await c.newPage();
      const uid = await signIn(p);
      const s = await findCommanderSlug(p);
      await goto(p, `/commanders/${s}`);
      // The route's loading screen draws an h1 of its own ("Consulting the council"), so the
      // name is read only once a group head exists, which the page draws and the loader does not.
      await onPage(p, "[data-role-gap]").first().waitFor({ state: "attached", timeout: 30_000 });
      const h1 = onPage(p, "h1").first();
      const name = (await h1.innerText()).trim();
      await c.close();
      return { slug: s, userId: uid, commanderName: name };
    })();
    console.log(`fixture: /commanders/${slug}`);

    // Captured BEFORE the write, so the `finally` puts back what was there.
    const { rows: targetRows } = await pool.query(
      `select cs.commander_oracle_id as oracle_id, cs.avg_ramp, cs.avg_draw, cs.avg_removal, cs.avg_wipes
         from commander_support cs join cards c on c.oracle_id = cs.commander_oracle_id
        where c.name = $1
           or c.oracle_id in (select oracle_id from printings where flavor_name = $1)`,
      [commanderName],
    );
    if (targetRows.length === 1) {
      heldTargets = targetRows[0];
      await pool.query(
        `update commander_support set avg_ramp = $2, avg_draw = $3, avg_removal = $4, avg_wipes = $5
          where commander_oracle_id = $1`,
        [heldTargets.oracle_id, SENTINEL.ramp, SENTINEL.draw, SENTINEL.removal, SENTINEL.wipes],
      );
    } else {
      report("the measured sentinel", false,
        `found ${targetRows.length} commander_support rows for "${commanderName}"; the group-head check lost its subject, NOT a pass`);
    }

    // Force a HARD claim so the slot's marker states are reachable at all. The
    // dev account's claims are all soft, so without this the marker reading is
    // skipped and the run says so — honest, and still not a check.
    const page0 = await (async () => {
      const c = await browser.newContext({ viewport: WIDTHS[0].viewport });
      const p = await c.newPage();
      await signIn(p);
      await goto(p, `/commanders/${slug}`);
      await onPage(p, SLOT).first().waitFor({ state: "attached", timeout: 15_000 }).catch(() => {});
      // The commander this page is about, so the fixture deck is not led by it.
      const commanderName = await onPage(p, "h1").first().innerText().catch(() => null);
      // An OWNED synergy row: the ones drawing a buy tag are unowned, and a card
      // nobody owns cannot be claimed into a deck.
      const name = await onPage(p, "li:has(button[aria-pressed])")
        .evaluateAll((rows) => {
          for (const r of rows) {
            if (r.querySelector('[class*="rounded-\\[4px\\]"]')) continue; // a buy tag — unowned
            const t = r.querySelector("button:not([aria-pressed])");
            if (t?.textContent) return t.textContent.trim();
          }
          return null;
        })
        .catch(() => null);
      await c.close();
      return { name, commanderName: commanderName?.trim() ?? null };
    })();
    const heldName = page0.name;

    const resolved = heldName
      ? await resolveOwnedCard(userId, heldName)
      : { card: null, ambiguous: false };
    const held = resolved.card;
    const leader = held
      ? await anyOwnedLegend(
          userId, held.oracle_id, page0.commanderName, held.color_identity ?? [],
        )
      : null;

    // ONE EXPLICIT STATE, not an inference from `heldDeckId`. The marker check
    // below needs to know whether a claim was built AND on which card, and
    // reading that off the deck id conflated two different runs: a fixture that
    // was never built reported "no owned synergy card" whatever the actual
    // reason, and a row that already carried a marker of its own could satisfy
    // the check while the fixture had done nothing. `fixture.card` is set only
    // when this run put the claim there.
    const fixture = { card: null, why: null };
    if (held && leader) {
      await sleeveEveryCopy(userId, held.oracle_id, leader, (id) => {
        heldDeckId = id;
        fixtureDeckId = id;
      });
      fixture.card = heldName;
      console.log(`fixture: sleeved the only copy of "${heldName}" into a committed deck`);
    } else {
      // EACH REASON SAYS ITSELF. One note covering all four read every failure as
      // "you own no support for this commander", which is wrong for three of them
      // and sends the next reader to change PROBE_SLUG when the fixture is fine.
      fixture.why = !heldName
        ? "the page drew no owned synergy row to claim"
        : resolved.basic
          ? `"${heldName}" is a basic land, and \`loadAvailability\` omits basics from its` +
            " owned CTE — sleeving one would claim nothing and the row would draw no marker"
          : resolved.ambiguous
          ? `"${heldName}" names more than one card in the catalog, and sleeving the wrong` +
            " one would measure the wrong row"
          : !held
            ? `the collection does not hold exactly one copy of "${heldName}", and a non-basic` +
              " is a singleton, so one deck could not claim every copy"
            : "this account owns no card that could legally lead the fixture deck";
      console.log(
        `  note  no claim was built — ${fixture.why}. The slot's marker reading is skipped on` +
          " this run. Pass PROBE_SLUG for a commander whose support this account owns.",
      );
    }
    console.log("");

    for (const { name, viewport } of WIDTHS) {
      console.log(`── ${name} ${viewport.width}x${viewport.height} ──`);
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await signIn(page);
      await goto(page, `/commanders/${slug}`);
      await page.waitForURL((u) => u.pathname === `/commanders/${slug}`, { timeout: 30_000 });
      await onPage(page, "h1").first().waitFor({ state: "attached", timeout: 30_000 });
      // The panels paint after the heading. Counting straight after the h1 reads
      // an empty document and reports "no chip on the page" over a page with
      // fifty — the same mistake the fixture loop made one function up.
      await onPage(page, CHIP).first().waitFor({ state: "attached", timeout: 15_000 }).catch(() => {});
      await onPage(page, "li").first().waitFor({ state: "attached", timeout: 15_000 }).catch(() => {});

      // ── 1. the chip wrap ────────────────────────────────────────────────
      //
      // Measured on the CHIP only, which is desktop-only — the phone draws
      // `CoverageRow`, which truncates and is a different component.
      if (name === "desktop") {
        const chips = onPage(page, CHIP);
        const n = await chips.count();
        if (n === 0) {
          report("chip wrap", false, "no Role Coverage chip on the page — the reading lost its subject, NOT a pass");
        } else {
          const boxes = await chips.evaluateAll((els) =>
            els.map((el) => {
              const r = el.getBoundingClientRect();
              const nameEl = el.querySelector("span > span");
              return {
                h: Math.round(r.height * 100) / 100,
                text: nameEl?.textContent ?? "",
                lines: nameEl ? Math.round(nameEl.getBoundingClientRect().height / parseFloat(getComputedStyle(nameEl).lineHeight || "14")) : 0,
              };
            }),
          );
          // THE HEIGHT CHECK ALONE MEASURES NOTHING, and the mutation run proved
          // it: reverting `whitespace-nowrap` left every check green, because no
          // name on any fixture is long enough to wrap inside a chip at 1300px.
          // A chip that cannot fit simply takes its own line in the flex-wrap.
          //
          // So the rule is asserted where it lives — the name's computed
          // white-space — and the height is kept beside it as the invariant that
          // would catch a wrap arriving by some other route. One of the two can
          // fail without the other.
          const ws = await chips.first().evaluate((el) => {
            const nameEl = el.querySelector("span > span");
            return nameEl ? getComputedStyle(nameEl).whiteSpace : null;
          });
          const nowrap = ws === "nowrap";
          report("the chip's name is not allowed to wrap", nowrap, `white-space: ${ws}`);

          const tallest = boxes.reduce((a, b) => (b.h > a.h ? b : a));
          const ok = tallest.h <= CHIP_HEIGHT + 0.5;
          report(
            "chip holds its 28px",
            ok,
            `${boxes.length} chips, tallest ${tallest.h}px against ${CHIP_HEIGHT}px` +
              (ok ? "" : ` — "${tallest.text}" wrapped`),
          );

          // A run where no chip is near the cap proves little, so say so.
          // A NOTE, not a check. It reports on the fixture's strength rather
          // than on the build, so it must not print `FAIL` — a run that ends
          // "All checks passed." after a FAIL line is a probe whose own output
          // cannot be read. `report` is not used here for that reason.
          const widest = boxes.reduce((a, b) => (b.text.length > a.text.length ? b : a));
          console.log(
            `  note  longest chip name is "${widest.text}" (${widest.text.length} chars)` +
              (widest.text.length >= 12
                ? ""
                : " — under 12, so the height reading above is weak; pass PROBE_SLUG for a" +
                  " commander with longer staples"),
          );
        }
      }

      // ── 2. the marker's resolved type ───────────────────────────────────
      // `:visible` again, and for the same reason the key pip needed it: BOTH
      // widths' panels are in the DOM at once. Unfiltered, a phone run measures
      // the hidden desktop chips' 10.5px markers beside the phone's own 11.5px
      // rows and reports 17 of 25 "off" on a build where every visible marker is
      // correct.
      //
      // SCOPED TO ROLE COVERAGE. `tracking-[0.02em]` is the coverage marker's
      // class and the synergy row's markers do not carry it — so this locator
      // measured one panel and reported for both, and a synergy regression could
      // pass on a healthy chip. The synergy rows are measured separately below.
      const markers = onPage(page, '[class*="tracking-[0.02em]"]:visible');
      const mCount = await markers.count();
      if (mCount === 0) {
        report(
          "marker type",
          false,
          "no availability marker drawn — this account's collection covers its decks, so the" +
            " state has to be BUILT. NOT a pass: sleeve a copy into a committed deck first.",
        );
      } else {
        const sizes = await markers.evaluateAll((els) =>
          els.map((el) => ({
            px: Math.round(parseFloat(getComputedStyle(el).fontSize) * 100) / 100,
            family: getComputedStyle(el).fontFamily,
            text: el.textContent ?? "",
          })),
        );
        const want = name === "desktop" ? MARKER_PX.chip : MARKER_PX.row;
        const bad = sizes.filter((s) => Math.abs(s.px - want) > 0.6);
        report(
          "marker takes the figure's size, not the page's sans",
          bad.length === 0,
          `${sizes.length} markers, sizes ${[...new Set(sizes.map((s) => s.px))].join("/")}px` +
            ` against ${want}px` + (bad.length ? ` — ${bad.length} off` : ""),
        );

        const mono = sizes.every((s) => /mono/i.test(s.family));
        report("marker is mono, as the figure beside it is", mono, sizes[0].family);
      }

      // ── 2b. the SYNERGY row's own marker type ───────────────────────────
      //
      // A separate reading because it is a separate ruling: the slot's marker is
      // 11px on desktop and rides the meta line's 10px on the phone, neither of
      // which is the chip's size. Measured through the row, so a coverage marker
      // cannot stand in for it.
      // The marker by the SIZE CLASS the row sets on it, which is the thing
      // under test — not by `flex-none font-mono`, which `BuyTag`'s row variant
      // also carries. That first version matched the tags instead and reported
      // `9.5px against 11px`: the tag's own size, on a build where every marker
      // was correct and simply absent, because every synergy row on this fixture
      // is unowned.
      const rowMarkerClass = name === "desktop" ? "text-[11px]" : "text-[10px]";
      // SCOPED TO THE ROW THE FIXTURE HELD, not to every synergy row. Counting all
      // of them proves only that SOME row draws a marker — and other rows carry
      // pre-existing soft claims, so the held card could lose its marker entirely
      // while the count stayed above zero and the check reported OK. `heldName` is
      // the card this run sleeved; the row that names it is the only subject.
      //
      // Playwright quotes the name, so an apostrophe in a card name is safe.
      const rowScope = fixture.card
        ? `li:has(button[aria-pressed]):has(button:text-is(${JSON.stringify(fixture.card)}))`
        : "li:has(button[aria-pressed])";
      const rowMarkers = onPage(
        page,
        `${rowScope} [class*="${rowMarkerClass}"][class*="flex-none"]:visible`,
      );
      const rowCount = await rowMarkers.count();
      if (!fixture.card) {
        console.log(
          `  note  no claim was built (${fixture.why}), so no row can reach a marker. The` +
            " slot's marker type is not measured on this run.",
        );
      } else if (rowCount === 0) {
        // The fixture sleeved every copy of a card this page lists, so exactly one row
        // must read hard. No marker means the reading lost its subject — a silent pass
        // here is how this check spent its whole life measuring nothing.
        report(
          "synergy marker takes the slot's size",
          false,
          `markers: 0 on the row for "${fixture.card}", whose only copy this run sleeved`,
        );
      } else {
        const wantRow = name === "desktop" ? 11 : 10;
        const rowSizes = await rowMarkers.evaluateAll((els) =>
          els.map((el) => Math.round(parseFloat(getComputedStyle(el).fontSize) * 100) / 100),
        );
        const offRow = rowSizes.filter((px) => Math.abs(px - wantRow) > 0.6);
        report(
          "synergy marker takes the slot's size",
          offRow.length === 0,
          `${rowSizes.length} markers, sizes ${[...new Set(rowSizes)].join("/")}px against ${wantRow}px`,
        );
      }

      // ── 3. the key's pip baseline ───────────────────────────────────────
      //
      // The pip and the first word of the key share a line. If the atoms sit on
      // different baselines the pip rides above or below the text it labels,
      // which is what Design could not verify.
      // `:visible` is load-bearing. Both widths' panels are in the DOM at once
      // and one is hidden, so an unfiltered query finds the hidden copy first
      // and measures it at 0x0 — reporting a broken key on a healthy build. The
      // first run of this probe did exactly that.
      const keyPip = onPage(
        page,
        'p[class*="font-mono"] > span[aria-hidden="true"]:visible > span[class*="rounded-full"]',
      ).first();
      if (await keyPip.count()) {
        const geom = await keyPip.evaluate((dot) => {
          const wrap = dot.parentElement;
          const para = wrap.parentElement;
          const d = dot.getBoundingClientRect();
          const p = para.getBoundingClientRect();
          return { dotMid: d.top + d.height / 2, paraTop: p.top, lineH: parseFloat(getComputedStyle(para).lineHeight), size: Math.round(d.width * 100) / 100 };
        });
        const firstLineMid = geom.paraTop + geom.lineH / 2;
        const off = Math.abs(geom.dotMid - firstLineMid);
        // The size is checked BEFORE the offset: a 0px dot sits 0px from
        // everything, so an offset assertion alone passes on a dot that is not
        // being drawn at all.
        const sized = geom.size >= 5.5 && geom.size <= 6.5;
        report("key pip is drawn at 6px", sized, `${geom.size}px`);
        report(
          "key pip sits on the key's first line",
          sized && off <= 3,
          `dot centre ${Math.round(off * 100) / 100}px from the line's centre`,
        );
      } else {
        report("key pip", false, "no dot key found — NOT a pass");
      }

      // ── 4. the synergy slot holds one width ─────────────────────────────
      if (name === "desktop") {
        // WAIT FOR IT. The row takes `isPhone` as a prop and the shell settles its
        // width after mount, so the desktop slot is genuinely absent for the first
        // frames — a bare count races that and reads 0 on a healthy page. A real
        // absence still fails, one timeout later rather than instantly.
        const slots = onPage(page, SLOT);
        await slots.first().waitFor({ state: "attached", timeout: 10_000 }).catch(() => {});
        const sCount = await slots.count();
        if (sCount === 0) {
          report("synergy slot", false, "no 88px slot drawn — the synergy panel did not render, NOT a pass");
        } else {
          const widths = await slots.evaluateAll((els) =>
            els.map((el) => Math.round(el.getBoundingClientRect().width * 100) / 100),
          );
          // The contract is 88px, not "at least 88px". A floor would pass a
          // regression widening the column to 100 — uniform, wider, and wrong,
          // since the figure is chosen to hold `buy · sold out` and no more.
          const uniform = new Set(widths).size === 1;
          const exact = uniform && Math.abs(widths[0] - SLOT_PX) < 0.5;
          report(
            "every synergy slot is exactly the slot width",
            exact,
            `${widths.length} slots, widths ${[...new Set(widths)].join("/")}px against ${SLOT_PX}px`,
          );
        }
      }

      // ── 5. the group heads grade against the commander's measured targets ─────
      //
      // How it works §5.4b. Every head on screen at this width, read through its own hook, against
      // the shipped wording for the sentinel's targets. The wipes head is the case that matters: a
      // measured 0 never reads short, whatever the reader owns.
      if (heldTargets) {
        const heads = await onPage(page, "[data-role-gap]").evaluateAll((els) =>
          els
            .filter((el) => el.getClientRects().length > 0)
            .map((el) => ({ role: el.dataset.roleGap, owned: Number(el.dataset.owned), text: el.textContent.trim() })),
        );
        const roles = heads.map((h) => h.role).sort().join(",");
        report("a head for each of the four roles", roles === "draw,ramp,removal,wipes", `drawn: ${roles || "none"}`);
        for (const h of heads) {
          const want = recommendationsCopy.coverage.gap(h.owned, wholeTarget(SENTINEL[h.role]), true);
          report(`${h.role} head reads the measured target`, h.text === want, `"${h.text}" against "${want}"`);
        }
        const outcome = (t) => (/short/.test(t) ? "short" : /^At /.test(t) ? "at" : /past/.test(t) ? "past" : "none");
        const outcomes = [...new Set(heads.map((h) => `${h.role} ${outcome(h.text)}`))].join(", ");
        console.log(`  note outcomes reached at this width: ${outcomes}`);
        const wipes = heads.find((h) => h.role === "wipes");
        report("a measured 0 never reads short", !!wipes && !/short/.test(wipes.text), wipes ? `"${wipes.text}"` : "no wipes head");
      }

      await context.close();
    }
  } finally {
    await restoreTargets();
    // The deck goes whatever happened above; versions and version cards cascade.
    // Attempted independently of the browser shutdown, so one failing does not
    // strand the other — and the deck is a write on a shared account, which is
    // the one thing here that must not survive the run.
    try {
      if (heldDeckId) await pool.query(`delete from decks where id = $1`, [heldDeckId]);
      fixtureDeckId = null;
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

/**
 * Delete the fixture deck on the way out, whichever door is used.
 *
 * `once`, because a second signal while the delete is in flight would start a
 * second delete and then exit under it. The handler re-raises with the
 * conventional 128 + signal code rather than swallowing the interrupt — a script
 * that ignores Ctrl-C is worse than one that leaves a row behind.
 *
 * `beforeExit` covers the remaining case: a normal return whose `finally` was
 * skipped because something above it called `process.exit`. Nothing here does
 * today, and `probe:score-lock` learned what it costs when something does.
 *
 * MEASURED, and narrower than it looks. Interrupting mid-run with a browser
 * operation in flight already cleaned up before this existed: Playwright installs
 * its own SIGINT handling, the pending operation rejects, and the `finally` runs
 * normally — removing these handlers and repeating the interrupt still left no
 * deck behind. What they cover is the window with NO browser call pending, which
 * on this script is the fixture setup itself: the deck row is written, then three
 * more inserts, and an interrupt in there exits with the claim standing on a
 * shared account. Small window, and the cost of losing it is a row that silently
 * changes every availability reading taken afterwards.
 */
async function sweepFixture() {
  await restoreTargets();
  if (!fixtureDeckId) return;
  const id = fixtureDeckId;
  fixtureDeckId = null;
  try {
    await pool.query(`delete from decks where id = $1`, [id]);
    console.log(`\n  cleaned up the fixture deck (${id})`);
  } catch (err) {
    // Say so loudly: an undeleted deck on a shared account is a claim that
    // silently changes every later reading, and the next person to run this
    // needs the id to remove it by hand.
    console.error(`\n  COULD NOT DELETE the fixture deck ${id} — remove it by hand:`, err);
  }
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.once(signal, async () => {
    await sweepFixture();
    process.exit(signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 129);
  });
}
process.once("beforeExit", sweepFixture);

run();
