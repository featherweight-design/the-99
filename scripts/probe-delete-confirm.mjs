// Gate for the deck-delete confirm — the pane that replaced `window.confirm`.
//
// Three of its rulings are facts about laid-out geometry rather than markup, so
// the component test cannot reach them. The panel is 186px in every other mode
// and the confirm pane is the folder pane, which the folders handoff specifies
// inside a 248px panel: whether its two side-by-side buttons hold their labels
// at that width is a question for a layout engine. And the panel is anchored
// `right-0`, so widening it extends LEFT — on a 390px phone, past the card's
// own left edge if the card is narrow enough.
//
// Point it at `local-dev` or a scratch Neon branch, NEVER production. It writes
// ONE DECK PER WIDTH under the account it signs in as — the last block of each
// width presses the real Delete, so each width needs its own — and deletes any
// that survive in a `finally`. The survivors are tracked in a SET rather than a
// single handle: a `deckId` reassigned at the top of the second width would
// leave the first width's deck behind whenever its delete check failed, which is
// exactly the run on which cleanup matters.
//
//   node scripts/probe-delete-confirm.mjs
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

// 390 and 1300 both draw the 248px art band — a phone is one column and a wide
// desktop's three columns are wide too. 900 is the band NEITHER covers: between
// roughly 640 and 1062 the three columns fall under the tile's `@min-[330px]`
// container query and the art box is 168px, which is the one that can clip the
// panel hanging out of it. Copilot named that ancestor in round 2; no width here
// reached it.
const WIDTHS = [390, 900, 1300];

// Long enough that the heading has real text to hold, short enough to stay one
// deck among several in the grid.
const DECK_NAME = "probe · delete confirm";

// `DECK_NAME_MAX` is 120 and nothing forbids an unbroken run, so this is the
// worst name a reader can actually make. Normal word-breaking sends it straight
// past the panel's content box, and the panel clips its own overflow — so the
// deck the pane is asking about is the one thing it fails to show.
const LONG_NAME = `probe${"x".repeat(114)}`;

