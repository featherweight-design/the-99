// Home, at both widths, after the parity round.
//
// This gates the claim the round is made of: the two widths draw ONE page.
// Every check here is a fact about laid-out geometry that no unit test can
// reach — JSDOM applies no CSS, so it cannot see which rows wrapped, whether a
// section is on screen, or what order the blocks ended up in.
//
// Rewritten rather than extended: the probe it replaces asserted a deck rail
// that no longer exists, and read its findings out as JSON for a human instead
// of passing or failing.
//
// What it proves, in the order the checks run:
//   1. Four blocks at BOTH widths, in one order — CTAs, Ready to build, the
//      resume block, Commitments. Nothing is on one width only.
//   2. `Your decks` is gone from both, heading and rows.
//   3. Four resume rows, 2×2 above 1180px and stacked below.
//   4. Every row carries a stamp, and the stamps are in the order the block
//      claims — a row's evidence for why it is where it is.
//   5. The row's geometry is the shipped one: a stated 72px band, a 99px
//      portrait (errata E1/E2 — the handoff's 74/62 and 64px are legal at no
//      band, the wash table keys the portrait to band × 1.37).
//   6. `All {n} decks` is a real route to /decks, CLICKED rather than counted,
//      at desktop AND phone — the footer is part of the parity claim.
//   7. The 900px band nobody drew: rows stack rather than clipping their names.
//   8. Phone controls clear 44px, and both header CTAs are on the page at every
//      width — the pair mobile Home did not draw before this round.
//   9. The bracket chip (Home bracket-chip addendum, section C): every row is
//      three lines inside its 72px, the chip draws marks only (a range 55px, a
//      single 28px), the commander is the only child of line two that shrinks,
//      the count group beside the bar is never cut, and a row with no chip
//      lines up with one that has one (N4). A range is what the width is sized
//      for, so the probe PUTS one on Home: it finds a deck of this account whose
//      stored reading is an unanswered range, moves its `last_edited_at` to now
//      so it is one of the four rows, and puts the stamp back in a `finally`.
//      No such deck FAILS the run rather than measuring singles and passing.
//      A single-mark deck joins them, so the 28px check has a subject, and it
//      refuses the staging and production branches before its first write,
//      holding the stamps it moves in a file so an interrupted run is put right
//      by the next one.
//      A chip-less deck is touched a second earlier, so the first pair mixes the
//      two and N4 is measured rather than skipped. Three mutations fail it: the
//      chip's face left on (16 checks), line two's stated height removed (names
//      2.5px apart in every pair), and the bar's `flex-1` removed (0px bars).
//
// Run: `node scripts/probe-refresh-home.mjs`, against local dev.
// `PROBE_TOUCH=1` runs every width as a touch screen (the 88px desktop rail) and adds 1190.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const sql = neon(DATABASE_URL);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

let failures = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
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
}

/** The visible section labels with their positions — column, then top. */
const READ_BLOCKS = `() => [...document.querySelectorAll('main h2')]
  .filter((h) => h.getClientRects().length)
  .map((h) => {
    const r = h.getBoundingClientRect();
    return { text: (h.textContent ?? '').trim(), x: Math.round(r.left), y: Math.round(r.top) };
  })
  .sort((a, b) => a.x - b.x || a.y - b.y)`;

