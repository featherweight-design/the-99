// `Put back` on a real `Going out` column, at 390x844 and 1300x900 — and the
// regression that matters more than the feature: #185's receipt on the deck
// page, which this change deliberately does not touch.
//
// Four things only a browser answers:
//
//  1. Every row under `Going out` carries the control, and pressing one takes
//     that row out of the column while the heading count drops with it — in the
//     same paint, because the write is optimistic.
//  2. The target is 44px square at 390px and the label right-aligns at both
//     widths. Centring inside the target leaves the label inboard and the
//     trailing column ragged.
//  3. No row in the column is two-line at either width, and the page does not
//     scroll sideways.
//  4. `/decks/[id]` still leaves a dashed spent slot with its `Undo` after a
//     removal, in list AND card view. R3 ships alongside #185, not over it.
//
// It writes its own deck, version and draft under the account it signs in as
// and deletes them in a `finally`. Point it at `local-dev`, NEVER production.
//
// Run by hand against a local `pnpm dev`: `node scripts/probe-undo-removal.mjs`
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon, neonConfig } from "@neondatabase/serverless";
import { chromium } from "playwright";
import ws from "ws";
import { requireEnv } from "./lib/env.mjs";
import { PAGE, onPage } from "./lib/surface.mjs";

neonConfig.webSocketConstructor = ws;

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const sql = neon(DATABASE_URL);
const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844, phone: true },
  { label: "desktop · 1300x900", width: 1300, height: 900, phone: false },
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
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

/**
 * A deck with a committed version and a draft that has cut three cards from it.
 * Built by hand rather than through the UI: the point of the run is the column,
 * and reaching it through the builder would spend a minute of clicks per width.
 */
