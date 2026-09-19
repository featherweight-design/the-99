// The seven status plates, measured where they are painted.
//
// Every ruling here is a RESOLVED STYLE, and jsdom computes none: a component
// test can say which token a pill asks for and cannot say what that token
// resolves to, whether two neutral plates are distinguishable, or whether a
// dash survives at 10.5px.
//
// THE ROUND THIS REPLACES. R4 drew two wordless marks — a hollow plate and a
// 2px left rule — and R6 retired both: a signal the product owner could not
// read without a key is not a signal, and the plate measured ~39 near-neutral
// units against `Building`, the commonest work-in-progress deck. So this script
// now proves the opposite of what it used to: that NO mark is drawn anywhere,
// and that the phase is a word.
//
// Three fixture decks still, because the claim is about telling them apart: a
// DRAFT (cards, no version), a NEW (no cards, no version) and a COMMITTED deck.
//
// Point it at `local-dev` or a scratch Neon branch, NEVER production. It writes
// three decks under the account it signs in as and deletes them in a `finally`.
//
//   node scripts/probe-deck-statuses.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

/**
 * The chassis's own switch point, READ FROM THE CHASSIS.
 *
 * The tightest wide layout is the one worth measuring, and it is at the
 * breakpoint — 1300 has slack and passes over an overflow that begins at the
 * switch. A literal here is a second copy of a constant that belongs to
 * `filter-chassis.tsx`: raised, this script's "boundary" becomes a compact
 * viewport and the tight case goes unmeasured; lowered, it stops being the
 * boundary at all. So it is parsed out of the source rather than typed again.
 */
