// Gate for Surface 2: the review page, its two columns, the pull control and the
// commit sheet — at both breakpoints, driven out of a real database.
//
// What a component test cannot settle here:
//
//   1. THE ROUTE'S OWN GUARD. `/decks/<id>/changes` on a clean deck redirects to
//      the deck page. That is a server redirect off a real diff, and jsdom never
//      sees it.
//   2. `?commit=1` ARRIVING AS A URL. The banner's CTA is a link, so the sheet
//      opening is a fact about a navigation, and Cancel taking the parameter back
//      off is a fact about the live URL.
//   3. THE PHONE'S SEGMENTED PAIR. It exists only when both columns have rows and
//      only under 768px, and it hides the column it is not showing. Three facts
//      about layout at a width.
//   4. `Pull it` NEEDS A REAL CLAIM. A row offers the control only when the add is
//      bucketed `claimed` and a holder is releasable — a second deck, sleeved, not
//      pending, holding the one copy the player owns. That is a claim query, not a
//      prop, and it is the whole reason this surface exists.
//   5. THE WHAT-CHANGED STRIP DRAWS ALL SIX CELLS AT BOTH WIDTHS. Three of them
//      used to stand down at 390px, so the phone measured the deck against a
//      shorter list of recommendations than desktop did; the strip is now a
//      three-across grid under 768px. The verdict line under each cell stays
//      desktop-only. Which box is on screen at which width is only answerable
//      here, and a cell off screen fails the run.
//   6. DISCARD IS TWO CLICKS IN THE PLACE THE QUESTION WAS ASKED. The confirm
//      replaces the body of whichever surface raised it, so the trigger is out of
//      the document while it is up, focus is carried by hand to the way out and
//      back to the trigger on a cancel, and the answers swap order under 768px.
//      None of that is reachable where nothing has a box. The discard itself runs
//      once, last: it overwrites the only copy of the draft with the version.
//   7. THE AVAILABILITY MARKER'S TYPE IS INHERITED. At row density the marker
//      sets no size and no family of its own — it rides the meta line it sits on
//      — and a diff row has no meta line, so the label painted in the page's
//      16px sans, above the card name beside it. What it inherits is a fact
//      about laid-out type, so only a browser can read it. The run fails when
//      the label is not mono, is larger than the name in its own row, or is not
//      the decklist row's own size at that width — 11px under 768px, 11.5px
//      above it. It also fails when the fixture's own row draws no marker at
//      all, because a run that measures nothing must not read as a pass.
//
// THE FIXTURE IS THIS SCRIPT'S OWN. The probe account is not the account that owns
// local-dev's decks, and a deck page the signed-in player does not own is a 404 —
// so a run pointed at a fixture deck would report every surface absent and make a
// working feature look dead. The script copies a 99-row template into TWO decks
// owned by the account it signs in as, commits both as v1, finds a card the account
// already owns exactly one copy of, sleeves it into the second deck and adds it to
// the first. A THIRD deck, a brew with no version, holds a second singly-owned card
// that is also added to the first: a brew claims softly, so that add keeps its free
// bucket, draws no buy tag, and is the only row on this page that reaches the
// availability marker. All three decks go in a `finally`; no collection row is
// written, because a copy inserted on top of one already owned leaves a spare and
// buckets the add free.
//
// Point it at `local-dev` or a scratch Neon branch — NEVER production. It writes.
//
// Run by hand, with a dev server up:
//   node scripts/probe-review-changes.mjs
// Set PROBE_TEMPLATE_DECK to copy a different 99-row deck.
// Not part of `pnpm test`: it needs a browser, a signed-in session and a database.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { requireEnv } from "./lib/env.mjs";

neonConfig.webSocketConstructor = ws;

const {
  E2E_AUDIT_USER_EMAIL: EMAIL,
  E2E_AUDIT_USER_PASSWORD: PASSWORD,
  DATABASE_URL,
} = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const TEMPLATE = process.env.PROBE_TEMPLATE_DECK ?? "a1111111-1111-1111-1111-111111111111";

/** Column headings a run found on more than one line. A hard failure. */
const crushedHeadings = [];

/** Ways a run found the mix strip short of its contract: a cell never drawn, a
 *  cell drawn off screen, or a phone laying the six out as anything other than
 *  three columns over two rows. A hard failure at either width, because the
 *  strip's six figures are the deck against its recommendations, and a phone
 *  drawing three of them measures the deck against a shorter list than desktop. */
const hiddenCells = [];

/** Availability markers on a diff row whose type is not the row's. The marker
 *  sets no font size and no family of its own — row density rides the meta line
 *  it sits on — and a diff row has no meta line, so an untyped marker inherits
 *  the page's sans base and paints half again the `buy` tag that alternates with
 *  it in the same slot. Only a browser can answer it: jsdom applies no media
 *  query and resolves no Tailwind, so a component test can assert the class list
 *  and never the laid-out pair. */
const mistypedMarkers = [];

/** Type-move rows whose name is clipped by its own box. `text-overflow: ellipsis`
 *  does not touch `innerText`, so a truncated `Enchantment` reads back whole and
 *  every assertion on the row's text passes while the reader sees `Enchantme...`.
 *  What tells them apart is the name's overflow against its box, which needs a
 *  layout: the phone row hands the name the spare width and sizes the figure
 *  beside it to its digits, where a fixed 74px name slot clipped the one
 *  variable-length thing in the row and left `2 → 3` sitting in space it had no
 *  use for. */
const clippedGroups = [];

const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
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
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

/**
 * What the review page says, read off the rendered page.
 *
 * Anchored on `#review` — the container the commit sheet's money block links back
 * to — so a heading counted here is one of the two column headings and not a
 * string that happens to appear elsewhere on the page.
 */
