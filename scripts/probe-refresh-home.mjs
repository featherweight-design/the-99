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
//   3. Four resume rows, 2×2 above 1000px and stacked below.
//   4. Every row carries a stamp, and the stamps are in the order the block
//      claims — a row's evidence for why it is where it is.
//   5. The row's geometry is the shipped one: a stated 72px band, a 99px
//      portrait (errata E1/E2 — the handoff's 74/62 and 64px are legal at no
//      band, the wash table keys the portrait to band × 1.37).
//   6. `All {n} decks` is a real route to /decks, CLICKED rather than counted.
//   7. The 900px band nobody drew: rows stack rather than clipping their names.
//   8. Phone controls clear 44px.
//
// Run: `node scripts/probe-refresh-home.mjs`, against local dev.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
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
    const stampEl = [...a.querySelectorAll('span')]
      .find((s) => /^· (edited|committed|played) /.test((s.textContent ?? '').trim())) ?? null;
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
    const name = a.querySelector('[data-resume-text] > span');
    return {
      x: Math.round(r.x), y: Math.round(r.y),
      w: Math.round(r.width), h: Math.round(r.height),
      band: washRoot ? Number(washRoot.getAttribute('data-art-wash-band')) : null,
      portrait: cropLayer ? Math.round(cropLayer.getBoundingClientRect().width) : null,
      stamp,
      stampClipped,
      nameWidth: name ? Math.round(name.getBoundingClientRect().width) : 0,
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

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();

  for (const vp of [
    { label: "desktop", width: 1440, height: 900 },
    // The band the old threshold made a third layout of: one column, and until
    // this round desktop padding with it.
    { label: "tablet", width: 1100, height: 900 },
    // 1200 is the tightest two-up: the rows pair at 1180, so this is where the
    // meta line has least room for the pill, the count and the stamp together.
    // The clipping this width holds the line against was measured at 1024, back
    // when the pair started at 1000 — that width now stacks, so it can no longer
    // reproduce it, and 1200 is where the same arithmetic is tightest today.
    { label: "narrow-pair", width: 1200, height: 900 },
    { label: "mid", width: 900, height: 900 },
    { label: "phone", width: 390, height: 844, isMobile: true, hasTouch: true },
  ]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.hasTouch ?? false,
      isMobile: vp.isMobile ?? false,
    });
    const page = await context.newPage();
    await signIn(page);
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
    if (rows === null || rows.length < 4) {
      console.error(
        `PREREQUISITE: ${BASE} must be signed in to an account with a collection read and at least ` +
        `four decks. Home drew ${rows === null ? "no resume block at all" : `${rows.length} row(s)`}.`,
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
    check(`${vp.label}: every row carries a stamp`, rows.every((r) => r.stamp !== null), true);
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
    check(`${vp.label}: every row has room for its name`, rows.every((r) => r.nameWidth > 40), true);

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
    if (vp.label === "desktop") {
      const all = onPage(page, 'a[href="/decks"]').filter({ hasText: /All \d+ decks/ });
      const found = await all.count();
      check("desktop: the footer offers All {n} decks", found, 1);
      // Only where there is exactly one to press. A missing or doubled footer is
      // already the failure above, and clicking into it would throw here — before
      // the summary line and before the remaining viewports ever run.
      if (found === 1) {
        await all.first().click();
        await page.waitForURL(/\/decks$/, { timeout: 10_000 });
        check("desktop: it lands on /decks", new URL(page.url()).pathname, "/decks");
        await page.goBack({ waitUntil: "networkidle" });
      }
    }

    await page.screenshot({ path: `/tmp/home-parity-${vp.label}.png`, fullPage: true });
    await context.close();
  }

  await browser.close();
  console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
