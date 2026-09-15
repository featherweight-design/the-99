// Gate for the desktop deck header while the `Commit as v1` offer is present —
// the one state in which that band's title column reached **0px**.
//
// The offer's note is a 318px mono line, the action column sized to its content
// and refused to shrink, and the deficit came out of the title column: the deck
// name, the commander line and the progress bar each measured zero and drew
// nothing, while every one of them was in the DOM with its text intact. jsdom
// lays nothing out, so every component test on this header passed over it, and
// no probe here could see it either — the state needs a **versionless deck at a
// full body**, which no fixture account happened to own.
//
// So this script builds one: a brew with 99 `deck_cards` rows and no version,
// which is exactly the gate `builder-shell.tsx` reads. It asserts the columns
// have width rather than asserting a class list, because the defect was a
// resolved width and not a missing rule.
//
// Point it at `local-dev` or a scratch Neon branch, NEVER production. It writes
// one deck under the account it signs in as and deletes it in a `finally`.
//
//   node scripts/probe-commit-offer.mjs
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
// Demanded separately, because a `+clerk_test` fixture address takes the
// email-code path and has no password to supply — the documented local account
// is one, so requiring it through `requireEnv` would exit before the browser
// launched. Same shape as `probe-collection-filter.mjs`.
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) {
  throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
}

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

// Both desktop geometries of the band: the 560px portrait's 592px inset above
// 1200px of row, and the 340px portrait's 364px inset below it. The collapse
// happened at both, and a run at one width alone would leave the other's inset
// unmeasured. 820 is the narrowest desktop the header draws.
const WIDTHS = [1440, 1300, 1024, 820];

// The floors. A name at 21px needs real width to read as a name at all, and the
// bar is capped at 170px so it has to survive the crowding rather than merely
// exist. These are deliberately generous: the defect measured 0.
const TITLE_FLOOR = 140;
const BAR_FLOOR = 60;

const failures = [];
const note = (line) => console.log(`  ${line}`);

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
 * The fixture: a brew at a full body, with a LONG name.
 *
 * Long on purpose. A short name leaves slack in the title column, and slack is
 * what hid this: the column has to be asked for more than it can have before it
 * can be seen giving way. The name is the deck's, so it also proves the clamp
 * still ends in something readable rather than in nothing.
 *
 * `onDeck` takes the id the instant the deck row exists, before the 99 body
 * rows: a helper that only returned at the end would leave the deck behind
 * whenever one of those inserts threw.
 */
