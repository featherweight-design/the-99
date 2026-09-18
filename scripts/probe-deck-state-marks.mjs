// The two deck-state marks, measured where they are painted.
//
// Every ruling here is a RESOLVED STYLE, and jsdom computes none: the component
// tests can say `background: var(--bg)` is set and cannot say what `--bg`
// resolves to, whether the plate is opaque over the wash, or whether the tile's
// ground makes a hollow chip read as a hole rather than as a chip.
//
// Three readings, so three fixture decks: a PLAN (cards, no version), a DECK
// (committed, clean) and a DECK MID-TINKER (committed, one card added since).
// No fixture account happens to own one of each, and the whole claim is that
// the three are distinguishable at a glance — which cannot be read off one.
//
// Point it at `local-dev` or a scratch Neon branch, NEVER production. It writes
// three decks under the account it signs in as and deletes them in a `finally`.
//
//   node scripts/probe-deck-state-marks.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { onPage } from "./lib/surface.mjs";
import { requireEnv } from "./lib/env.mjs";

neonConfig.webSocketConstructor = ws;

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) {
  throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
}

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const WIDTHS = [
  { label: "desktop", width: 1300, height: 900 },
  // The chassis's own switch point, and the width where a fifth control in the
  // wide row either fits or wraps. 1300 has slack and would pass either way.
  { label: "boundary", width: 1000, height: 900 },
  { label: "phone", width: 390, height: 844 },
];

const failures = [];
const note = (line) => console.log(`  ${line}`);
const fail = (line) => {
  failures.push(line);
  console.log(`  FAIL  ${line}`);
};

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

const pool = new Pool({ connectionString: DATABASE_URL });

/**
 * The three fixtures.
 *
 * Small bodies — five cards — because nothing measured here is a function of
 * the count: the plate, the edge and the bar's opacity are the same at 5 as at
 * 99, and a 99-row deck claims cards that change what every other run on this
 * shared database measures.
 *
 * `onDeck` takes each id the instant its row exists, before the cards, so a
 * throw part way through cannot strand a deck.
 */
