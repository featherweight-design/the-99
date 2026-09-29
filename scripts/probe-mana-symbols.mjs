// The large pip prints the real mana symbol, and the card view prints no pips.
//
// Both rulings are about painted pixels, and jsdom lays nothing out: the unit
// tests can assert which file a pip ASKS for and that the tile renders no run,
// and neither of those says the art resolved, that it fills its box, or that the
// tile's bottom-left is actually clear. A 404 on `/mana/2R.svg` leaves the same
// markup the passing build has.
//
// So this reads back the LOADED bytes — every symbol URL fetched through the
// page and checked for a 200 and an SVG body — and the painted box of every pip
// in the modal's cost, at both widths.
//
// Run by hand, and not part of `pnpm test`. Point it at `local-dev`:
//   node scripts/probe-mana-symbols.mjs
//   PROBE_BASE=http://localhost:3600 PROBE_DECK=<uuid> node scripts/probe-mana-symbols.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { PAGE, onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
/** A costed card the fixture account holds. Override with PROBE_CARD. */
const CARD = process.env.PROBE_CARD ?? "Smothering Tithe";
/**
 * A card printing TWO costs on one piece of stock. Override with
 * PROBE_SPLIT_CARD — any `split`, `adventure` or `prepare` card the account
 * holds answers, and the default is a split whose halves differ in length, so a
 * build that drew one half twice would still read wrongly.
 */
const SPLIT_CARD = process.env.PROBE_SPLIT_CARD ?? "Repudiate // Replicate";
/**
 * The mark drawn between two costs, as a LITERAL rather than as the copy
 * constant the component reads. Kept here so a change to the drawn separator
 * fails this probe and has to be made twice, on purpose.
 */
const SEPARATOR = "//";
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

/** The drawn box, per the property table: 22px under `md`, 26px from it up. */
const PIP_PX = { 1300: 26, 390: 22 };

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
 * Every pip in the modal's cost: the file it asks for and the box it paints.
 *
 * Read off the testid the modal already carries, so a pip drawn anywhere else in
 * the dialog — the oracle text's inline symbols, were they ever added — cannot
 * stand in for the cost this checks.
 */
const READ_COST = () => {
  const slot = document.querySelector('[data-testid="modal-mana-cost"]');
  if (!slot) return null;
  // The pips themselves: the children of the run, never every span in the slot.
  // The slot also holds the run's own container and the sr-only cost, and a
  // sweep of all three reads a 57px box and a lettered string that belong to
  // neither pip — which is a probe reporting its own markup as a defect.
  const run = slot.querySelector('[aria-hidden="true"]');
  if (!run) return null;
  // EVERY child, with no size filter. Dropping the zero-sized ones would hide
  // exactly the regression this measures: a pip collapsed to nothing would leave
  // the survivors satisfying the URL, text and box assertions, and the check
  // would pass over a cost with a symbol missing from it. Kept in, it fails the
  // box assertion, which is the reading that should catch it.
  const children = [...run.children].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      url: getComputedStyle(el).backgroundImage.match(/url\("?([^")]+)"?\)/)?.[1] ?? null,
      // The window onto the sprite: its horizontal position and the sheet's drawn width, both
      // percentages of the pip's own box.
      x: parseFloat(getComputedStyle(el).backgroundPositionX),
      size: parseFloat(getComputedStyle(el).backgroundSize),
      // The lettered fallback is the one thing that must not appear here: on a
      // catalog this app has ingested, every cost symbol has committed art.
      text: el.textContent?.trim() ?? "",
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  });
  // Split into pips and the `//` between two costs, because they are held to
  // opposite standards: a pip must carry art and NO text, the separator must
  // carry text and no art. Lumped together, a separator reads as a pip that
  // fell back to a letter and a two-cost card cannot be checked at all.
  return {
    pips: children.filter((c) => c.url !== null || c.text === ""),
    marks: children.filter((c) => c.url === null && c.text !== ""),
  };
};

/**
 * The deck card view's tiles: how many draw art, and which of them draw pips.
 *
 * Liveness comes from the ARTED count rather than from a marker beside the pips:
 * a run that never reached the card view reports zero pips while measuring
 * nothing, and `arted > 0` is what tells that apart. An earlier version counted
 * the ownership dots in the same slot for this, which went stale the moment the
 * dot moved into the caption.
 */
