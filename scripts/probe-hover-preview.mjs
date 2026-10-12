// The card hover preview, on EVERY surface that draws one, at 1300x900.
//
// The box used to be placed against the ROW it belonged to. That works while a
// row is about as wide as the box and fails completely when it is not: on the
// top-off list a row spans the whole list, so "beside the row" could only
// resolve to "past its far edge" — flush right, over TYPE, COST, the
// availability, SYNERGY and DECKS, which are exactly the figures a reader hovers
// a row to compare, with several hundred pixels of empty row going unused.
//
// It follows the POINTER now, which answers that without any surface having to
// describe its own column layout, and cannot cover what the reader is pointing
// at. Because the rule lives in one shared provider, every surface inherits it —
// and inheritance is the thing worth checking rather than assuming, which is why
// this walks all three — the decklist, the top-off list and the review page
// (`/decks/[id]/changes`) — rather than trusting that one implies the others.
//
// The review page needs a deck with a draft, since a clean deck has no changes
// to list. Name one with `PROBE_CHANGES_DECK`, or the probe opens the review
// page of each of the account's first twelve decks until one lists rows, and
// FAILS when none does.
//
// Asserted as a RELATION to the cursor, never against a column's position: the
// box moves with the pointer and sits clear of it. A column-relative assertion
// would be a fact about one list's widths at one viewport.
//
// Makes no writes. Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3013 node scripts/probe-hover-preview.mjs
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

/** The box, if it is open. */
const BOX = () => {
  const el = document.querySelector('[data-testid="hover-preview"]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

/** A deck with open slots, which is what makes the top-off list reachable. */
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
        if (href) return href;
      }
    }
    return null;
  });
}

/** A deck whose review page lists rows, or null. Read-only: it only visits. */
async function findChangesDeck(page) {
  if (process.env.PROBE_CHANGES_DECK) return `/decks/${process.env.PROBE_CHANGES_DECK}/changes`;
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  // The tiles stream in after the shell, so an immediate read can find none
  // and report "no deck has a draft" about an account that has one.
  await onPage(page, "li article").first().waitFor({ timeout: 15_000 }).catch(() => {});
  const hrefs = await page.evaluate(() => [
    ...new Set(
      [...document.querySelectorAll('main li article a[href^="/decks/"]')]
        .map((a) => a.getAttribute("href"))
        .filter((h) => /^\/decks\/[^/]+$/.test(h ?? "")),
    ),
  ]);
  for (const href of hrefs.slice(0, 12)) {
    await page.goto(`${BASE}${href}/changes`, { waitUntil: "networkidle" });
    if ((await onPage(page, "[data-diff-row]").count()) > 0) return `${href}/changes`;
  }
  return null;
}

/**
 * One surface, measured the same way: hover a row, then move the pointer and
 * read the box against it.
 *
 * `rowLocator` is resolved through `onPage`, so no caller here spells `main`.
 */
