// The Last 31 list, measured in a real browser at 1300x900 and 390x844.
//
// Five rulings here are facts about laid-out geometry or about a pointer, and
// jsdom has neither.
//
// THE DESKTOP LIST IS BOUNDED. The handoff's long-list note refuses an inner
// scroller, and is right about every one of its four grounds AT 390px — so the
// phone keeps exactly what it drew. But it costs the decision as "a player
// scrolls past up to 38 rows", because "the list can never be longer than
// 99 − built", and the pool is the whole ranking: 262 cards for the average
// commander, 423 at the widest. So desktop shipped the one option that note
// refused by name, an unpinned commit at the end of the list. This measures that
// the commit is reachable without scrolling the list, and that the phone's is
// still pinned.
//
// THE ROW LIGHTS UNDER A POINTER. The fill was an inline style, which outranks
// every utility — so no hover could exist at all until it moved to classes.
// Whether a background actually changes under the mouse is a question for a
// browser.
//
// THE NAME OPENS THE CARD, and does not tick the row. Those are the same press
// on a control nested in the tick's label, which is the trap the decline control
// is already placed against.
//
// THE TYPE IS DESKTOP ONLY. The phone row is two lines by design and has no
// room for the word.
//
// Makes no writes. Signs in through Clerk's dev instance — see the local-auth
// note in memory. Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3011 node scripts/probe-last-slots.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

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
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
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

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

/** A deck with open slots, which is the only state that draws the strip. */
async function findDeck(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3_000);
  return page.evaluate(() => {
    // The tile states `built / size`; anything short of its own denominator has
    // slots to fill. Read off the tile rather than re-deriving it from a query,
    // which is a second copy of the rule that drifts from the real one.
    for (const tile of document.querySelectorAll("main li article")) {
      const count = [...tile.querySelectorAll("span")]
        .map((s) => (s.textContent ?? "").trim())
        .find((t) => /^\d+ \/ \d+$/.test(t));
      if (!count) continue;
      const [built, size] = count.split("/").map((n) => Number(n.trim()));
      if (built < size) {
        const href = tile.querySelector('a[href^="/decks/"]')?.getAttribute("href");
        if (href) return { href, built, size };
      }
    }
    return null;
  });
}

/**
 * The strip's door, by its own spoken name — `Choose the cards for the last N
 * slots` (`topOffCopy.strip.openAria`). Matched on the stable head of that
 * sentence rather than on its figure, which is the deck's own shortfall, and
 * never on `[aria-expanded]` alone: this page draws several.
 */