const READ_TILES = (page) => {
  const tiles = [...document.querySelectorAll(`${page} li`)].filter((li) =>
    li.querySelector("[style*='aspect-ratio']"),
  );
  let arted = 0;
  let pipsOverArt = 0;
  let noArtWithPips = 0;
  for (const tile of tiles) {
    const art = tile.querySelector("[style*='aspect-ratio']");
    if (!art) continue;
    const box = art.getBoundingClientRect();
    // GEOMETRY, not a wrapper. A pip over the art is a drawn round box whose
    // centre lies inside the art's own rect, whatever element holds it — where a
    // testid reading can only see the wrapper the component happens to use
    // today. `tile-cost-pips` is rendered in the NO-ART branch alone, so a
    // counter keyed on it could never fire for an arted tile: a regression
    // drawing pips over art under any other wrapper would report a clean run.
    const overArt = [...tile.querySelectorAll("span.rounded-full")].filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      return cx >= box.left && cx <= box.right && cy >= box.top && cy <= box.bottom;
    });
    // Split by whether the tile HAS art, because the rule is. A no-art tile
    // keeps its pips deliberately, and `PROBE_DECK` is any deck the account
    // owns — so a deck holding one costed card with no image would fail a check
    // that counted every tile, over a component obeying the rule exactly.
    // The art is a lazy <img> inside the box since the Card view stopped painting it as a
    // CSS background (list payload plan follow-up); either form counts as drawing art.
    if (getComputedStyle(art).backgroundImage.includes("url(") || art.querySelector("img[src]")) {
      arted += 1;
      if (overArt.length > 0) pipsOverArt += 1;
    } else if (overArt.length > 0) {
      noArtWithPips += 1;
    }
  }
  return { tiles: tiles.length, arted, pipsOverArt, noArtWithPips };
};

/**
 * Open one named card's modal from `/collection`, or return false.
 *
 * A NAMED card, never the first row: the cost is the subject here, so the run
 * has to know which cost it is looking at, and a land would measure nothing
 * while reporting a clean sweep.
 */
