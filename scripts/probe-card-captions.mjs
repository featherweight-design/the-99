// The card views draw nothing over the art, and their caption is one box.
//
// Three of this design's rulings are facts about laid-out geometry, and jsdom can see none
// of them:
//
//   - The art carries NO mark and no bottom wash (call D). A class-list assertion cannot
//     tell a deleted scrim from one whose class moved, and it cannot see an absolutely
//     positioned mark at all — the element is present in both builds.
//   - The slot's three occupants are ONE BOX. They are not the same box today: the chip
//     uses Tailwind `border`, which is 1px of real layout on every side, while the collapsed
//     buy tag uses an inset shadow and the proxy mark an outline, neither of which occupies
//     space. Normalising font size and padding leaves the chip 2px taller — and a class-list
//     check reads `border` and `outline` as equally present, so only a measured height can
//     tell them apart.
//   - The live tile and the undo receipt report the SAME caption height, which is what makes
//     a removed card leave a hole exactly its own size.
//
// It also reads each grid's column count and tile width. The two routes' achievable tiles
// DIFFER and the probe asserts each one by name rather than a shared tolerance: `/collection`
// has 1170px of track at 1300px and lands on 178.3px, the deck pane has 1186px (its ancestor
// pays `md:px-[26px]`) and lands on 181px. No floor produces 178 there, and a shared ±2 would
// pass or fail on whether a scrollbar happens to render.
//
// PREREQUISITE: the account needs at least one card in a MARKED state — claimed,
// over-committed, unowned or proxied. The slot draws nothing for a free, owned,
// un-proxied card, so a collection in which everything is free renders no slot box
// anywhere and the one-box check has nothing to compare. It fails rather than
// passing quietly in that case, and says which it was.
//
// Run by hand, and not part of `pnpm test`:
//   node scripts/probe-card-captions.mjs
//   PROBE_BASE=http://localhost:3600 PROBE_DECK=<uuid> node scripts/probe-card-captions.mjs
import { readFileSync } from "node:fs";

import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPageRole, PAGE } from "./lib/surface.mjs";

const { deck: DECK_VIEW } = { deck: { card: "Card view" } };
const viewToggleCopy = { deck: DECK_VIEW };

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  // The draft block stages its own `deck_cards` row. Point this at `local-dev`
  // or a scratch branch, NEVER production.
  "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