/** Each resume row's box, its stamp and its portrait. */
const READ_ROWS = `() => {
  const heading = [...document.querySelectorAll('main h2')]
    .find((h) => (h.textContent ?? '').trim().startsWith('Pick up'));
  if (!heading) return null;
  const section = heading.closest('section');
  return [...section.querySelectorAll('a[href^="/decks/"]')].map((a) => {
    const r = a.getBoundingClientRect();
    // The wash's own root publishes the band it was keyed to; the painted layer
    // beside it is the portrait ONLY when the row has a crop. A commander with
    // no art crop draws an identity gradient at inset-0 — a supported rendering,
    // and full width — so measuring whatever is painted would report a portrait
    // of 300-odd for a row that is drawn exactly as intended. Crop-backed rows
    // are asserted at 99; artless rows are counted and reported instead.
    // Anchored to the row's own hook rather than to the text it prints: a
    // matcher keyed on the verbs would go quiet the day the copy changed, and a
    // quiet check reads exactly like a passing one.
    const stampEl = a.querySelector('[data-resume-stamp]');
    const stamp = stampEl ? (stampEl.textContent ?? '').trim() : null;
    // Whether the stamp is WHOLLY inside the row. The row hides its overflow
    // and the stamp does not shrink, so a meta line with too little room clips
    // it rather than wrapping — and a half-printed stamp is worse than none.
    // (No backticks in this comment: the whole function is a template literal.)
    const stampBox = stampEl ? stampEl.getBoundingClientRect() : null;
    const stampClipped = stampBox
      ? stampBox.right > r.right + 0.5 || stampBox.left < r.left - 0.5 || stampBox.width < 1
      : true;
    const washRoot = a.querySelector('[data-art-wash-band]');
    // The crop's own layer: the wash draws it at a stated width, where the
    // artless gradient spans the band. Anything as wide as the row is the latter.
    const cropLayer = [...a.querySelectorAll('.art-wash-art')]
      .find((el) => el.getBoundingClientRect().width < r.width - 1) ?? null;
    const name = a.querySelector('[data-resume-name]');
    return {
      x: Math.round(r.x), y: Math.round(r.y),
      w: Math.round(r.width), h: Math.round(r.height),
      band: washRoot ? Number(washRoot.getAttribute('data-art-wash-band')) : null,
      portrait: cropLayer ? Math.round(cropLayer.getBoundingClientRect().width) : null,
      stamp,
      stampClipped,
      // Whether the NAME element exists and is laid out at all, plus whether the
      // row leaves the first line any room. A width threshold would fail a deck
      // honestly called Elf; what the 640px defect actually did was leave the
      // element with no box to be in. (No backticks here: template literal.)
      nameWidth: name ? Math.round(name.getBoundingClientRect().width) : 0,
      namePresent: name !== null,
      nameRoom: name
        ? Math.round(name.parentElement.getBoundingClientRect().width) > 0
        : false,
    };
  });
}`;

/** `2d ago` and friends, as a number of hours, so the order can be read off. */
function staleness(stamp) {
  const m = /(\d+)(h|d|w|mo) ago/.exec(stamp ?? "");
  if (/yesterday/.test(stamp ?? "")) return 24;
  if (!m) return 0;
  const n = Number(m[1]);
  return { h: n, d: n * 24, w: n * 168, mo: n * 720 }[m[2]];
}

