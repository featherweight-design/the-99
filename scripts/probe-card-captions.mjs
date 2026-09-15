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
import { PAGE } from "./lib/surface.mjs";

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
        const r = d.getBoundingClientRect();
        // An `sr-only` span is absolutely positioned and 1px square. It is not a mark; it is
        // the cost this design deliberately kept speaking.
        return r.width > 4 && r.height > 4;
      }).length;
      const shadow = getComputedStyle(el).boxShadow;
      // The wash is the only shadow with a blur. `inset 0 0 0 1px rgba(...)` has none, and
      // matching on "inset" alone would condemn the edge the design keeps.
      const wash = /inset[^,]*\b(?!0px\b)\d+(\.\d+)?px\s+\d/.test(shadow)
        || /\b\d+(\.\d+)?px\s+-?\d+(\.\d+)?px\s+rgba/.test(shadow);
      return { marks, wash, shadow };
    });

/** Every caption's height, and every slot box's height, on the page. */
const CAPTIONS = (page) => {
  const caps = [...document.querySelectorAll(`${page} [class*="min-h-[52px]"], ${page} [class*="min-h-[46px]"]`)];
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
  return { captions: caps.length, heights, boxes: boxes.length, boxHeights };
};

/** The grid's column count and its tile width, read off the laid-out tracks. */
const GRID = (page, tileSelector) => {
  const tiles = [...document.querySelectorAll(`${page} ${tileSelector}`)]
    .filter((t) => t.getBoundingClientRect().width > 0);
  if (!tiles.length) return null;
  const top = Math.round(tiles[0].getBoundingClientRect().top);
  const firstRow = tiles.filter((t) => Math.abs(Math.round(t.getBoundingClientRect().top) - top) < 2);
  return { columns: firstRow.length, tile: Math.round(tiles[0].getBoundingClientRect().width * 10) / 10 };
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

      for (const [label, route, tileSel] of [
        ["/collection", "/collection?view=grid", "button"],
        ["deck card view", `${deck}?view=card`, "li"],
      ]) {
        await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(2_000);

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
        // The check the border defeats. Zero boxes is a FAILURE, not a pass: a page with no
        // card in a marked state has not proved the three agree, it has measured nothing.
        failures += !report(
          `${width}px · ${label} · one slot box`,
          caps.boxes > 0 && caps.boxHeights.length === 1,
          `${caps.boxes} boxes, heights ${caps.boxHeights.join(" / ") || "none"}`,
        );

        if (width === 1300) {
          const grid = await page.evaluate(GRID, PAGE, tileSel);
          const want = label === "/collection" ? 178.3 : 181;
          checks += 1;
          failures += !report(
            `${width}px · ${label} · six tracks at ${want}px`,
            grid !== null && grid.columns === 6 && Math.abs(grid.tile - want) <= 2,
            grid === null ? "no tiles" : `${grid.columns} columns, tile ${grid.tile}px`,
          );
        }
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
