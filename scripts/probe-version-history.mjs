// Gate for Surfaces 4 and 5: the version rail with the diff it opens, and the
// version stamp on a logged game — at both breakpoints, driven out of a real
// database.
//
// What a component test cannot settle here:
//
//   1. THE TAB IS THE WAY IN, AND THE DECK STAYS ON SCREEN. The rail is the deck
//      page's fourth tab: pressing it draws one row per committed version below the
//      deck's own head, the retired `/decks/<id>/versions` is gone and answers
//      not-found rather than forwarding, and a
//      deck the reader does not own is refused. Server reads and laid out geometry,
//      neither of which jsdom sees.
//   2. THE DIFF IS FETCHED ON OPEN. A closed rail fires no read; clicking one row
//      resolves that row's card lists. Two facts about a server action over the
//      wire.
//   3. MOTION IS ABSENT (READINESS 19). The only way to prove no element on either
//      surface carries a transition is to read the computed styles of the rendered
//      tree.
//   4. THE STAMP SLOT IS FIXED-WIDTH AT BOTH WIDTHS. A stamped row and an unstamped
//      one have to put their marks on the same vertical, which is a fact about laid
//      out geometry.
//
// THE FIXTURE IS THIS SCRIPT'S OWN. The probe account does not own local-dev's
// decks and a deck page the signed-in player does not own is a 404, so a run
// pointed at a fixture deck would report every surface absent and make a working
// feature look dead. The script copies a 99-row template into one deck owned by
// the account it signs in as, writes three versions against it (v1 the template
// list, v2 a two-for-two swap with a note, v3 a swap with no note), and logs two
// games — one stamped to v2, one with no version at all. It also writes a second
// deck under a synthetic `user_id` no account maps to, which is the only way to
// ask the route to refuse a reader. Both decks go in a `finally`; versions,
// version cards and games follow them by cascade.
//
// Point it at `local-dev` or a scratch Neon branch — NEVER production. It writes.
//
// Run by hand, with a dev server up:
//   node scripts/probe-version-history.mjs
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

const DECK_NAME = "Probe · version history";

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

const pool = new Pool({ connectionString: DATABASE_URL });

/**
 * What the rail says, read off the rendered page.
 *
 * Rows are found by `aria-expanded` rather than by text: the row IS the control,
 * so a thing without that attribute is not a rail row however much it looks like
 * one. NOT `aria-controls` as well — a closed row deliberately carries none,
 * because pointing at an id nothing has is a broken relationship, so requiring it
 * matched nothing and reported an empty rail on a page drawing three rows. The
 * leading `v<n>` does the narrowing the attribute pair used to: the account menu
 * in the app chrome also carries `aria-expanded`.
 */
const ROW = "button[aria-expanded]";
const ROW_TEXT = /^v\d/;
const railRows = (page) => page.locator(ROW).filter({ hasText: ROW_TEXT });

const readRail = (page) =>
  page.evaluate(({ selector, text }) => {
    const rows = [...document.querySelectorAll(selector)]
      .filter((b) => new RegExp(text).test(b.innerText));
    const panel = document.getElementById("panel-versions");
    // The DRAWN heading, not the first one in the document. The deck head ships
    // a phone spine and a desktop spine, each with its own `h1` and one of them
    // hidden at any width, so `querySelector("h1")` returned the desktop
    // heading's collapsed box on the phone and read the deck's name as absent.
    const headings = [...document.querySelectorAll("h1")];
    const h1 = headings.find((h) => h.getBoundingClientRect().width > 1) ?? headings[0] ?? null;
    // Scoped to the panel rather than `main`: READINESS 19 forbids motion on
    // THIS surface, and the deck page's own chrome around it carries five
    // transitioned elements that were never this ruling's to answer for.
    const moving = [...(panel?.querySelectorAll("*") ?? [])].filter((el) => {
      const s = getComputedStyle(el);
      return (
        (s.transitionDuration !== "0s" && s.transitionProperty !== "none") ||
        s.animationName !== "none"
      );
    });
    return {
      url: location.pathname + location.search,
      // The deck's own head, which is the entire reason the rail moved into a
      // tab: the deck's name is the page's drawn `h1`, and every other tab
      // keeps it on screen. The old route drew no head at all.
      deckName: h1?.textContent ?? null,
      deckNameDrawn: h1 ? h1.getBoundingClientRect().width > 1 : false,
      // The rail's own heading names the panel without ink. `innerText` reads
      // as empty on an `sr-only` element, which is the point — `textContent` is
      // the only way to see it.
      railHeading: panel?.querySelector("h2")?.textContent ?? null,
      railHeadingDrawn: (() => {
        const h = panel?.querySelector("h2");
        return h ? h.getBoundingClientRect().width > 1 : false;
      })(),
      // The rail is drawn below the deck's head rather than in place of it.
      // Geometry, not containment: a rail nested anywhere inside the shell
      // would satisfy a DOM check while painting over the art.
      belowHead:
        h1 && rows.length
          ? rows[0].getBoundingClientRect().top > h1.getBoundingClientRect().bottom
          : null,
      headGeometry:
        h1 && rows.length
          ? `h1 bottom ${Math.round(h1.getBoundingClientRect().bottom)} · row top ${Math.round(
              rows[0].getBoundingClientRect().top,
            )} · scrollY ${Math.round(window.scrollY)}`
          : null,
      inPanel: rows.length > 0 && panel !== null && rows.every((row) => panel.contains(row)),
      // Versions is a tab over a panel in this document now, so the row is a
      // tablist of buttons rather than links. A link here is the regression:
      // it is what took the deck off screen.
      tabs: [...document.querySelectorAll('[role="tab"]')].map((tab) => ({
        id: tab.id,
        label: tab.innerText.replace(/\n/g, " "),
        selected: tab.getAttribute("aria-selected") === "true",
      })),
      tabLinks: [...document.querySelectorAll('[role="tablist"] a')].length,
      rows: rows.map((b) => ({
        text: b.innerText.replace(/\n/g, " · "),
        open: b.getAttribute("aria-expanded") === "true",
        panel: b.getAttribute("aria-controls"),
      })),
      // Scoped to the panel, not the body: the deck's head carries a pending
      // changes banner of its own, and a body-wide match would read that
      // banner as a rail row for the draft.
      restore: /restore|revert|roll back/i.test(panel?.innerText ?? ""),
      pending: /pending|draft/i.test(panel?.innerText ?? ""),
      moving: moving.length,
    };
  }, { selector: ROW, text: ROW_TEXT.source });

