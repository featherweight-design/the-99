// The card note, measured in a real browser at 1300x900 and 390x844, on all three of the deck
// page's add surfaces — the Consider tile, the top-off row and the quick-add result row.
//
// FOUR RULINGS HERE ARE FACTS ABOUT LAID-OUT GEOMETRY, and jsdom produces none of them.
//
// THE NOTE IS INSIDE THE ROW'S BOX. `HANDOFF.md` §Geometry puts it below the row's own line
// and inside its box, above a 1px rule. Drawing it after the box instead leaves markup a
// component test cannot tell apart — the same elements in the same order — while the reader
// sees a sentence hanging under a bordered row with nothing around it. What separates the two
// is whether the note's rect lies inside the box's, which needs a layout engine.
//
// THE ROW RESERVES NO HEIGHT FOR A NOTE IT IS NOT DRAWING. Most of a 480-candidate pool
// carries no fact, so a reserved slot would be the commonest rendering on the surface. The
// unit tests prove the component returns null; only a browser proves the row beside it did
// not grow anyway.
//
// THE BODY'S TYPE IS 12.5px ON A ROW AND 11.5px ON A TILE, and the label is 9px mono. Read
// RESOLVED rather than off the class list: a Tailwind arbitrary value that does not compile
// leaves the class string reading correctly and the text at its inherited size.
//
// THE NOTE INDENTS TO THE NAME COLUMN. Measured against the row's own name, not against a
// constant — 27px is what the handoff states for the 390 row, and what makes it right is that
// it clears the tick box, which is a laid-out width.
//
// THE FACT MARKS ARE MEASURED HERE TOO, because they are the same slot's other half: §C2 puts
// the three glyphs on both of these surfaces, the note says the count and the rule, and a
// reader meets the silhouette first. A MARKED TILE IS ONLY REACHABLE WITH THE SHELVES
// EXPANDED — at the default cap every tile on the fixture deck is a tutor, which has no glyph
// by Round 2's design, so a run taking the first screen reports the mount missing on a build
// that draws it. The probe presses every `Show all` before it looks.
//
// A RUN THAT FINDS NO NOTE FAILS. The fixture is whatever the account's pool happens to hold,
// and a check that counted zero and passed would be a probe measuring nothing — the failure
// `probe:commander-availability` carried for its whole life before it was found.
//
// Makes no writes. Signs in through Clerk's dev instance — see the local-auth note in memory.
// Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3011 node scripts/probe-card-note.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

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