/** The two decks the probe moved onto Home: undefined until looked for, null when either is missing. */
let rangeFixture;

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
  for (const vp of [
    { label: "desktop", width: 1440, height: 900 },
    // The band the old threshold made a third layout of: one column, and until
    // this round desktop padding with it.
    { label: "tablet", width: 1100, height: 900 },
    // 20px inside the 1180 threshold: the narrowest pair this probe draws, and
    // where the row's first line has least room for a long deck name and a long
    // stamp together. Not the narrowest pair that EXISTS — that is 1180 itself —
    // so this is representative rather than a boundary test.
    { label: "narrow-pair", width: 1200, height: 900 },
    { label: "mid", width: 900, height: 900 },
    { label: "phone", width: 390, height: 844, isMobile: true, hasTouch: true },
    // The addendum's own widths: 1300 as drawn, 1180 the narrowest pair, 360 the
    // narrowest phone it measures (F3).
    { label: "pair-1300", width: 1300, height: 900 },
    { label: "pair-1180", width: 1180, height: 900 },
    // The rail's touch width moves the pair's need from ~1168 to ~1194 of viewport (audit E6), so a
    // touch walk reads the band just above the threshold as well.
    ...(process.env.PROBE_TOUCH === "1" ? [{ label: "pair-1190", width: 1190, height: 900 }] : []),
    { label: "phone-360", width: 360, height: 780, isMobile: true, hasTouch: true },
  ]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      // PROBE_TOUCH=1 walks every width as a touch screen, where the desktop rail is 88px and
      // `main` 26px narrower (desktop nav labels audit E6): the 1180 split's stamp check is the
      // measurement that says whether the threshold still holds there. `hasTouch` is what makes
      // Chromium report `(hover: none)`; CDP's media emulation does not cover `hover`.
      hasTouch: vp.hasTouch ?? process.env.PROBE_TOUCH === "1",
      isMobile: vp.isMobile ?? false,
    });
    const page = await context.newPage();
    await signIn(page);
    if (rangeFixture === undefined) rangeFixture = await surfaceFixtures(page);
    if (rangeFixture === null) {
      console.error(
        "PREREQUISITE: this account needs a deck whose stored reading is an unanswered range, one whose reading is a single mark, and one with no reading.",
      );
      failures += 1;
      await context.close();
      break;
    }
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

    const blocks = await page.evaluate(`(${READ_BLOCKS})()`);
    const rows = await page.evaluate(`(${READ_ROWS})()`);

    // The prerequisite, stated once rather than discovered as a null three lines
    // down. This probe reads the populated Home: a first-run account draws the
    // checklist instead and has no blocks at all, and an account with fewer than
    // four decks cannot satisfy the row checks. It does not build that fixture —
    // Home renders the whole account, so a probe-owned deck would be four rows
    // among the reader's own — so it asks for an account that has one.
    // `rows.length` is capped at four by the block itself, so it cannot say
    // whether the account has MORE than four — the footer can, and the check
    // below needs it to exist or its navigation assertion never runs.
    const hasFooter = await page.evaluate(`(() => [...document.querySelectorAll('main span')]
      .some((el) => el.getClientRects().length && /^\\d+ more decks?$/.test((el.textContent ?? '').trim())))()`);
    if (rows === null || rows.length < 4 || !hasFooter) {
      console.error(
        `PREREQUISITE: ${BASE} must be signed in to an account with a collection read and MORE THAN ` +
        `four decks — at four exactly the footer is correctly absent and its link is never pressed. ` +
        `Home drew ${rows === null ? "no resume block at all" : `${rows.length} row(s)`}` +
        `${rows !== null && rows.length >= 4 && !hasFooter ? " and no footer, so the account has exactly four" : ""}.`,
      );
      failures += 1;
      await context.close();
      break;
    }

    // 1 + 2. The same blocks at every width, in the same READING order — and no
    // rail. Reading order is not `y` order: above 1180px the page is two
    // columns, and Commitments, as the whole right rail, starts higher up the
    // page than the resume block it follows. So the labels are grouped by
    // column first, which is how a reader takes them.
    const columnsOfBlocks = [...new Set(blocks.map((b) => b.x))];
    const inReadingOrder = columnsOfBlocks.flatMap((x) =>
      blocks.filter((b) => b.x === x).sort((a, b) => a.y - b.y).map((b) => b.text),
    );
    check(
      `${vp.label}: the blocks, in reading order`,
      inReadingOrder,
      ["Ready to build", "Pick up where you left off", "Commitments"],
    );
    check(
      `${vp.label}: two columns above 1180, one below`,
      columnsOfBlocks.length,
      vp.width >= 1180 ? 2 : 1,
    );
    check(
      `${vp.label}: no Your decks heading`,
      blocks.some((b) => /Your decks/.test(b.text)),
      false,
    );
    // And no rail ROWS, which the heading check alone cannot see: a rail whose
    // label was removed, or whose rows moved under another container, would pass
    // it. Every link to a DECK on this page has to be one of the four resume
    // rows — `/decks/new` is the header's CTA and `/decks` the footer's, so the
    // test is the id-shaped tail rather than the prefix.
    const strayDeckLinks = await page.evaluate(`(() => {
      const section = [...document.querySelectorAll('main h2')]
        .find((h) => (h.textContent ?? '').trim().startsWith('Pick up'))
        ?.closest('section') ?? null;
      return [...document.querySelectorAll('main a[href^="/decks/"]')]
        .filter((a) => a.getClientRects().length)
        .filter((a) => !['/decks/new', '/decks/import'].includes(a.getAttribute('href')))
        .filter((a) => !section || !section.contains(a))
        .map((a) => a.getAttribute('href'));
    })()`);
    check(`${vp.label}: no deck link outside the resume block`, strayDeckLinks, []);

    // The two CTAs. Claimed at the top of this file and asserted nowhere until
    // now: a regression that dropped either at one width — which is exactly the
    // drift this round exists to undo — passed every other check here.
    for (const [label, href] of [["New deck", "/decks/new"], ["Update collection", "/collection/replace"]]) {
      check(
        `${vp.label}: the ${label} control is on the page`,
        await onPage(page, `a[href="${href}"]:visible`).count(),
        1,
      );
    }

    // 3. Four rows, and how they are laid out.
    check(`${vp.label}: four resume rows`, rows.length, 4);
    const columns = new Set(rows.map((r) => r.x)).size;
    const lines = new Set(rows.map((r) => r.y)).size;
    if (vp.width >= 1180) {
      check(`${vp.label}: two columns`, columns, 2);
      check(`${vp.label}: two lines`, lines, 2);
    } else {
      check(`${vp.label}: one column`, columns, 1);
      check(`${vp.label}: four lines`, lines, 4);
    }

    // 4. Every row states its evidence, and the stamps agree with the order.
    check(
      `${vp.label}: every row carries a stamp`,
      rows.every((r) => /^(edited|committed|played) /.test(r.stamp ?? "")),
      true,
    );
    const ages = rows.map((r) => staleness(r.stamp));
    check(
      `${vp.label}: the stamps run oldest-last`,
      ages.every((age, i) => i === 0 || ages[i - 1] <= age),
      true,
    );

    check(
      `${vp.label}: no stamp is clipped by its row`,
      rows.filter((r) => r.stampClipped).length,
      0,
    );

    // The WORST case, which the account's own data may not contain: the longest
    // verb and the longest elapsed figure together. Written into the live rows
    // and measured, then put back — a stamp that fits `edited 2h ago` and clips
    // `committed 10mo ago` is a defect nobody would see until a deck went a year
    // without a game.
    const worstClipped = await page.evaluate(`(() => {
      const heading = [...document.querySelectorAll('main h2')]
        .find((h) => (h.textContent ?? '').trim().startsWith('Pick up'));
      const section = heading.closest('section');
      const rows = [...section.querySelectorAll('a[href^="/decks/"]')];
      const originals = [];
      for (const a of rows) {
        const el = a.querySelector('[data-resume-stamp]');
        if (el) { originals.push([el, el.textContent]); el.textContent = 'committed 10mo ago'; }
      }
      const clipped = rows.filter((a) => {
        const r = a.getBoundingClientRect();
        const el = a.querySelector('[data-resume-stamp]');
        if (!el) return true;
        const b = el.getBoundingClientRect();
        // Both edges: the stamp is right-aligned, so one too wide for the line
        // keeps its right edge inside the row and loses its LEFT to the row's
        // overflow — the failure this check exists for, invisible from the right.
        return b.right > r.right + 0.5 || b.left < r.left - 0.5 || b.width < 1;
      }).length;
      for (const [el, text] of originals) el.textContent = text;
      return clipped;
    })()`);
    check(`${vp.label}: the longest stamp fits too`, worstClipped, 0);

    // 5. The shipped row, unchanged — errata E1/E2.
    check(`${vp.label}: the band is a stated 72`, [...new Set(rows.map((r) => r.h))], [72]);
    check(`${vp.label}: every band is keyed to 72`, [...new Set(rows.map((r) => r.band))], [72]);
    // Crop-backed rows only. A commander with no art crop draws the identity
    // gradient across the band instead, which is the wash's own supported answer
    // and not a portrait of the wrong width.
    const cropped = rows.filter((r) => r.portrait !== null);
    check(
      `${vp.label}: every crop-backed portrait is 99`,
      [...new Set(cropped.map((r) => r.portrait))],
      cropped.length > 0 ? [99] : [],
    );
    if (cropped.length !== rows.length) {
      console.log(`      (${rows.length - cropped.length} row(s) drew the artless identity gradient)`);
    }

    // 7. The widths nobody drew. A name clipped to nothing is the defect this
    //    block already shipped once, at 640px, and the reason 1180 is arithmetic
    //    rather than a Tailwind stop.
    check(
      `${vp.label}: every row draws its name, in a line with room`,
      rows.every((r) => r.namePresent && r.nameRoom && r.nameWidth > 0),
      true,
    );

    // 8. The phone's floor.
    if (vp.label === "phone") {
      const short = await page.evaluate(() =>
        [...document.querySelectorAll("main a, main button")]
          .filter((b) => b.getClientRects().length)
          .map((b) => ({
            name: (b.getAttribute("aria-label") ?? b.textContent ?? "").trim().slice(0, 24),
            h: Math.round(b.getBoundingClientRect().height),
          }))
          .filter((b) => b.h < 44),
      );
      check("phone: every control clears 44px", short, []);

      // Commitments is LAST on the phone — the block you read, under the two
      // you act on. Read off the laid-out page rather than the markup order.
      check("phone: Commitments is the last block", inReadingOrder[inReadingOrder.length - 1], "Commitments");
    }

    // 6. The footer's link, pressed rather than counted. A link that renders and
    //    does not navigate is exactly what counting cannot tell apart.
    if (vp.label === "desktop" || vp.label === "phone") {
      // The footer is absent when every deck is already drawn — a figure of
      // nought is an absence, not a zero — so an account with exactly four decks
      // correctly has none. `rows.length` is 4 either way; the total is what
      // decides, and it is read off the footer's own copy where there is one.
      const all = onPage(page, 'a[href="/decks"]').filter({ hasText: /All \d+ decks/ });
      const found = await all.count();
      // `hasFooter` is read per viewport above, and the prerequisite has already
      // refused an account that draws none — so this is the footer being present
      // where it must be, rather than a branch that can excuse its absence.
      check(`${vp.label}: the footer appears exactly when decks remain`, found, hasFooter ? 1 : 0);
      // Only where there is exactly one to press. A missing or doubled footer is
      // already the failure above, and clicking into it would throw here — before
      // the summary line and before the remaining viewports ever run.
      if (found === 1) {
        await all.first().click();
        await page.waitForURL(/\/decks$/, { timeout: 10_000 });
        check(`${vp.label}: it lands on /decks`, new URL(page.url()).pathname, "/decks");
        await page.goBack({ waitUntil: "networkidle" });
      }
    }

    // 9. The bracket chip.
    const chip = await page.evaluate(`(${READ_CHIP_ROWS})()`);
    check(
      `${vp.label}: every row's three lines sit inside its band`,
      chip.rows.filter((r) => !r.linesInside).map((r) => r.name),
      [],
    );
    check(`${vp.label}: every row draws three lines`, [...new Set(chip.rows.map((r) => r.lines))], [3]);
    check(
      `${vp.label}: the chip draws marks only`,
      chip.rows.filter((r) => r.chip && r.chip.text !== "").map((r) => r.name),
      [],
    );
    check(
      `${vp.label}: the range chip is 55 and a single 28`,
      chip.rows.filter((r) => r.chip && r.chip.w !== (r.chip.range ? 55 : 28)).map((r) => [r.name, r.chip.w]),
      [],
    );
    check(`${vp.label}: the range deck is on Home`, chip.rows.some((r) => r.chip?.range), true);
    check(`${vp.label}: a single-mark deck is on Home`, chip.rows.some((r) => r.chip && !r.chip.range), true);
    check(
      `${vp.label}: nothing but the commander shrinks on line two`,
      chip.rows.filter((r) => !r.platesWhole).map((r) => r.name),
      [],
    );
    check(
      `${vp.label}: the count group is never cut`,
      chip.rows.filter((r) => !r.countWhole).map((r) => r.name),
      [],
    );
    // The count's WORST case, the way the stamp's is measured above: a count long enough that the
    // bar has to give most of its width. The count group is `flex-none`, so the bar gives and the
    // count stays whole; a shrinkable group would split the loss and cut the figure. Written into
    // the live rows and put back. At the narrow widths this is the only reading that tells the two
    // apart, because the real count always leaves the bar room.
    // An INVARIANCE rather than a mutation-proved case: the bar grows from a zero basis, so a
    // count that fits the line is never squeezed whether or not its group is `flex-none`, and
    // dropping that class measured nothing. It catches a future change that gives the bar a basis.
    const worstCount = await page.evaluate(`(() => {
      const heading = [...document.querySelectorAll('main h2')]
        .find((h) => (h.textContent ?? '').trim().startsWith('Pick up'));
      const rows = [...heading.closest('section').querySelectorAll('a[href^="/decks/"]')];
      const cut = [];
      for (const a of rows) {
        const count = a.querySelector('[data-resume-count]');
        const line = count.parentElement;
        const before = count.innerHTML;
        // Most of the line, less the gap and 20px of bar: the widest count that still fits whole.
        count.innerHTML = '<span></span>';
        const probe = count.firstElementChild;
        probe.textContent = '99 / 99';
        while (probe.getBoundingClientRect().width < line.getBoundingClientRect().width - 10 - 20) {
          probe.textContent += ' ·';
        }
        const r = a.getBoundingClientRect();
        const b = count.getBoundingClientRect();
        if (count.scrollWidth > count.clientWidth + 0.5 || b.right > r.right + 0.5) cut.push(a.querySelector('[data-resume-name]').textContent);
        count.innerHTML = before;
      }
      return cut;
    })()`);
    check(`${vp.label}: a count that takes the bar's room stays whole`, worstCount, []);
    check(
      `${vp.label}: every bar keeps 80px or more`,
      chip.rows.filter((r) => r.barW < 80).map((r) => [r.name, r.barW]),
      [],
    );
    // N4: in a pair, the deck names are level whether or not a row carries a chip.
    const pairs = Object.values(Object.groupBy(chip.rows, (r) => r.y)).filter((g) => g.length === 2);
    const mixed = pairs.filter((g) => Boolean(g[0].chip) !== Boolean(g[1].chip));
    // The fixture puts a mixed pair first, so on any width that draws pairs its absence is a failure.
    if (pairs.length > 0) check(`${vp.label}: a pair mixes a chip row with a chip-less one`, mixed.length > 0, true);
    check(
      `${vp.label}: deck names in a pair are level`,
      pairs.filter((g) => Math.abs(g[0].nameTop - g[1].nameTop) > 0.5).map((g) => g.map((r) => r.name)),
      [],
    );

    await page.screenshot({ path: `/tmp/home-parity-${vp.label}.png`, fullPage: true });
    await context.close();
  }

  await browser.close();
  } finally {
    // Put the stamp back, whatever happened above: the fixture moved a real deck
    // to the head of this account's Home.
    if (rangeFixture) await restoreHeld();
  }
  console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

