// The deck list's sort trigger, measured where it lands.
//
// Everything here is a question about a laid-out row, which is why none of it
// is a unit test. The toolbar is one `flex-wrap` row and the handoff's whole
// placement argument rests on two figures: the desktop widest state at
// **1006 of 1008 — two pixels** — and the phone's arrangement line at 345 of
// 358. A class-list assertion cannot see either, and jsdom reports every box at
// zero.
//
// THE STATE THE HANDOFF DID NOT MEASURE is the one this exists for. R1 measured
// the desktop row with the KEPT note; the *draft* note is a larger string that
// used to sit outside the auto cluster as its own flex child, bringing another
// 10px gap to a row defending two. The build wraps it into that cluster, and
// this proves the row is still one line with a draft note present.
//
// WHAT IT DOES NOT PROVE, said plainly: that the wrapper is what saves it. The
// fixture copies whatever deck the account has, and its auto cluster is
// narrower than the 1006-of-1008 worst case R1 measured — so with the note put
// back outside the cluster this run still reports one line. The wrapper is
// argued from R1's figures and the 10px it returns, and measured only to the
// extent that the row it produces is one line on a real fixture.
//
// Run by hand, and not part of `pnpm test`:
//   node scripts/probe-deck-sort.mjs
//   PROBE_BASE=http://localhost:3600 node scripts/probe-deck-sort.mjs
//
// It writes one deck with a committed version and an edited draft under the
// account it signs in as, and deletes it in a `finally`. Point it at
// `local-dev` or a scratch Neon branch, NEVER production.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

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

const pool = new Pool({ connectionString: DATABASE_URL });

function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_client_trust" || attempt.status === "needs_first_factor") {
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
}

/**
 * A deck with BOTH notes reachable: auto cards for the kept/bulk cluster, and a
 * committed version its draft differs from, which is what puts the draft note
 * in that slot. The draft note stands the kept note down, so the two desktop
 * states below are one fixture read twice rather than two fixtures.
 */
async function buildFixture(userId, onCreated) {
  const { rows: template } = await pool.query(
    `select d.id, d.commander_oracle_id
       from decks d
      where d.user_id = $1 and d.commander_oracle_id is not null
        and (select count(*) from deck_cards dc where dc.deck_id = d.id) > 20
      order by d.created_at limit 1`,
    [userId],
  );
  if (template.length === 0) throw new Error("no deck with 20+ cards to copy — cannot build a fixture");

  const { rows: made } = await pool.query(
    `insert into decks (user_id, name, commander_oracle_id, filled)
       values ($1, 'PROBE deck sort', $2, true) returning id`,
    [userId, template[0].commander_oracle_id],
  );
  const deckId = made[0].id;
  // BEFORE any further write. A throw in the queries below would otherwise
  // leave `run`'s `deckId` unassigned and its `finally` with nothing to delete,
  // stranding a `PROBE deck sort` deck in the database — the failure mode the
  // repo's fixture rule exists to prevent.
  onCreated(deckId);

  // `auto` rows, so the bulk cluster draws: `Keep all N` + `Clear all auto · N`.
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto)
       select $1, oracle_id, quantity, true from deck_cards where deck_id = $2`,
    [deckId, template[0].id],
  );
  const { rows: version } = await pool.query(
    `insert into deck_versions (deck_id, number, commander_oracle_id)
       values ($1, 1, $2) returning id`,
    [deckId, template[0].commander_oracle_id],
  );
  await pool.query(
    `insert into deck_version_cards (version_id, oracle_id, quantity)
       select $1, oracle_id, quantity from deck_cards where deck_id = $2`,
    [version.rows?.[0]?.id ?? version[0].id, deckId],
  );
  // ONE CARD ADDED, not one cut. A whole removal is filtered out of the
  // builder's `moves` map on purpose — "there is no row left to mark" — so a
  // fixture that cut a row would leave `pendingChange` null and the draft note
  // unrendered, which is the state this probe exists to measure. An add keeps a
  // row on the list and puts the note in the slot.
  const { rows: extra } = await pool.query(
    `select c.oracle_id from cards c
      where c.oracle_id not in (select oracle_id from deck_cards where deck_id = $1)
        and c.type_line not like 'Basic Land%'
      limit 1`,
    [deckId],
  );
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto) values ($1, $2, 1, false)`,
    [deckId, extra[0].oracle_id],
  );
  return deckId;
}