/** A deck with open slots, which is the only state that draws the top-off strip. */
async function findDeck(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3_000);
  return page.evaluate(() => {
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

async function openList(page) {
  const door = onPage(page, 'button[aria-label^="Choose the cards for the last"]').first();
  if ((await door.count()) === 0) return false;
  await door.click();
  await page.waitForTimeout(1_500);
  return true;
}

/**
 * The shared reading for one note: where it sits, what it is set in, and what its box does.
 *
 * `visible` is DEFENSIVE rather than load-bearing, and says so rather than inventing a reason:
 * the top-off row picks its phone and desktop parts with `useIsDesktop`, so only one of them
 * is mounted at a time and nothing here is currently filtered out. It stays because every
 * reading below is a rect, and a box with no layout reports zeros that look like a defect.
 */
const READ_NOTES = (boxSelector) => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const out = [];
  for (const note of document.querySelectorAll('main [data-testid="card-note"]')) {
    if (!visible(note)) continue;
    const box = note.closest(boxSelector);
    if (!box) continue;
    const paragraphs = [...note.querySelectorAll("p")];
    const label = paragraphs[0];
    const body = paragraphs[1];
    if (!label || !body) continue;
    const noteRect = note.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    const labelStyle = getComputedStyle(label);
    const bodyStyle = getComputedStyle(body);
    const noteStyle = getComputedStyle(note);
    out.push({
      text: body.textContent ?? "",
      labelText: label.textContent ?? "",
      labelPx: Number.parseFloat(labelStyle.fontSize),
      labelFamily: labelStyle.fontFamily,
      labelTransform: labelStyle.textTransform,
      bodyPx: Number.parseFloat(bodyStyle.fontSize),
      // The 1px rule above the note. Read as a painted border rather than as a class.
      ruleTop: noteStyle.borderTopWidth,
      inside:
        noteRect.left >= boxRect.left - 0.5 &&
        noteRect.right <= boxRect.right + 0.5 &&
        noteRect.bottom <= boxRect.bottom + 0.5,
      // The note's own box spans the host's content width; the INDENT is padding inside it,
      // so the thing to measure is where the text starts. Reading the box's left edge
      // measures the host's padding and reports it as the note's, which is what the first
      // version of this check did — 10px against a 27px rule, on a build that was correct.
      indent: Math.round(label.getBoundingClientRect().left - boxRect.left),
      textLeft: label.getBoundingClientRect().left,
      sentences: paragraphs.length - 1,
    });
  }
  return out;
};

/**
 * Every host box of a kind, measured against ITS OWN row line.
 *
 * The figure is the box's height MINUS the height of the line inside it — the room the box
 * gives to anything below that line, which on this surface is the note and nothing else.
 * Normalising that way is the whole of the reading: a phone row's own height ranges 73 to
 * 92px purely on how a card's name wraps, so comparing a tall un-noted row against a short
 * noted one can fail a build that is correct, which is a probe manufacturing a defect.
 */
const READ_BOXES = (boxSelector) => {
  const out = [];
  for (const box of document.querySelectorAll(`main ${boxSelector}`)) {
    const r = box.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const line = box.firstElementChild;
    if (!line) continue;
    out.push({
      // Rounded to whole pixels: sub-pixel layout differences between two rows are not the
      // subject, and a 0.5px drift would otherwise read as reserved space.
      below: Math.round(r.height - line.getBoundingClientRect().height),
      noted: box.querySelector('[data-testid="card-note"]') !== null,
    });
  }
  return out;
};

function checkNotes(where, notes, { bodyPx, density }) {
  if (notes.length === 0) {
    report(`${where} · a note on screen`, false, "none drawn — NOT a pass, the check has no subject");
    return;
  }
  report(`${where} · notes drawn`, true, `${notes.length}`);

  const outside = notes.filter((n) => !n.inside);
  report(
    `${where} · every note is inside its host's box`,
    outside.length === 0,
    outside.length === 0 ? "all within" : `${outside.length} hanging outside`,
  );

  const ruleless = notes.filter((n) => Number.parseFloat(n.ruleTop) < 0.5);
  report(
    `${where} · the 1px rule above it is painted`,
    ruleless.length === 0,
    `border-top ${notes[0].ruleTop}`,
  );

  const wrongBody = notes.filter((n) => Math.abs(n.bodyPx - bodyPx) > 0.26);
  report(
    `${where} · the body is ${bodyPx}px at ${density} density`,
    wrongBody.length === 0,
    `read ${[...new Set(notes.map((n) => n.bodyPx))].join(", ")}px`,
  );

  const wrongLabel = notes.filter(
    (n) => Math.abs(n.labelPx - 9) > 0.26 || n.labelTransform !== "uppercase" || !/mono/i.test(n.labelFamily),
  );
  report(
    `${where} · the label is 9px mono uppercase`,
    wrongLabel.length === 0,
    `${notes[0].labelPx}px · ${notes[0].labelTransform} · ${notes[0].labelFamily.split(",")[0]}`,
  );

  // The label is the same string on every surface and every fact. A host composing its own
  // would drift from the copy module, which is what `check:copy-drift` cannot see in a
  // rendered tree.
  const labels = [...new Set(notes.map((n) => n.labelText.trim()))];
  report(
    `${where} · one label, on every note`,
    labels.length === 1 && labels[0] === "About this card",
    labels.join(" / "),
  );

  // The cap is the RULE's, and it is the one thing a host can get wrong by passing the other
  // density. A tile drawing two facts' worth of sentences is the row's reading on a tile.
  const over = notes.filter((n) => n.sentences > (density === "tile" ? 2 : 3));
  report(
    `${where} · no note draws more than its density allows`,
    over.length === 0,
    `max ${Math.max(...notes.map((n) => n.sentences))} sentence(s)`,
  );
}

/**
 * The row's own MINIMUM, unchanged by the feature.
 *
 * The note made the box a column, so its `min-h` had to move to the line inside it — and a
 * border-box minimum carries the box's own 1px border, which the first split dropped. Two
 * pixels on a row drawn 38 times is 76px of list, and nothing in the markup says it moved.
 *
 * Read as the MINIMUM rather than as a painted height, because only the desktop row sits at
 * its own floor: the phone row is two lines by design and measures 73 to 92px, so a height
 * assertion there would be a fact about the longest card name in the pool. The sum the check
 * makes — the line's `min-height` plus the box's padding and border — is exactly the
 * arithmetic the finding named, and it is read RESOLVED from both elements rather than added
 * up from the class strings that produced it.
 */
const READ_ROW_MINIMUM = () => {
  const box = document.querySelector("main [data-top-off-row]");
  if (!box) return null;
  const line = box.firstElementChild;
  if (!line) return null;
  const b = getComputedStyle(box);
  const l = getComputedStyle(line);
  const px = (v) => Number.parseFloat(v) || 0;
  return {
    line: px(l.minHeight),
    padding: px(b.paddingTop) + px(b.paddingBottom),
    border: px(b.borderTopWidth) + px(b.borderBottomWidth),
  };
};

function checkRowMinimum(where, parts, expected) {
  if (parts === null) {
    report(`${where} · a row to measure`, false, "none — NOT a pass");
    return;
  }
  const total = parts.line + parts.padding + parts.border;
  report(
    `${where} · the row's minimum is still ${expected}px`,
    Math.abs(total - expected) <= 0.5,
    `${parts.line} line + ${parts.padding} padding + ${parts.border} border = ${total}px`,
  );
}

function checkNoReservedHeight(where, boxes) {
  const plain = boxes.filter((b) => !b.noted);
  const noted = boxes.filter((b) => b.noted);
  if (plain.length === 0 || noted.length === 0) {
    report(
      `${where} · a noted and an un-noted host side by side`,
      false,
      `${noted.length} noted, ${plain.length} not — NOT a pass, the comparison has no subject`,
    );
    return;
  }
  // Every un-noted host gives the SAME room below its line as every other, and a noted one
  // gives more. Equality alone would pass on a build that reserved the slot on every row;
  // "more" alone would pass on one where the room varied for unrelated reasons.
  const plainRoom = [...new Set(plain.map((b) => b.below))];
  const tallestPlain = Math.max(...plainRoom);
  const shortestNoted = Math.min(...noted.map((b) => b.below));
  report(
    `${where} · a host with no fact reserves no height for a note`,
    plainRoom.length === 1 && tallestPlain < shortestNoted,
    `un-noted ${plainRoom.join(", ")}px below the line, noted from ${shortestNoted}px`,
  );
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();

  try {
    for (const width of [1300, 390]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
      });
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

      // ── The Consider tile ────────────────────────────────────────────────
      //
      // Reached by its tab rather than by a URL: the panel is component state, and a URL
      // sweep cannot see a surface reached by a press.
      const considerTab = onPage(page, "#tab-consider").first();
      if ((await considerTab.count()) === 0) {
        report(`${width}px · the Consider tab`, false, "not on the page — NOT a pass");
      } else {
        await considerTab.click();
        await page.waitForTimeout(1_500);
        const notes = await page.evaluate(READ_NOTES, '[data-testid="suggestion-tile"]');
        checkNotes(`${width}px · Consider tile`, notes, { bodyPx: 11.5, density: "tile" });
        // NO RESERVED-HEIGHT CHECK ON THE TILE, and the omission is the finding rather than a
        // gap. Consider is a GRID, and `deck-grid`'s own shipped ruling is that tiles in a row
        // end level — so a noted tile and an un-noted one beside it are the same height by
        // design, and a difference check there measures the grid rather than the note. The
        // rule the handoff states is about the ROW, which is checked below.

        // THE ADDS IN A GRID ROW STAY LEVEL, whether or not a tile in that row carries a
        // note. This is the check that caught this feature's own regression: the note is
        // ~30px of content on one tile in six, and without `mt-auto` on the Add it put the
        // controls in a row 90 to 91px apart on desktop and 91px apart at 390. The tiles
        // themselves still ended level — they are grid items — which is exactly what makes a
        // ragged row of Adds inside them read as a mistake rather than as a layout.
        //
        // Rows are grouped by MEASURED top edge, never by index: the column count is a
        // function of the viewport, so a probe slicing the list into sixes would compare
        // tiles from two different rows the moment the grid reflowed.
        const addRows = await page.evaluate(() => {
          const rows = new Map();
          for (const tile of document.querySelectorAll('main [data-testid="suggestion-tile"]')) {
            const controls = [...tile.querySelectorAll("button, span[aria-disabled]")];
            const add = controls.at(-1);
            if (!add) continue;
            const key = Math.round(tile.getBoundingClientRect().top);
            if (!rows.has(key)) rows.set(key, []);
            rows.get(key).push({
              addTop: Math.round(add.getBoundingClientRect().top),
              noted: tile.querySelector('[data-testid="card-note"]') !== null,
            });
          }
          const out = [];
          for (const items of rows.values()) {
            if (items.length < 2) continue;
            const tops = items.map((i) => i.addTop);
            out.push({
              spread: Math.max(...tops) - Math.min(...tops),
              noted: items.filter((i) => i.noted).length,
              n: items.length,
            });
          }
          return out;
        });
        // A run where no MIXED row exists has not measured this at all — every tile carrying
        // a note, or none of them, lines up on any build.
        const mixed = addRows.filter((r) => r.noted > 0 && r.noted < r.n);
        report(
          `${width}px · Consider tile · the Adds stay level in a row holding a note`,
          mixed.length > 0 && mixed.every((r) => r.spread <= 1),
          mixed.length === 0
            ? `no row mixes a noted tile with an un-noted one — NOT a pass, nothing measured`
            : `max spread ${Math.max(...mixed.map((r) => r.spread))}px across ${mixed.length} mixed row(s)`,
        );

        // THE NOTE IS IN THE TILE'S FOOT, above the Add. Asserted by geometry rather than by
        // document order: a tile whose Add floated above the note would read correctly in the
        // markup and wrongly on screen.
        const footOrder = await page.evaluate(() => {
          const out = [];
          for (const tile of document.querySelectorAll('main [data-testid="suggestion-tile"]')) {
            const note = tile.querySelector('[data-testid="card-note"]');
            // THE LAST control in the tile, not the first match of a comma list — which is
            // what `querySelector("button:last-of-type, span[aria-disabled]")` returns, and
            // it resolved to the art's own detail trigger. That read `0 of 3` on a build
            // whose note is rendered above the Add in the markup.
            const controls = [...tile.querySelectorAll("button, span[aria-disabled]")];
            const add = controls.at(-1);
            if (!note || !add) continue;
            out.push(note.getBoundingClientRect().bottom <= add.getBoundingClientRect().top + 0.5);
          }
          return out;
        });
        if (footOrder.length > 0) {
          report(
            `${width}px · Consider tile · the note sits above the Add`,
            footOrder.every(Boolean),
            `${footOrder.filter(Boolean).length} of ${footOrder.length}`,
          );
        }

        // THE FACT MARKS, §C2's other half. Expanded first: see the header — at the default
        // cap this deck's shelves are all tutors, which carry no glyph.
        for (const btn of await onPage(page, 'button[aria-label^="Show all"]').all()) {
          await btn.click({ timeout: 4000 }).catch(() => {});
        }
        await page.waitForTimeout(1200);
        const tileMark = await page.evaluate(() => {
          const tile = [...document.querySelectorAll('main [data-testid="suggestion-tile"]')]
            .find((t) => t.querySelector("[data-testid^='card-fact-']"));
          if (!tile) return null;
          const mark = tile.querySelector("[data-testid^='card-fact-']");
          const name = [...tile.querySelectorAll("button")].find((b) =>
            b.className.includes("font-semibold"));
          if (!name) return null;
          const m = mark.getBoundingClientRect();
          const n = name.getBoundingClientRect();
          return {
            // §C2: "own line above the name". Its own LINE, so the mark's foot clears the
            // name's top rather than merely sitting left of it.
            aboveName: m.bottom <= n.top + 1,
            px: Math.round(m.width),
            // The glyph carries its own name here: the tile composes no accessible name of
            // its own, so hiding it would delete the fact rather than relocate it.
            spoken: mark.getAttribute("aria-hidden") !== "true",
          };
        });
        if (tileMark === null) {
          report(
            `${width}px · Consider tile · a marked tile`,
            false,
            "none across every expanded shelf — NOT a pass, the check has no subject",
          );
        } else {
          report(
            `${width}px · Consider tile · the mark is 16px on its own line above the name`,
            tileMark.aboveName && tileMark.px === 16,
            `${tileMark.px}px, above the name: ${tileMark.aboveName}`,
          );
          report(
            `${width}px · Consider tile · the mark speaks its own name`,
            tileMark.spoken,
            tileMark.spoken ? "role=img with a label" : "aria-hidden, and nothing else says it",
          );
        }

        // THE KEY. A wordless mark is legal only where something glosses it — the rule the
        // deck-status marks were retired in a day for breaking. Unconditional on this surface,
        // so it is asserted with no marked card required.
        const tileKey = await page.evaluate(() => {
          const key = document.querySelector('main [role="group"][aria-label*="ark"]');
          return key ? (key.textContent ?? "") : null;
        });
        report(
          `${width}px · Consider tile · the key glosses every glyph drawn here`,
          tileKey !== null
            && ["game changer", "mass land denial", "extra turns", "tutor", "Two-card combo"]
              .every((w) => tileKey.includes(w)),
          tileKey === null ? "no key on the panel" : "all five words present",
        );
      }

      // ── The quick-add result row (PR 8c) ────────────────────────────────
      //
      // Measured BEFORE the top-off list opens, because at 390 an open list takes the dock's
      // slot and the bar is hidden. Searched with `Owned only` off and for `tutor`, so the
      // results are cards the note has something to say about whatever the account owns: a
      // run whose results carry no fact reports that it measured nothing.
      const deckTabForBar = onPage(page, "#tab-deck").first();
      if ((await deckTabForBar.count()) > 0) {
        await deckTabForBar.click();
        await page.waitForTimeout(800);
      }
      const bar = onPage(page, 'input[role="combobox"]').first();
      if ((await bar.count()) === 0) {
        report(`${width}px · the quick-add field`, false, "not on the page — NOT a pass");
      } else {
        await bar.focus();
        const owned = onPageRole(page, "checkbox", /only cards you own/i).first();
        // `force`, because the input is the visually hidden peer of the drawn switch — the
        // switch's own box is what intercepts a pointer.
        if ((await owned.count()) > 0) await owned.setChecked(false, { force: true });
        await bar.fill("tutor");
        await page
          .locator('main [role="option"]')
          .first()
          .waitFor({ state: "attached", timeout: 15_000 })
          .catch(() => {});
        await page.waitForTimeout(800);

        const barNotes = await page.evaluate(READ_NOTES, '[role="option"]');
        checkNotes(`${width}px · quick-add row`, barNotes, { bodyPx: 12.5, density: "row" });

        // The row's own line is its first child — the same reading `READ_BOXES` makes for
        // the top-off row, so the two hosts are held to one rule.
        checkNoReservedHeight(
          `${width}px · quick-add row`,
          await page.evaluate(READ_BOXES, '[role="option"]'),
        );

        const barGeometry = await page.evaluate(() => {
          const out = { indents: [], marks: [] };
          for (const option of document.querySelectorAll('main [role="option"]')) {
            const name = option.querySelector('[data-testid="search-row-name"]');
            if (!name) continue;
            const box = option.getBoundingClientRect();
            // The note's LABEL against the row line's own left edge — both laid out, neither a
            // constant. This host is NOT indented (§C gives the indent to the top-off row
            // alone), so the label starts where the row's first line does.
            const label = option.querySelector('[data-testid="card-note"] p');
            if (label) {
              out.indents.push({
                label: Math.round(label.getBoundingClientRect().left - box.left),
                edge: Math.round(option.firstElementChild.getBoundingClientRect().left - box.left),
              });
            }
            const mark = option.querySelector("[data-testid^='card-fact-']");
            if (mark) {
              // The text's own end, via a Range — see the top-off row's reading below for why
              // an element's rect is not the measure.
              const range = document.createRange();
              range.selectNodeContents(name);
              const text = range.getBoundingClientRect();
              const m = mark.getBoundingClientRect();
              out.marks.push({
                sameLine: Math.abs(m.top + m.height / 2 - (text.top + text.height / 2)) < 6,
                px: Math.round(m.width),
                gap: Math.round(m.left - text.right),
                name: (name.textContent ?? "").trim(),
              });
            }
          }
          return out;
        });

        if (barGeometry.indents.length > 0) {
          const off = barGeometry.indents.filter((i) => Math.abs(i.label - i.edge) > 1);
          report(
            `${width}px · quick-add row · the note is flush with the row's content edge`,
            off.length === 0,
            `label at ${[...new Set(barGeometry.indents.map((i) => i.label))].join(", ")}px · ` +
              `row line at ${[...new Set(barGeometry.indents.map((i) => i.edge))].join(", ")}px`,
          );
        }

        if (barGeometry.marks.length === 0) {
          report(
            `${width}px · quick-add row · a marked row`,
            false,
            "none among the results — NOT a pass, the check has no subject",
          );
        } else {
          const bad = barGeometry.marks.filter(
            (m) => !m.sameLine || m.px !== 16 || m.gap < 0 || m.gap > 24,
          );
          const first = barGeometry.marks[0];
          report(
            `${width}px · quick-add row · the mark is 16px, on the name's line and beside its text`,
            bad.length === 0,
            bad.length === 0
              ? `${barGeometry.marks.length} marked · ${first.gap}px past "${first.name}"`
              : `${bad[0].px}px · ${bad[0].gap}px past "${bad[0].name}" · same line: ${bad[0].sameLine}`,
          );
        }

        // THE MARK'S TOOLTIP IS NOT CLIPPED BY THE RESULTS SCROLLER. The bubble is absolute
        // inside its mark and the results are their own `overflow-y-auto` box, so a bubble
        // drawn above a mark on the list's FIRST row is cut off by that box's top edge.
        //
        // The first row is reached by SEARCHING it there — `mystical tutor` returns one card,
        // a game changer — never by scrolling: the `tutor` list is too short to scroll, so a
        // scroll to the marked row moved nothing and the first version of this check read a
        // bubble 117px clear of the edge and passed a build that clips. Desktop only: a coarse
        // pointer draws no tooltip at all.
        if (width === 1300) {
          await bar.fill("mystical tutor");
          await page.waitForTimeout(1_500);
          const firstMark = onPage(page, '[role="option"]').first().locator("[data-testid^='card-fact-']").first();
          if ((await firstMark.count()) === 0) {
            report(`${width}px · quick-add row · a marked FIRST row`, false, "none — NOT a pass");
          } else {
            await firstMark.hover();
            await page.waitForTimeout(700);
            const tip = await page.evaluate(() => {
              const option = document.querySelector('main [role="option"]');
              // The bubble is portalled to the body, so it is found there, not in the option.
              const bubble = document.querySelector('[data-testid="fact-tooltip"]');
              if (!option || !bubble) return null;
              let scroller = option.parentElement;
              while (scroller && getComputedStyle(scroller).overflowY === "visible") {
                scroller = scroller.parentElement;
              }
              const b = bubble.getBoundingClientRect();
              const s = scroller.getBoundingClientRect();
              return {
                side: bubble.getAttribute("data-side"),
                top: Math.round(b.top - s.top),
                bottom: Math.round(s.bottom - b.bottom),
              };
            });
            report(
              `${width}px · quick-add row · the first row's mark tooltip is inside the scroller`,
              tip !== null && tip.top >= 0 && tip.bottom >= 0,
              tip === null
                ? "no bubble opened — NOT a pass"
                : `opened ${tip.side} · ${tip.top}px under the scroller's top · ${tip.bottom}px above its foot`,
            );
            await page.mouse.move(0, 0);
          }
        }

        // Spoken in the OPTION's own name, which is where a listbox option is heard.
        const barSpoken = await page.evaluate(() =>
          [...document.querySelectorAll('main [role="option"]')]
            .filter((o) => o.querySelector('[data-testid="card-note"]'))
            .map((o) => {
              const note = o.querySelector('[data-testid="card-note"]');
              const body = note.querySelectorAll("p")[1];
              return {
                hidden: note.getAttribute("aria-hidden") === "true",
                inName: (o.getAttribute("aria-label") ?? "").includes((body?.textContent ?? "").trim()),
              };
            }),
        );
        report(
          `${width}px · quick-add row · the drawn note is hidden and spoken in the option's name`,
          barSpoken.length > 0 && barSpoken.every((s) => s.hidden && s.inName),
          `${barSpoken.filter((s) => s.hidden && s.inName).length} of ${barSpoken.length}`,
        );

        await bar.fill("");
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
      }

      // ── The top-off row ──────────────────────────────────────────────────
      const deckTab = onPage(page, "#tab-deck").first();
      if ((await deckTab.count()) > 0) {
        await deckTab.click();
        await page.waitForTimeout(1_000);
      }
      if (!(await openList(page))) {
        report(`${width}px · the strip's door`, false, "not on the page — NOT a pass");
        await context.close();
        continue;
      }

      const rowNotes = await page.evaluate(READ_NOTES, "[data-top-off-row]");
      checkNotes(`${width}px · top-off row`, rowNotes, { bodyPx: 12.5, density: "row" });
      const rowBoxes = await page.evaluate(READ_BOXES, "[data-top-off-row]");
      checkNoReservedHeight(`${width}px · top-off row`, rowBoxes);
      checkRowMinimum(
        `${width}px · top-off row`,
        await page.evaluate(READ_ROW_MINIMUM),
        width === 390 ? 52 : 34,
      );

      // THE ROW'S MARKS, inline AFTER the name and on its line — the placement that was wrong
      // at 390 before it was measured: mounted once outside the tick's label, the glyph landed
      // on the phone's second line, 73px from the row's left against a name ending at 251px.
      // Read as a relation to the laid-out name at each width, never as a constant.
      const rowMark = await page.evaluate(() => {
        const row = [...document.querySelectorAll("main [data-top-off-row]")]
          .find((r) => r.querySelector("[data-testid^='card-fact-']"));
        if (!row) return null;
        const mark = row.querySelector("[data-testid^='card-fact-']");
        const nameEl = row.querySelector('[data-testid="top-off-name"]');
        // THE TEXT'S OWN END, via a Range over the name's contents — never the element's
        // rect. The name grows to fill its cell, so its BOX ends wherever the column does:
        // the first version of this check read `m.left - n.right` and reported a healthy
        // 10px for every row while the glyph sat 535px past the end of `Mu Yanling`. A gap
        // measured against a grown box is satisfied by construction for any mark placed
        // after it, and only `sameLine` was telling two builds apart.
        const range = document.createRange();
        range.selectNodeContents(nameEl);
        const text = range.getBoundingClientRect();
        const m = mark.getBoundingClientRect();
        return {
          sameLine: Math.abs(m.top - text.top) < 12,
          px: Math.round(m.width),
          gap: Math.round(m.left - text.right),
          name: (nameEl.textContent ?? "").trim(),
        };
      });
      if (rowMark === null) {
        report(
          `${width}px · top-off row · a marked row`,
          false,
          "none in the pool — NOT a pass, the check has no subject",
        );
      } else {
        // 24px is generous against the 7px gap the group sets, and tight enough that the
        // pre-wrapper placement — 87px at 390, 535px at 1300 — fails at either width.
        report(
          `${width}px · top-off row · the mark is 16px, on the name's line and beside its text`,
          rowMark.sameLine && rowMark.px === 16 && rowMark.gap >= 0 && rowMark.gap <= 24,
          `${rowMark.px}px · ${rowMark.gap}px past the end of "${rowMark.name}" · same line: ${rowMark.sameLine}`,
        );
      }

      if (rowNotes.length > 0) {
        // INDENTED TO THE NAME COLUMN. The handoff states 27px for the 390 row; what makes
        // that figure right is that it clears the 26px tick box, so the check is stated as a
        // floor against the tick rather than as the constant, and the constant is printed.
        // THE PROPERTY, never the constant. The handoff's 27px is derived from a tick this
        // row does not have; what the figure is FOR is that the note starts at the name
        // column. So the check reads the laid-out tick and the laid-out name and asserts the
        // note begins at the name — which stays true if either ever moves.
        const columns = await page.evaluate(() => {
          const box = document.querySelector("main [data-top-off-row]");
          if (!box) return null;
          const tick = box.querySelector("label[aria-hidden]");
          // By its own handle, never by its type size: the row is full of 12.5px text and a
          // size-based selector picks whichever of it comes first.
          const name = box.querySelector('[data-testid="top-off-name"]');
          const r = box.getBoundingClientRect();
          return {
            tickRight: tick ? tick.getBoundingClientRect().right - r.left : null,
            nameLeft: name ? name.getBoundingClientRect().left - r.left : null,
          };
        });
        const indents = [...new Set(rowNotes.map((n) => n.indent))];
        report(
          `${width}px · the note starts at the name column`,
          columns !== null &&
            columns.nameLeft !== null &&
            rowNotes.every(
              (n) => n.indent >= (columns.tickRight ?? 0) && Math.abs(n.indent - columns.nameLeft) <= 2,
            ),
          `indent ${indents.join(", ")}px · tick ends ${columns?.tickRight}px · name at ${columns?.nameLeft}px`,
        );

        // SPOKEN ONCE, in the row's own accessible name. Every visual atom on this row is
        // aria-hidden, so a note drawn without being folded into `rowLabel` is content a
        // screen reader is simply never told about.
        const spoken = await page.evaluate(() => {
          const out = [];
          for (const box of document.querySelectorAll("main [data-top-off-row]")) {
            const note = box.querySelector('[data-testid="card-note"]');
            if (!note) continue;
            const body = note.querySelectorAll("p")[1];
            const tick = box.querySelector('input[type="checkbox"]');
            out.push({
              hidden: note.getAttribute("aria-hidden") === "true",
              inName: (tick?.getAttribute("aria-label") ?? "").includes(
                (body?.textContent ?? "").trim(),
              ),
            });
          }
          return out;
        });
        report(
          `${width}px · the drawn note is hidden and spoken in the row's name`,
          spoken.length > 0 && spoken.every((s) => s.hidden && s.inName),
          `${spoken.filter((s) => s.hidden && s.inName).length} of ${spoken.length}`,
        );
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