// WHERE THIS PROBE MAY WRITE. It moves `last_edited_at` on three real decks, so it refuses any
// database that is not a scratch one before the first write, by the Neon BRANCH it reports
// rather than by the URL (a copied URL names the wrong database as readily as the right one).
// Fail closed: an unreadable branch is refused too.
const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

async function refuseSharedDatabase() {
  const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH || process.env.VERCEL_ENV === "production") {
    throw new Error(
      `probe:home writes deck stamps and refuses branch ${branch ?? "(unknown)"}; point DATABASE_URL at local-dev or a scratch branch.`,
    );
  }
}

// The stamps it moved, held ON DISK before the first write, so a run killed before its `finally`
// is put right by the next run rather than leaving three decks reordered on Home. Held as TEXT: the
// column is microsecond-precise and a JS Date is not, and `touchDeck`'s guards compare it as text.
const HOLD = path.join(os.tmpdir(), "the99-probe-home-hold.json");

async function restoreHeld() {
  let held;
  try {
    held = JSON.parse(readFileSync(HOLD, "utf8"));
  } catch {
    return;
  }
  let ok = true;
  // Each on its own, so one failing cannot skip the others.
  for (const f of held) {
    try {
      await sql`update decks set last_edited_at = ${f.lastEditedAt}::timestamp where id = ${f.id}`;
      console.log(`      (restored ${f.id}'s last_edited_at)`);
    } catch (error) {
      ok = false;
      failures += 1;
      console.error(`RESTORE FAILED for ${f.id}: set last_edited_at back to ${f.lastEditedAt}`, error);
    }
  }
  // Kept on any failure, so the next run tries again.
  if (ok) rmSync(HOLD, { force: true });
}