/** The card lists the opened panel resolved to, and its stat boxes. */
const readPanel = (page, panelId) =>
  page.evaluate((id) => {
    const panel = document.getElementById(id);
    if (!panel) return null;
    return {
      headings: [...panel.querySelectorAll("h2,h3")].map((h) => h.innerText.replace(/\n/g, " ")),
      // The hook the panel actually renders while its read is in flight. The
      // surface takes no SVG and no motion, so the wait is a reserved box with
      // nothing in it — there is no mark to look for, and looking for one
      // reported every pending panel as settled.
      pending: panel.querySelector("[data-diff-pending]") !== null,
      // Diff rows carry their own hook: they are not list items, and counting
      // `li` here found nothing and reported it as "none" — a gap-shaped reading
      // of a working panel.
      names: [...panel.querySelectorAll("[data-version-diff-row]")]
        .map((row) => row.innerText.split("\n")[0])
        .slice(0, 6),
      // Read so a check can prove the v1 arm links nowhere. It once carried a
      // route out to the deck page, which is now the page it is drawn on.
      // `getAttribute` rather than `.href`, so a link that did appear is named
      // as the route the app wrote instead of an absolutised copy of it.
      links: [...panel.querySelectorAll("a")].map((a) => ({
        text: a.innerText.trim(),
        href: a.getAttribute("href"),
      })),
      text: panel.innerText.replace(/\n/g, " · ").slice(0, 400),
    };
  }, panelId);

/** The game log's stamp slots: one per row, geometry and reading. */
const readStamps = (page) =>
  page.evaluate(() => {
    const rows = [...document.querySelectorAll("li")].filter((li) =>
      /^[WLD]$/.test(li.innerText.trim().split("\n")[0] ?? ""),
    );
    return rows.map((li) => {
      // Any depth, not `:scope > span`: a game carrying a note draws its slots
      // inside an inner row, so the stamp is a grandchild there and a child
      // otherwise. The pattern narrows this, not the depth.
      const spans = [...li.querySelectorAll("span")];
      const stamp = spans.find((s) => /^(v\d+|—)$/.test(s.innerText.trim()));
      if (!stamp) return { stamp: null };
      const box = stamp.getBoundingClientRect();
      const style = getComputedStyle(stamp);
      return {
        stamp: stamp.innerText.trim(),
        left: Math.round(box.left),
        width: Math.round(box.width),
        fontSize: style.fontSize,
        color: style.color,
      };
    });
  });

// Every deck this run has written, recorded the moment its insert returns rather
// than when its builder finishes: a fixture that fails half-built would otherwise
// leave its deck behind, because the id only reaches the caller on the way out.
// The `finally` drains this, and versions, version cards and games cascade.
const createdDeckIds = [];

/**
 * A legendary creature the template's commander is not, so one version can be
 * piloted by somebody else and the rail has a helm change to describe. Read out of
 * the catalog rather than hard-coded: the name has to resolve, or the sentence the
 * check looks for is correctly absent and the check would fail for the wrong reason.
 */
