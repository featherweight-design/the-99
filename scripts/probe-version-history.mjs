// Gate for Surfaces 4 and 5: the version rail with the diff it opens, and the
// version stamp on a logged game — at both breakpoints, driven out of a real
// database.
//
// What a component test cannot settle here:
//
//   1. THE ROUTE EXISTS AND IS GUARDED. `/decks/<id>/versions` renders one row per
//      committed version for the owner and 404s for anybody else. That is a server
//      read, and jsdom never sees it.
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

// The rail's way back is the deck's name, so the check needs the same string the
// insert wrote.
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
    const moving = [...document.querySelectorAll("main *")].filter((el) => {
      const s = getComputedStyle(el);
      return (
        (s.transitionDuration !== "0s" && s.transitionProperty !== "none") ||
        s.animationName !== "none"
      );
    });
    return {
      url: location.pathname,
      h1: document.querySelector("h1")?.innerText ?? null,
      back: document.querySelector("header a")?.innerText ?? null,
      rows: rows.map((b) => ({
        text: b.innerText.replace(/\n/g, " · "),
        open: b.getAttribute("aria-expanded") === "true",
        panel: b.getAttribute("aria-controls"),
      })),
      restore: /restore|revert|roll back/i.test(document.body.innerText),
      pending: /pending|draft/i.test(document.body.innerText),
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
      pending: panel.querySelector("[data-pending-mark]") !== null,
      // Diff rows carry their own hook: they are not list items, and counting
      // `li` here found nothing and reported it as "none" — a gap-shaped reading
      // of a working panel.
      names: [...panel.querySelectorAll("[data-version-diff-row]")]
        .map((row) => row.innerText.split("\n")[0])
        .slice(0, 6),
      // The v1 arm's one way on, which is the whole reason that arm is not an
      // empty panel: `getAttribute` rather than `.href`, so the check reads the
      // route the app wrote instead of an absolutised copy of it.
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
      const spans = [...li.querySelectorAll(":scope > span")];
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
        template.commander_oracle_id,
        template.partner_oracle_id,
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
  return { deckId, versions };
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

  // ── The guard, once: a rail is not width-dependent in whom it refuses.
  // `networkidle`, not `domcontentloaded`: the route streams behind a loading
  // boundary, so the document is "loaded" while the skeleton is still on screen
  // and the refusal has not arrived yet.
  const refused = await page.goto(`${BASE}/decks/${foreignDeckId}/versions`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(500);
  const refusedStatus = refused?.status() ?? null;
  const refusedBody = await page.evaluate(() => document.body.innerText);
  const leaked = /v1|committed/i.test(refusedBody);
  const notFoundPage = /There's no page here\./.test(refusedBody);
  console.log(`\n########## another player's deck · /decks/<id>/versions`);
  check("no rail drawn for a deck the reader does not own", !leaked);
  check("the not-found page is drawn instead", notFoundPage);
  // Reported, not asserted. `versions/loading.tsx` makes this route stream, so
  // the 200 is flushed with the first chunk before the guard's `notFound()`
  // throws — the body is the refusal, and the header cannot be.
  console.log(`  status: ${refusedStatus} (200 while the route has a loading boundary)`);

  for (const viewport of VIEWPORTS) {
    const vpContext = await browser.newContext({ viewport });
    const vpPage = await vpContext.newPage();
    await signIn(vpPage);

    // ── Surface 4 · the rail
    await vpPage.goto(`${BASE}/decks/${deck.deckId}/versions`, { waitUntil: "networkidle" });
    await vpPage.waitForTimeout(700);
    const rail = await readRail(vpPage);
    console.log(`\n########## ${viewport.label} · /decks/<id>/versions`);
    console.log(`  url: ${rail.url}`);
    console.log(`  h1: ${rail.h1} · back: ${rail.back}`);
    for (const row of rail.rows) console.log(`    ${row.open ? "open " : "closed"} ${row.text}`);
    check(`${viewport.label} · one row per version`, rail.rows.length === 3, `${rail.rows.length} of 3`);
    check(
      `${viewport.label} · the deck's name is the way back`,
      (rail.back ?? "").includes(DECK_NAME),
      rail.back ?? "no link",
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
    }

    // The v1 row is the initial arm: no diff to fetch, and a browse link instead.
    // Read on a fresh load rather than by closing the open row first — what is
    // being checked is the arm the panel draws, not the toggle.
    await vpPage.goto(`${BASE}/decks/${deck.deckId}/versions`, { waitUntil: "networkidle" });
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
      const browse = v1Panel.links.find((a) => /^Browse the \d+ cards/.test(a.text));
      check(
        `${viewport.label} · the first version offers the list instead`,
        browse !== undefined && browse.href === `/decks/${deck.deckId}`,
        browse ? `${browse.text} → ${browse.href}` : v1Panel.links.map((a) => a.text).join(", ") || "no link",
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