/**
 * Puts the three decks the chip checks need among Home's four rows, by making them the most
 * recently edited: a deck whose stored reading is an unanswered RANGE (the width the row is sized
 * for; an answered range draws its answer alone), a deck with NO reading touched a second later so
 * the first desktop pair mixes a chip row with a chip-less one (N4), and a deck whose reading is a
 * SINGLE mark, so the 28px check measures something. Any of the three missing refuses the run.
 */
async function surfaceFixtures(page) {
  await refuseSharedDatabase();
  await restoreHeld();
  const userId = await page.evaluate(() => window.Clerk.user.id);
  const [range] = await sql`
    select d.id, d.last_edited_at::text as last_edited_at
    from decks d join deck_profiles p on p.deck_id = d.id
    where d.user_id = ${userId}
      and cardinality(p.permits) = 2
      and (d.declared_bracket is null or not (d.declared_bracket = any(p.permits)))
    order by d.id
    limit 1`;
  const [bare] = await sql`
    select d.id, d.last_edited_at::text as last_edited_at
    from decks d left join deck_profiles p on p.deck_id = d.id
    where d.user_id = ${userId} and p.deck_id is null
    order by d.id
    limit 1`;
  const [single] = await sql`
    select d.id, d.last_edited_at::text as last_edited_at
    from decks d join deck_profiles p on p.deck_id = d.id
    where d.user_id = ${userId} and cardinality(p.permits) = 1
    order by d.id
    limit 1`;
  if (!range || !bare || !single) return null;
  const fixtures = [range, bare, single].map((r) => ({ id: r.id, lastEditedAt: r.last_edited_at }));
  writeFileSync(HOLD, JSON.stringify(fixtures));
  await sql`update decks set last_edited_at = now() where id = ${range.id}`;
  await sql`update decks set last_edited_at = now() - interval '1 second' where id = ${bare.id}`;
  await sql`update decks set last_edited_at = now() - interval '2 seconds' where id = ${single.id}`;
  return fixtures;
}