/** The gate's threshold, read from the file the app pins it in. */
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
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

  // CLEAR THE ABOUT GATE before any route is asked for. Since #658 `proxy.ts`
  // redirects a reader who has not seen the current `ABOUT_VERSION` to
  // `/about?next=…` — so a probe that navigated straight to `/decks` scraped the
  // about page and reported "the account owns none", a routing problem wearing a
  // fixture problem's clothes.
  //
  // Seeded rather than clicked through: the flag lives in `user_prefs` and the
  // probe account has no row at all, so visiting the page does not write one.
  // Left set afterwards on purpose — "this account has seen the about page" is
  // true once this ran, and clearing it would re-break every other probe on this
  // account.
  //
  // `greatest(...)`, which is what `lib/about/read.ts` itself writes. A bare
  // assignment LOWERS the stored value when this checkout is pinned behind the
  // database's — putting the About page back in front of a real reader on their
  // next navigation, which is a probe editing a person's state rather than its
  // own fixture.
  const [{ version }] = [JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"))];
  await neon(DATABASE_URL)`
    insert into user_prefs (user_id, about_version_seen)
    values (${await page.evaluate(() => window.Clerk.user.id)}, ${version})
    on conflict (user_id) do update
      set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
}

function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  return ok;
}

/**
 * What the art region is carrying.
 *
 * The art is found by its aspect ratio rather than by a class: 63/88 is the card, and every
 * candidate this could match — a plate, an illustration, a no-art sunken box — is drawn at
 * it. A positioned descendant is a mark left on the art; a `box-shadow` naming a blur radius
 * is the bottom wash, which the 1px inner edge (`inset 0 0 0 1px`) never does.
 */
const ART = (page) =>
  [...document.querySelectorAll(`${page} *`)]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 60) return false;
      return Math.abs(r.height / r.width - 88 / 63) < 0.03;
    })
    .map((el) => {
      const marks = [...el.querySelectorAll("*")].filter((d) => {
        const s = getComputedStyle(d);
        if (s.position !== "absolute") return false;
        // The no-art plate's cost pips are the one thing this design leaves
        // positioned over the art's box, and they are not a mark on an
        // illustration: that plate prints no cost, so the pips are the only one
        // anyone can see. Without this a deck holding a single artless card
        // fails the check for drawing exactly what it was told to draw.
        if (d.closest("[data-testid='tile-cost-pips']")) return false;
        const r = d.getBoundingClientRect();
        // An `sr-only` span is absolutely positioned and 1px square. It is not a mark; it is
        // the cost this design deliberately kept speaking.
        return r.width > 4 && r.height > 4;
      }).length;
      const shadow = getComputedStyle(el).boxShadow;
      // The wash is the shadow with a BLUR. The 1px inner edge this design keeps
      // is `0 0 0 1px`, which has none, so blur is what tells them apart.
      //
      // Parsed, never matched with one regex. A computed `box-shadow` puts the
      // COLOUR first — `rgba(0, 0, 0, 0.6) 0px -40px 40px -30px inset` — and the
      // first version of this check assumed the authored order, so its pattern
      // never fired: it reported "0 carrying a wash" over a tile whose wash had
      // been put back. Split on commas that are not inside `rgba(...)`, then read
      // each shadow's third length.
      const wash = shadow
        .split(/,(?![^(]*\))/)
        .some((part) => {
          const lengths = part.match(/-?\d+(\.\d+)?px/g) ?? [];
          return lengths.length >= 3 && parseFloat(lengths[2]) > 0;
        });
      return { marks, wash, shadow };
    });

/**
 * The draft's treatment on the tiles: the accent edge, and the figure standing
 * in the count's position.
 *
 * `boxShadow` rather than a class, because the edge is an inline style and the
 * question is which ELEMENT carries it — the caption, never the shell, whose
 * border already carries over-committed.
 */
const DRAFT = ({ page }) => {
  const edged = [...document.querySelectorAll(`${page} *`)].filter((el) =>
    (el.style.boxShadow ?? "").includes("var(--accent)"),
  );
  return {
    edges: edged.length,
    // The caption is the flex row; the shell is the rounded plate above it. If
    // the edge ever migrates, this is what says so.
    onCaption: edged.filter((el) => el.className.includes("items-stretch")).length,
    // SCOPED TO A CAPTION. Unscoped, this read the deck header's own `+1`
    // pending-count chip and passed with the tile's figure deleted outright —
    // the check existed and measured nothing. The caption is the only place the
    // tile's figure can legitimately be.
    figures: [...document.querySelectorAll(
      `${page} [class*="min-h-[52px]"][class*="min-h-[46px]"] span`,
    )]
      .filter((el) => /^(\+\d+|\d+ → \d+)$/.test((el.textContent ?? "").trim()))
      .map((el) => el.textContent.trim()),
  };
};

/** Every caption's height, and every slot box's height, on the page. */
const CAPTIONS = (page) => {
  // BOTH halves of the pair. `decklist-row`'s meta shell is also `min-h-[52px]`
  // — with `md:min-h-[34px]` — so matching the phone figure alone measured the
  // LIST's rows and reported a tidy single height of 34 for them.
  const caps = [...document.querySelectorAll(
    `${page} [class*="min-h-[52px]"][class*="min-h-[46px]"]`,
  )];
  const heights = [...new Set(caps.map((c) => Math.round(c.getBoundingClientRect().height)))];
  // The slot's occupants: the one box, whoever is in it. Found by the geometry they share —
  // a 4px radius on a mono box inside a caption — rather than by three component classes,
  // because the point of the check is that the three agree.
  const boxes = caps.flatMap((c) =>
    [...c.querySelectorAll("span")].filter((s) => {
      const st = getComputedStyle(s);
      if (st.borderRadius !== "4px") return false;
      return st.fontFamily.toLowerCase().includes("mono");
    }),
  );
  const boxHeights = [...new Set(boxes.map((b) => Math.round(b.getBoundingClientRect().height * 2) / 2))];
  // WHICH occupant, not just how many. The three are one box by rule, and a run
  // whose every box is a chip has not tested that — it has measured one
  // component against itself. The kinds are named so the report says which.
  const kinds = [...new Set(boxes.map((b) => {
    const t = (b.textContent ?? "").trim();
    if (t.startsWith("P")) return "P";
    if (t.includes("$")) return "$";
    return "chip";
  }))];
  return { captions: caps.length, heights, boxes: boxes.length, boxHeights, kinds };
};

/**
 * The grid's column count and track width, read off `grid-template-columns`.
 *
 * Computed, not declared: `auto-fill` resolves to an explicit track list, so this reports
 * what the browser actually laid out. Counting tile ELEMENTS instead needs a selector for
 * "a tile", and the first attempt — `button` inside `main` — matched every control on the
 * page and reported five columns of 22px.
 */
const GRID = ({ page }) => {
  const grids = [...document.querySelectorAll(`${page} *`)].filter((el) => {
    const s = getComputedStyle(el);
    if (!s.display.includes("grid")) return false;
    return el.querySelector('[class*="min-h-[52px]"][class*="min-h-[46px]"]') !== null;
  });
  if (!grids.length) return null;
  const tracks = getComputedStyle(grids[0]).gridTemplateColumns.split(" ").filter(Boolean);
  return {
    columns: tracks.length,
    tile: Math.round(parseFloat(tracks[0]) * 10) / 10,
  };
};

async function run() {
  await clerkSetup();
  const sql = neon(DATABASE_URL);
  const browser = await chromium.launch();
  let failures = 0;
  let checks = 0;
  /** Populated BEFORE the insert it covers, so a throw cannot strand the row. */
  let staged = null;

  try {
    for (const width of [1300, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await signIn(page);

      const deck = process.env.PROBE_DECK
        ? `/decks/${process.env.PROBE_DECK}`
        : await (async () => {
          await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
          await page.waitForTimeout(2_500);
          return page.evaluate(() => [...document.querySelectorAll('a[href^="/decks/"]')]
            .map((a) => a.getAttribute("href"))
            .find((h) => h && !/\/(import|new)$/.test(h)) ?? null);
        })();
      if (deck === null) {
        checks += 1;
        failures += !report(`${width}px · a deck to read`, false, "the account owns none");
        await context.close();
        continue;
      }

      for (const [label, route, toggle] of [
        ["/collection", "/collection?view=grid", null],
        // PRESSED, never a URL parameter. The deck's view is client state with
        // no `?view=`, so a run that navigated to `?view=card` measured the LIST
        // and said so in the language of the card view.
        ["deck card view", deck, viewToggleCopy.deck.card],
      ]) {
        await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(2_000);
        if (toggle) {
          const control = onPageRole(page, "button", toggle);
          if ((await control.count()) === 0) {
            checks += 1;
            failures += !report(`${width}px · ${label} · reach the view`, false, `no "${toggle}" control`);
            continue;
          }
          await control.first().click();
          await page.waitForTimeout(1_500);
        }

        const arts = await page.evaluate(ART, PAGE);
        checks += 2;
        // A run that photographed an empty route would otherwise sweep clean.
        failures += !report(
          `${width}px · ${label} · found art`,
          arts.length > 0,
          `${arts.length} card-shaped regions`,
        );
        const dirty = arts.filter((a) => a.marks > 0);
        const washed = arts.filter((a) => a.wash);
        failures += !report(
          `${width}px · ${label} · the art keeps nothing`,
          arts.length > 0 && dirty.length === 0 && washed.length === 0,
          `${dirty.length} carrying a mark, ${washed.length} carrying a wash`,
        );

        const caps = await page.evaluate(CAPTIONS, PAGE);
        checks += 2;
        failures += !report(
          `${width}px · ${label} · one caption height`,
          caps.captions > 0 && caps.heights.length === 1,
          `${caps.captions} captions, heights ${caps.heights.join(" / ") || "none"}`,
        );
        // Zero boxes is a FAILURE, and it names a missing PREREQUISITE rather than a
        // defect. The slot draws nothing for a free, owned, un-proxied card, so a
        // collection in which every card is free legitimately renders no box at all —
        // and a run over one has measured nothing, which must not read as a sweep.
        // See the header: the account needs at least one card in a marked state.
        //
        // It reports the KINDS it saw, and that line is the point. On a fixture whose cards
        // are all owned and none printed, every box is a chip and this check compares one
        // component against itself — it passed a mutation that put the chip's border back,
        // which is the exact defect it was written for. The invariant that the three agree
        // is pinned in `card-tile-caption.test.tsx`, which forces all three; here the kinds
        // line says how much of it this run actually exercised.
        failures += !report(
          `${width}px · ${label} · one slot box`,
          caps.boxes > 0 && caps.boxHeights.length === 1,
          caps.boxes === 0
            ? "no card in a marked state — seed one, this run proves nothing"
            : `${caps.boxes} boxes, heights ${caps.boxHeights.join(" / ")}, kinds ${caps.kinds.join("+")}`,
        );

        // BOTH widths. This was gated to 1300 alone, which left the phone's
        // explicit 2-up — the one thing the desktop floor cannot express, since
        // at 390px a 178px floor plus a gap exceeds the track and auto-fill
        // would collapse to one column — asserted by nothing. A regression there
        // passed every check on the surface it was most likely to break.
        const grid = await page.evaluate(GRID, { page: PAGE });
        const want = width === 1300 ? (label === "/collection" ? 178.3 : 181) : null;
        const wantColumns = width === 1300 ? 6 : 2;
        checks += 1;
        failures += !report(
          `${width}px · ${label} · ${wantColumns} tracks${want ? ` at ${want}px` : ""}`,
          grid !== null
            && grid.columns === wantColumns
            && (want === null ? grid.tile > 120 : Math.abs(grid.tile - want) <= 2),
          grid === null ? "no tiles" : `${grid.columns} columns, tile ${grid.tile}px`,
        );
      }
      // The draft. Staged once, read at both widths, and torn down in the
      // `finally` — a deck with a committed version is what makes a draft
      // possible at all, since a brew has nothing to diff against.
      if (staged === null) {
        // A draft is a DIFF, so staging one needs a committed version to diff
        // against — and the account this probe signs in as owns none. So it
        // commits one itself, out of the deck's own current rows, which makes
        // the version identical to the draft and the deck momentarily clean.
        // Adding one card after that is then the only change there is, and `+1`
        // is a figure whose true value is known rather than read back.
        //
        // The deck comes from the run's own discovery (`/decks` as the signed-in
        // account). Picking one straight out of the database is how the first
        // version of this block ended up navigating to ANOTHER USER'S deck and
        // reading its not-found page as "no edges drawn".
        const deckId = deck.replace(/^\/decks\//, "");
        // OWNERSHIP IS PROVEN BEFORE ANYTHING IS WRITTEN. These are direct
        // inserts with no Clerk authorization in front of them, so a typo in
        // `PROBE_DECK` — or someone else's UUID — would otherwise stage a
        // version and a card into a stranger's deck, on a route the browser
        // cannot even read. The run's own `/decks` listing is the proof: a deck
        // that appears there belongs to the account that signed in.
        // Read on `/decks` ITSELF. The page is on a card route by now, where
        // there are no deck links at all — scraping it there reported every deck
        // as somebody else's, including the one the run had just discovered.
        await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
        await page.waitForTimeout(1_500);
        const ownedHere = await page.evaluate(() =>
          [...document.querySelectorAll('a[href^="/decks/"]')]
            .map((a) => a.getAttribute("href")?.replace(/^\/decks\//, "") ?? "")
            .filter(Boolean),
        );
        if (!ownedHere.includes(deckId)) {
          checks += 1;
          failures += !report(
            `${width}px · draft · the deck is this account's`,
            false,
            `${deckId} is not in this account's deck list — refusing to write to it`,
          );
        }
        const [lead] = ownedHere.includes(deckId)
          ? await sql`
          select commander_oracle_id, partner_oracle_id from decks where id = ${deckId}`
          : [];
        // NOT the commander, and not the partner. The app rejects either as
        // `is-commander` (`lib/decks/add-validation.ts`), so a fixture that
        // staged one would be testing a row the app cannot produce — and on a
        // pair deck the obvious `not in (deck_cards)` filter selects exactly
        // that, because a commander is not a `deck_cards` row.
        // A card the APP COULD HAVE ADDED. Commander-legal, and inside the
        // deck's colour identity, because a probe that stages a row no route can
        // produce is describing a state the app never reaches. Not the deck's own
        // commander or partner either: the app rejects both as `is-commander`,
        // and on a pair deck the obvious `not in (deck_cards)` filter selects
        // exactly them, since a commander is not a `deck_cards` row.
        const [spare] = lead
          ? await sql`
          select c.oracle_id from cards c
           where c.oracle_id not in (
                 select dc.oracle_id from deck_cards dc where dc.deck_id = ${deckId})
             and c.oracle_id is distinct from ${lead.commander_oracle_id ?? null}
             and c.oracle_id is distinct from ${lead.partner_oracle_id ?? null}
             and c.commander_legal
             and c.color_identity <@ (
                   select coalesce(lc.color_identity, '{}') || coalesce(pc.color_identity, '{}')
                     from cards lc
                     left join cards pc on pc.oracle_id = ${lead.partner_oracle_id ?? null}
                    where lc.oracle_id = ${lead.commander_oracle_id})
           limit 1`
          : [];
        if (!lead?.commander_oracle_id || !spare) {
          checks += 1;
          failures += !report(
            `${width}px · draft · a deck to stage one in`,
            false,
            "the discovered deck has no commander, or the catalog no spare card",
          );
        } else {
          const [{ next }] = await sql`
            select coalesce(max(number), 0) + 1 as next from deck_versions where deck_id = ${deckId}`;
          // EVERY handle is recorded before the write it covers, so a throw
          // part-way through cannot strand a version or a row in this player's
          // deck. The same rule `probe:review` follows around the collection.
          const versionId = crypto.randomUUID();
          staged = { deckId, oracleId: spare.oracle_id, versionId };
          // BOTH commander columns. The partner is nullable, and a snapshot that
          // dropped it would make this temporary version — which is the newest,
          // and therefore the one every reader consults — say a pair deck has no
          // partner. The probe would then be reading a deck in a state the app
          // never produces.
          //
          // The `*_since` tenures are the VERSION's own and have no counterpart
          // on `decks`, so they are left to their defaults rather than copied
          // from a column that does not exist.
          // The tenures come with the commanders. `commander_since` and
          // `partner_since` are what the availability query reads as a claim's
          // SENIORITY, and `commitVersion` populates both for every non-null
          // commander — so a snapshot that left the partner's null would change
          // which deck goes short while this probe is running.
          await sql`
            insert into deck_versions (
              id, deck_id, number,
              commander_oracle_id, partner_oracle_id, commander_since, partner_since)
            values (
              ${versionId}, ${deckId}, ${next},
              ${lead.commander_oracle_id}, ${lead.partner_oracle_id ?? null},
              now(), ${lead.partner_oracle_id ? sql`now()` : null})`;
          // `since` is INHERITED from the predecessor, exactly as the real commit
          // path does it (`lib/decks/versions.ts`): an unchanged card keeps the
          // tenure it already had, and only a card the predecessor did not hold
          // starts its clock now. It is a claim's seniority, so defaulting every
          // row to `now()` would reorder who goes short for cards this probe
          // never touched, for as long as it runs.
          await sql`
            insert into deck_version_cards (version_id, oracle_id, quantity, since)
            select ${versionId}, dc.oracle_id, dc.quantity,
                   coalesce(prev.since, now())
              from deck_cards dc
              left join deck_version_cards prev
                on prev.oracle_id = dc.oracle_id
               and prev.version_id = (
                     select v.id from deck_versions v
                      where v.deck_id = ${deckId} and v.id <> ${versionId}
                      order by v.number desc limit 1)
             where dc.deck_id = ${deckId}`;
          // No receipt is kept, deliberately — see the cleanup's own note. The
          // row is identified at teardown by the quantity it was inserted with,
          // which survives a lost reply where a receipt does not.
          await sql`
            insert into deck_cards (deck_id, oracle_id, quantity, auto)
            values (${deckId}, ${spare.oracle_id}, 1, false)
            on conflict do nothing`;
        }
      }
      if (staged) {
        await page.goto(`${BASE}/decks/${staged.deckId}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(2_000);
        const toggle = onPageRole(page, "button", viewToggleCopy.deck.card);
        if ((await toggle.count()) > 0) {
          await toggle.first().click();
          await page.waitForTimeout(1_500);
        }
        const draft = await page.evaluate(DRAFT, { page: PAGE });
        checks += 2;
        // Exactly one tile is touched, so exactly one edge — and it is on the
        // caption. Zero would mean the card view still photographs a dirty draft
        // as a clean one, which is the state this whole call exists to end.
        failures += !report(
          `${width}px · draft · one accent edge, on the caption`,
          draft.edges === 1 && draft.onCaption === 1,
          `${draft.edges} edges, ${draft.onCaption} on a caption`,
        );
        failures += !report(
          `${width}px · draft · a signed figure in the count's position`,
          draft.figures.includes("+1"),
          `figures ${draft.figures.join(" / ") || "none"}`,
        );
      }
      await context.close();
    }
  } finally {
    if (staged) {
      const clean = neon(DATABASE_URL);
      // ONE TRANSACTION, because this writes into a real player's deck. Two
      // separate requests can fail between them: the card deleted and the
      // version left standing, or — worse — the version gone while the card it
      // was staged with remains, a row no version knows about. Either leaves the
      // deck mutated by a probe that reported it had cleaned up.
      //
      // The card's delete is guarded on the QUANTITY rather than on a receipt.
      // A receipt read after the insert cannot tell "the write never happened"
      // from "the write committed and the reply was lost", and it strands the
      // row in the second case. The card was chosen for being absent from this
      // deck, so a row at quantity 1 is this run's; a concurrent edit that
      // bumped the count is left alone by the guard.
      //
      // Order carries no meaning here, and that is the point of the change: the
      // two statements used to be separate requests, where deleting the version
      // last was what kept a failure from stranding a card no version knows
      // about. Inside one transaction nobody observes an intermediate state and
      // the cascade takes the version's cards whichever runs first.
      await clean.transaction([
        clean`
          delete from deck_cards
           where deck_id = ${staged.deckId}
             and oracle_id = ${staged.oracleId}
             and quantity = 1`,
        clean`delete from deck_versions where id = ${staged.versionId}`,
      ]);
      console.log("  ..   removed the staged version and its one added card");
    }
    await browser.close();
  }

  console.log(`\n${checks - failures}/${checks} checks passed.`);
  if (failures) process.exitCode = 1;
}

run();