/**
 * Open the panel, and SCROLL FIRST.
 *
 * `FilterPanel` dismisses on page scroll (`filter-panel.tsx:308`), and
 * Playwright's own `click()` scrolls the target into view before pressing it —
 * so on a toolbar that sits below the fold, the click opened the panel and the
 * scroll it had just caused closed it again, leaving `aria-expanded="false"`
 * and no rows to count. `/collection`'s bar is at the top of its page and never
 * showed it. Scrolling deliberately, settling, and then clicking is the whole
 * fix, and it is the instrument being wrong rather than the app.
 */
async function openSortPanel(page) {
  const trigger = onPageRole(page, "button", /Sort the deck list/).first();
  await trigger.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await trigger.click();
  await onPage(page, "[role=option]").first().waitFor({ timeout: 5_000 });
}

/**
 * The toolbar's row, its children, and where each of them ends.
 *
 * Evaluated THROUGH the scoped trigger locator rather than re-querying `main`
 * inside the page: `surface.mjs` owns what "the page" means, and a second copy
 * of `PAGE` here is how a probe drifts from the one definition — the thing
 * `surface.test.mts` exists to enforce. The element arrives as the argument.
 */
const MEASURE = (trigger) => {
  // The row is the wrapping flex container the trigger's cluster sits in.
  // The trigger's own cluster is the nearest `flex-none` ancestor; `FilterPanel`
  // wraps its button in a `relative` div of its own, so `parentElement` is that
  // wrapper rather than the cluster and measuring it would measure the trigger.
  let cluster = trigger.parentElement;
  while (cluster && !cluster.className.includes("flex-none")) cluster = cluster.parentElement;
  let row = cluster?.parentElement ?? trigger.parentElement;
  while (row && !row.className.includes("flex-wrap")) row = row.parentElement;
  if (!row || !cluster) return null;

  const kids = [...row.children].filter((el) => el.getBoundingClientRect().width > 0);
  // COUNTED ON CENTRES, not tops. The row is `items-center` and its children
  // are 27, 36 and 38px tall, so three children on ONE line have three
  // different `top` values — a tops-based count reports a wrapped row on a
  // layout that never wrapped, which is exactly what the first version of this
  // probe did.
  const lineOf = (el) => {
    const box = el.getBoundingClientRect();
    return Math.round((box.top + box.bottom) / 2);
  };
  const centres = kids.map(lineOf).sort((a, b) => a - b);
  const tops = centres.filter((c, i) => i === 0 || c - centres[i - 1] > 12);
  const rowBox = row.getBoundingClientRect();
  const triggerBox = trigger.getBoundingClientRect();
  const clusterBox = cluster.getBoundingClientRect();
  // The INNERMOST span carrying it: the cluster wrapper contains the note's
  // text too, and matching that would report the whole cluster as the note.
  const draftNote = [...row.querySelectorAll("span")]
    .filter((s) => s.children.length === 0)
    .find((s) => /differs? from v\d+/.test(s.textContent ?? ""));

  return {
    lines: tops.length,
    children: kids.length,
    rowWidth: Math.round(rowBox.width),
    rowHeight: Math.round(rowBox.height),
    triggerHeight: Math.round(triggerBox.height),
    triggerLabel: trigger.textContent?.trim() ?? "",
    triggerAria: trigger.getAttribute("aria-label") ?? "",
    triggerAccent: getComputedStyle(trigger).borderTopColor,
    accentClass: trigger.className.includes("border-[color:var(--accent)]"),
    // The arrangement cluster: everything from `By type` rightwards, on one line.
    clusterWidth: Math.round(clusterBox.width),
    clusterLines: (() => {
      const kidCentres = [...cluster.children]
        .filter((el) => el.getBoundingClientRect().width > 0)
        .map(lineOf)
        .sort((a, b) => a - b);
      return kidCentres.filter((c, i) => i === 0 || c - kidCentres[i - 1] > 12).length;
    })(),
    draftNote: draftNote ? draftNote.textContent.trim() : null,
    // What the row has left. The spacer must be allowed to reach zero, so the
    // slack is measured as the gap between the last child's right edge and the
    // row's own.
    slack: Math.round(rowBox.right - Math.max(...kids.map((el) => el.getBoundingClientRect().right))),
    // Printed on a failure, so a wrapped row says WHICH child went over rather
    // than only that one did.
    kids: kids.map((el) => ({
      text: (el.textContent ?? "").trim().slice(0, 26),
      top: Math.round(el.getBoundingClientRect().top),
      width: Math.round(el.getBoundingClientRect().width),
    })),
  };
};

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  let failures = 0;
  let deckId = null;

  try {
    const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
    const page = await context.newPage();
    await signIn(page);
    const userId = await page.evaluate(() => window.Clerk?.user?.id ?? null);
    if (!userId) throw new Error("signed in but no Clerk user id");

    await buildFixture(userId, (id) => { deckId = id; });

    for (const width of [1300, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(2_500);

      console.log(`\n=== ${width}px · All, auto cluster and a DRAFT note present`);
      const trigger = onPageRole(page, "button", /Sort the deck list/).first();
      if (await trigger.count() === 0) {
        failures += !report("the toolbar draws a sort trigger", false, "no trigger on the page");
        continue;
      }
      const all = await trigger.evaluate(MEASURE);
      if (all === null) {
        failures += !report("the toolbar's row can be measured", false, "no wrapping row found");
        continue;
      }

      // THE MEASUREMENT R1 COULD NOT TAKE, and it is a DESKTOP one: both notes
      // are `hidden md:inline`, so the phone never draws either and the state
      // does not exist there. A fixture that failed to produce the note fails
      // the run rather than passing quietly — a check that lost its subject is
      // not a check.
      if (width === 1300) {
        failures += !report(
          "the desktop row is one line with a DRAFT note present",
          all.lines === 1 && all.draftNote !== null,
          all.draftNote === null
            ? "no draft note on the fixture — this run measured the kept-note state, which R1 already measured"
            : `${all.lines} line(s), ${all.children} children, note ${JSON.stringify(all.draftNote)}`,
        );
      }

      if (width === 1300) {
        failures += !report(
          "the desktop row does not wrap",
          all.lines === 1,
          `${all.lines} line(s), ${all.slack}px of slack past the last child`
          + (all.lines === 1 ? "" : ` · ${JSON.stringify(all.kids)}`),
        );
      } else {
        // Three lines is the shipped maximum on a filled deck; the trigger
        // joins the third rather than making a fourth.
        failures += !report(
          "the phone row is at most three lines",
          all.lines <= 3,
          `${all.lines} line(s)`,
        );
      }

      // The arrangement cluster never splits: the view well alone on its own
      // line is the defect the wrapper exists to prevent.
      failures += !report(
        `the arrangement cluster stays on one line at ${width}`,
        all.clusterLines === 1,
        `${all.clusterLines} line(s), ${all.clusterWidth}px wide`,
      );

      // No `Sort:` prefix — the 38px that buys the well its place.
      failures += !report(
        `the trigger reads the whole order and no prefix at ${width}`,
        /·/.test(all.triggerLabel) && !all.triggerLabel.includes("Sort:"),
        JSON.stringify(all.triggerLabel),
      );

      // The accessible name keeps the word the label drops.
      failures += !report(
        `the accessible name carries the order at ${width}`,
        all.triggerAria.startsWith("Sort the deck list,") && /·/.test(all.triggerAria),
        JSON.stringify(all.triggerAria),
      );

      // This bar's own rule: no accent ground or border on a resting control.
      failures += !report(
        `the resting trigger takes no accent border at ${width}`,
        !all.accentClass,
        `border ${all.triggerAccent}`,
      );

      if (width === 390) {
        failures += !report(
          "the phone trigger clears the 44px target",
          all.triggerHeight >= 44,
          `${all.triggerHeight}px`,
        );
      }

      await openSortPanel(page);

      // The sheet's title wears no count badge — single-select has nothing to
      // count. Phone only: the desktop form is a popover and draws no title, so
      // asserting it at 1300 would be asserting the absence of a heading that
      // was never there.
      if (width === 390) {
        const title = await onPage(page, "[role=dialog] h2").first().textContent();
        failures += !report(
          "the sort sheet's title carries no count badge",
          (title ?? "").trim() === "Sort by",
          JSON.stringify((title ?? "").trim()),
        );
      }

      // Not scoped to `[role=dialog]`: the desktop form is a popover with no
      // dialog role, so that selector counted zero at 1300 while the sheet
      // answered fine at 390 — a check that passed at one width by measuring
      // the other one's markup.
      const rows = await onPage(page, "[role=option]").count();
      failures += !report(
        `the panel offers two orders under All at ${width}`,
        rows === 2,
        `${rows} row(s)`,
      );
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);

      // Shopping offers the third.
      await onPageRole(page, "button", /^Shopping \d+$/).first().click();
      await page.waitForTimeout(1_200);
      await openSortPanel(page);
      const shoppingRows = await onPage(page, "[role=option]").count();
      failures += !report(
        `the panel offers three orders under Shopping at ${width}`,
        shoppingRows === 3,
        `${shoppingRows} row(s)`,
      );
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }
  } finally {
    if (deckId) {
      await pool.query(`delete from decks where id = $1`, [deckId]);
      console.log(`\ncleaned up deck ${deckId}`);
    }
    await browser.close();
    await pool.end();
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

await run();