const CHASSIS_WIDE_MIN_PX = (() => {
  const source = readFileSync(
    join(import.meta.dirname, "..", "src", "components", "ui", "filter-chassis.tsx"),
    "utf8",
  );
  const match = source.match(/CHASSIS_WIDE_MIN_PX\s*=\s*(\d+)/);
  if (!match) throw new Error("filter-chassis.tsx no longer declares CHASSIS_WIDE_MIN_PX");
  return Number(match[1]);
})();
const WIDTHS = [
  { label: "desktop", width: 1300, height: 900 },
  // The switch point itself: the tightest width at which the wide row renders,
  // and the one where a fifth control either fits or wraps.
  { label: "boundary", width: CHASSIS_WIDE_MIN_PX, height: 900 },
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

  const draft = await make("probe · a draft, never committed");
  const deck = await make("probe · a deck, committed and clean");
  const moved = await make("probe · a deck mid-tinker");
  // FOUR fixtures, because the dash check needs BOTH neutral words on screen.
  // `New` and `Draft` differ by their border style and by nothing else a
  // greyscale reader can use, so a run holding only one of them skips that
  // check and proves nothing — which is exactly what the first version of this
  // rewrite did.
  const fresh = await make("probe · a new deck, no cards");
  await pool.query(`delete from deck_cards where deck_id = $1`, [fresh]);
  await commit(deck);
  await commit(moved);
  // The sixth card, added AFTER the commit — one change, so the edge is drawn
  // and the detail row reads `1 change since v1`.
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto) values ($1, $2, 1, false)`,
    [moved, cards[5]],
  );
  return { fresh, draft, deck, moved };
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
    borderStyle: s.borderTopStyle,
    borderTopWidth: s.borderTopWidth,
    borderRightWidth: s.borderRightWidth,
    color: s.color,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
};

/**
 * The alpha of a resolved colour, in either notation the app can produce.
 *
 * `color-mix(in srgb, …)` resolves to `color(srgb r g b)` — NOT to `rgb()` —
 * and a parser that only knew `rgb()` returned null for every plate and then
 * reported each one as transparent. Twelve failures on a build with nothing
 * wrong with it, which is the shape this script exists to refuse in the other
 * direction.
 */
const alphaOf = (value) => {
  const fn = value.match(/color\(srgb\s+[^)]*?\/\s*([\d.]+)\s*\)/);
  if (fn) return Number(fn[1]);
  if (value.startsWith("color(")) return 1;
  const parts = value.match(/rgba?\(([^)]+)\)/);
  if (!parts) return null;
  const nums = parts[1].split(",").map((n) => Number(n.trim()));
  return nums.length > 3 ? nums[3] : 1;
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
  note(
    `fixtures: new ${fixtures.fresh} · draft ${fixtures.draft} · deck ${fixtures.deck}` +
      ` · moved ${fixtures.moved}`,
  );

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
      ["fresh", "a new deck, no cards"],
      ["draft", "a draft, never committed"],
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
        word: (await tile.locator("[class*='grid-area:chip']").first().innerText()).trim(),
        // An empty deck draws the track and no fill — that IS what an empty
        // track means — so a missing fill is a state, not a failure.
        bar: (await tile.locator("[data-deck-bar-fill]").count()) === 0
          ? { opacity: "" }
          : await tile.locator("[data-deck-bar-fill]").first()
              .evaluate((el) => ({ opacity: getComputedStyle(el).opacity })),
        text: (await tile.innerText()).replace(/\s+/g, " "),
        ground: await tile.evaluate((el) => getComputedStyle(el).backgroundColor),
      };
    }
    if (!read.fresh || !read.draft || !read.deck || !read.moved) continue;

    // NO MARK, ANYWHERE. This is the check the round turns on: R4's plate and
    // edge are retired, so a chip drawing either is a regression to a
    // vocabulary the reader could not decode.
    for (const [key, r] of Object.entries(read)) {
      if (r.chip.borderLeftWidth === "2px") {
        fail(`${label}: the ${key} tile draws a 2px left edge — the pending mark is retired`);
      }
      if (r.bar.opacity !== "1" && r.bar.opacity !== "") {
        fail(`${label}: the ${key} tile's bar is opacity ${r.bar.opacity} — the provisional bar is retired`);
      }
      const alpha = alphaOf(r.chip.background);
      if (alpha === null || alpha < 1) {
        fail(`${label}: the ${key} tile's plate is ${r.chip.background} — every plate is opaque`);
      }
    }

    // THE PHASE IS A WORD. Read off the chip rather than inferred from a
    // colour, which is the whole correction: `Draft` on a list of five cards,
    // `New` on a list of none, and the committed deck saying whatever its
    // counts earn.
    if (read.fresh.word !== "New") {
      fail(`${label}: the empty uncommitted deck reads "${read.fresh.word}", expected New`);
    }
    if (read.draft.word !== "Draft") {
      fail(`${label}: the uncommitted 5-card deck reads "${read.draft.word}", expected Draft`);
    }
    if (read.deck.word === "Draft" || read.moved.word === "Draft") {
      fail(`${label}: a committed deck reads Draft — the phase is testing the wrong thing`);
    }
    note(
      `${label}: words — ${read.fresh.word} / ${read.draft.word} / ${read.deck.word} /` +
        ` ${read.moved.word} · plates ${read.fresh.chip.background} vs ${read.draft.chip.background}`,
    );

    // THE DASH SEPARATES THE TWO NEUTRALS. `New` and `Draft` are both drawn
    // from text colours, so in greyscale the border style is the only thing
    // between them — which is why R6 moved it off `Building`. Read from the
    // two fixtures that actually carry those words.
    const byWord = Object.fromEntries(Object.values(read).map((r) => [r.word, r.chip]));
    if (!byWord.New || !byWord.Draft) {
      fail(`${label}: the run does not hold both New and Draft, so the dash check measured nothing`);
    } else if (byWord.New.borderStyle === byWord.Draft.borderStyle) {
      fail(
        `${label}: New and Draft both draw a ${byWord.New.borderStyle} edge, so greyscale cannot ` +
          `tell them apart`,
      );
    }
    if (byWord.Draft && byWord.Draft.borderStyle !== "dashed") {
      fail(`${label}: Draft's edge is ${byWord.Draft.borderStyle}, expected dashed`);
    }

    // ── The wide chassis must not wrap, with a fifth control in the row ──
    // Runs WHEREVER THE WIDE ROW RENDERS, and asks the CHASSIS which form it is
    // in rather than comparing the viewport to a constant this script keeps its
    // own copy of. `CHASSIS_WIDE_MIN_PX` is the chassis's to move: a duplicated
    // 1000 here reports a false failure the day it rises, and stops describing
    // the switch point the day it falls. The compact form puts every dimension
    // in a sheet, so there is no row to wrap and nothing to measure.
    {
      const row = await page.evaluate(() => {
        const chassis = document.querySelector("main [data-chassis-form]");
        const form = chassis?.getAttribute("data-chassis-form") ?? null;
        if (form !== "wide") return { form, wide: false };
        const cluster = chassis?.querySelector("[data-chassis-row='controls']");
        if (!cluster) return { form, wide: true, found: false };
        const kids = [...cluster.children].filter((c) => c.getClientRects().length > 0);
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
        return {
          form,
          wide: true,
          found: true,
          controls: kids.length,
          hasFacet: /Deck state/.test(cluster.textContent ?? ""),
          band: Math.round(bottom - top),
          tallest: Math.round(Math.max(...boxes.map((b) => b.height))),
          overflow: cluster.scrollWidth - cluster.clientWidth,
        };
      });
      if (!row.wide) {
        note(`${label}: chassis is ${row.form ?? "absent"} — the facet is in the sheet, no row to wrap`);
      } else if (!row.found) {
        fail(`${label}: the wide chassis draws no control row`);
      } else if (!row.hasFacet) {
        fail(`${label}: the wide chassis row does not hold the Deck state control`);
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

    // ── The deck page: the word, and no line under the bar ──────────────
    // #730 drew the phase as a mono line under the progress bar. The pill says
    // it now, and the line is gone: two statements of one fact is what this
    // round removes.
    await page.goto(`${BASE}/decks/${fixtures.fresh}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    const phaseLines = onPage(page, "[data-deck-phase]");
    if ((await phaseLines.count()) > 0) {
      fail(`${label}: the deck page still draws the retired phase line under the bar`);
    }
    const spineChip = onPage(page, "header [class*='rounded-[6px]']:visible").first();
    if ((await spineChip.count()) === 0) {
      fail(`${label}: no chip is visible in the deck page's header, so nothing was measured`);
    } else {
      const chip = await spineChip.evaluate(CHIP);
      const word = (await spineChip.innerText()).trim();
      const alpha = alphaOf(chip.background);
      if (alpha === null || alpha < 1) {
        fail(`${label}: the spine's chip is ${chip.background} — every plate is opaque on the wash`);
      }
      if (chip.borderLeftWidth === "2px") {
        fail(`${label}: the spine's chip draws the retired 2px edge`);
      }
      if (word !== "New") {
        fail(`${label}: the deck page's chip reads "${word}" for an empty uncommitted deck, expected New`);
      } else {
        note(`${label}: the deck page says ${word} in the pill, and nothing under the bar`);
      }
    }

    // ── Home: the word, no mark, no figure ──────────────────────────────
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    const row = onPage(page, "a[href*='/decks/']").filter({ hasText: "a deck mid-tinker" }).first();
    if ((await row.count()) === 0) {
      note(`${label}: the edited deck is not in Home's resume block — rows are capped, skipped`);
    } else {
      const rowChip = await row.locator("[class*='h-[19px]']").first().evaluate(CHIP);
      if (rowChip.borderLeftWidth === "2px") {
        fail(`${label}: Home's row draws the retired 2px edge`);
      }
      const text = (await row.innerText()).replace(/\s+/g, " ");
      if (text.includes("change since")) {
        fail(`${label}: Home's row prints a change figure — the stamp is its second half`);
      }
      note(`${label}: Home's row carries the word and no mark`);
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
console.log("\nSeven statuses, no marks, and the phase is a word on every surface.");