async function otherCommander(template) {
  const { rows } = await pool.query(
    `select oracle_id, name from cards
       where type_line ilike 'Legendary Creature%' and oracle_id <> $1
       order by oracle_id limit 1`,
    [template.commander_oracle_id],
  );
  if (rows.length === 0) throw new Error("No second legendary creature in the catalog.");
  return rows[0];
}

/**
 * The sentence the v3 panel should carry, assembled from the same names the
 * loader will resolve. Built here rather than pattern-matched in the browser: an
 * arrow is drawn elsewhere in the panel, so only the names make the check specific.
 */
async function helmSentence(template, helm) {
  const named = async (oracleId) => {
    if (!oracleId) return null;
    const { rows } = await pool.query(`select name from cards where oracle_id = $1 limit 1`, [
      oracleId,
    ]);
    return rows[0]?.name ?? null;
  };
  const primary = await named(template.commander_oracle_id);
  const partner = await named(template.partner_oracle_id);
  if (primary === null) throw new Error("The template's commander name does not resolve.");
  const from = partner === null ? primary : `${primary} & ${partner}`;
  return `${from} → ${helm.name}`;
}

/** A 99-row deck owned by the signed-in account, plus three committed versions. */
async function buildDeck(userId, template) {
  const { rows } = await pool.query(
    `insert into decks (user_id, name, commander_oracle_id, partner_oracle_id, filled)
       values ($1, $2, $3, $4, true) returning id`,
    [userId, DECK_NAME, template.commander_oracle_id, template.partner_oracle_id],
  );
  const deckId = rows[0].id;
  createdDeckIds.push(deckId);
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto)
       select $1, oracle_id, quantity, false from deck_cards where deck_id = $2`,
    [deckId, TEMPLATE],
  );
  // Three versions dated apart, so the rail's dates differ and the ordering it
  // draws is the ordering the loader read rather than an insertion accident.
  const versions = [];
  const notes = [null, "swapped the ramp", null];
  // v3 took a new commander, so its panel has a helm sentence to draw and the
  // probe can see it at both widths. v1 and v2 kept the template's, which is also
  // what proves the sentence is absent on a version that changed no commander.
  const helm = await otherCommander(template);
  for (const number of [1, 2, 3]) {
    const age = `${(4 - number) * 20} days`;
    const v = await pool.query(
      `insert into deck_versions
         (deck_id, number, note, commander_oracle_id, partner_oracle_id,
          committed_at, commander_since)
       values ($1, $2, $3, $4, $5, now() - $6::interval, now() - $6::interval) returning id`,
      [
        deckId,
        number,
        notes[number - 1],
        number === 3 ? helm.oracle_id : template.commander_oracle_id,
        number === 3 ? null : template.partner_oracle_id,
        age,
      ],
    );
    const versionId = v.rows[0].id;
    // v1 is the whole list. v2 drops the first two cards. v3 drops two more and
    // takes v1's first two back — a genuine two-for-two, so the rail states a
    // delta with both figures and the diff has rows in both columns to draw.
    await pool.query(
      `insert into deck_version_cards (version_id, oracle_id, quantity)
         select $1, oracle_id, quantity from deck_cards where deck_id = $2
         order by oracle_id offset $3`,
      [versionId, deckId, (number - 1) * 2],
    );
    if (number === 3) {
      await pool.query(
        `insert into deck_version_cards (version_id, oracle_id, quantity)
           select $1, oracle_id, quantity from deck_cards where deck_id = $2
           order by oracle_id limit 2`,
        [versionId, deckId],
      );
    }
    versions.push({ id: versionId, number });
  }
  return { deckId, versions, helm: await helmSentence(template, helm) };
}

/**
 * A deck belonging to somebody else, so the guard has something to refuse.
 *
 * Owned by a synthetic `user_id` no Clerk account maps to, which is the point: the
 * signed-in reader can post its id into the URL and the route has to answer 404
 * rather than draw a stranger's list. It carries one version, because a route that
 * 404s on an empty rail would pass this check for the wrong reason.
 */
async function buildForeignDeck(template) {
  const { rows } = await pool.query(
    `insert into decks (user_id, name, commander_oracle_id, partner_oracle_id, filled)
       values ($1, $2, $3, $4, true) returning id`,
    [
      `probe_foreign_${Date.now()}`,
      "Probe · somebody else's deck",
      template.commander_oracle_id,
      template.partner_oracle_id,
    ],
  );
  const deckId = rows[0].id;
  createdDeckIds.push(deckId);
  await pool.query(
    `insert into deck_versions
       (deck_id, number, note, commander_oracle_id, partner_oracle_id,
        committed_at, commander_since)
     values ($1, 1, null, $2, $3, now(), now())`,
    [deckId, template.commander_oracle_id, template.partner_oracle_id],
  );
  return deckId;
}

/** Two games: one played under v2, one with no version at all. */
async function logGames(userId, deckId, v2) {
  await pool.query(
    `insert into deck_games (deck_id, user_id, result, pod_size, version_id, played_at)
       values ($1, $2, 'win', 4, $3, now() - interval '10 days'),
              ($1, $2, 'loss', 4, null, now() - interval '30 days')`,
    [deckId, userId, v2],
  );
}

/** Every asserted check, so the run can end in a verdict rather than in prose a
 *  reader has to grade themselves. A probe that only prints is not a gate: it
 *  exits 0 while the route leaks another player's deck. */
const failures = [];

/** Print one check and remember whether it held. `note` carries the measured
 *  value either way — a passing check whose figure is worth reading is most of
 *  this probe. */
function check(label, ok, note) {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${note ? ` — ${note}` : ""}`);
  if (!ok) failures.push(label);
}

