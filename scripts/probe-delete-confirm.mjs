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
  return rows[0].id;
}

/** Opens this deck's panel and presses Delete. Returns the panel locator. */
async function openConfirm(page, name = DECK_NAME) {
  const trigger = onPage(page, `button[aria-label="Actions for ${name}"]`);
  await trigger.waitFor({ state: "visible", timeout: 20_000 });
  await trigger.click();
  const panelId = await trigger.getAttribute("aria-controls");
  if (!panelId) throw new Error("The trigger names no panel; the menu did not open.");
  // An attribute selector, not `#id`: React's `useId` emits colons, which are
  // CSS combinator syntax, and `CSS.escape` does not exist in Node.
  const panel = page.locator(`[id="${panelId}"]`);
  await panel.getByRole("button", { name: "Delete", exact: true }).click();
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
      const headingFit = await longPanel
        .locator("p")
        .first()
        .evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
      check(
        headingFit.scroll <= headingFit.client,
        `a ${LONG_NAME.length}-character name wraps rather than running past the panel (${headingFit.scroll} in ${headingFit.client})`,
      );

      // And the half that `break-words` does NOT answer. Wrapping a 119-character
      // name made the pane 323px tall, and the panel hangs inside `data-deck-art`,
      // which is `overflow-hidden` and only 168px at the 900px band. Nothing
      // rect-based sees that: `getBoundingClientRect` reports the layout box and
      // knows nothing about a clipping ancestor, and Playwright clicks a painted-
      // away button happily. So intersect each element with every clipping
      // ancestor and read what is LEFT.
      //
      // BOTH elements, and the heading is the one that caught it. The first
      // version of this block measured the confirm button alone and reported a
      // clean 32-of-32 over a build whose heading had its first lines painted
      // away — the reader could not see which deck they were deleting, which is
      // the entire job of the pane. A screenshot found that, not this check.
      const visibility = await longPanel.evaluate((el) => {
        const clipped = (node) => {
          if (!node) return null;
          const box = node.getBoundingClientRect();
          let top = box.top;
          let bottom = box.bottom;
          for (let n = el.parentElement; n; n = n.parentElement) {
            const overflow = getComputedStyle(n).overflow;
            if (overflow && overflow !== "visible") {
              const r = n.getBoundingClientRect();
              top = Math.max(top, r.top);
              bottom = Math.min(bottom, r.bottom);
            }
          }
          return { height: Math.round(box.height), visible: Math.round(Math.max(0, bottom - top)) };
        };
        return {
          heading: clipped(el.querySelector("p")),
          confirm: clipped(
            [...el.querySelectorAll("button")].find((b) => b.textContent.trim() === "Delete deck"),
          ),
          paneHeight: Math.round(el.getBoundingClientRect().height),
        };
      });
      for (const [what, m] of [
        ["heading", visibility.heading],
        ["confirm", visibility.confirm],
      ]) {
        check(
          m !== null && m.visible === m.height,
          m === null
            ? `the long-name pane draws no ${what} at all`
            : `the ${what} stays unclipped under a long name (${m.visible} of ${m.height}px)`,
        );
      }
      // The pane's own height is the cause the two checks above are effects of:
      // unclamped it is 323px, and nothing the box can do makes that fit 168.
      check(
        visibility.paneHeight <= 220,
        `a long name leaves the pane near its normal height (${visibility.paneHeight}px)`,
      );
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