async function openList(page) {
  const door = onPage(page, 'button[aria-label^="Choose the cards for the last"]').first();
  if ((await door.count()) === 0) return false;
  await door.click();
  await page.waitForTimeout(1_500);
  return true;
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();

  try {
    for (const width of [1300, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
      const page = await context.newPage();
      await signIn(page);

      const deck = process.env.PROBE_DECK
        ? { href: `/decks/${process.env.PROBE_DECK}` }
        : await findDeck(page);
      if (deck === null) {
        report(`${width}px · a deck with open slots`, false, "the account owns none — NOT a pass");
        await context.close();
        continue;
      }
      await page.goto(`${BASE}${deck.href}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(3_500);
      if (!(await openList(page))) {
        report(`${width}px · the strip's door`, false, "not on the page — NOT a pass");
        await context.close();
        continue;
      }

      const m = await page.evaluate(() => {
        const boxes = [...document.querySelectorAll('main div[role="group"]')];
        const rowsBox = boxes.find((b) => b.querySelectorAll('input[type="checkbox"]').length > 0);
        if (!rowsBox) return null;
        const style = getComputedStyle(rowsBox);
        const rows = rowsBox.querySelectorAll('input[type="checkbox"]').length;
        const commit = [...document.querySelectorAll("main button")]
          .find((b) => /^Add \d+ card/.test((b.textContent ?? "").trim()));
        return {
          rows,
          overflowY: style.overflowY,
          boxHeight: rowsBox.getBoundingClientRect().height,
          scrollHeight: rowsBox.scrollHeight,
          commitTop: commit ? commit.getBoundingClientRect().top : null,
          // Walked UP to whatever is actually positioned, never `closest("div")`:
          // the button's immediate parent is an inner flex wrapper, which is
          // static on both widths, so the first version reported the phone's bar
          // unpinned on a correct build.
          commitFixed: commit
            ? (() => {
                let el = commit;
                while (el && el !== document.body) {
                  const pos = getComputedStyle(el).position;
                  if (pos === "fixed" || pos === "sticky") return pos;
                  el = el.parentElement;
                }
                return "static";
              })()
            : null,
          viewportH: window.innerHeight,
        };
      });
      if (m === null) {
        report(`${width}px · the rows`, false, "no row group found — NOT a pass");
        await context.close();
        continue;
      }

      // Liveness: a list short enough to fit needs no box and proves nothing.
      report(
        `${width}px · a list long enough to measure`,
        m.rows > 20,
        `${m.rows} rows drawn`,
      );

      if (width === 1300) {
        report(
          `${width}px · the list is bounded`,
          m.overflowY === "auto" && m.boxHeight <= 481 && m.scrollHeight > m.boxHeight,
          `overflow-y ${m.overflowY}, box ${Math.round(m.boxHeight)}px of ${m.scrollHeight}px of rows`,
        );
        report(
          `${width}px · the commit is on screen without scrolling the list`,
          m.commitTop !== null && m.commitTop > 0 && m.commitTop < m.viewportH,
          m.commitTop === null
            ? "no `Add N cards` control found — NOT a pass"
            : `its top is at ${Math.round(m.commitTop)} of a ${m.viewportH}px viewport`,
        );
      } else {
        // The phone keeps the handoff's own shape: one scroll surface, no box.
        report(
          `${width}px · the phone list is NOT boxed`,
          m.overflowY !== "auto" && m.overflowY !== "scroll",
          `overflow-y ${m.overflowY}`,
        );
        report(
          `${width}px · the phone commit is pinned`,
          m.commitFixed === "fixed",
          `its wrapper is ${m.commitFixed}`,
        );
      }

      // The type word, desktop only.
      // Found STRUCTURALLY, by the column's own attribute. Matching the bucket
      // words against the row's text cannot tell the type column from a card
      // NAMED one of them — `Spell`, `Land` — so a phone row drawing no type
      // could fail, and a desktop row that lost the column could pass on the
      // card's name supplying the match.
      const typed = await page.evaluate(() => {
        const row = document.querySelector('main div[role="group"] input[type="checkbox"]')
          ?.closest("div[class*=rounded-]");
        if (!row) return null;
        const cell = row.querySelector("[data-top-off-type]");
        return cell !== null && cell.getBoundingClientRect().width > 0;
      });
      report(
        `${width}px · the type word`,
        width === 1300 ? typed === true : typed === false,
        width === 1300
          ? `drawn: ${typed}`
          : `drawn: ${typed} — the phone row is two lines by design`,
      );

      if (width === 1300) {
        // The fill, under a real pointer. Read as a COLOUR either side of a
        // hover rather than as a class: the defect was an inline style winning
        // over a utility, which leaves the class list reading correctly.
        // The header and the rows share ONE content width. A classic scrollbar
        // takes its width out of the scroll container's content box, so a header
        // OUTSIDE the box reads about 15px wider than the rows and every heading
        // after the flex-auto name column sits that far right of its data. macOS
        // draws overlay scrollbars, so the width delta reads 0 either way here —
        // which is why the check also asserts the header is INSIDE the box, the
        // structural fact that makes the delta 0 on every platform.
        const cols = await page.evaluate(() => {
          const box = [...document.querySelectorAll('main div[role="group"]')]
            .find((b) => b.querySelectorAll('input[type="checkbox"]').length > 0);
          const header = box?.querySelector("div[aria-hidden]");
          const row = box?.querySelector('input[type="checkbox"]')?.closest("div[class*=rounded-]");
          if (!header || !row) return null;
          return {
            inside: box.contains(header),
            delta: Math.abs(header.getBoundingClientRect().width - row.getBoundingClientRect().width),
          };
        });
        report(
          `${width}px · the header and the rows share a width`,
          cols !== null && cols.inside && cols.delta <= 1,
          cols === null
            ? "no header or no row found — NOT a pass"
            : `header is ${cols.inside ? "inside" : "OUTSIDE"} the box, widths differ by`
              + ` ${Math.round(cols.delta * 100) / 100}px`,
        );

        // A SLOT HAS TO BE FREED FIRST, and that is the fixture, not a
        // workaround. On open the seed fills every slot, which leaves the list
        // in a state where nothing can light: a ticked row already carries the
        // hovered colour outright (a hover rule there would be a no-op dressed
        // as a state), and every unticked row is INERT at the cap — a fill that
        // lit under the pointer would promise a tick the row cannot take. So the
        // probe unticks one row, which is what a reader does before choosing a
        // different card, and measures the rows that become tickable.
        await page.evaluate(() => {
          const box = [...document.querySelectorAll('main div[role="group"] input[type="checkbox"]')]
            .find((b) => b.checked);
          box?.click();
        });
        await page.waitForTimeout(400);

        // An UNTICKED row, and the distinction is load-bearing: a ticked row
        // already carries the hovered colour, so hovering one reads the same
        // colour twice on a working build.
        const unticked = await page.evaluate(() => {
          const boxes = [...document.querySelectorAll('main div[role="group"] input[type="checkbox"]')];
          const box = boxes.find((b) => !b.checked);
          if (!box) return null;
          const row = box.closest("div[class*=rounded-]");
          if (!row) return null;
          row.setAttribute("data-probe-hover", "1");
          return getComputedStyle(row).backgroundColor;
        });
        if (unticked === null) {
          report(
            `${width}px · the row lights under the pointer`,
            false,
            "every row is ticked — NOT a pass: the fixture has no row to hover",
          );
        } else {
          await page.locator('[data-probe-hover="1"]').first().hover();
          await page.waitForTimeout(250);
          const hovered = await page.evaluate(() => {
            const row = document.querySelector('[data-probe-hover="1"]');
            return row ? getComputedStyle(row).backgroundColor : null;
          });
          report(
            `${width}px · the row lights under the pointer`,
            hovered !== null && unticked !== hovered,
            `${unticked} then ${hovered}`,
          );
        }

        // The name opens the card, and does NOT tick the row.
        const before = await page.evaluate(() =>
          document.querySelectorAll('main div[role="group"] input[type="checkbox"]:checked').length);
        // Scoped to the ROW GROUP, never to the page. `onPage` bounds this to
        // `<main>`, and the decklist behind the strip is inside `<main>` too —
        // and every one of its rows carries a `View details for …` trigger of
        // its own. The first version took the page-wide first match, so removing
        // this list's trigger entirely still opened a dialog and still reported
        // a pass: the probe was proving the decklist works.
        const name = onPage(page, 'div[role="group"] button[aria-label^="View details for"]').first();
        if ((await name.count()) === 0) {
          report(`${width}px · the name is a trigger`, false, "no trigger on any row — NOT a pass");
        } else {
          await name.click();
          await page.waitForTimeout(1_500);
          // Scoped, like every other page-content query here: the shell draws a
          // `role="dialog"` of its own for the account menu, so a bare locator
          // can count a dialog this press did not open.
          const opened = await onPage(page, '[role="dialog"]').count();
          const after = await page.evaluate(() =>
            document.querySelectorAll('main div[role="group"] input[type="checkbox"]:checked').length);
          report(
            `${width}px · the name opens the card`,
            opened > 0,
            `${opened} dialog(s) after the press`,
          );
          // The whole reason it sits outside the label: one press, one meaning.
          report(
            `${width}px · and does not tick the row`,
            after === before,
            `${before} ticked before, ${after} after`,
          );
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run();