/** Each resume row's three lines, its chip, its plates, its count and its bar. */
const READ_CHIP_ROWS = `() => {
  const heading = [...document.querySelectorAll('main h2')]
    .find((h) => (h.textContent ?? '').trim().startsWith('Pick up'));
  const section = heading.closest('section');
  const rows = [...section.querySelectorAll('a[href^="/decks/"]')].map((a) => {
    const r = a.getBoundingClientRect();
    const text = a.querySelector('[data-resume-text]');
    const lines = [...text.children].filter((el) => el.getClientRects().length && !el.classList.contains('sr-only'));
    const linesInside = lines.every((el) => {
      const b = el.getBoundingClientRect();
      return b.top >= r.top - 0.5 && b.bottom <= r.bottom + 0.5 && b.height > 0;
    });
    const chipEl = a.querySelector('[data-testid="bracket-chip"]');
    const chipBox = chipEl?.getBoundingClientRect();
    // Line two's plates group: the pill, and the chip when there is one. Whole means laid out at
    // its content width: nothing in it gave way to the commander.
    const plates = lines[1]?.firstElementChild;
    // By EDGE, against the row: the group is flex-none, so its own scroll and client widths
    // agree on every build, and a pill and chip pushed past the row's right edge would be cut by
    // the row's overflow while still reading whole. Its right edge must sit inside the row, and
    // left of the commander beside it.
    const pb = plates?.getBoundingClientRect();
    const beside = plates?.nextElementSibling?.getBoundingClientRect();
    const platesWhole = plates
      ? pb.right <= r.right + 0.5 && (!beside || pb.right <= beside.left + 0.5) && pb.width > 0
      : false;
    const count = a.querySelector('[data-resume-count]');
    const cb = count?.getBoundingClientRect();
    const countWhole = count
      ? count.scrollWidth <= count.clientWidth + 0.5 && cb.right <= r.right + 0.5 && cb.width > 0
      : false;
    const bar = a.querySelector('[data-resume-bar]');
    const name = a.querySelector('[data-resume-name]');
    return {
      name: (name?.textContent ?? '').trim(),
      nameTop: name ? name.getBoundingClientRect().top : 0,
      y: Math.round(r.y),
      lines: lines.length,
      linesInside,
      chip: chipEl
        ? {
            // The chip's own text, less the marks' numerals: the name is what "marks only" drops.
            text: [...chipEl.children].filter((c) => c.getAttribute('data-testid') !== 'bracket-mark')
              .map((c) => c.textContent).join('').trim(),
            w: Math.round(chipBox.width),
            range: (chipEl.getAttribute('data-bracket') ?? '').includes('-'),
          }
        : null,
      platesWhole,
      countWhole,
      barW: bar ? Math.round(bar.getBoundingClientRect().width) : 0,
    };
  });
  return { rows };
}`;