const readReview = (page) =>
  page.evaluate(() => {
    const columns = document.getElementById("review");
    const visible = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const buttons = [...document.querySelectorAll("button")];
    // `textContent`, never `innerText`, for anything matched by its words: every
    // label and heading on this surface is a mono uppercase class, and `innerText`
    // returns the transformed glyphs while `textContent` returns what the copy
    // module wrote. A match on `innerText` silently finds only the cells that are
    // hidden at that width, where no transform is applied — which is exactly how
    // this reader first reported the three stood-down cells and nothing else.
    const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    return {
      url: location.pathname + location.search,
      // The centred container, found by walking up from the columns rather than
      // by class, so a restyle does not quietly stop measuring anything. A flex
      // item with `margin-inline: auto` loses `align-items: stretch` and sizes to
      // its content: this page drew ~870px of a 1300px desktop until `w-full`
      // restored the fill, so the ratio is the check that reported the defect.
      fill: (() => {
        const main = document.querySelector("main");
        if (!columns || !main) return null;
        let box = columns;
        while (box.parentElement && box.parentElement !== main) box = box.parentElement;
        const cap = Math.min(1180, main.clientWidth);
        return box.getBoundingClientRect().width / cap;
      })(),
      h1: document.querySelector("h1")?.innerText ?? null,
      lede: document.querySelector("header p")?.innerText ?? null,
      ledeVisible: visible(document.querySelector("header p")),
      chips: [...document.querySelectorAll("div")]
        .filter((el) => el.className.includes?.("hidden md:flex"))
        .map((el) => el.innerText.replace(/\n/g, " "))
        .slice(0, 1),
      headings: [...(columns?.querySelectorAll("h2") ?? [])].map((h) => {
        // A flex item shrinks by default, so the note beside the heading used to
        // squeeze `GOING OUT · 15` onto three lines. Lines rather than a pixel
        // height: the figure that matters is how many rows of text the heading
        // occupies, and that survives a font-size change.
        //
        // Counted off the text's own client rects, one per line box, rather than
        // by dividing the box height by `getComputedStyle(...).lineHeight` — that
        // property answers `normal` under a font stack that sets no length, and a
        // division by `NaN` would report a healthy heading as unmeasurable.
        const range = document.createRange();
        range.selectNodeContents(h);
        const rows = new Set(
          [...range.getClientRects()]
            .filter((r) => r.width > 0 && r.height > 0)
            .map((r) => Math.round(r.top)),
        );
        const box = h.getBoundingClientRect();
        return {
          text: h.innerText,
          visible: visible(h.closest("section") ?? h),
          // The heading's own box, not its section's: below `md:` a column whose
          // direction is already named by the segmented pair above it hides the
          // heading while the section stays on screen, so a line count taken off
          // the section would read 0 and look like a crush.
          drawn: box.height > 0,
          lines: box.height > 0 ? rows.size : null,
        };
      }),
      segments: buttons
        .filter((b) => b.hasAttribute("aria-pressed"))
        .map((b) => ({
          label: b.innerText.trim(),
          pressed: b.getAttribute("aria-pressed") === "true",
          width: Math.round(b.getBoundingClientRect().width),
          height: Math.round(b.getBoundingClientRect().height),
        })),
      pulls: buttons
        .filter((b) => /^Pull it$/.test(b.innerText.trim()))
        .map((b) => ({
          height: Math.round(b.getBoundingClientRect().height),
          width: Math.round(b.getBoundingClientRect().width),
        })),
      footer: [...document.querySelectorAll("span")]
        .map((s) => s.innerText)
        .find((t) => /card[s]? · /.test(t ?? "")) ?? null,
      commitCta: buttons.map((b) => b.innerText.trim()).find((t) => /^Commit /.test(t)) ?? null,
      sheetHeading:
        [...document.querySelectorAll("h2,h3")]
          .map((h) => h.innerText)
          .find((t) => /^Commit this list as v\d+$/.test(t ?? "")) ?? null,
      cancel: buttons.some((b) => b.innerText.trim() === "Cancel"),
      // The what-changed strip: six cells and the type-distribution rows under
      // them. Anchored on the cell labels and on the section's own heading —
      // neither the cells nor the rows carry an id, and both are the same
      // geometry as the deck page's mix strip, which this page does not draw.
      shape: (() => {
        // `ROLE_ORDER` in src/lib/decks/mix.ts, behind the mana-value cell the
        // strip prepends. The list is the contract, so a label the page stopped
        // drawing has to come back as a gap rather than shortening the run.
        const labels = ["Mana value", "Ramp", "Draw", "Removal", "Wipes", "Land"];
        // A positive box is not being on screen. A cell pushed past the right edge
        // of a 390px viewport, or clipped out of an `overflow` parent, measures
        // exactly as wide as one the reader can see — and `getBoundingClientRect`
        // reports the whole box either way, so what decides it is the cell's rect
        // intersected with the viewport AND with every ancestor that clips.
        const onScreen = (el) => {
          if (!visible(el)) return false;
          const r = el.getBoundingClientRect();
          let left = Math.max(r.left, 0);
          let top = Math.max(r.top, 0);
          let right = Math.min(r.right, innerWidth);
          let bottom = Math.min(r.bottom, innerHeight);
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const s = getComputedStyle(p);
            if (s.overflowX === "visible" && s.overflowY === "visible") continue;
            const pr = p.getBoundingClientRect();
            if (s.overflowX !== "visible") {
              left = Math.max(left, pr.left);
              right = Math.min(right, pr.right);
            }
            if (s.overflowY !== "visible") {
              top = Math.max(top, pr.top);
              bottom = Math.min(bottom, pr.bottom);
            }
          }
          return right - left > 0 && bottom - top > 0;
        };
        const found = [...document.querySelectorAll("p")].filter((p) =>
          labels.includes(text(p)),
        );
        const cells = found.map((p) => {
          const cell = p.parentElement;
          const lines = [...cell.querySelectorAll(":scope > p")];
          const figures = lines[1];
          const after = figures?.querySelector("span:last-child");
          const r = cell.getBoundingClientRect();
          return {
            label: text(p),
            figures: figures ? text(figures) : null,
            afterColor: after ? getComputedStyle(after).color : null,
            note: lines[2] ? text(lines[2]) : null,
            noteVisible: visible(lines[2]),
            visible: onScreen(cell),
            width: Math.round(r.width),
            left: Math.round(r.left),
            top: Math.round(r.top),
          };
        });
        const drawn = cells.map((c) => c.label);
        const missing = labels.filter((l) => !drawn.includes(l));
        const section = [...document.querySelectorAll("section")].find(
          (s) => text(s.querySelector("h2")) === "How the deck's shape moves",
        );
        const moves = section
          ? [...section.querySelectorAll(":scope > div > div")].map((row) => {
              const spans = [...row.querySelectorAll(":scope > span")];
              const pair = spans[1];
              const afterFigure = pair?.querySelector("span");
              const bar = row.querySelector(":scope > div");
              return {
                group: spans[0] ? text(spans[0]) : null,
                pair: pair ? text(pair) : null,
                pairColor: pair ? getComputedStyle(pair).color : null,
                // The one gap the verify pass found: the after figure carries the
                // deck's own ink and the figure before the arrow does not.
                afterColor: afterFigure ? getComputedStyle(afterFigure).color : null,
                delta: spans[2] ? text(spans[2]) : null,
                barVisible: visible(bar),
                groupWidth: spans[0] ? Math.round(spans[0].getBoundingClientRect().width) : null,
                groupClipped: spans[0] ? spans[0].scrollWidth > spans[0].clientWidth + 1 : null,
                // The name's own text, not its box. `scrollWidth` reports the box
                // whenever the text fits, so it cannot answer whether the fixture
                // moved a group long enough to have clipped in the retired slot; a
                // range over the text node is laid out either way.
                groupContent: (() => {
                  if (!spans[0]) return null;
                  const range = document.createRange();
                  range.selectNodeContents(spans[0]);
                  return Math.round(range.getBoundingClientRect().width);
                })(),
              };
            })
          : null;
        return { cells, missing, expected: labels.length, moves };
      })(),
      // The availability marker on a diff row. It sets no size and no family of
      // its own by design — row density rides the meta line it sits on — and
      // these rows have no meta line, so whatever it inherits is what the reader
      // gets. Read the computed pair, and the name beside it in the same row:
      // the label belongs a step BELOW the card name, and what shipped was the
      // page's sans base, above it.
      markers: [...(columns?.querySelectorAll("span.inline-flex") ?? [])]
        // `span.inline-flex` alone is not the marker: the group headings' counts
        // and the `Pull it` button match it too. The label is the only thing that
        // identifies one.
        .filter((s) => /^(none free|short \d+|\d+ in a brew)/.test(text(s)))
        .map((s) => {
          const style = getComputedStyle(s);
          // The name is the row's TITLED trigger, and the title is what
          // identifies it: a phone row carrying a pull stacks, putting the
          // marker on a second line whose first button is `PullControl`, so
          // taking the first button of the marker's own parent measured the
          // action's type on exactly the row this probe exists for. Step up one
          // level when the marker's line holds no name.
          const name =
            s.parentElement?.querySelector("button[title]") ??
            s.parentElement?.parentElement?.querySelector("button[title]") ??
            null;
          return {
            label: text(s),
            family: style.fontFamily,
            size: Number.parseFloat(style.fontSize),
            // The oracle name, off the button's title: the face prints the
            // printed name, which for a Secret Lair row is not the name the
            // fixture asked for.
            name: name?.getAttribute("title") ?? (name ? text(name) : null),
            nameSize: name ? Number.parseFloat(getComputedStyle(name).fontSize) : null,
          };
        }),
      discardTriggers: buttons
        .filter((b) => b.innerText.trim() === "Discard")
        .map((b) => ({
          width: Math.round(b.getBoundingClientRect().width),
          height: Math.round(b.getBoundingClientRect().height),
        })),
      // The confirm, wherever it was raised: it replaces the body of the surface
      // that raised it, so the same reading serves the banner and the apply bar.
      discardConfirm: (() => {
        const question = [...document.querySelectorAll("span")].find((s) =>
          /^Discard (this draft|\d+ changes?)\?$/.test(text(s)),
        );
        if (!question) return null;
        const box = question.parentElement;
        const why = box.querySelector("p");
        const style = getComputedStyle(box);
        return {
          question: text(question),
          questionColor: getComputedStyle(question).color,
          consequence: why ? text(why) : null,
          // The version clause, drawn in the reading ink at 600. Absent means the
          // sentence rendered whole, which is the fallback and not a pass.
          stamp: text(why?.querySelector("b")) || null,
          rule: `${style.borderLeftWidth} ${style.borderLeftColor}`,
          answers: [...box.querySelectorAll("button")].map((b) => {
            const r = b.getBoundingClientRect();
            return {
              label: b.innerText.trim(),
              color: getComputedStyle(b).color,
              background: getComputedStyle(b).backgroundColor,
              border: getComputedStyle(b).borderColor,
              height: Math.round(r.height),
              // Which answer is the higher one on the page: at 390px the safe one
              // is, because the thumb reaches the bottom row first.
              top: Math.round(r.top),
              describesWhy: !!why && b.getAttribute("aria-describedby") === why.id,
            };
          }),
          focused: document.activeElement?.innerText?.trim() ?? null,
        };
      })(),
    };
  });