const failures = [];
const note = (line) => console.log(`  ${line}`);
const check = (ok, label) => {
  note(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) failures.push(label);
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
 * The fixture deck carries a BODY, and that is not decoration.
 *
 * `DeckCardOverflow` draws its `Update from a list` row only when `built > 0`
 * (#277 state 3), so a deck with no `deck_cards` shows a THREE-row menu. Three
 * rows fit the 168px art box; four do not, and the fourth is `Delete`. The first
 * version of this script built an empty deck and reported every row reachable at
 * every width, over the exact build whose screenshot shows `Delete` cut in half.
 */
async function makeDeck(userId, name = DECK_NAME) {
  const commander = await pool.query(
    `select oracle_id from cards
      where commander_legal and type_line like '%Legendary%' and type_line like '%Creature%'
      order by name limit 1`,
  );
  if (commander.rows.length === 0) throw new Error("The catalog holds no legendary creature.");
  const { rows } = await pool.query(
    `insert into decks (user_id, name, commander_oracle_id, filled)
       values ($1, $2, $3, true) returning id`,
    [userId, name, commander.rows[0].oracle_id],
  );
  const deckId = rows[0].id;
  // A handful, not 99: `built > 0` is the whole gate, and the row count is what
  // this script measures.
  const body = await pool.query(
    `select oracle_id from cards where commander_legal and oracle_id <> $1 order by oracle_id limit 5`,
    [commander.rows[0].oracle_id],
  );
  for (const row of body.rows) {
    await pool.query(
      `insert into deck_cards (deck_id, oracle_id, quantity) values ($1, $2, 1)`,
      [deckId, row.oracle_id],
    );
  }
  return deckId;
}

/**
 * Is `node` actually REACHABLE — can a reader see and press it?
 *
 * Hit-testing, via `document.elementFromPoint`, and not rect arithmetic. Three
 * instruments were tried here and only this one is right at both of the
 * positions this panel takes:
 *
 *  - `getBoundingClientRect` alone reports the layout box and knows nothing
 *    about an ancestor's `overflow`. Playwright will click a painted-away
 *    element without complaint, so a run can press a control no reader can reach
 *    and then report the surface it opened as healthy. That is what this script
 *    did until 2026-09-18.
 *  - Intersecting that box with every clipping ancestor fixes the absolute case
 *    and then FAILS THE FIX: a `position: fixed` panel is still a DOM descendant
 *    of the `overflow-hidden` art box, so the intersection keeps subtracting a
 *    clip the browser no longer applies, and reports 0 of 32px over a control
 *    that is plainly on screen.
 *
 * The browser's own hit-test knows about both. THREE points — the centre and 3px
 * inside each edge — because a box can lose either end: clipped from below by the
 * art crop, and clipped from above by a pane that grew upward, which is what
 * `deck-delete-mode.tsx` documents and what a centre-and-bottom pair passes over.
 */
async function reach(panel, selector) {
  // `(root, sel)`, not a destructured pair: a locator's `evaluate` passes the
  // element as the first argument and the extra arg as the second.
  return panel.evaluate((root, sel) => {
    const node = sel === ":self" ? root : root.querySelector(sel);
    if (!node) return null;
    const b = node.getBoundingClientRect();
    const at = (x, y) => {
      const hit = document.elementFromPoint(x, y);
      return hit !== null && (hit === node || node.contains(hit));
    };
    return {
      height: Math.round(b.height),
      reachable:
        at(b.left + b.width / 2, b.top + 3) &&
        at(b.left + b.width / 2, b.top + b.height / 2) &&
        at(b.left + b.width / 2, b.bottom - 3),
    };
  }, selector);
}

/**
 * Opens this deck's ⋯ panel and returns the panel locator. It does NOT press
 * `Delete` — each caller does that itself, after the menu's own rows have been
 * read, because pressing a row is what hid the fact that one of them was
 * unreachable.
 */
async function openConfirm(page, name = DECK_NAME) {
  const trigger = onPage(page, `button[aria-label="Actions for ${name}"]`);
  await trigger.waitFor({ state: "visible", timeout: 20_000 });
  // The trigger TOGGLES, so opening an already-open menu closes it and leaves no
  // `aria-controls` to find. Close first and open from a known state.
  if ((await trigger.getAttribute("aria-expanded")) === "true") await trigger.click();
  await trigger.click();
  const panelId = await trigger.getAttribute("aria-controls");
  if (!panelId) throw new Error("The trigger names no panel; the menu did not open.");
  // An attribute selector, not `#id`: React's `useId` emits colons, which are
  // CSS combinator syntax, and `CSS.escape` does not exist in Node.
  const panel = page.locator(`[id="${panelId}"]`);
  return panel;
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  // Populated the instant a deck exists, never at the end of a block: a throw
  // part-way through must not strand a row.
  const written = new Set();
  try {
    for (const width of WIDTHS) {
      console.log(`\n${width}px`);
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const userId = await signIn(page);
      // Per width: the last width DELETES the deck, which is the point of the
      // last block, so each width needs its own.
      const deckId = await makeDeck(userId);
      written.add(deckId);

      await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
      const panel = await openConfirm(page);

      // EVERY ROW OF THE MENU, before anything is pressed, and HIT-TESTED rather
      // than measured — see `reach()` for why rect arithmetic is wrong at both of
      // the positions this panel takes. The panel used to hang out of
      // `data-deck-art`, which is `overflow-hidden` and 168px at the three-column
      // band, and `Delete` is the LAST row, so it was the one that went. Reading
      // the rows was the gap: this script pressed `Delete` to open the pane and
      // then measured the pane, which is a healthy reading of a surface reached
      // through a control no reader could see.
      const rows = await panel.evaluate((el) => {
        const at = (node, x, y) => {
          const hit = document.elementFromPoint(x, y);
          return hit !== null && (hit === node || node.contains(hit));
        };
        return [...el.querySelectorAll("a, button")].map((node) => {
          const b = node.getBoundingClientRect();
          return {
            label: node.textContent.trim(),
            height: Math.round(b.height),
            reachable:
              at(node, b.left + b.width / 2, b.top + 3) &&
              at(node, b.left + b.width / 2, b.top + b.height / 2) &&
              at(node, b.left + b.width / 2, b.bottom - 3),
          };
        });
      });
      // FOUR: the Update row is what makes the menu taller than the art box, so a
      // run that drew three has lost its subject and must fail rather than pass.
      check(rows.length === 4, `the menu draws all four rows (${rows.length})`);
      for (const row of rows) {
        check(row.reachable, `menu row “${row.label}” is reachable (${row.height}px tall)`);
      }

      // THE SAME MENU, WITH THE TRIGGER NEAR THE FOLD. This is the case the fix
      // for the art-crop clip introduced, and it was worse than the clip: a fixed
      // box cannot be scrolled into view, because scrolling re-places it and it
      // travels with its trigger. Measured at 900x900 before the flip, the
      // four-row menu drew 821→975 and both `Move` and `Delete` sat below the
      // fold permanently.
      //
      // The grid's last visible row is the COMMON case here, not an edge one, and
      // no other check in this file reaches it: every one of them opens a menu on
      // a deck at the top of a freshly loaded route.
      // Through `onPage`, never a re-spelled `main`: the shell draws controls
      // around `<main>`, and the scope has one definition in `lib/surface.mjs`.
      await onPage(page, `button[aria-label="Actions for ${DECK_NAME}"]`).evaluate((trigger) => {
        trigger.scrollIntoView({ block: "center" });
        // Put the trigger about 140px above the fold — too little room for the
        // ~153px menu, so the panel has to flip.
        const r = trigger.getBoundingClientRect();
        window.scrollBy(0, r.top - (window.innerHeight - 140));
      });
      const lowPanel = await openConfirm(page, DECK_NAME);
      const lowRows = await lowPanel.evaluate((el) => {
        const at = (node, x, y) => {
          const hit = document.elementFromPoint(x, y);
          return hit !== null && (hit === node || node.contains(hit));
        };
        const box = el.getBoundingClientRect();
        return {
          top: Math.round(box.top),
          bottom: Math.round(box.bottom),
          viewport: window.innerHeight,
          rows: [...el.querySelectorAll("a, button")].map((node) => {
            const b = node.getBoundingClientRect();
            return {
              label: node.textContent.trim(),
              reachable:
                at(node, b.left + b.width / 2, b.top + 3) &&
                at(node, b.left + b.width / 2, b.bottom - 3),
            };
          }),
        };
      });
      check(
        lowRows.bottom <= lowRows.viewport,
        `a menu opened near the fold stays on screen (${lowRows.top}→${lowRows.bottom} in ${lowRows.viewport})`,
      );
      for (const row of lowRows.rows) {
        check(row.reachable, `near the fold, menu row “${row.label}” is still reachable`);
      }
      // Back to the top, so the checks that follow read the ordinary placement.
      await page.evaluate(() => window.scrollTo(0, 0));
      await openConfirm(page, DECK_NAME);

      await panel.getByRole("button", { name: "Delete", exact: true }).click();

      const heading = panel.getByText(`Delete “${DECK_NAME}”?`);
      check(await heading.isVisible(), "the pane names the deck it would delete");
      check(
        await panel
          .getByText("Its list, its versions and its game log go with it.", { exact: false })
          .isVisible(),
        "the pane states what goes and what does not",
      );

      const box = await panel.boundingBox();
      // The panel keeps its own 186px in every mode. The pane was ported from the
      // folder menu, which the folders handoff specifies inside a 248px panel, and
      // widening for it looked necessary — two buttons side by side in a 186px
      // panel reads as too little for `Delete deck`. A mode-dependent 248px was
      // written, and then MEASURED against this script rather than reasoned about:
      // at 186px both labels sit on one line with room to spare and the paragraph
      // settles at 176px tall, so the widening was dropped. The figures are below
      // in this run's own output; nothing here restates them, because the estimate
      // that justified the widening was itself arithmetic written from memory.
      // This check pins the outcome: a panel that changes width when it changes
      // mode has regained the mechanism.
      check(
        Math.round(box.width) === 186,
        `panel keeps its 186px while confirming (${Math.round(box.width)})`,
      );
      check(box.x >= 0, `panel stays inside the viewport (left edge ${Math.round(box.x)})`);
      check(box.x + box.width <= width + 1, "panel does not overflow right");
      // The pane is a paragraph, and a narrow panel makes it a tall one. A
      // panel taller than the viewport cannot be finished — the confirm button
      // is its last row, and the panel is absolutely positioned, so nothing
      // scrolls it into reach.
      check(box.height <= 900, `pane fits the viewport (${Math.round(box.height)}px tall)`);

      for (const label of ["Keep it", "Delete deck"]) {
        const button = panel.getByRole("button", { name: label, exact: true });
        const fit = await button.evaluate((el) => ({
          scroll: el.scrollWidth,
          client: el.clientWidth,
          scrollH: el.scrollHeight,
          clientH: el.clientHeight,
          lines: el.getClientRects().length,
        }));
        // Two overflows, and the SECOND is the one that bites. The labels are in
        // `innerText` whether or not they are painted, so any assertion on the
        // text passes over a button showing half a word — hence the width check.
        // But a button too narrow for its label WRAPS rather than clipping, and a
        // wrapped label overflows a fixed 32px button VERTICALLY while its
        // `scrollWidth` stays exactly its `clientWidth`. Measured: at the menu's
        // own 186px both labels report "not clipped" at 75px while `Delete deck`
        // is on two lines. Width alone reports a clean pane over a broken one.
        check(fit.scroll <= fit.client, `“${label}” is not clipped (${fit.scroll} in ${fit.client})`);
        check(
          fit.scrollH <= fit.clientH,
          `“${label}” stays on one line (content ${fit.scrollH} in ${fit.clientH})`,
        );
        check(fit.client >= 60, `“${label}” has real width (${fit.client})`);
      }

      // Nothing has been deleted yet — the whole difference from a browser
      // confirm is that the destructive act is described before it happens.
      const before = await pool.query(`select 1 from decks where id = $1`, [deckId]);
      check(before.rows.length === 1, "pressing Delete deletes nothing on its own");

      await panel.getByRole("button", { name: "Keep it", exact: true }).click();
      check(
        await panel.getByRole("button", { name: "Rename", exact: true }).isVisible(),
        "Keep it returns to the menu",
      );
      const menuBox = await panel.boundingBox();
      check(
        Math.round(menuBox.width) === 186,
        `panel is still 186px back in menu mode (${Math.round(menuBox.width)})`,
      );
      const kept = await pool.query(`select 1 from decks where id = $1`, [deckId]);
      check(kept.rows.length === 1, "Keep it keeps the deck");
      // And the act itself, at this width, against the real action.
      await panel.getByRole("button", { name: "Delete", exact: true }).click();
      await panel.getByRole("button", { name: "Delete deck", exact: true }).click();
      // ASSERTED, never swallowed. `deleteDeck` ends in `redirect("/decks")`, so
      // the navigation is part of the flow under test — and the database poll
      // below would go green on a build whose client never followed it, leaving
      // the reader on a deck page whose deck is gone. A `.catch(() => {})` here
      // turned that into a silent pass.
      let landed = true;
      await page.waitForURL(/\/decks\/?$/, { timeout: 20_000 }).catch(() => {
        landed = false;
      });
      check(landed, `the delete lands the reader on /decks (at ${page.url()})`);
      let gone = false;
      for (let i = 0; i < 20 && !gone; i += 1) {
        const row = await pool.query(`select 1 from decks where id = $1`, [deckId]);
        gone = row.rows.length === 0;
        if (!gone) await new Promise((r) => setTimeout(r, 250));
      }
      check(gone, "Delete deck deletes the deck");
      if (gone) written.delete(deckId);

      // LAST, deliberately. This block reloads the route, which leaves the main
      // deck's panel locator stale — running it earlier made every check after it
      // time out against an id that no longer existed.
      const longId = await makeDeck(userId, LONG_NAME);
      written.add(longId);
      await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
      const longPanel = await openConfirm(page, LONG_NAME);
      await longPanel.getByRole("button", { name: "Delete", exact: true }).click();
      const headingFit = await longPanel
        .locator("p")
        .first()
        .evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
      check(
        headingFit.scroll <= headingFit.client,
        `a ${LONG_NAME.length}-character name wraps rather than running past the panel (${headingFit.scroll} in ${headingFit.client})`,
      );

      // And the half that `break-words` does NOT answer. Wrapping a 119-character
      // name made the pane 323px tall against the 176px a short name draws, and a
      // pane that cannot fit below its trigger is flipped ABOVE it — so an
      // over-tall pane loses its own first lines rather than its buttons. Both
      // ends are hit-tested; see `reach()`.
      for (const [what, selector] of [
        ["heading", "p"],
        ["confirm", "button:last-of-type"],
      ]) {
        const m = await reach(longPanel, selector);
        check(
          m !== null && m.reachable,
          m === null
            ? `the long-name pane draws no ${what} at all`
            : `the ${what} is reachable under a long name (${m.height}px tall)`,
        );
      }
      // The pane's own height is the cause those two are effects of: unclamped it
      // is 323px against the 176px a short name draws.
      const paneHeight = await longPanel.evaluate((el) => Math.round(el.getBoundingClientRect().height));
      check(paneHeight <= 220, `a long name leaves the pane near its normal height (${paneHeight}px)`);

      await pool.query(`delete from decks where id = $1`, [longId]);
      written.delete(longId);

      await context.close();
    }
  } finally {
    for (const id of written) {
      await pool.query(`delete from decks where id = $1`, [id]).catch(() => {});
    }
    await browser.close();
    await pool.end();
  }

  console.log("");
  if (failures.length > 0) {
    console.log(`${failures.length} failing check(s):`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("All checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
