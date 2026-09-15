// The card views draw nothing over the art, and their caption is one box.
//
// Three of this design's rulings are facts about laid-out geometry, and jsdom can see none
// of them:
//
//   - The art carries NO mark and no bottom wash (call D). A class-list assertion cannot
//     tell a deleted scrim from one whose class moved, and it cannot see an absolutely
//     positioned mark at all — the element is present in both builds.
//   - The slot's three occupants are ONE BOX. They are not the same box today: the chip
//     uses Tailwind `border`, which is 1px of real layout on every side, while the collapsed
//     buy tag uses an inset shadow and the proxy mark an outline, neither of which occupies
//     space. Normalising font size and padding leaves the chip 2px taller — and a class-list
//     check reads `border` and `outline` as equally present, so only a measured height can
//     tell them apart.
//   - The live tile and the undo receipt report the SAME caption height, which is what makes
//     a removed card leave a hole exactly its own size.
//
// It also reads each grid's column count and tile width. The two routes' achievable tiles
// DIFFER and the probe asserts each one by name rather than a shared tolerance: `/collection`
// has 1170px of track at 1300px and lands on 178.3px, the deck pane has 1186px (its ancestor
// pays `md:px-[26px]`) and lands on 181px. No floor produces 178 there, and a shared ±2 would
// pass or fail on whether a scrollbar happens to render.
//
// Run by hand, and not part of `pnpm test`:
//   node scripts/probe-card-captions.mjs
//   PROBE_BASE=http://localhost:3600 PROBE_DECK=<uuid> node scripts/probe-card-captions.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPageRole, PAGE } from "./lib/surface.mjs";

const { deck: DECK_VIEW } = { deck: { card: "Card view" } };
const viewToggleCopy = { deck: DECK_VIEW };

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

function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  return ok;
}

/**
 * What the art region is carrying.
 *
 * The art is found by its aspect ratio rather than by a class: 63/88 is the card, and every
 * candidate this could match — a plate, an illustration, a no-art sunken box — is drawn at
 * it. A positioned descendant is a mark left on the art; a `box-shadow` naming a blur radius
 * is the bottom wash, which the 1px inner edge (`inset 0 0 0 1px`) never does.
 */
const ART = (page) =>
  [...document.querySelectorAll(`${page} *`)]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 60) return false;
      return Math.abs(r.height / r.width - 88 / 63) < 0.03;
    })
    .map((el) => {
      const marks = [...el.querySelectorAll("*")].filter((d) => {
        const s = getComputedStyle(d);
        if (s.position !== "absolute") return false;
        // The no-art plate's cost pips are the one thing this design leaves
        // positioned over the art's box, and they are not a mark on an
        // illustration: that plate prints no cost, so the pips are the only one
        // anyone can see. Without this a deck holding a single artless card
        // fails the check for drawing exactly what it was told to draw.
        if (d.closest("[data-testid='tile-cost-pips']")) return false;
        const r = d.getBoundingClientRect();
        // An `sr-only` span is absolutely positioned and 1px square. It is not a mark; it is
        // the cost this design deliberately kept speaking.
        return r.width > 4 && r.height > 4;
      }).length;
      const shadow = getComputedStyle(el).boxShadow;
      // The wash is the shadow with a BLUR. The 1px inner edge this design keeps
      // is `0 0 0 1px`, which has none, so blur is what tells them apart.
      //
      // Parsed, never matched with one regex. A computed `box-shadow` puts the
      // COLOUR first — `rgba(0, 0, 0, 0.6) 0px -40px 40px -30px inset` — and the
      // first version of this check assumed the authored order, so its pattern
      // never fired: it reported "0 carrying a wash" over a tile whose wash had
      // been put back. Split on commas that are not inside `rgba(...)`, then read
      // each shadow's third length.
      const wash = shadow
        .split(/,(?![^(]*\))/)
        .some((part) => {
          const lengths = part.match(/-?\d+(\.\d+)?px/g) ?? [];
          return lengths.length >= 3 && parseFloat(lengths[2]) > 0;
        });
      return { marks, wash, shadow };
    });

/** Every caption's height, and every slot box's height, on the page. */
const CAPTIONS = (page) => {
  // BOTH halves of the pair. `decklist-row`'s meta shell is also `min-h-[52px]`
  // — with `md:min-h-[34px]` — so matching the phone figure alone measured the
  // LIST's rows and reported a tidy single height of 34 for them.
  const caps = [...document.querySelectorAll(
    `${page} [class*="min-h-[52px]"][class*="min-h-[46px]"]`,
  )];
  const heights = [...new Set(caps.map((c) => Math.round(c.getBoundingClientRect().height)))];
  // The slot's occupants: the one box, whoever is in it. Found by the geometry they share —
  // a 4px radius on a mono box inside a caption — rather than by three component classes,
  // because the point of the check is that the three agree.
  const boxes = caps.flatMap((c) =>
    [...c.querySelectorAll("span")].filter((s) => {
      const st = getComputedStyle(s);
      if (st.borderRadius !== "4px") return false;
      return st.fontFamily.toLowerCase().includes("mono");
    }),
  );
  const boxHeights = [...new Set(boxes.map((b) => Math.round(b.getBoundingClientRect().height * 2) / 2))];
  // WHICH occupant, not just how many. The three are one box by rule, and a run
  // whose every box is a chip has not tested that — it has measured one
  // component against itself. The kinds are named so the report says which.
  const kinds = [...new Set(boxes.map((b) => {
    const t = (b.textContent ?? "").trim();
    if (t.startsWith("P")) return "P";
    if (t.includes("$")) return "$";
    return "chip";
  }))];
  return { captions: caps.length, heights, boxes: boxes.length, boxHeights, kinds };
};