async function seed(userId) {
  const [{ oracle_id: commander }] = await sql`
    select oracle_id from cards where commander_legal = true
      and color_identity @> array['G']::text[] and type_line ilike '%Legendary%Creature%'
    limit 1`;
  // The commander is excluded by name: `addCardToDeck` refuses its own deck's
  // commander with `is-commander`, so a commander row under `Going out` would
  // be the one row here whose control cannot succeed — and this probe's whole
  // contract is that it always does.
  const cards = await sql`
    select oracle_id from cards where commander_legal = true and type_line not ilike '%Basic%'
      and oracle_id <> ${commander}
      and (color_identity = '{}'::text[] or color_identity <@ array['G']::text[])
    limit 8`;
  const [deck] = await sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${userId}, ${`Undo probe ${Date.now()}`}, ${commander})
    returning id`;
  // Registered the moment it exists, not when the seed finishes: a throw while
  // inserting the version or its cards would otherwise leave a deck behind that
  // the `finally` has no id for.
  deckIds.push(deck.id);
  const [version] = await sql`
    insert into deck_versions (deck_id, number, committed_at, commander_oracle_id, commander_since)
    values (${deck.id}, 1, now(), ${commander}, now()) returning id`;
  for (const c of cards) {
    await sql`insert into deck_version_cards (version_id, oracle_id, quantity, since)
              values (${version.id}, ${c.oracle_id}, 1, now())`;
  }
  // The draft keeps five of the eight, so three rows are `Going out`, and they
  // are non-basics — the only thing that column can ever hold.
  for (const c of cards.slice(0, 5)) {
    await sql`insert into deck_cards (deck_id, oracle_id, quantity)
              values (${deck.id}, ${c.oracle_id}, 1)`;
  }
  return deck.id;
}

/** Everything the column says about itself, before and after a press. */
async function readColumn(page) {
  // Scoped to `<main>`, never the document: the shell's own controls come first
  // in document order, and a probe that reaches past the page measures the
  // shell while naming the surface it meant to measure. See `lib/surface.mjs`.
  return page.locator(PAGE).evaluate((main) => {
    const controls = [...main.querySelectorAll("button")].filter((b) =>
      (b.getAttribute("aria-label") ?? "").startsWith("Put "),
    );
    const heading = [...main.querySelectorAll("*")]
      .map((e) => e.textContent ?? "")
      .find((t) => /^Going out · \d+$/.test(t.trim()));
    const rows = controls.map((control) => {
      const row = control.closest("li, div[class*='rounded']") ?? control.parentElement;
      const box = control.getBoundingClientRect();
      const rowBox = row.getBoundingClientRect();
      // The NAME, which is the thing that wraps. The row's own height is a
      // poor proxy: a wrapped name still fits inside a 44px control's box, so
      // comparing the row to the control would call a two-line row one line.
      const name = row.querySelector("button, a") ?? row;
      const nameStyle = getComputedStyle(name);
      const nameLines = Math.round(
        name.getBoundingClientRect().height / (parseFloat(nameStyle.lineHeight) || 1),
      );
      return {
        width: Math.round(box.width),
        height: Math.round(box.height),
        rowHeight: Math.round(rowBox.height),
        nameLines,
        // Right-aligned: the label's own right edge sits within a few pixels of
        // its target's, never centred inside it.
        rightGap: Math.round(rowBox.right - box.right),
      };
    });
    return {
      controls: controls.length,
      heading: heading?.trim() ?? null,
      rows,
      // The document's own overflow, which is a page-level fact rather than a
      // control's — the one measurement here that is deliberately unscoped.
      overflowsX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
}

const report = {};
/** One deck per viewport. The first run restores a cut and then removes two more
 *  cards for the #185 check, so a shared fixture would hand the second viewport
 *  a column of a different size and the assertions below would be measuring
 *  whatever the first one left behind. */
const deckIds = [];
await clerkSetup();
const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await signIn(page);
    const userId = await page.evaluate(() => window.Clerk.user.id);
    const deckId = await seed(userId);

    await page.goto(`${BASE}/decks/${deckId}/changes`, { waitUntil: "networkidle" });
    // The phone puts the two directions behind a segmented pair; the column is
    // only on screen once its segment is.
    const outTab = onPage(page, "button").filter({ hasText: /^Going out · \d+$/ }).first();
    if (vp.phone && (await outTab.count()) > 0) await outTab.click();
    await onPage(page, "button[aria-label^='Put ']").first().waitFor({ timeout: 15_000 });

    const before = await readColumn(page);
    await onPage(page, "button[aria-label^='Put ']").first().click();
    // Optimistic: the row is gone before the server answers, so this waits on
    // the count rather than on a navigation.
    await page.waitForFunction(
      ([was, scope]) =>
        [...(document.querySelector(scope)?.querySelectorAll("button") ?? [])].filter((b) =>
          (b.getAttribute("aria-label") ?? "").startsWith("Put "),
        ).length < was,
      [before.controls, PAGE],
      { timeout: 10_000 },
    );
    const after = await readColumn(page);
    // The optimistic paint satisfies the wait above whether or not the server
    // took the write, so without this the probe could report a restore that
    // never happened. The draft's own rows are the proof — polled, because the
    // paint is by definition ahead of the write it is predicting.
    let persisted = 0;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const [row] = await sql`
        select count(*)::int as n from deck_cards where deck_id = ${deckId}`;
      persisted = row.n;
      if (persisted === 6) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    // #185, untouched: remove a card on the deck page and the dashed receipt
    // with its own `Undo` is still what is left behind.
    await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "networkidle" });
    const receipt = {};
    for (const view of ["List view", "Card view"]) {
      const toggle = onPage(page, `button[aria-label="${view}"]`).first();
      if ((await toggle.count()) > 0) await toggle.click();
      const remove = onPage(page, "button[aria-label^='Remove ']").first();
      if ((await remove.count()) === 0) {
        receipt[view] = "no removable row";
        continue;
      }
      await remove.click();
      receipt[view] = await onPage(page, "button[aria-label^='Undo']")
        .first()
        .waitFor({ timeout: 10_000 })
        .then(() => "undo offered")
        .catch(() => "NO UNDO");
    }

    report[vp.label] = { before, after, persisted, receipt };
    await context.close();
  }
} finally {
  for (const id of deckIds) {
    await sql`delete from deck_cards where deck_id = ${id}`;
    await sql`delete from deck_version_cards where version_id in
              (select id from deck_versions where deck_id = ${id})`;
    await sql`delete from deck_versions where deck_id = ${id}`;
    await sql`delete from decks where id = ${id}`;
  }
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));

const failures = [];
for (const [label, r] of Object.entries(report)) {
  const phone = label.startsWith("iPhone");
  const check = (name, got, want) => {
    if (got !== want) failures.push(`${label} · ${name}: ${got} (expected ${want})`);
  };
  check("rows carrying Put back", r.before.controls, 3);
  check("heading before", r.before.heading, "Going out · 3");
  check("heading after the press", r.after.heading, "Going out · 2");
  check("rows after the press", r.after.controls, 2);
  // Five cards in the seeded draft, and the restore makes six. Read from the
  // database, because the optimistic paint says nothing about the server.
  check("the draft actually grew", r.persisted, 6);
  check("page scrolls sideways", r.before.overflowsX, false);
  // And after the row leaves: a reflow could push the page sideways at exactly
  // the moment the feature acts, which is the one moment this probe watches.
  check("page scrolls sideways after the restore", r.after.overflowsX, false);
  for (const [i, row] of r.before.rows.entries()) {
    // 44px square at 390px, 34px tall above it. The width floor is the phone's
    // target; desktop sizes to its label.
    if (phone) {
      check(`row ${i} target width`, row.width >= 44, true);
      check(`row ${i} target height`, row.height >= 44, true);
    } else {
      check(`row ${i} control height`, row.height >= 34, true);
    }
    // One line, measured on the element that wraps rather than on the row: a
    // wrapped name still fits inside a 44px control's box, so a row-to-control
    // comparison would call a two-line row one line.
    check(`row ${i} name is one line`, row.nameLines, 1);
    // Alignment is NOT checked here, and that is deliberate: the control's box
    // hugs its label at both widths, so centring and right-aligning render
    // within a pixel of each other and a measurement passes either way. The
    // class contract is asserted in `put-back-control.test.tsx` instead, which
    // is honest about being structural. See the handoff's ruling 17b for why
    // the property matters at all — it is about this label sitting flush with
    // `Pull` in the column beside it, which needs both on screen at once.
  }
  check("list view keeps #185's undo", r.receipt["List view"], "undo offered");
  check("card view keeps #185's undo", r.receipt["Card view"], "undo offered");
}

if (failures.length > 0) {
  console.error("\nAgainst the handoff and #185:");
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.error("\nPut back behaves, and #185's receipt is untouched, at both widths.");