const pool = new Pool({ connectionString: DATABASE_URL });

/** A 99-row deck owned by the signed-in account, committed as v1. */
async function buildDeck(userId, name, template) {
  const { rows } = await pool.query(
    `insert into decks (user_id, name, commander_oracle_id, partner_oracle_id, filled)
       values ($1, $2, $3, $4, true) returning id`,
    [userId, name, template.commander_oracle_id, template.partner_oracle_id],
  );
  const deckId = rows[0].id;
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto)
       select $1, oracle_id, quantity, false from deck_cards where deck_id = $2`,
    [deckId, TEMPLATE],
  );
  const version = await pool.query(
    `insert into deck_versions (deck_id, number, commander_oracle_id, partner_oracle_id)
       values ($1, 1, $2, $3) returning id`,
    [deckId, template.commander_oracle_id, template.partner_oracle_id],
  );
  await pool.query(
    `insert into deck_version_cards (version_id, oracle_id, quantity)
       select $1, oracle_id, quantity from deck_cards where deck_id = $2`,
    [version.rows[0].id, deckId],
  );
  return { deckId, versionId: version.rows[0].id };
}

/**
 * A card the player owns exactly one copy of, sleeved in the second deck.
 *
 * This is the shape `Pull it` is offered against and the only one: the add is
 * bucketed `claimed` because the lone copy is spoken for, and the holder is
 * releasable because it is sleeved, has no pending edits of its own, and does not
 * hold the card as its commander. Anything less and the row draws a guard tag or
 * no control at all.
 */
async function claimOneCopy(userId, holderDeckId, holderVersionId, excludeDeckId) {
  // Found in the collection rather than written into it. The probe account owns
  // most of the catalog, so an insert on top of what is already there leaves two
  // copies — one for the holder and one spare — and a spare copy buckets the add
  // free, which draws no control at all. The card has to be one the account owns
  // exactly one of, and the only way to have that is to ask.
  const { rows } = await pool.query(
    `select ci.oracle_id, c.name
       from collection_items ci
       join cards c on c.oracle_id = ci.oracle_id
      where ci.user_id = $1
        and c.type_line not like 'Basic Land%'
        and ci.oracle_id not in (select oracle_id from deck_cards where deck_id = $2)
        and ci.oracle_id not in (select oracle_id from deck_cards where deck_id = $3)
        -- Not sleeved anywhere else either: another committed deck's claim on the
        -- same lone copy would make the holder's the junior one, and the pull the
        -- page offers is against the deck this fixture built.
        and not exists (
          select 1 from deck_version_cards vc
            join deck_versions v on v.id = vc.version_id
            join decks d on d.id = v.deck_id
           where d.user_id = $1 and vc.oracle_id = ci.oracle_id
        )
        -- Nor anybody's commander. A commander is a column on the deck, not a
        -- deck_cards or deck_version_cards row, so the two exclusions above cannot
        -- see one — and the claim model counts a commander as a hard claim. Picked
        -- as the fixture card, it would add a holder this fixture never built, and
        -- the row would draw a guard tag or no control while the probe still
        -- reported on the pull control.
        and not exists (
          select 1 from decks d
           where d.user_id = $1
             and ci.oracle_id in (d.commander_oracle_id, d.partner_oracle_id)
        )
      group by ci.oracle_id, c.name
     having sum(ci.quantity) = 1
      limit 1`,
    [userId, excludeDeckId, holderDeckId],
  );
  if (rows.length === 0) throw new Error("No singly-owned unsleeved card to claim.");
  const { oracle_id: oracleId, name } = rows[0];
  // Into the holder's draft AND its version, or the holder reads as pending and
  // the pull is refused before it is offered.
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto) values ($1, $2, 1, false)`,
    [holderDeckId, oracleId],
  );
  await pool.query(
    `insert into deck_version_cards (version_id, oracle_id, quantity) values ($1, $2, 1)`,
    [holderVersionId, oracleId],
  );
  // Why the row is expected to offer a pull, in the two figures that decide it:
  // one owned copy against one sleeved claim leaves no free copy, which is the
  // `claimed` bucket the control hangs off. Printed rather than assumed, so a
  // reading of "0 controls" can be told from a fixture that never set the state up.
  const supply = await pool.query(
    `select
       (select coalesce(sum(quantity), 0) from collection_items
          where user_id = $1 and oracle_id = $2) as owned,
       (select count(*) from deck_version_cards vc
          join deck_versions v on v.id = vc.version_id
          join decks d on d.id = v.deck_id
         where d.user_id = $1 and vc.oracle_id = $2) as sleeved_in`,
    [userId, oracleId],
  );
  return { oracleId, name, ...supply.rows[0] };
}