/**
 * The grid's column count and track width, read off `grid-template-columns`.
 *
 * Computed, not declared: `auto-fill` resolves to an explicit track list, so this reports
 * what the browser actually laid out. Counting tile ELEMENTS instead needs a selector for
 * "a tile", and the first attempt — `button` inside `main` — matched every control on the
 * page and reported five columns of 22px.
 */
const GRID = ({ page }) => {
  const grids = [...document.querySelectorAll(`${page} *`)].filter((el) => {
    const s = getComputedStyle(el);
    if (!s.display.includes("grid")) return false;
    return el.querySelector('[class*="min-h-[52px]"][class*="min-h-[46px]"]') !== null;
  });
  if (!grids.length) return null;
  const tracks = getComputedStyle(grids[0]).gridTemplateColumns.split(" ").filter(Boolean);
  return {
    columns: tracks.length,
    tile: Math.round(parseFloat(tracks[0]) * 10) / 10,
  };
};

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  let failures = 0;
  let checks = 0;

  try {
    for (const width of [1300, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await signIn(page);

      const deck = process.env.PROBE_DECK
        ? `/decks/${process.env.PROBE_DECK}`
        : await (async () => {
          await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
          await page.waitForTimeout(2_500);
          return page.evaluate(() => [...document.querySelectorAll('a[href^="/decks/"]')]
            .map((a) => a.getAttribute("href"))
            .find((h) => h && !/\/(import|new)$/.test(h)) ?? null);
        })();
      if (deck === null) {
        checks += 1;
        failures += !report(`${width}px · a deck to read`, false, "the account owns none");
        await context.close();
        continue;
      }

      for (const [label, route, toggle] of [
        ["/collection", "/collection?view=grid", null],
        // PRESSED, never a URL parameter. The deck's view is client state with
        // no `?view=`, so a run that navigated to `?view=card` measured the LIST
        // and said so in the language of the card view.
        ["deck card view", deck, viewToggleCopy.deck.card],
      ]) {
        await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(2_000);
        if (toggle) {
          const control = onPageRole(page, "button", toggle);
          if ((await control.count()) === 0) {
            checks += 1;
            failures += !report(`${width}px · ${label} · reach the view`, false, `no "${toggle}" control`);
            continue;
          }
          await control.first().click();
          await page.waitForTimeout(1_500);
        }

        const arts = await page.evaluate(ART, PAGE);
        checks += 2;
        // A run that photographed an empty route would otherwise sweep clean.
        failures += !report(
          `${width}px · ${label} · found art`,
          arts.length > 0,
          `${arts.length} card-shaped regions`,
        );
        const dirty = arts.filter((a) => a.marks > 0);
        const washed = arts.filter((a) => a.wash);
        failures += !report(
          `${width}px · ${label} · the art keeps nothing`,
          arts.length > 0 && dirty.length === 0 && washed.length === 0,
          `${dirty.length} carrying a mark, ${washed.length} carrying a wash`,
        );

        const caps = await page.evaluate(CAPTIONS, PAGE);
        checks += 2;
        failures += !report(
          `${width}px · ${label} · one caption height`,
          caps.captions > 0 && caps.heights.length === 1,
          `${caps.captions} captions, heights ${caps.heights.join(" / ") || "none"}`,
        );
        // Zero boxes is a FAILURE, not a pass: a page with no card in a marked state has
        // not proved anything, it has measured nothing.
        //
        // It reports the KINDS it saw, and that line is the point. On a fixture whose cards
        // are all owned and none printed, every box is a chip and this check compares one
        // component against itself — it passed a mutation that put the chip's border back,
        // which is the exact defect it was written for. The invariant that the three agree
        // is pinned in `card-tile-caption.test.tsx`, which can force all three; here the
        // kinds line says how much of it this run actually exercised.
        failures += !report(
          `${width}px · ${label} · one slot box`,
          caps.boxes > 0 && caps.boxHeights.length === 1,
          `${caps.boxes} boxes, heights ${caps.boxHeights.join(" / ") || "none"}, kinds ${caps.kinds.join("+") || "none"}`,
        );

        // BOTH widths. This was gated to 1300 alone, which left the phone's
        // explicit 2-up — the one thing the desktop floor cannot express, since
        // at 390px a 178px floor plus a gap exceeds the track and auto-fill
        // would collapse to one column — asserted by nothing. A regression there
        // passed every check on the surface it was most likely to break.
        const grid = await page.evaluate(GRID, { page: PAGE });
        const want = width === 1300 ? (label === "/collection" ? 178.3 : 181) : null;
        const wantColumns = width === 1300 ? 6 : 2;
        checks += 1;
        failures += !report(
          `${width}px · ${label} · ${wantColumns} tracks${want ? ` at ${want}px` : ""}`,
          grid !== null
            && grid.columns === wantColumns
            && (want === null ? grid.tile > 120 : Math.abs(grid.tile - want) <= 2),
          grid === null ? "no tiles" : `${grid.columns} columns, tile ${grid.tile}px`,
        );
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${checks - failures}/${checks} checks passed.`);
  if (failures) process.exitCode = 1;
}

run();