async function buildBrew(userId, onDeck) {
  const commander = await pool.query(
    `select oracle_id, name from cards
      where commander_legal and type_line like '%Legendary%' and type_line like '%Creature%'
      order by name limit 1`,
  );
  if (commander.rows.length === 0) throw new Error("The catalog holds no legendary creature.");
  const { oracle_id: commanderId } = commander.rows[0];

  const body = await pool.query(
    `select oracle_id from cards
      where commander_legal and oracle_id <> $1
      order by oracle_id limit 99`,
    [commanderId],
  );
  if (body.rows.length < 99) {
    throw new Error(`The catalog holds ${body.rows.length} usable cards; the fixture needs 99.`);
  }

  const { rows } = await pool.query(
    `insert into decks (user_id, name, commander_oracle_id, filled)
       values ($1, $2, $3, true) returning id`,
    [userId, "probe · commit offer, a deliberately long deck name", commanderId],
  );
  const deckId = rows[0].id;
  onDeck(deckId);

  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto)
       select $1, unnest($2::uuid[]), 1, false`,
    [deckId, body.rows.map((r) => r.oracle_id)],
  );
  return deckId;
}

// The desktop band, reached through `onPage` and its own marker. Both spines are
// in the DOM — that is what the responsive split is — so the phone's is filtered
// out by `:visible` here and by `getClientRects()` inside the read.
//
// Scoped rather than queried straight off the document, like every other browser
// script here: the shell draws `NavRail`, `MobileHeader` and `TabBar` around
// `<main>`, and a probe that spells its own selector is a second definition of
// what "the page" means. The read then runs THROUGH this locator, so `onPage`
// keeps owning that.
const band = (page) =>
  onPage(page, "header[data-deck-spine-desktop]:visible").first();

// The offer is found by its own text, so a run that never reached the gate fails
// rather than measuring a header with no offer in it.
// A function rather than a string: `Locator.evaluate` hands the element to it,
// and a string would be evaluated as an expression with nothing bound to it.
const READ = (header) => {
  const vis = (el) => el && el.getClientRects().length > 0;
  if (!vis(header)) return { found: false };
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), right: Math.round(r.right) };
  };
  const row = [...header.children].find((el) => vis(el) && el.querySelector('[data-deck-title]'));
  const cols = row ? [...row.children] : [];
  const offer = [...header.querySelectorAll('a')].find((a) => a.textContent.trim() === 'Commit as v1');
  const bar = header.querySelector('[data-testid="spine-bar-fill"]');
  return {
    found: true,
    offer: Boolean(offer && vis(offer)),
    header: box(header),
    titleColumn: box(cols[0]),
    actionColumn: box(cols[cols.length - 1]),
    title: box(header.querySelector('[data-deck-title]')),
    titleText: header.querySelector('[data-deck-title]')?.textContent ?? '',
    meta: box(header.querySelector('[data-spine-meta]')),
    barTrack: box(bar?.parentElement),
    count: box(header.querySelector('[data-spine-count]')),
  };
};

let deckId = null;
const browser = await clerkSetup().then(() => chromium.launch());
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const userId = await signIn(page);
  deckId = await buildBrew(userId, (id) => {
    deckId = id;
  });
  note(`fixture deck ${deckId}`);

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
    // `attached`, not the default `visible`: a collapsed title is zero-width,
    // which Playwright calls hidden — so waiting for visibility turns the very
    // defect this script exists to measure into a 30s timeout that abandons
    // every width after the first. Presence is what the read needs; the width is
    // what it reports. Scoped through `onPage` for the same reason the read is.
    await onPage(page, "header[data-deck-spine-desktop] [data-deck-title]")
      .first()
      .waitFor({ state: "attached", timeout: 30_000 });
    await page.waitForTimeout(400);
    // Counted before it is read: a locator that resolves to nothing throws out of
    // `evaluate`, and "no desktop band on this route" is a failure this run should
    // report rather than crash on.
    const header = band(page);
    const read =
      (await header.count()) === 0 ? { found: false } : await header.evaluate(READ);

    if (!read.found) {
      failures.push(`${width}: no desktop deck header is visible`);
      continue;
    }
    // The gate, not a nicety: with no offer on the page this run measures the
    // header every other check already covers and proves nothing about the
    // state that collapsed it.
    if (!read.offer) {
      failures.push(`${width}: the fixture drew no \`Commit as v1\` offer, so nothing was proved`);
      continue;
    }

    note(
      `${width}: title ${read.title.w}px · column ${read.titleColumn.w}px · ` +
        `meta ${read.meta.w}px · bar ${read.barTrack.w}px · actions ${read.actionColumn.w}px`,
    );

    if (read.title.w < TITLE_FLOOR) {
      failures.push(`${width}: the deck name measures ${read.title.w}px (floor ${TITLE_FLOOR})`);
    }
    if (read.titleText.trim() === "") {
      failures.push(`${width}: the deck name is empty`);
    }
    if (read.meta.w < TITLE_FLOOR) {
      failures.push(`${width}: the commander line measures ${read.meta.w}px (floor ${TITLE_FLOOR})`);
    }
    if (read.barTrack.w < BAR_FLOOR) {
      failures.push(`${width}: the progress track measures ${read.barTrack.w}px (floor ${BAR_FLOOR})`);
    }
    if (read.count.w === 0) {
      failures.push(`${width}: the count measures 0px`);
    }
    // The other half of the same defect: a column that will not shrink draws
    // past the row instead, so the offer sat outside the band's right edge.
    if (read.actionColumn.right > read.header.right + 1) {
      failures.push(
        `${width}: the action column ends at ${read.actionColumn.right}px, past the band's ${read.header.right}px`,
      );
    }
  }
  // The rename state, at the narrowest desktop. §B14 replaces the action row with
  // a Save/Cancel pair that does not wrap, and the column is `flex-none` while
  // the field is open for that reason.
  //
  // Reported as an invariant, not as a mutation-proved case: with the column
  // left shrinkable here the controls still end inside the band at 820, so this
  // block passes either way and the `flex-none` is conservative rather than
  // load-bearing. It is kept because the rename column is the narrower of the
  // two — it needs nothing from the title to fit — and because the shrink exists
  // for content that state does not draw. What the block does earn: any future
  // widening of §B14's row is caught here rather than on someone's screen.
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  await onPage(page, "header[data-deck-spine-desktop] [data-deck-title]")
    .first()
    .waitFor({ state: "attached", timeout: 30_000 });
  const pencil = onPage(page, "header[data-deck-spine-desktop] button:visible").filter({
    hasText: "✎",
  });
  if ((await pencil.count()) === 0) {
    failures.push("820 renaming: the header draws no rename trigger, so nothing was proved");
  } else {
    await pencil.first().click();
    // The field is the state's own marker: it replaces the heading, so its
    // presence is what says the rename opened rather than a click landing on the
    // band behind the glyph.
    await onPage(page, "header[data-deck-spine-desktop] input")
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
    const renaming = await band(page).evaluate((header) => {
      const rect = (el) => (el ? Math.round(el.getBoundingClientRect().right) : null);
      const row = [...header.children].find((el) => el.querySelector("input"));
      const cols = row ? [...row.children] : [];
      // The controls INSIDE the action column, not the first button in the
      // header: with the field open the pencil is gone and the band's own
      // `Card details` pill is the first button in document order, which sits
      // at the far left and reported a comfortable 195px while proving nothing.
      const actionColumn = cols[cols.length - 1];
      const controls = actionColumn ? [...actionColumn.querySelectorAll("button")] : [];
      return {
        actions: rect(actionColumn),
        controls: controls.length,
        save: controls.length === 0 ? null : Math.max(...controls.map((b) => rect(b))),
        header: rect(header),
        field: Math.round(header.querySelector("input")?.getBoundingClientRect().width ?? 0),
      };
    });
    note(
      `820 renaming: actions end ${renaming.actions}px · ${renaming.controls} controls, ` +
        `rightmost ends ${renaming.save}px · band ends ${renaming.header}px · ` +
        `field ${renaming.field}px`,
    );
    // Two, and both of them §B14's: a count of anything else means this read
    // found a different column and every edge below it is about the wrong box.
    if (renaming.controls !== 2) {
      failures.push(`820 renaming: the action column holds ${renaming.controls} controls, not 2`);
    }
    if (renaming.actions > renaming.header + 1) {
      failures.push(
        `820 renaming: the action column ends at ${renaming.actions}px, past the band's ${renaming.header}px`,
      );
    }
    if (renaming.save === null || renaming.save > renaming.header + 1) {
      failures.push(
        `820 renaming: a rename control ends at ${renaming.save}px, past the band's ${renaming.header}px`,
      );
    }
    if (renaming.field < 100) {
      failures.push(`820 renaming: the field measures ${renaming.field}px`);
    }
  }
} finally {
  if (deckId) {
    await pool.query(`delete from decks where id = $1`, [deckId]);
    note(`fixture deck ${deckId} deleted`);
  }
  await pool.end();
  await browser.close();
}

if (failures.length > 0) {
  console.log(`\n${failures.length} failure(s):`);
  for (const line of failures) console.log(`  ✗ ${line}`);
  process.exit(1);
}
console.log("\nThe deck header keeps its title, commander line and track while `Commit as v1` is offered.");