/**
 * A card the player owns one copy of, held by a BREWING deck, so that adding it
 * to the deck under review draws the availability marker rather than a buy tag.
 *
 * This is the only fixture shape that reaches the marker on this page. An `in`
 * row passes `selfClaimed={false}` and buys by default, so any add that is
 * unowned, hard-claimed or short draws a buy tag instead. An `out` row
 * passes `selfClaimed`, which turns `free === 0` into silence, so a cut can
 * only speak when it is over or softly claimed. What is left is an add whose
 * lone copy is claimed *softly*: a brew — a deck with no committed version —
 * claims soft rather than hard, so `free` stays at 1, the add buckets free, no
 * buy tag is drawn, and `soft > 0` renders `1 in a brew`. That string is the
 * one Hugh photographed.
 *
 * Returns null rather than throwing when the collection holds no suitable card:
 * the report then says the marker checks measured nothing, which is the honest
 * reading and not a pass.
 */
async function brewClaim(userId, excludeOracleIds, commanderOracleId) {
  const { rows } = await pool.query(
    // Not a basic, not in ANY deck of this reader's, not sleeved in any of their
    // versions (a committed claim is hard and would buy instead), not anybody's
    // commander (a hard claim the deck_cards exclusion cannot see), and not the
    // card `claimOneCopy` already took.
    //
    // Every deck, not just the two fixture ones: a card sitting in another BREW
    // is softly claimed by it too, so the marker would read `2 in a brew` and the
    // named-row lookup below would fail on a fixture that is otherwise fine. The
    // brew this function creates has to be the only soft claim on the card.
    `select ci.oracle_id, c.name
       from collection_items ci
       join cards c on c.oracle_id = ci.oracle_id
      where ci.user_id = $1
        and c.type_line not like 'Basic Land%'
        and ci.oracle_id <> all ($2::uuid[])
        and not exists (
          select 1 from deck_cards dc
            join decks d on d.id = dc.deck_id
           where d.user_id = $1 and dc.oracle_id = ci.oracle_id
        )
        and not exists (
          select 1 from deck_version_cards vc
            join deck_versions v on v.id = vc.version_id
            join decks d on d.id = v.deck_id
           where d.user_id = $1 and vc.oracle_id = ci.oracle_id
        )
        and not exists (
          select 1 from decks d
           where d.user_id = $1
             and ci.oracle_id in (d.commander_oracle_id, d.partner_oracle_id)
        )
      group by ci.oracle_id, c.name
     having sum(ci.quantity) = 1
      limit 1`,
    [userId, excludeOracleIds],
  );
  if (rows.length === 0) return null;
  const { oracle_id: oracleId, name } = rows[0];
  // No `deck_versions` row, deliberately: that absence is what makes the claim
  // soft. Committing this deck would turn the marker into a buy tag.
  // decks.commander_oracle_id is NOT NULL, so the brew borrows the fixture's
  // commander. That adds a claim on the commander card and none on this one.
  const deck = await pool.query(
    `insert into decks (user_id, name, commander_oracle_id, filled)
       values ($1, 'Probe · brew', $2, false) returning id`,
    [userId, commanderOracleId],
  );
  const deckId = deck.rows[0].id;
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto) values ($1, $2, 1, false)`,
    [deckId, oracleId],
  );
  return { oracleId, name, deckId };
}

/** n changes on the deck under review: adds, cuts, or the committed list back. */
async function stage(deckId, versionId, addOracleIds, cuts) {
  await pool.query(`delete from deck_cards where deck_id = $1`, [deckId]);
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto)
       select $1, oracle_id, quantity, false from deck_version_cards where version_id = $2`,
    [deckId, versionId],
  );
  if (cuts > 0) {
    await pool.query(
      `delete from deck_cards where deck_id = $1 and oracle_id in (
         select oracle_id from deck_cards where deck_id = $1 order by oracle_id limit $2)`,
      [deckId, cuts],
    );
  }
  for (const oracleId of addOracleIds) {
    await pool.query(
      `insert into deck_cards (deck_id, oracle_id, quantity, auto) values ($1, $2, 1, false)
         on conflict (deck_id, oracle_id) do update set quantity = deck_cards.quantity + 1`,
      [deckId, oracleId],
    );
  }
}