async function measure(page, surface, rowLocator) {
  const rows = await rowLocator.count();
  if (rows === 0) {
    report(`${surface} · a row to hover`, false, "none on the page — NOT a pass");
    return;
  }

  // A PREVIEWABLE row, found by hovering until one opens the box. `imageUri` is
  // nullable on both a deck row and a `SynergyCard`, and `usePreviewRow` no-ops
  // on null by design — so a fixed nth row lands on a card the catalog has no
  // picture for and reports "no preview" about a build that is working. Nothing
  // in the DOM says which rows have art, so the box opening IS the test.
  //
  // Cheap after the first: the 240ms delay is paid once, and a row-to-row move
  // while already open is instant.
  const TRIES = 8;
  let index = -1;
  let opened = null;
  for (let i = 0; i < Math.min(TRIES, rows) && opened === null; i++) {
    await rowLocator.nth(i).hover();
    await page.waitForTimeout(700);
    opened = await page.evaluate(BOX);
    if (opened !== null) index = i;
  }
  report(
    `${surface} · the card appears`,
    opened !== null,
    opened === null
      ? `no preview on any of the first ${Math.min(TRIES, rows)} rows — NOT a pass:`
        + " either none of them has art, or the provider is not wired"
      : `row ${index} at ${Math.round(opened.left)},${Math.round(opened.top)}`,
  );
  if (opened === null) return;

  const at = await rowLocator.nth(index).boundingBox();
  // Both ends of the move must keep the box on the pointer's RIGHT, or it flips
  // mid-move and `left` jumps the other way on a working build. Mid-row alone
  // did not guarantee that: the review page's second column starts right of
  // centre, and mid-row plus 160 crosses the flip. 18 + 252 + 8 is the
  // provider's gutter, width and margin.
  const flipAt = (await page.evaluate(() => window.innerWidth)) - 18 - 252 - 8;
  const x = Math.max(
    Math.round(at.x) + 4,
    Math.min(Math.round(at.x + at.width / 2), flipAt - 160),
  );
  const y = Math.round(at.y + at.height / 2);
  await page.mouse.move(x, y);
  await page.waitForTimeout(150);
  const before = await page.evaluate(BOX);
  await page.mouse.move(x + 160, y);
  await page.waitForTimeout(150);
  const after = await page.evaluate(BOX);

  report(
    `${surface} · it follows the pointer`,
    before !== null && after !== null && Math.abs((after.left - before.left) - 160) <= 2,
    before === null || after === null
      ? "the box closed during the move — NOT a pass"
      : `left ${Math.round(before.left)} then ${Math.round(after.left)} for a 160px move`,
  );
  report(
    `${surface} · and sits clear of the pointer`,
    after !== null
      && (after.left >= x + 160 + 10 || after.left + after.width <= x + 160 - 10),
    after === null
      ? "no box — NOT a pass"
      : `box spans ${Math.round(after.left)}..${Math.round(after.left + after.width)}`
        + ` against a pointer at ${x + 160}`,
  );
  // AT THE WINDOW'S EDGE, which is the only place the flip is reachable. The
  // pointer positions above sit mid-row, and a box that never flips passes every
  // one of them — the mutation that removed the flip entirely was invisible
  // until the pointer went somewhere it mattered.
  //
  // The pointer must stay INSIDE a row throughout: leaving one closes the box,
  // so "move to the window's edge" is not available. The rightmost point of the
  // row is, and on these full-width lists that is within a card's width of the
  // window — which is what makes the flip fire.
  const near = await rowLocator.nth(index).boundingBox();
  await page.mouse.move(Math.round(near.x + near.width) - 6, y);
  await page.waitForTimeout(150);
  const atRight = await page.evaluate(BOX);
  const pointerX = Math.round(near.x + near.width) - 6;
  report(
    `${surface} · it stays in the window at the row's right edge`,
    atRight !== null && atRight.left >= 0 && atRight.left + atRight.width <= 1300,
    atRight === null
      ? "the box closed at the row's edge — NOT a pass"
      : `box spans ${Math.round(atRight.left)}..${Math.round(atRight.left + atRight.width)}`
        + ` against a pointer at ${pointerX}`,
  );
  // The flip itself, asserted only where the geometry demands one: with less
  // than a card's width to the pointer's right, a box still drawn to its right
  // would be off-screen. Where there IS room, rightward is correct and this says
  // so rather than failing a working build.
  const mustFlip = pointerX + 18 + 252 + 8 > 1300;
  report(
    `${surface} · and flips to the pointer's left when it must`,
    atRight !== null && (!mustFlip || atRight.left + atRight.width <= pointerX),
    atRight === null
      ? "no box — NOT a pass"
      : mustFlip
        ? `flipped: box ends at ${Math.round(atRight.left + atRight.width)}, pointer at ${pointerX}`
        : `not required here — ${1300 - pointerX}px of room to the right`,
  );

  // THE VERTICAL CLAMP is NOT measured here, deliberately. Reaching it needs the
  // pointer near the window's foot and still inside a row, and on both surfaces
  // the foot is occupied — the commit bar on one, the quick-add dock on the
  // other — so the pointer lands on furniture and the box closes. The check
  // failed for that reason rather than for the rule's.
  //
  // `hover-preview.test.tsx` pins the arithmetic instead ("holds the box inside
  // the window at either end"), which is deterministic and does not depend on
  // what happens to be at the bottom of a fixture deck's page. A fragile browser
  // check over a solid unit one is a worse trade than no browser check.
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
    const page = await context.newPage();
    await signIn(page);

    const deck = process.env.PROBE_DECK ? `/decks/${process.env.PROBE_DECK}` : await findDeck(page);
    if (deck === null) {
      report("a deck with open slots", false, "the account owns none — NOT a pass");
    } else {
      await page.goto(`${BASE}${deck}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(3_500);

      // 1 · THE DECKLIST, which is where this preview shipped first.
      await measure(page, "decklist", onPage(page, '[data-decklist-row]'));

      // 2 · THE TOP-OFF LIST, behind the strip's own door.
      const door = onPage(page, 'button[aria-label^="Choose the cards for the last"]').first();
      if ((await door.count()) === 0) {
        report("top-off · the strip's door", false, "not on the page — NOT a pass");
      } else {
        await door.click();
        await page.waitForTimeout(1_500);
        // CANDIDATE rows only. That container's direct children also include
        // the sticky column header and any illegal or set-aside rows, none of
        // which carries a preview handler — and each one eats an attempt, so a
        // working provider reads as missing whenever they come first. The
        // checkbox is what makes a row a candidate.
        await measure(
          page,
          "top-off",
          onPage(page, '[data-top-off-rows] > div:has(input[type="checkbox"])'),
        );
      }
    }

    if (deck !== null) {
      // 2b · THE DECK'S CARD VIEW and 2c · THE CONSIDER TAB, which had no preview at all: every card row has a
      // preview and a press that opens card details (Hugh, 2026-10-12).
      await page.goto(`${BASE}${deck}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(3_000);
      const cardView = onPage(page, 'button[aria-label="Card view"], button:has-text("Card view")').first();
      if ((await cardView.count()) === 0) {
        report("card view · its toggle", false, "not on the page — NOT a pass");
      } else {
        await cardView.click();
        await page.waitForTimeout(1_000);
        await measure(page, "card view", onPage(page, "ul.grid > li"));
      }
      const consider = page.getByRole("tab", { name: /cards to consider/i });
      if ((await consider.count()) === 0) {
        report("consider · its tab", false, "not on the page — NOT a pass");
      } else {
        await consider.click();
        await page.waitForTimeout(1_500);
        await measure(page, "consider", onPage(page, '[data-testid="suggestion-tile"]'));
      }
    }

    // 3 · THE REVIEW PAGE, both columns. Desktop draws them side by side, so
    // one locator reaches the adds and the cuts alike.
    const changes = await findChangesDeck(page);
    if (changes === null) {
      report("review · a deck with a draft", false, "none of the first 12 has one — NOT a pass");
    } else {
      await page.goto(`${BASE}${changes}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(2_000);
      await measure(page, "review", onPage(page, "[data-diff-row]"));
    }

    await context.close();
  } finally {
    await browser.close();
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run();
