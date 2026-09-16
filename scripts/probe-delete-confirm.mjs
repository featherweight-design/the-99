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
// one deck under the account it signs in as and deletes it in a `finally`.
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

// 390 is where the panel can leave the viewport; 1300 is the desktop the grid
// draws its narrowest card at.
const WIDTHS = [390, 1300];

// Long enough that the heading has real text to hold, short enough to stay one
// deck among several in the grid.
const DECK_NAME = "probe · delete confirm";

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

async function makeDeck(userId) {
  const commander = await pool.query(
    `select oracle_id from cards
      where commander_legal and type_line like '%Legendary%' and type_line like '%Creature%'
      order by name limit 1`,
  );
  if (commander.rows.length === 0) throw new Error("The catalog holds no legendary creature.");
  const { rows } = await pool.query(
    `insert into decks (user_id, name, commander_oracle_id, filled)
       values ($1, $2, $3, true) returning id`,
    [userId, DECK_NAME, commander.rows[0].oracle_id],
  );
  return rows[0].id;
}

/** Opens this deck's panel and presses Delete. Returns the panel locator. */
async function openConfirm(page) {
  const trigger = onPage(page, `button[aria-label="Actions for ${DECK_NAME}"]`);
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
  let deckId = null;
  try {
    for (const width of WIDTHS) {
      console.log(`\n${width}px`);
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const userId = await signIn(page);
      // Per width: the last width DELETES the deck, which is the point of the
      // last block, so each width needs its own.
      deckId = await makeDeck(userId);

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
      check(Math.round(box.width) === 248, `panel is 248px wide while confirming (${Math.round(box.width)})`);
      // `right-0` anchoring means the extra 62px is taken off the LEFT edge.
      check(box.x >= 0, `panel stays inside the viewport (left edge ${Math.round(box.x)})`);
      check(box.x + box.width <= width + 1, "panel does not overflow right");

      for (const label of ["Keep it", "Delete deck"]) {
        const button = panel.getByRole("button", { name: label, exact: true });
        const fit = await button.evaluate((el) => ({
          scroll: el.scrollWidth,
          client: el.clientWidth,
        }));
        // `scrollWidth <= clientWidth` is the whole question: the labels are in
        // `innerText` whether or not they are painted, so any assertion on the
        // text passes over a button showing half a word.
        check(fit.scroll <= fit.client, `“${label}” is not clipped (${fit.scroll} in ${fit.client})`);
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
        `panel returns to 186px in menu mode (${Math.round(menuBox.width)})`,
      );
      const kept = await pool.query(`select 1 from decks where id = $1`, [deckId]);
      check(kept.rows.length === 1, "Keep it keeps the deck");

      // And the act itself, at this width, against the real action.
      await panel.getByRole("button", { name: "Delete", exact: true }).click();
      await panel.getByRole("button", { name: "Delete deck", exact: true }).click();
      await page.waitForURL(/\/decks\/?$/, { timeout: 20_000 }).catch(() => {});
      let gone = false;
      for (let i = 0; i < 20 && !gone; i += 1) {
        const row = await pool.query(`select 1 from decks where id = $1`, [deckId]);
        gone = row.rows.length === 0;
        if (!gone) await new Promise((r) => setTimeout(r, 250));
      }
      check(gone, "Delete deck deletes the deck");
      if (gone) deckId = null;

      await context.close();
    }
  } finally {
    if (deckId) await pool.query(`delete from decks where id = $1`, [deckId]).catch(() => {});
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