/** Put one basic land into the deck, and name it. `isBasicLand` reads the type
 *  line, so the card has to be a real catalog basic rather than any land — and a
 *  basic is the one edit the diff counts as a change while naming no card, which
 *  is the whole point of the basics-only case. The template is 99 non-basic
 *  lands, so this adds rather than increments. Returns null if the catalog holds
 *  no basic at all, so the block reports itself skipped rather than as a pass. */
async function addOneBasic(deckId) {
  const { rows } = await pool.query(
    `select oracle_id, name from cards where type_line ilike 'basic land%'
      order by name limit 1`,
  );
  if (rows.length === 0) return null;
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto) values ($1, $2, 1, false)
       on conflict (deck_id, oracle_id) do update set quantity = deck_cards.quantity + 1`,
    [deckId, rows[0].oracle_id],
  );
  return rows[0].name;
}

/** What the confirm says and wears, printed the same way at both doors. */
function reportConfirm(seen, width) {
  const confirm = seen.discardConfirm;
  if (!confirm) {
    console.log(`  confirm: DID NOT OPEN`);
    return;
  }
  console.log(`  question: "${confirm.question}" ${confirm.questionColor}`);
  console.log(`  consequence: ${confirm.consequence}`);
  console.log(`  version clause in the reading ink: ${confirm.stamp ?? "NOT SPLIT OUT"}`);
  console.log(`  left rule: ${confirm.rule} (expect 3px of --danger)`);
  for (const answer of confirm.answers) {
    console.log(
      `    "${answer.label}" ${answer.height}px at y=${answer.top} · ink ${answer.color} · ` +
        `fill ${answer.background} · border ${answer.border} · ` +
        `points at the consequence: ${answer.describesWhy ? "yes" : "NO"}`,
    );
  }
  // DOM order, which the confirm draws as the way out first and the destructive
  // answer second — the phone stack is the DOM order and desktop reverses it.
  const [safe, danger] = confirm.answers;
  if (danger && safe) {
    // The pair stacks below 768px, and stacked it puts the way out on top: the
    // thumb reaches the bottom row first and the bottom row would otherwise be
    // the unrecoverable one. Keyed on the width rather than the label, which
    // starts with the device name and never with the figure.
    const stacked = width < 768;
    console.log(
      `  order: ${safe.top < danger.top ? "way out on top" : "act on top"} (expect ${
        stacked ? "way out on top" : "act on top"
      })`,
    );
  }
  console.log(`  focus: ${confirm.focused} (expect Keep editing)`);
}

await clerkSetup();
const browser = await chromium.launch();
let underReview = null;
let holder = null;
let claimed = null;
let brewed = null;
let userId = null;
try {
  const context = await browser.newContext({ viewport: VIEWPORTS[0] });
  const page = await context.newPage();
  userId = await signIn(page);
  const template = (
    await pool.query(
      `select commander_oracle_id, partner_oracle_id from decks where id = $1`,
      [TEMPLATE],
    )
  ).rows[0];
  if (!template) throw new Error(`No template deck ${TEMPLATE}.`);
  underReview = await buildDeck(userId, "Probe · under review", template);
  holder = await buildDeck(userId, "Probe · holder", template);
  claimed = await claimOneCopy(userId, holder.deckId, holder.versionId, underReview.deckId);
  brewed = await brewClaim(userId, [claimed.oracleId], template.commander_oracle_id);
  console.log(`signed in as ${userId}`);
  console.log(`deck under review ${underReview.deckId} · holder ${holder.deckId}`);
  console.log(
    `claimed card: ${claimed.name} (${claimed.oracleId}) · owned ${claimed.owned} · ` +
      `sleeved in ${claimed.sleeved_in} deck(s)`,
  );
  if (!brewed) {
    // Without it the marker checks measure nothing and the run would still exit
    // 0, which is the one outcome a probe must never produce. The fixture needs
    // one collection card held at a single copy that no deck of this reader
    // sleeves or commands; `local-dev` has thousands.
    throw new Error(
      "No collection card is free to be softly claimed, so the availability " +
        "marker cannot be reached. Point this at a fuller collection.",
    );
  }
  console.log(`softly claimed add: ${brewed.name} (owned 1, in the brew ${brewed.deckId})`);
  await context.close();

  for (const { label, width, height } of VIEWPORTS) {
    const vpContext = await browser.newContext({ viewport: { width, height } });
    const vpPage = await vpContext.newPage();
    await signIn(vpPage);

    // 1. The route's own guard: a clean deck has nothing to review.
    await stage(underReview.deckId, underReview.versionId, [], 0);
    await vpPage.goto(`${BASE}/decks/${underReview.deckId}/changes`, {
      waitUntil: "networkidle",
    });
    console.log(`\n########## ${label} · CLEAN deck`);
    console.log(`  landed on: ${new URL(vpPage.url()).pathname} (expect /decks/<id>)`);

    // 1b. A BASICS-ONLY draft, which names no card and still has a version to
    // cut. Both columns render empty on it, so the route admits it only as the
    // banner's `?commit=1` — a direct visit would be two blank columns under a
    // heading naming the mana base. Neither fact is reachable from jsdom: the
    // redirect is a server decision and the diff is a real one.
    const moved = await addOneBasic(underReview.deckId);
    await vpPage.goto(`${BASE}/decks/${underReview.deckId}/changes`, {
      waitUntil: "networkidle",
    });
    console.log(`\n########## ${label} · BASICS-ONLY draft`);
    console.log(`  basic added: ${moved ?? "no basic in the catalog — block skipped"}`);
    if (moved) {
      console.log(
        `  direct visit landed on: ${new URL(vpPage.url()).pathname} (expect /decks/<id>)`,
      );
      await vpPage.goto(`${BASE}/decks/${underReview.deckId}/changes?commit=1`, {
        waitUntil: "networkidle",
      });
      await vpPage.waitForTimeout(900);
      const basics = await readReview(vpPage);
      console.log(`  ?commit=1 landed on: ${new URL(vpPage.url()).pathname} (expect /changes)`);
      console.log(`  h1: ${basics.h1} (expect the mana base, not a change count)`);
    }

    // 2. Both columns, the hard-claimed add and the softly claimed one among
    // them: the first draws `Pull it`, the second draws the availability marker,
    // and the two states cannot be carried by one row.
    await stage(
      underReview.deckId,
      underReview.versionId,
      [claimed.oracleId, brewed.oracleId],
      3,
    );
    await vpPage.goto(`${BASE}/decks/${underReview.deckId}/changes`, {
      waitUntil: "networkidle",
    });
    await vpPage.waitForTimeout(900);
    let seen = await readReview(vpPage);
    console.log(`\n########## ${label} · 2 adds / 3 cuts`);
    console.log(`  h1: ${seen.h1}`);
    console.log(`  lede: ${seen.ledeVisible ? seen.lede : "hidden"}`);
    console.log(`  chips: ${seen.chips[0] ?? "absent"}`);
    // A ratio near 1 is the whole point: the centred container is a flex item, so
    // dropping `w-full` returns it to shrink-to-fit and this page draws ~0.67 of
    // its cap on desktop with every component test still green.
    console.log(
      `  container fill: ${
        seen.fill === null ? "NO CONTAINER FOUND" : `${(seen.fill * 100).toFixed(0)}% of cap`
      } (expect ~100%)`,
    );
    for (const h of seen.headings) {
      console.log(
        `  column heading: "${h.text}" ${h.visible ? "visible" : "HIDDEN"} · ${
          h.drawn ? `${h.lines} line(s)` : "not drawn"
        }`,
      );
    }
    // Hugh, of `GOING OUT · 15` on this surface: "crushed into three stacked
    // lines by the oversized adjacent note." The note lost a sentence and the
    // heading gained `flex-none`, either of which alone would leave the other
    // free to regress.
    const crushed = seen.headings.filter((h) => h.drawn && h.lines !== null && h.lines > 1);
    console.log(
      `  headings on more than one line: ${
        crushed.map((h) => `"${h.text}" on ${h.lines}`).join(", ") || "none"
      } (expect none)`,
    );
    // The rest of this script reports figures for a reader to weigh. This one is
    // an invariant with a single right answer, so it exits non-zero instead: a
    // wrapped heading is the defect Hugh reported, and a line nobody reads is no
    // guard against it coming back.
    for (const h of crushed) crushedHeadings.push(`${label} · "${h.text}" on ${h.lines} lines`);
    console.log(
      `  segments: ${
        seen.segments.length === 0
          ? "absent"
          : seen.segments
              .map((s) => `"${s.label}" ${s.pressed ? "pressed" : "not"} ${s.width}x${s.height}`)
              .join(" · ")
      }`,
    );
    console.log(
      `  Pull it: ${seen.pulls.length} control(s)${
        seen.pulls[0] ? ` ${seen.pulls[0].width}x${seen.pulls[0].height}` : ""
      }`,
    );
    console.log(`  footer: ${seen.footer ?? "absent"}`);
    console.log(`  commit CTA: ${seen.commitCta ?? "absent"}`);

    // 2b. The what-changed strip. All six cells are drawn at both widths, and
    // every cell draws a movement rather than a figure against a bar, so what is
    // being read is the pair and the verdict under it.
    // Visible, not matched: `cells` holds all six paragraphs whatever their boxes
    // do, so a raw length prints 6 on a phone drawing three and says nothing
    // about the contract this line exists to check.
    console.log(
      `  strip cells: ${seen.shape.cells.filter((c) => c.visible).length} visible` +
        ` of ${seen.shape.cells.length} drawn, ${seen.shape.expected} expected`,
    );
    // A cell the reader is owed and the page never drew leaves no paragraph to
    // measure, so the run would otherwise report "5 visible of 5" and pass.
    for (const absent of seen.shape.missing) {
      hiddenCells.push(`${label} · "${absent}" not drawn at all`);
    }
    for (const cell of seen.shape.cells) {
      console.log(
        `    "${cell.label}" ${cell.visible ? `${cell.width}px` : "OFF SCREEN"} · ` +
          `at ${cell.left},${cell.top} · ` +
          `${cell.figures} · after ${cell.afterColor} · ` +
          `note ${cell.note ?? "none"}${cell.note && !cell.noteVisible ? " (hidden)" : ""}`,
      );
      if (!cell.visible) hiddenCells.push(`${label} · "${cell.label}" off screen`);
    }
    // Six visible boxes is not the phone's contract. Six ~55px cells in one row,
    // or six full-width rows, leave every box on screen and satisfy both the unit
    // test and the visibility check while breaking the laid-out ruling — so the
    // positions themselves are counted: three columns, two rows.
    if (width < 768 && seen.shape.missing.length === 0) {
      const columns = new Set(seen.shape.cells.map((c) => c.left)).size;
      const rows = new Set(seen.shape.cells.map((c) => c.top)).size;
      console.log(`  phone grid: ${columns} column(s) x ${rows} row(s)`);
      if (columns !== 3 || rows !== 2) {
        hiddenCells.push(
          `${label} · strip laid out ${columns}x${rows}, expected 3 columns x 2 rows`,
        );
      }
    }
    console.log(
      `  type moves: ${
        seen.shape.moves === null ? "section absent" : `${seen.shape.moves.length} row(s)`
      }`,
    );
    for (const move of seen.shape.moves ?? []) {
      console.log(
        `    ${move.group}: ${move.pair} ${move.delta} · pair ${move.pairColor} · ` +
          `after ${move.afterColor} · bar ${move.barVisible ? "drawn" : "hidden"} · ` +
          `name ${move.groupWidth}px, text ${move.groupContent}px` +
          `${move.groupClipped ? " CLIPPED" : ""}`,
      );
      if (move.groupClipped) {
        clippedGroups.push(`${label} · "${move.group}" clipped in a ${move.groupWidth}px slot`);
      }
    }
    // A section with no row measures nothing, and the fixture is built to move at
    // least one type group — so an empty list is the check having lost its subject
    // rather than a deck whose shape held.
    if ((seen.shape.moves ?? []).length === 0) {
      clippedGroups.push(`${label} · no type-move row to measure a name against`);
    }
    // And a row whose name fits in the slot this fix removed proves nothing either:
    // the draft cuts whatever cards the fixture picked, so a run that happened to
    // move only `Lands` would pass against the 74px slot as readily as against the
    // flexible one. Demand a name whose own text is wider than that slot before the
    // phone's result counts as coverage.
    const phoneSlot = 74;
    if (width < 768 && (seen.shape.moves ?? []).length > 0) {
      const widest = Math.max(...seen.shape.moves.map((m) => m.groupContent ?? 0));
      if (widest <= phoneSlot) {
        clippedGroups.push(
          `${label} · widest moved name is ${widest}px of text, which the retired ` +
            `${phoneSlot}px slot would have fitted — nothing here can clip`,
        );
      }
    }

    // 2b-ii. The availability marker's own type. A marker larger than the card
    // name beside it is the defect Hugh reported; a marker in the page's sans is
    // the same defect read a second way, because every other host of this marker
    // supplies mono.
    console.log(`  markers: ${seen.markers.length} on this page`);
    // The one marker this page is built to draw, named. A count alone would pass
    // on any marker the page happened to carry — a cut's, say — and pass equally
    // if the fixture's add stopped rendering one at all, which is the state the
    // styling is being measured on.
    const brewMarker = seen.markers.find(
      (m) => m.name === brewed.name && m.label === "1 in a brew",
    );
    if (!brewMarker) {
      mistypedMarkers.push(
        `${label} · no "1 in a brew" marker on the ${brewed.name} row, so nothing was measured`,
      );
    }
    for (const marker of seen.markers) {
      console.log(
        `    "${marker.label}" on ${marker.name ?? "no row name"} · ` +
          `${marker.size}px in ${marker.family.split(",")[0]}` +
          ` · name ${marker.nameSize ?? "not found"}px`,
      );
      if (!/mono/i.test(marker.family)) {
        mistypedMarkers.push(`${label} · "${marker.label}" is not mono (${marker.family})`);
      }
      // The decklist row's own pair, and the responsive step between them is the
      // half of the fix that "smaller than the name" cannot see: 11px passes that
      // test at both widths while dropping the `md:` size the design specifies.
      const expected = width < 768 ? 11 : 11.5;
      if (marker.size !== expected) {
        mistypedMarkers.push(
          `${label} · "${marker.label}" is ${marker.size}px, expected ${expected}px`,
        );
      }
      if (marker.nameSize === null) {
        mistypedMarkers.push(`${label} · "${marker.label}" has no name beside it to measure`);
      } else if (marker.size > marker.nameSize) {
        mistypedMarkers.push(
          `${label} · "${marker.label}" is ${marker.size}px, above the ${marker.nameSize}px name`,
        );
      }
    }

    // 2c. Discard, raised from the apply bar. The question replaces the bar's own
    // body, so the trigger is gone while it is up and the way out holds focus —
    // neither is reachable from jsdom, where nothing has a box.
    console.log(`\n########## ${label} · DISCARD from the apply bar`);
    console.log(
      `  trigger: ${
        seen.discardTriggers.length === 0
          ? "ABSENT"
          : `${seen.discardTriggers[0].width}x${seen.discardTriggers[0].height}`
      }`,
    );
    if (seen.discardTriggers.length > 0) {
      await vpPage.getByRole("button", { name: "Discard", exact: true }).click();
      await vpPage.waitForTimeout(350);
      seen = await readReview(vpPage);
      reportConfirm(seen, width);
      if (seen.discardConfirm) {
        await vpPage.getByRole("button", { name: "Keep editing" }).click();
        await vpPage.waitForTimeout(350);
        seen = await readReview(vpPage);
        console.log(`  after Keep editing · confirm: ${seen.discardConfirm ? "STILL UP" : "gone"}`);
        console.log(
          `  after Keep editing · trigger back: ${seen.discardTriggers.length > 0 ? "yes" : "NO"}`,
        );
        console.log(
          `  after Keep editing · focus: ${await vpPage.evaluate(
            () => document.activeElement?.innerText?.trim() ?? null,
          )} (expect Discard)`,
        );
      }
    }

    // 2d. The same question from the deck page's banner, which is the other host.
    // The banner's card is what the confirm replaces there, so the reading proves
    // the third of the banner's three controls opens it on that surface too.
    await vpPage.goto(`${BASE}/decks/${underReview.deckId}`, { waitUntil: "networkidle" });
    await vpPage.waitForTimeout(900);
    let onDeck = await readReview(vpPage);
    console.log(`\n########## ${label} · DISCARD from the deck-page banner`);
    console.log(
      `  trigger: ${
        onDeck.discardTriggers.length === 0
          ? "ABSENT"
          : `${onDeck.discardTriggers[0].width}x${onDeck.discardTriggers[0].height}`
      }`,
    );
    if (onDeck.discardTriggers.length > 0) {
      await vpPage.getByRole("button", { name: "Discard", exact: true }).click();
      await vpPage.waitForTimeout(350);
      onDeck = await readReview(vpPage);
      reportConfirm(onDeck, width);
      if (onDeck.discardConfirm) {
        await vpPage.getByRole("button", { name: "Keep editing" }).click();
        await vpPage.waitForTimeout(350);
        onDeck = await readReview(vpPage);
        console.log(`  after Keep editing · confirm: ${onDeck.discardConfirm ? "STILL UP" : "gone"}`);
        console.log(
          `  after Keep editing · trigger back: ${onDeck.discardTriggers.length > 0 ? "yes" : "NO"}`,
        );
      }
    }
    await vpPage.goto(`${BASE}/decks/${underReview.deckId}/changes`, {
      waitUntil: "networkidle",
    });
    await vpPage.waitForTimeout(900);
    seen = await readReview(vpPage);

    // 3. The phone's other segment, and the column swap. Above the breakpoint the
    // segments are still in the DOM and measure 0x0 — both columns are drawn, so
    // there is nothing to switch between and nothing to click.
    if (seen.segments.length > 1 && seen.segments[1].height > 0) {
      await vpPage.getByRole("button", { name: seen.segments[1].label }).click();
      await vpPage.waitForTimeout(250);
      seen = await readReview(vpPage);
      console.log(`  after pressing the second segment:`);
      for (const h of seen.headings) {
        console.log(`    column heading: "${h.text}" ${h.visible ? "visible" : "HIDDEN"}`);
      }
    }

    // 4. `?commit=1` opens the sheet, and Cancel takes it back off the URL.
    await vpPage.goto(`${BASE}/decks/${underReview.deckId}/changes?commit=1`, {
      waitUntil: "networkidle",
    });
    await vpPage.waitForTimeout(900);
    seen = await readReview(vpPage);
    console.log(`\n########## ${label} · ?commit=1`);
    console.log(`  sheet heading: ${seen.sheetHeading ?? "ABSENT"}`);
    console.log(`  Cancel present: ${seen.cancel ? "yes" : "NO"}`);
    console.log(`  commit CTA in the bar: ${seen.commitCta ?? "absent (sheet has the page)"}`);
    if (seen.cancel) {
      await vpPage.getByRole("button", { name: "Cancel" }).click();
      await vpPage.waitForTimeout(400);
      seen = await readReview(vpPage);
      console.log(`  after Cancel · url: ${seen.url} (expect no ?commit=1)`);
      console.log(`  after Cancel · sheet: ${seen.sheetHeading ?? "gone"}`);
    }

    await vpContext.close();
  }

  // 5. The pull itself, once, at the end: it takes the copy out of the holder's
  // version for good, so every reading above would change under it. What is being
  // proved is the write and the refresh together — the row the reader is standing
  // on stops asking for a purchase, and the page repaints without a navigation.
  //
  // Back to the one add first. The marker fixture's second add is a row in the
  // same column, and with it in place the click lands on a card name instead of
  // the control — a fixture artefact, not a defect, and the pull is about the
  // write rather than about how a five-change list stacks.
  await stage(underReview.deckId, underReview.versionId, [claimed.oracleId], 3);
  const pullContext = await browser.newContext({ viewport: VIEWPORTS[1] });
  const pullPage = await pullContext.newPage();
  await signIn(pullPage);
  await pullPage.goto(`${BASE}/decks/${underReview.deckId}/changes`, {
    waitUntil: "networkidle",
  });
  await pullPage.waitForTimeout(900);
  console.log(`\n########## pull · 1300x900`);
  console.log(`  before: ${(await readReview(pullPage)).footer ?? "absent"}`);
  // By the accessible name, which carries the card and the holder — the visible
  // text is two words and the button's name is deliberately not it.
  await pullPage.getByRole("button", { name: /^Pull .+ from .+\.$/ }).click();
  await pullPage.waitForTimeout(2500);
  const pulled = await readReview(pullPage);
  console.log(`  after · url: ${pulled.url} (expect the same page, no navigation)`);
  console.log(`  after · footer: ${pulled.footer ?? "absent"} (expect 0 to buy)`);
  console.log(`  after · Pull it: ${pulled.pulls.length} control(s) (expect 0)`);
  // The holder's NEWEST version, not the v1 the fixture wrote: a pull commits the
  // release, so the holder ends the run on v2 and v1 still records the copy it
  // held. Reading v1 here would report a pull that plainly worked as a failure.
  const holderNow = await pool.query(
    `select
       v.number,
       (select count(*) from deck_version_cards
          where version_id = v.id and oracle_id = $2) as in_version,
       (select count(*) from deck_cards where deck_id = $1 and oracle_id = $2) as in_draft
       from deck_versions v where v.deck_id = $1 order by v.number desc limit 1`,
    [holder.deckId, claimed.oracleId],
  );
  const held = holderNow.rows[0];
  console.log(
    `  after · holder is on v${held.number} holding it: version ${held.in_version} · ` +
      `draft ${held.in_draft} (expect v2 · 0 · 0)`,
  );
  await pullContext.close();

  // 6. The discard itself, once and last: it overwrites the only copy of the draft
  // with the version behind it, so every reading above would change under it. What
  // is being proved is the write, the move off the page, and what the deck holds
  // afterwards — a discard that left one changed row would still look right.
  const discardContext = await browser.newContext({ viewport: VIEWPORTS[1] });
  const discardPage = await discardContext.newPage();
  await signIn(discardPage);
  await discardPage.goto(`${BASE}/decks/${underReview.deckId}/changes`, {
    waitUntil: "networkidle",
  });
  await discardPage.waitForTimeout(900);
  console.log(`\n########## discard · 1300x900`);
  const beforeDiscard = await pool.query(
    `select count(*) from deck_cards dc
       where dc.deck_id = $1
         and not exists (
           select 1 from deck_version_cards vc
            where vc.version_id = $2 and vc.oracle_id = dc.oracle_id
              and vc.quantity = dc.quantity)`,
    [underReview.deckId, underReview.versionId],
  );
  console.log(`  rows differing from v1 before: ${beforeDiscard.rows[0].count} (expect > 0)`);
  await discardPage.getByRole("button", { name: "Discard", exact: true }).click();
  await discardPage.waitForTimeout(400);
  reportConfirm(await readReview(discardPage), VIEWPORTS[1].width);
  await discardPage.getByRole("button", { name: /^Discard (the draft|\d+ changes?)$/ }).click();
  await discardPage.waitForTimeout(2500);
  const afterDiscard = await readReview(discardPage);
  console.log(`  after · url: ${afterDiscard.url} (expect /decks/<id>, off the review page)`);
  console.log(
    `  after · announcement: ${await discardPage.evaluate(
      () => document.getElementById("draft-announcer")?.textContent ?? null,
    )}`,
  );
  // The navigation takes the confirm and everything focused near it, so the deck
  // page's version line takes focus off the body — the one sentence naming the
  // list the deck is on now, which is what the draft just stopped being. The
  // hash that carried the handoff is spent on arrival.
  console.log(
    `  after · focus: ${await discardPage.evaluate(
      () => document.activeElement?.textContent?.trim().slice(0, 60) ?? null,
    )} (expect the version line)`,
  );
  console.log(
    `  after · hash: "${await discardPage.evaluate(() => window.location.hash)}" (expect empty)`,
  );
  const settled = await pool.query(
    `select
       (select count(*) from deck_cards where deck_id = $1) as draft_rows,
       (select count(*) from deck_version_cards where version_id = $2) as version_rows,
       (select count(*) from deck_cards dc
          where dc.deck_id = $1
            and not exists (
              select 1 from deck_version_cards vc
               where vc.version_id = $2 and vc.oracle_id = dc.oracle_id
                 and vc.quantity = dc.quantity)) as differing`,
    [underReview.deckId, underReview.versionId],
  );
  const back = settled.rows[0];
  console.log(
    `  after · draft ${back.draft_rows} rows · v1 ${back.version_rows} rows · ` +
      `differing ${back.differing} (expect equal counts and 0 differing)`,
  );
  await discardContext.close();
} finally {
  // The three decks, and nothing else: versions and cards go with them by
  // cascade, and the run writes no collection row to take back — both fixture
  // cards were ones the account already owned.
  for (const deck of [underReview, holder, brewed]) {
    if (deck) await pool.query(`delete from decks where id = $1`, [deck.deckId]);
  }
  await pool.end();
  await browser.close();
}

if (crushedHeadings.length > 0) {
  console.log(`\n########## FAIL · a column heading wrapped`);
  for (const line of crushedHeadings) console.log(`  ${line}`);
  process.exitCode = 1;
}

if (hiddenCells.length > 0) {
  console.log(`\n########## FAIL · the mix strip is not the six cells it owes`);
  for (const line of hiddenCells) console.log(`  ${line}`);
  process.exitCode = 1;
}

if (mistypedMarkers.length > 0) {
  console.log(`\n########## FAIL · an availability marker carries the wrong type`);
  for (const line of mistypedMarkers) console.log(`  ${line}`);
  process.exitCode = 1;
}

if (clippedGroups.length > 0) {
  console.log(`\n########## FAIL · a type-move row clips its own name`);
  for (const line of clippedGroups) console.log(`  ${line}`);
  process.exitCode = 1;
}