await clerkSetup();
const browser = await chromium.launch();
let deck = null;
let foreignDeckId = null;
try {
  const context = await browser.newContext({ viewport: VIEWPORTS[1] });
  const page = await context.newPage();
  const userId = await signIn(page);
  const template = (
    await pool.query(
      `select commander_oracle_id, partner_oracle_id from decks where id = $1`,
      [TEMPLATE],
    )
  ).rows[0];
  if (!template) throw new Error(`No template deck ${TEMPLATE}.`);
  deck = await buildDeck(userId, template);
  foreignDeckId = await buildForeignDeck(template);
  await logGames(userId, deck.deckId, deck.versions[1].id);
  console.log(`signed in as ${userId} · deck ${deck.deckId}`);

  // ── The retired route, once. It forwarded to the tab for a while after the
  // rail moved; it is GONE now, so the only thing to prove is that it answers
  // not-found rather than still serving or still redirecting. A route deleted
  // from the tree and a route that quietly kept working look identical from the
  // outside until something asks.
  const retired = await page.goto(`${BASE}/decks/${deck.deckId}/versions`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(500);
  const retiredUrl = await page.evaluate(() => location.pathname + location.search);
  const retiredBody = await page.evaluate(() => document.body.innerText);
  console.log(`\n########## the retired route · /decks/<id>/versions`);
  console.log(`  url: ${retiredUrl}  status: ${retired?.status() ?? "?"}`);
  // Two checks, not one, because "did not forward to the tab" and "did not
  // forward at all" are different claims and only the second is the retirement.
  // The status below cannot separate them either: `page.goto` follows
  // redirects and reports the FINAL response, so a route redirecting to
  // something that 404s would satisfy it. The address bar is what tells them
  // apart — after a redirect it holds the destination, not what was asked for.
  check(
    "the retired route no longer forwards to the tab",
    retiredUrl !== `/decks/${deck.deckId}?tab=versions`,
    retiredUrl,
  );
  check(
    "and does not redirect anywhere else either",
    retiredUrl === `/decks/${deck.deckId}/versions`,
    retiredUrl,
  );
  check(
    "it draws the not-found page",
    /There’s no page here\./.test(retiredBody),
    retiredUrl,
  );
  // Asserted here, unlike the ownership guard below, and the difference is the
  // whole reason this check is worth having. A route that still EXISTS and
  // throws `notFound()` behind a loading boundary has already flushed its 200;
  // a route that does not exist never streams, so Next answers the header as
  // well as the body. Measured against a running dev server on 2026-09-13:
  // `/decks/<uuid>/versions` returns 404. Without this, a page that rendered the
  // same not-found component on a 200 would satisfy both checks above and the
  // probe would call the retirement done.
  check("and answers 404, not a 200 carrying that page", retired?.status() === 404, retiredUrl);

  // ── The guard, once: a rail is not width-dependent in whom it refuses. This
  // asked through the retired route while it existed, because the forward
  // carried no guard of its own and the refusal was always the deck page's. The
  // route is gone, so it asks the deck page directly — the same assertion about
  // the same guard, through the door that still exists.
  // `networkidle`, not `domcontentloaded`: the deck page streams behind a
  // loading boundary, so the document is "loaded" while the skeleton is still on
  // screen and the refusal has not arrived yet.
  const refused = await page.goto(`${BASE}/decks/${foreignDeckId}`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(500);
  const refusedStatus = refused?.status() ?? null;
  const refusedBody = await page.evaluate(() => document.body.innerText);
  const leaked = /v1|committed/i.test(refusedBody);
  const notFoundPage = /There’s no page here\./.test(refusedBody);
  console.log(`\n########## another player's deck · /decks/<id>`);
  check("no rail drawn for a deck the reader does not own", !leaked);
  check("the not-found page is drawn instead", notFoundPage);
  // Reported, not asserted. `decks/[id]/loading.tsx` makes the deck page
  // stream, so the 200 is flushed with the first chunk before the guard's
  // `notFound()` throws — the body is the refusal, and the header cannot be.
  console.log(`  status: ${refusedStatus} (200 while the deck page has a loading boundary)`);

  for (const viewport of VIEWPORTS) {
    const vpContext = await browser.newContext({ viewport });
    const vpPage = await vpContext.newPage();
    await signIn(vpPage);

    // ── Surface 4 · the rail, reached by pressing the tab rather than by a URL.
    // The tab is the way in, so a rail a URL can reach and a click cannot is
    // still the bug Hugh reported.
    await vpPage.goto(`${BASE}/decks/${deck.deckId}`, { waitUntil: "networkidle" });
    await vpPage.waitForTimeout(900);
    await vpPage.locator("#tab-versions").click();
    await vpPage.waitForTimeout(700);
    const rail = await readRail(vpPage);
    console.log(`\n########## ${viewport.label} · /decks/<id> · Versions tab`);
    console.log(`  url: ${rail.url}`);
    console.log(`  deck name: ${rail.deckName} (${rail.deckNameDrawn ? "drawn" : "not drawn"})`);
    for (const row of rail.rows) console.log(`    ${row.open ? "open " : "closed"} ${row.text}`);
    check(`${viewport.label} · one row per version`, rail.rows.length === 3, `${rail.rows.length} of 3`);
    // Every figure on a row comes out of `listVersions` — the card count off the
    // snapshot rows, the delta off the diff against the predecessor, the tally off
    // the games table — and the component tests are handed those figures already
    // computed. A row whose text is only counted proves the rail renders, never
    // that the aggregates are right, so each one is named here against the fixture
    // this run wrote: v1 is the whole 99, v2 drops two, v3 takes two back and drops
    // two more, and the one logged game is held by v2. Case-insensitive, because
    // the tags are uppercased in CSS and `innerText` reports what is drawn. The
    // mana values are catalog-dependent and only checked for shape.
    const [rowThree, rowTwo, rowOne] = rail.rows.map((row) => row.text);
    check(
      `${viewport.label} · v3 states 97 cards, a two-for-two, and no held game`,
      /97 cards/.test(rowThree) && /\+2/.test(rowThree) && /−2/.test(rowThree)
        && /current/i.test(rowThree) && !/held/i.test(rowThree),
      rowThree,
    );
    // The tally is desktop-only by design — at 390px the meta line keeps the date
    // and the size, and the games a version held is the part that gives way. So
    // the phone is checked for its absence rather than excused from the check.
    const phone = viewport.width < 640;
    check(
      `${viewport.label} · v2 states 97 cards, two out, and ${
        phone ? "no tally" : "the game it held"
      }`,
      /97 cards/.test(rowTwo) && /−2/.test(rowTwo) && !/\+\d/.test(rowTwo)
        && /held 1 game/i.test(rowTwo) !== phone,
      rowTwo,
    );
    check(
      `${viewport.label} · v1 states the whole 99 and no delta`,
      /99 cards/.test(rowOne) && /initial/i.test(rowOne) && !/[+−]\d/.test(rowOne),
      rowOne,
    );
    check(
      `${viewport.label} · every row carries a mana value`,
      rail.rows.every((row) => /mv \d+\.\d\d/i.test(row.text)),
      rail.rows.map((row) => row.text.match(/mv \d+\.\d\d/i)?.[0] ?? "none").join(" · "),
    );
    // Versions is the fourth tab, selected, in the same tablist as the other
    // three. The cell used to be a link to a route of its own, which is what
    // made it the one cell that took the deck's head off screen.
    const selected = rail.tabs.filter((tab) => tab.selected);
    check(
      `${viewport.label} · Versions is a selected tab in the deck's tablist`,
      selected.length === 1 && selected[0].id === "tab-versions",
      rail.tabs.map((t) => `${t.label}${t.selected ? "*" : ""}`).join(" · ") || "no tablist",
    );
    check(
      `${viewport.label} · all four tabs are in the row`,
      ["tab-deck", "tab-consider", "tab-games", "tab-versions"].every((id) =>
        rail.tabs.some((tab) => tab.id === id),
      ),
      rail.tabs.map((t) => t.id).join(" · ") || "no tablist",
    );
    // The regression, named: any link in the row is a cell that navigates.
    check(`${viewport.label} · no cell in the row is a link`, rail.tabLinks === 0, `${rail.tabLinks} links`);
    // The cells' figures come off the deck page's loader rather than a prop a
    // test chose, so this is the only place those counts are proved: the fixture
    // writes exactly two games and three versions under this deck.
    const gamesCell = rail.tabs.find((tab) => tab.id === "tab-games");
    check(
      `${viewport.label} · the Games cell counts the fixture's two games`,
      /(^|\D)2(\D|$)/.test(gamesCell?.label ?? ""),
      gamesCell?.label ?? "no Games cell",
    );
    check(
      `${viewport.label} · the Versions cell counts the fixture's three versions`,
      /(^|\D)3(\D|$)/.test(selected[0]?.label ?? ""),
      selected[0]?.label ?? "no selected cell",
    );
    // Hugh's ruling, and the whole point of the move: the deck's head stays on
    // screen while its history is read, with the rail below it.
    check(
      `${viewport.label} · the deck's name is drawn above the rail`,
      rail.deckNameDrawn && rail.belowHead === true,
      `${rail.deckName ?? "no h1"}${rail.belowHead === true ? " · rail below it" : " · rail NOT below it"} · ${rail.headGeometry ?? "no geometry"}`,
    );
    check(
      `${viewport.label} · the rows are inside the Versions tab panel`,
      rail.inPanel,
      rail.inPanel ? "panel-versions" : "outside panel-versions",
    );
    check(
      `${viewport.label} · the panel's heading names it without drawing ink`,
      rail.railHeading !== null && !rail.railHeadingDrawn,
      `${rail.railHeading ?? "no h2"}${rail.railHeadingDrawn ? " (drawn)" : ""}`,
    );
    check(`${viewport.label} · no restore control`, !rail.restore);
    check(`${viewport.label} · no row for the pending draft`, !rail.pending);
    // READINESS 19 forbids motion outright, and a count is the only way to show it.
    check(`${viewport.label} · nothing moves`, rail.moving === 0, `${rail.moving} elements`);

    // ── Surface 4 · the diff, which is read on open and not before
    await railRows(vpPage).first().click();
    await vpPage.waitForTimeout(1200);
    const opened = await readRail(vpPage);
    const openCount = opened.rows.filter((r) => r.open).length;
    const openRow = opened.rows.find((r) => r.open);
    const panel = openRow ? await readPanel(vpPage, openRow.panel) : null;
    check(`${viewport.label} · one row open at a time`, openCount === 1, `${openCount} of 1`);
    check(`${viewport.label} · the opened row draws a panel`, panel !== null);
    if (panel) {
      console.log(`  panel: ${panel.headings.join(" | ")}`);
      console.log(`  panel text: ${panel.text}`);
      // A panel still showing its pending mark after 1.2s means the server action
      // never resolved — the read is the surface, so a stuck one is a failure and
      // not a slow paint.
      check(`${viewport.label} · the diff read settled`, !panel.pending);
      check(
        `${viewport.label} · the diff names cards`,
        panel.names.length > 0,
        panel.names.join(", ") || "none",
      );
      // v3 took two cards back and dropped two, so both directions are stated with
      // their figures. Read off the panel's text rather than its headings because
      // the phone moves those counts into the segmented pair, where they are button
      // labels — the counts are the ruling, and the element carrying them is not.
      // Case-insensitive: the desktop column heading is uppercased in CSS, which
      // `innerText` reports, so the same copy reads `In · 2` and `IN · 2`.
      check(
        `${viewport.label} · both directions are stated with their counts`,
        /in · 2/i.test(panel.text) && /out · 2/i.test(panel.text),
        panel.text.slice(0, 120),
      );
      // v3 committed under a different commander, and who was at the helm is the
      // version's substance rather than its chrome. Checked at both widths because
      // the panel's header is desktop-only: a sentence living inside it would draw a
      // commander-only commit as a version that changed nothing on a phone.
      check(
        `${viewport.label} · the helm change is stated`,
        panel.text.includes(deck.helm),
        deck.helm,
      );
    }

    // The v1 row is the initial arm: no diff to fetch, a sentence saying why, and
    // no link of any kind.
    // Read on a fresh load rather than by closing the open row first — what is
    // being checked is the arm the panel draws, not the toggle.
    await vpPage.goto(`${BASE}/decks/${deck.deckId}?tab=versions`, { waitUntil: "networkidle" });
    await railRows(vpPage).last().click();
    await railRows(vpPage).and(vpPage.locator('[aria-expanded="true"]')).first().waitFor();
    await vpPage.waitForTimeout(600);
    const v1Row = (await readRail(vpPage)).rows.find((r) => r.open);
    const v1Panel = v1Row ? await readPanel(vpPage, v1Row.panel) : null;
    console.log(`  v1 row open: ${v1Row?.text ?? "none"}`);
    console.log(`  v1 panel: ${v1Panel?.text ?? "ABSENT"}`);
    check(`${viewport.label} · the first version draws its own arm`, v1Panel !== null);
    // v1 has no predecessor, so it names no cards at all — a diff drawn here would
    // mean the panel diffed against an empty list and called the whole deck an add.
    if (v1Panel) {
      check(
        `${viewport.label} · the first version states no delta`,
        v1Panel.names.length === 0,
        v1Panel.names.join(", ") || "none",
      );
      // Naming no cards is also what a blank panel does, so the arm has to be
      // recognised by what it says rather than by what it omits: the word the
      // design gives that state, and the sentence explaining why there is no diff.
      check(
        `${viewport.label} · the first version explains itself`,
        /Initial/.test(v1Panel.text) && /nothing before it to compare/.test(v1Panel.text),
        v1Panel.text.slice(0, 160),
      );
      // The arm used to link out to the deck page. The rail now draws on the deck
      // page itself, so any link here would point at the page already on screen.
      check(
        `${viewport.label} · the first version links nowhere`,
        v1Panel.links.length === 0,
        v1Panel.links.map((a) => `${a.text} → ${a.href}`).join(", ") || "no link",
      );
    }

    // ── Surface 5 · the stamp on a logged game
    // The log lives behind the deck's Games tab, so the stamp is only reachable
    // through it — which is itself the surface's way in.
    await vpPage.goto(`${BASE}/decks/${deck.deckId}`, { waitUntil: "networkidle" });
    await vpPage.waitForTimeout(900);
    await vpPage.locator("#tab-games").click();
    await vpPage.waitForTimeout(700);
    const stamps = await readStamps(vpPage);
    const stamped = stamps.filter((s) => s.stamp !== null);
    console.log(`\n########## ${viewport.label} · /decks/<id> game log`);
    for (const s of stamps) {
      if (s.stamp === null) {
        console.log(`    no stamp slot`);
        continue;
      }
      console.log(`    ${s.stamp} · left ${s.left} · width ${s.width} · ${s.fontSize} · ${s.color}`);
    }
    check(
      `${viewport.label} · every game row carries a stamp slot`,
      stamped.length === 2,
      `${stamped.length} of 2`,
    );
    // One game was logged under v2 and one under no version, so the pair proves
    // both readings: the version, and the em dash standing in for its absence.
    check(
      `${viewport.label} · the stamps read v2 and —`,
      stamped.some((s) => s.stamp === "v2") && stamped.some((s) => s.stamp === "—"),
      stamped.map((s) => s.stamp).join(", "),
    );
    // The slot is a reserved width, not a box that sizes to its text: `v2` and the
    // em dash are different lengths, and a slot that shrank to each would put the
    // two readings on different verticals down the log.
    const widths = new Set(stamped.map((s) => s.width));
    check(
      `${viewport.label} · the stamp slot is one reserved width`,
      widths.size === 1 && [...widths][0] === 44,
      [...widths].join(", "),
    );
    check(
      `${viewport.label} · the stamp is set at 10.5px`,
      stamped.every((s) => s.fontSize === "10.5px"),
      [...new Set(stamped.map((s) => s.fontSize))].join(", "),
    );
    // A version and its absence are not the same statement, so they are not the
    // same ink: the em dash is the fainter of the two.
    const inkOf = (value) => stamped.find((s) => s.stamp === value)?.color ?? null;
    check(
      `${viewport.label} · a version and its absence take different inks`,
      inkOf("v2") !== null && inkOf("—") !== null && inkOf("v2") !== inkOf("—"),
      `v2 ${inkOf("v2")} · — ${inkOf("—")}`,
    );
    const lefts = new Set(stamped.map((s) => s.left));
    // Reported, not asserted. Below `md:` the meta cell to the stamp's left sizes to
    // its own date text, so the two slots sit on different verticals — the game
    // log's existing behaviour, which this surface inherits rather than introduces.
    console.log(`  slots share one vertical: ${lefts.size === 1 ? "yes" : `no — ${[...lefts]}`}`);

    await vpContext.close();
  }

  // ── A precon-linked deck's v0 (precons R3 §5), three ways. A START commits the box's list as v0, so
  // the rail draws ONE row for it: v0, carrying the precon's note, its Open and Unlink line, and no dashed
  // virtual v0 beneath it. A start made before that committed it as v1 and keeps its number, but draws no
  // virtual v0 either (`isStartVersion`). A brew linked after the fact keeps its virtual v0, drawn apart
  // below a divider. Needs PRECONS_ENABLED on the server, which is what the deck page reads v0 under.
  const precon = (await pool.query(
    `select p.file_name, p.name,
            (select sum(quantity)::int from precon_cards pc where pc.file_name = p.file_name and not pc.is_commander) body
       from precons p
      where not exists (select 1 from precon_cards pc where pc.file_name = p.file_name
                        and not exists (select 1 from cards c where c.oracle_id = pc.oracle_id))
        and (select count(*) from precon_cards pc where pc.file_name = p.file_name and pc.is_commander) = 1
      order by p.file_name limit 1`,
  )).rows[0];
  check("precon fixture · a precon whose every card is in the catalog", precon !== undefined);
  if (precon) {
    const preconDeck = async (label, { first, late, drift }) => {
      const { rows } = await pool.query(
        `insert into decks (user_id, name, commander_oracle_id, built_from_precon, filled)
           select $1, $2, pc.oracle_id, $3, true from precon_cards pc where pc.file_name = $3 and pc.is_commander limit 1
         returning id, commander_oracle_id`,
        [userId, `Probe · ${label}`, precon.file_name],
      );
      const { id: deckId, commander_oracle_id: commander } = rows[0];
      createdDeckIds.push(deckId);
      // The body as a start writes it: one row per card, copies summed across printings.
      await pool.query(
        `insert into deck_cards (deck_id, oracle_id, quantity, auto)
           select $1, oracle_id, sum(quantity), false from precon_cards where file_name = $2 and not is_commander
           group by oracle_id`,
        [deckId, precon.file_name],
      );
      const v = await pool.query(
        `insert into deck_versions (deck_id, number, commander_oracle_id, committed_at, commander_since)
           select $1, $2, $3, d.created_at + $4::interval, d.created_at + $4::interval from decks d where d.id = $1
         returning id`,
        [deckId, first, commander, late ? "2 minutes" : "0 seconds"],
      );
      await pool.query(
        `insert into deck_version_cards (version_id, oracle_id, quantity)
           select $1, oracle_id, quantity from deck_cards where deck_id = $2 ${drift ? "offset 1" : ""}`,
        [v.rows[0].id, deckId],
      );
      return deckId;
    };
    const cases = [
      { label: "a start, committed as v0", opts: { first: 0 }, rows: ["v0"], apart: false },
      { label: "a start from before v0, committed as v1", opts: { first: 1 }, rows: ["v1"], apart: false },
      { label: "a brew linked later", opts: { first: 1, late: true, drift: true }, rows: ["v1"], apart: true },
    ];
    for (const c of cases) c.deckId = await preconDeck(c.label, c.opts);

    for (const viewport of VIEWPORTS) {
      const vpContext = await browser.newContext({ viewport });
      const vpPage = await vpContext.newPage();
      await signIn(vpPage);
      for (const c of cases) {
        await vpPage.goto(`${BASE}/decks/${c.deckId}`, { waitUntil: "networkidle" });
        await vpPage.waitForTimeout(900);
        await vpPage.locator("#tab-versions").click();
        await vpPage.waitForTimeout(700);
        // Committed rows only: the virtual v0 is a row button of its own, counted apart below.
        const rows = await railRows(vpPage).and(vpPage.locator(":not([data-origin-row])")).allInnerTexts();
        const numbers = rows.map((t) => t.match(/^v\d+/)?.[0]);
        const originRow = await vpPage.locator("main [data-origin-row]").count();
        const divider = await vpPage.locator("main").getByText("before your first commit").count();
        const tag = `${viewport.label} · ${c.label}`;
        console.log(`\n########## ${tag}`);
        for (const t of rows) console.log(`    ${t.replace(/\s+/g, " ")}`);
        check(`${tag} · its committed rows`, JSON.stringify(numbers) === JSON.stringify(c.rows), JSON.stringify(numbers));
        check(`${tag} · ${c.apart ? "draws" : "draws no"} virtual v0`, (originRow === 1) === c.apart, `${originRow} origin rows`);
        check(`${tag} · ${c.apart ? "draws" : "draws no"} the divider`, (divider === 1) === c.apart, `${divider} dividers`);
        if (!c.apart) {
          check(`${tag} · the start's row carries the precon's note`, rows[0]?.includes(`${precon.name}, as the box lists it`), rows[0]);
          check(`${tag} · its card count is the precon's 99`, new RegExp(`\\b${precon.body} cards\\b`, "i").test(rows[0] ?? ""), rows[0]);
          await railRows(vpPage).first().click();
          await vpPage.waitForTimeout(900);
          const actions = vpPage.locator("main [data-origin-actions]");
          check(`${tag} · open, it offers the precon's page and the unlink`,
            (await actions.count()) === 1
              && (await actions.getByRole("link", { name: `Open ${precon.name} ›` }).count()) === 1
              && (await actions.getByRole("button").count()) === 1);
        } else {
          const meta = await vpPage.locator("main [data-origin-row]").innerText();
          check(`${tag} · v0 counts the 99, commanders apart`, new RegExp(`\\b${precon.body} cards\\b`, "i").test(meta), meta.replace(/\s+/g, " "));
        }
      }
      await vpContext.close();
    }
  }
} finally {
  // The decks, and nothing else: versions, version cards and games all cascade,
  // and the run writes no collection row to take back. Driven off the ids recorded
  // at insert time, so a fixture that failed half-built still takes its deck with it.
  if (createdDeckIds.length > 0) {
    await pool.query(`delete from decks where id = any($1::uuid[])`, [createdDeckIds]);
  }
  await pool.end();
  await browser.close();
}

console.log(`\n########## verdict`);
if (failures.length === 0) {
  console.log("  every check held.");
} else {
  console.log(`  ${failures.length} failed:`);
  for (const label of failures) console.log(`    ${label}`);
  process.exitCode = 1;
}