async function openCard(page, name) {
  // Retried once on ERR_ABORTED: the previous card's modal writes the URL as it closes, and a
  // navigation started under that write can be cancelled by it.
  const url = `${BASE}/collection?view=rows&q=${encodeURIComponent(name)}`;
  await page.goto(url, { waitUntil: "networkidle" }).catch(async (error) => {
    if (!String(error).includes("ERR_ABORTED")) throw error;
    await page.goto(url, { waitUntil: "networkidle" });
  });
  await page.waitForTimeout(3_000);
  // A role locator with an escaped pattern, not an interpolated attribute
  // selector: a card name carrying a quote or a bracket would make that
  // selector invalid or change what it means. A split card's name carries `//`,
  // which is exactly that case.
  const pattern = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},`);
  // Pressed up to three times: the row paints before React hydrates it, so a
  // first click on a cold dev server lands on markup with no handler and
  // nothing happens. There is no state to wait for, only the absence of a
  // dialog, so the retry IS the wait.
  const row = onPageRole(page, "button", pattern).first();
  // The wait is SCOPED, like the click. The shell's account sheet is also a
  // `role="dialog"` and sits before `<main>` in document order, so an unscoped
  // wait can report success off a dialog this function never opened. The card
  // modal is mounted by `CardDetailProvider` inside the page's own section, so
  // the scope reaches it — verified by this probe passing, which it cannot do
  // if the wait looks somewhere the modal is not.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await row.click({ timeout: 10_000 }).catch(() => {});
    const opened = await onPage(page, '[role="dialog"]')
      .first()
      .waitFor({ state: "attached", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (opened) {
      await page.waitForTimeout(1_500);
      return true;
    }
  }
  return false;
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  let failures = 0;

  try {
    for (const width of [1300, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();

      // Every symbol the page asked the server for, with the answer it got. A
      // pip whose file 404s paints nothing and leaves markup identical to the
      // working build, which is the failure no assertion on the DOM can see.
      const loaded = new Map();
      page.on("response", async (res) => {
        const url = new URL(res.url());
        if (!url.pathname.startsWith("/mana/")) return;
        const body = res.status() === 200 ? await res.text().catch(() => "") : "";
        loaded.set(url.pathname, { status: res.status(), svg: body.includes("<svg") });
      });

      await signIn(page);

      // ── The modal's cost ──────────────────────────────────────────────────
      if (!(await openCard(page, CARD))) {
        failures += !report(
          `${width}px · a card to open`,
          false,
          `the modal never opened for ${CARD} — name another with PROBE_CARD`,
        );
        await context.close();
        continue;
      }

      const read = await page.evaluate(READ_COST);
      const cost = read?.pips ?? null;
      // A land has no cost and a run that opened one would measure nothing while
      // reporting a clean sweep, so an empty cost FAILS rather than passing.
      failures += !report(
        `${width}px · the modal's cost draws printed symbols`,
        cost !== null
          && cost.length > 0
          && cost.every((p) => p.url?.includes("/mana/"))
          && cost.every((p) => p.text === "")
          // A one-cost card draws no separator. Asserted here because the mark
          // is drawn from the same list as the pips, so a stray one would
          // otherwise be invisible to every check on this surface.
          && (read?.marks.length ?? 0) === 0,
        cost === null || cost.length === 0
          ? "no cost was drawn — a land, or a modal this probe did not reach. NOT a pass:"
            + " open a costed card with PROBE_CARD."
          : `${cost.length} pips, ${cost.filter((p) => p.url).length} from /mana/,`
            + ` ${cost.filter((p) => p.text !== "").length} still lettered`,
      );

      const box = PIP_PX[width];
      failures += !report(
        `${width}px · each pip paints its ${box}px box`,
        cost !== null && cost.length > 0 && cost.every((p) => p.w === box && p.h === box),
        (cost ?? []).map((p) => `${p.w}x${p.h}`).join(", ") || "nothing measured",
      );

      // The bytes. Markup alone cannot tell a sheet that loaded from one that did
      // not. Resolved against BASE: `getComputedStyle` returns these absolute, but
      // a relative value would make `new URL` throw and take the check down.
      // Since 2026-09-28 every pip is a window onto ONE sprite (`mana-sprite.ts`), so "its own file"
      // is the sheet, served as SVG, and a window that lands on a whole cell of it. A slug the
      // manifest does not hold has no cell and falls back to a letter, which the check above fails.
      // Which cell is the right one is `mana-sprite.test.ts`'s: the build and the reader share one
      // order, and the committed sheet must be the build of the committed files.
      const wanted = [...new Set((cost ?? []).map((p) => p.url && new URL(p.url, BASE).pathname).filter(Boolean))];
      const served = wanted.filter((path) => loaded.get(path)?.status === 200 && loaded.get(path)?.svg);
      // A sheet of n 100-unit cells 10 apart is drawn at (110n − 10)% of the box, and cell i sits at
      // i·110 / (110(n − 1)) of the overhang: a whole index, from 0 to n − 1.
      const cells = (cost ?? []).map((p) => {
        const n = (p.size + 10) / 110;
        const i = (p.x / 100) * (n - 1);
        return { n, i, whole: Number.isInteger(Math.round(n * 1000) / 1000) && Math.abs(i - Math.round(i)) < 0.01 && i >= -0.01 && i <= n - 0.99 };
      });
      failures += !report(
        `${width}px · the cost's own symbols resolved`,
        wanted.length === 1 && served.length === 1 && cells.length > 0 && cells.every((c) => c.whole),
        wanted.length === 0
          ? "the cost asked for no art at all"
          : `${wanted.join(", ")} ${served.length === wanted.length ? "served as SVG" : "NOT served"}; cells `
            + cells.map((c) => c.i.toFixed(2)).join(", ") + ` of ${cells[0]?.n.toFixed(2)}`,
      );

      await page.keyboard.press("Escape");

      // ── A card that prints TWO costs ───────────────────────────────────────
      // `split`, `adventure` and `prepare` carry two real castable costs on one
      // piece of stock, and this surface is the only one that draws both. The
      // reading is the separator: a build drawing the front half alone paints
      // the right pips for the wrong card and every other check here passes.
      if (!(await openCard(page, SPLIT_CARD))) {
        failures += !report(
          `${width}px · a two-cost card to open`,
          false,
          `the modal never opened for ${SPLIT_CARD} — name another with PROBE_SPLIT_CARD`,
        );
      } else {
        const split = await page.evaluate(READ_COST);
        const pips = split?.pips ?? [];
        const marks = split?.marks ?? [];
        // Both halves and one mark between them. The pip count is asserted as
        // MORE THAN the front half rather than as a literal, because the literal
        // belongs to one card and this takes an override; what cannot be true of
        // a front-half-only build is a separator, so that is the load-bearing
        // clause. A run with no mark FAILS rather than passing: the fixture is a
        // two-cost card, so no separator means the reading lost its subject.
        failures += !report(
          `${width}px · a two-cost card draws both halves`,
          pips.length > 1 && marks.length === 1 && pips.every((p) => p.url?.includes("/mana/")),
          `${pips.length} pips, ${marks.length} separator(s)`
            + (marks.length === 0
              ? ` — NOT a pass: ${SPLIT_CARD} prints two costs, so a missing separator means`
                + " the front half was drawn alone, or this is not a two-cost card"
              : ` drawn as \`${marks.map((m) => m.text).join("")}\``),
        );
        // The separator is punctuation, not a third cost: it carries text and no
        // art, where every pip carries art and no text. Read explicitly because
        // the two come out of the same list.
        //
        // Pinned to the LITERAL `//`, never to the copy constant the component
        // draws from. A check asserting "some non-empty text" passes a build
        // that swapped the mark for `/` or the word `or`, and one asserting
        // `manaCopy.costHalfSeparator` moves with whatever that constant becomes
        // — so both would ratify a change to the contract instead of catching
        // it. The literal is the contract, and changing it should cost an
        // edit here, deliberately.
        failures += !report(
          `${width}px · the separator is a mark rather than a pip`,
          marks.length === 1 && marks[0].url === null && marks[0].text === SEPARATOR,
          marks.length === 1
            ? `text \`${marks[0].text}\` against \`${SEPARATOR}\`,`
              + ` background ${marks[0].url ?? "none"}`
            : "no separator to read",
        );
        // The header wraps rather than squeezing the name. Only a layout engine
        // can answer this: the unit test asserts the ROW may wrap, and that is
        // true of a build where it never does — the name block having picked up
        // a `flex-1` and a zero basis, say, which makes the row shrink the name
        // instead. What tells them apart is the cost's own top against the
        // title's, and the title's line count.
        const header = await page.evaluate(() => {
          const slot = document.querySelector('[data-testid="modal-mana-cost"]');
          const h3 = document.querySelector("#card-modal-title");
          if (!slot || !h3) return null;
          const cs = getComputedStyle(h3);
          const box = h3.getBoundingClientRect();
          return {
            costTop: Math.round(slot.getBoundingClientRect().top),
            titleTop: Math.round(box.top),
            titleLines: Math.round(box.height / Number.parseFloat(cs.lineHeight)),
          };
        });
        // BOTH widths. The name block is in this row on a phone too — the art
        // header only takes it when `compactArt` is true, and that wants the
        // printing picker expanded, which it is not as the modal opens.
        //
        // Asserted as an INVARIANT rather than as an outcome: a cost sharing the
        // name's line means the name was not squeezed by it. Demanding the cost
        // be on its own line would be a fact about one card — `Fire // Ice` is
        // narrow enough to sit beside its own four pips and should — so
        // `PROBE_SPLIT_CARD` would stop being overridable with any two-cost card
        // the account holds. This clause fails the build the change was made
        // for: a squeezed name wraps while the cost stays beside it.
        failures += !report(
          `${width}px · no cost squeezes the name onto a second line`,
          header !== null && (header.costTop > header.titleTop || header.titleLines === 1),
          header === null
            ? "no header to read"
            : `cost top ${header.costTop} against title top ${header.titleTop},`
              + ` title on ${header.titleLines} line(s)`
              + (header.costTop > header.titleTop ? " — cost on its own line" : " — sharing the line"),
        );

        await page.keyboard.press("Escape");
      }

      // ── The deck's card view ──────────────────────────────────────────────
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
        failures += !report(`${width}px · a deck to read`, false, "the account owns none");
        await context.close();
        continue;
      }

      await page.goto(`${BASE}${deck}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(4_000);
      // The view is a client preference rather than a URL parameter, so it is
      // PRESSED. It is also sticky, which is why the press is conditional: a
      // previous run left the account in card view, and pressing an already-set
      // segment is not guaranteed to be a no-op on every surface.
      const cardView = onPageRole(page, "button", "Card view").first();
      if (await cardView.count()) await cardView.click({ timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(2_500);
      const tiles = await page.evaluate(READ_TILES, PAGE);
      // Two clauses, and `arted` is the load-bearing one: a run that never
      // reached the card view reports zero pips while measuring nothing, and the
      // count of tiles actually drawing art is what tells that apart from the
      // view drawn correctly.
      failures += !report(
        `${width}px · the card view draws no pips over art`,
        tiles.arted > 0 && tiles.pipsOverArt === 0,
        `${tiles.tiles} tiles (${tiles.arted} with art),`
          + ` ${tiles.pipsOverArt} arted tiles still drawing pips,`
          + ` ${tiles.noArtWithPips} no-art tiles keeping theirs`
          + (tiles.arted === 0
            ? " — NOT a pass: the card view was never reached, or no tile has art"
            : ""),
      );

      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run();