async function buildFixtures(userId, onDeck) {
  const commander = await pool.query(
    `select oracle_id from cards
      where commander_legal and type_line like '%Legendary%' and type_line like '%Creature%'
      order by oracle_id limit 1`,
  );
  if (commander.rows.length === 0) throw new Error("The catalog holds no legendary creature.");
  const commanderId = commander.rows[0].oracle_id;
  const body = await pool.query(
    `select oracle_id from cards where commander_legal and oracle_id <> $1
      order by oracle_id limit 6`,
    [commanderId],
  );
  if (body.rows.length < 6) throw new Error("The catalog is too small for the fixture.");
  const cards = body.rows.map((r) => r.oracle_id);

  const make = async (name) => {
    const { rows } = await pool.query(
      `insert into decks (user_id, name, commander_oracle_id) values ($1, $2, $3) returning id`,
      [userId, name, commanderId],
    );
    const id = rows[0].id;
    onDeck(id);
    await pool.query(
      `insert into deck_cards (deck_id, oracle_id, quantity, auto)
         select $1, unnest($2::uuid[]), 1, false`,
      [id, cards.slice(0, 5)],
    );
    return id;
  };

  // A version, written the way `commitVersion` writes one: the row, its cards,
  // and the commander columns it snapshots. Raw SQL rather than the real writer
  // because this is a browser script and that function reaches `src/db`.
  const commit = async (deckId) => {
    const { rows } = await pool.query(
      `insert into deck_versions (deck_id, number, commander_oracle_id) values ($1, 1, $2)
         returning id`,
      [deckId, commanderId],
    );
    await pool.query(
      `insert into deck_version_cards (version_id, oracle_id, quantity)
         select $1, oracle_id, quantity from deck_cards where deck_id = $2`,
      [rows[0].id, deckId],
    );
  };

  const plan = await make("probe · a plan, never committed");
  const deck = await make("probe · a deck, committed and clean");
  const moved = await make("probe · a deck mid-tinker");
  await commit(deck);
  await commit(moved);
  // The sixth card, added AFTER the commit — one change, so the edge is drawn
  // and the detail row reads `1 change since v1`.
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto) values ($1, $2, 1, false)`,
    [moved, cards[5]],
  );
  return { plan, deck, moved };
}

/** The painted truth of one chip, read through whatever element draws it. */
const CHIP = (el) => {
  const s = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return {
    background: s.backgroundColor,
    borderLeftWidth: s.borderLeftWidth,
    borderLeftColor: s.borderLeftColor,
    borderLeftStyle: s.borderLeftStyle,
    borderTopWidth: s.borderTopWidth,
    borderRightWidth: s.borderRightWidth,
    color: s.color,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
};

const rgba = (value) => {
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(",").map((n) => Number(n.trim()));
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
};

let ids = [];
let userId = null;
let browser = null;
try {
  await clerkSetup();
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  userId = await signIn(page);
  const fixtures = await buildFixtures(userId, (id) => ids.push(id));
  note(`fixtures: plan ${fixtures.plan} · deck ${fixtures.deck} · moved ${fixtures.moved}`);

  for (const { label, width, height } of WIDTHS) {
    await page.setViewportSize({ width, height });

    // ── /decks: the three tiles, side by side ────────────────────────────
    await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
    await onPage(page, "article:has([class*='grid-area:chip'])").first()
      .waitFor({ state: "attached", timeout: 30_000 });
    await page.waitForTimeout(400);

    const tileOf = (name) =>
      onPage(page, "article").filter({ hasText: name }).first();

    const read = {};
    for (const [key, name] of [
      ["plan", "a plan, never committed"],
      ["deck", "a deck, committed and clean"],
      ["moved", "a deck mid-tinker"],
    ]) {
      const tile = tileOf(name);
      if ((await tile.count()) === 0) {
        fail(`${label}: the ${key} fixture is not on /decks, so nothing was measured`);
        continue;
      }
      read[key] = {
        chip: await tile.locator("[class*='grid-area:chip']").first().evaluate(CHIP),
        bar: await tile.locator("[data-deck-bar-fill]").first()
          .evaluate((el) => ({ opacity: getComputedStyle(el).opacity })),
        text: (await tile.innerText()).replace(/\s+/g, " "),
        ground: await tile.evaluate((el) => getComputedStyle(el).backgroundColor),
      };
    }
    if (!read.plan || !read.deck || !read.moved) continue;

    // THE TRAP. Hollow is not transparent: the art-wash amendment rules this
    // plate opaque, and an alpha under 1 here is the defect, not a style.
    const planBg = rgba(read.plan.chip.background);
    if (!planBg || planBg.a < 1) {
      fail(`${label}: the plan's plate is ${read.plan.chip.background} — it must be opaque`);
    } else {
      note(`${label}: plan plate ${read.plan.chip.background} (opaque)`);
    }
    // And it is a DIFFERENT colour from the deck's, or the phase says nothing.
    if (read.plan.chip.background === read.deck.chip.background) {
      fail(`${label}: the plan and the deck draw the same plate, so the phase is invisible`);
    }
    // The ⚠ the handoff asks for, reported rather than ruled on: the tile's
    // ground is `--surface-inset`, so a `--bg` plate reads slightly recessed.
    note(
      `${label}: plan plate ${read.plan.chip.background} on tile ground ${read.plan.ground}` +
        (read.plan.chip.background === read.plan.ground ? " — FLAT, no step" : " — a step"),
    );

    // The edge: 2px, on the left, and nowhere else.
    const edge = read.moved.chip;
    if (edge.borderLeftWidth !== "2px") {
      fail(`${label}: the pending edge is ${edge.borderLeftWidth}, expected 2px`);
    }
    if (edge.borderTopWidth === "2px" || edge.borderRightWidth === "2px") {
      fail(`${label}: the pending mark is drawn on more than the left edge`);
    }
    note(`${label}: edge ${edge.borderLeftWidth} ${edge.borderLeftStyle} ${edge.borderLeftColor}`);
    // A deck with a clean draft draws none of it.
    if (read.deck.chip.borderLeftWidth === "2px") {
      fail(`${label}: a clean committed deck is drawing the pending edge`);
    }

    // The bar follows the plate.
    if (read.plan.bar.opacity !== "0.5") {
      fail(`${label}: the plan's bar is opacity ${read.plan.bar.opacity}, expected 0.5`);
    }
    if (read.deck.bar.opacity !== "1") {
      fail(`${label}: the deck's bar is opacity ${read.deck.bar.opacity}, expected 1`);
    }

    // The figure, and the tile that must NOT carry it.
    if (!read.moved.text.includes("1 change since v1")) {
      fail(`${label}: the moved tile does not print its change figure — ${read.moved.text}`);
    }
    if (read.plan.text.includes("change since")) {
      fail(`${label}: the plan tile prints a change figure, which it has no version for`);
    }

    // ── The wide chassis must not wrap, with a fifth control in the row ──
    // Runs WHEREVER THE WIDE ROW RENDERS rather than at a width this script
    // names: the chassis owns its own switch point, and a probe that hard-codes
    // 1000 measures nothing the day that constant moves. Below the switch the
    // control lives in a sheet and there is no row to wrap, so a miss there is
    // a skip; at or above it, a miss is a failure.
    {
      const row = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll("main button")]
          .filter((b) => b.getClientRects().length > 0);
        let el = buttons.find((b) => /Deck state/.test(b.textContent || ""));
        if (!el) return { found: false };
        // Climb to the element that actually holds the control cluster rather
        // than trusting a class name: the chassis composes its own wrappers.
        while (el && [...el.children].filter((c) => c.getClientRects().length > 0).length < 4) {
          el = el.parentElement;
        }
        if (!el) return { found: false };
        const kids = [...el.children].filter((c) => c.getClientRects().length > 0);
        const boxes = kids.map((c) => c.getBoundingClientRect());
        // WRAP IS A BAND, NOT A SHARED TOP. The row and its inner group are
        // both `items-center` and its controls are different heights — a 34px
        // search field, a ~40px panel trigger, 22px colour pips — so their tops
        // differ by several pixels while sitting on one line. A shared-top check
        // fails on a perfectly healthy row, which is what the first version of
        // this did: it reported "5 controls on 3 lines" against a row measuring
        // 40px tall. What a second line actually costs is HEIGHT, so the band is
        // compared to the tallest control rather than the tops to each other.
        const top = Math.min(...boxes.map((b) => b.top));
        const bottom = Math.max(...boxes.map((b) => b.bottom));
        const tallest = Math.max(...boxes.map((b) => b.height));
        return {
          found: true,
          controls: kids.length,
          band: Math.round(bottom - top),
          tallest: Math.round(tallest),
          overflow: el.scrollWidth - el.clientWidth,
        };
      });
      if (!row.found) {
        if (width >= 1000) {
          fail(`${label}: the Deck state control is not in the wide chassis row`);
        } else {
          note(`${label}: compact form, the facet is in the sheet — no row to wrap`);
        }
      } else if (row.band > row.tallest + 8) {
        fail(
          `${label}: the chassis row wrapped — ${row.controls} controls span ${row.band}px ` +
            `against a tallest control of ${row.tallest}px`,
        );
      } else if (row.overflow > 1) {
        fail(`${label}: the chassis row overflows by ${row.overflow}px`);
      } else {
        note(
          `${label}: ${row.controls} controls, one line (${row.band}px band, ` +
            `${row.tallest}px tallest), no overflow`,
        );
      }
    }

    // ── The deck page: the phase in words, at both widths ────────────────
    await page.goto(`${BASE}/decks/${fixtures.plan}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    // The LINE, by its own marker, never `text=`: both spines are in the DOM —
    // that is what the responsive split is — and Playwright's text engine also
    // matches every ancestor whose whole text is the phrase, so a text read
    // counts the paragraph, its wrapper, and the hidden width's copy of both.
    // The visible filter is what separates the two widths.
    const words = onPage(page, "[data-deck-phase]");
    const visible = await words.count() === 0
      ? 0
      : await words.evaluateAll((els) => els.filter((el) => el.getClientRects().length > 0).length);
    if (visible !== 1) {
      fail(`${label}: the deck page draws the phase ${visible} times, expected exactly 1`);
    } else {
      note(`${label}: the deck page states the phase in words`);
    }
    // And the spine's own chip is hollow there — the page the grid cannot teach.
    // FAILS when the chip cannot be found, never skips. A selector that stops
    // matching — a class rename, the header moving out of `main` — would
    // otherwise report a clean run having measured nothing, which is the shape
    // this whole script exists to refuse.
    const spineChip = onPage(page, "header [class*='rounded-[6px]']:visible").first();
    if ((await spineChip.count()) === 0) {
      fail(`${label}: no chip is visible in the deck page's header, so the wash was not measured`);
    } else {
      const chip = await spineChip.evaluate(CHIP);
      const bg = rgba(chip.background);
      if (!bg || bg.a < 1) {
        fail(`${label}: the spine's plan chip is ${chip.background} — it must be opaque on the wash`);
      }
    }

    await page.goto(`${BASE}/decks/${fixtures.deck}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    const onCommitted = onPage(page, "[data-deck-phase]");
    const stillThere = await onCommitted.count() === 0
      ? 0
      : await onCommitted.evaluateAll((els) => els.filter((el) => el.getClientRects().length > 0).length);
    if (stillThere !== 0) {
      fail(`${label}: a committed deck's page draws the phase line`);
    }

    // ── Home: the resume rows carry the marks and no figure ──────────────
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    const row = onPage(page, "a[href*='/decks/']").filter({ hasText: "a deck mid-tinker" }).first();
    if ((await row.count()) === 0) {
      note(`${label}: the moved deck is not in Home's resume block — rows are capped, skipped`);
    } else {
      const rowChip = await row.locator("[class*='h-[19px]']").first().evaluate(CHIP);
      if (rowChip.borderLeftWidth !== "2px") {
        fail(`${label}: Home's row draws no pending edge (${rowChip.borderLeftWidth})`);
      }
      const text = (await row.innerText()).replace(/\s+/g, " ");
      if (text.includes("change since")) {
        fail(`${label}: Home's row prints a change figure — the stamp is its second half`);
      }
      note(`${label}: Home's row carries the edge and no figure`);
    }
  }
} finally {
  try {
    if (ids.length > 0) {
      await pool.query(`delete from decks where id = any($1::uuid[]) and user_id = $2`, [ids, userId]);
      note(`fixture decks deleted (${ids.length})`);
    }
  } catch (error) {
    failures.push(
      `could not delete the fixture decks (${ids.join(", ")}): they are still claiming cards on ` +
        `this database and must be removed by hand (${error?.message ?? error})`,
    );
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      await pool.end();
    }
  }
}

if (failures.length > 0) {
  console.log(`\n${failures.length} failure(s):`);
  for (const line of failures) console.log(`  ✗ ${line}`);
  process.exit(1);
}
console.log("\nA plan, a deck and a deck mid-tinker are three different things on every surface.");
