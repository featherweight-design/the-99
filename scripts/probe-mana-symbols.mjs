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
import { PAGE, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
/** A costed card the fixture account holds. Override with PROBE_CARD. */
const CARD = process.env.PROBE_CARD ?? "Smothering Tithe";
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
  return [...run.children]
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        url: getComputedStyle(el).backgroundImage.match(/url\("?([^")]+)"?\)/)?.[1] ?? null,
        // The lettered fallback is the one thing that must not appear here: on a
        // catalog this app has ingested, every cost symbol has committed art.
        text: el.textContent?.trim() ?? "",
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    })
    .filter((p) => p.w > 0);
};

/**
 * The tiles' bottom-left slot in the deck's card view.
 *
 * Counts the OWNERSHIP DOTS as well as the pips: the dot and the pips shared one
 * wrapper, so a run that reported zero pips because it never reached the view
 * would report zero dots too, and this is what tells the two apart.
 */
const READ_TILES = (page) => {
  const tiles = [...document.querySelectorAll(`${page} li`)].filter((li) =>
    li.querySelector("[style*='aspect-ratio']"),
  );
  let dots = 0;
  let pipRuns = 0;
  for (const tile of tiles) {
    const slot = tile.querySelector("[class*='bottom-[6px]']");
    if (!slot) continue;
    // The dot is the round 8px mark; a pip run is two or more round boxes beside
    // it, which is exactly the shape that must be gone.
    const round = [...slot.querySelectorAll("span.rounded-full")].filter(
      (el) => el.getBoundingClientRect().width > 0,
    );
    if (round.length > 0) dots += 1;
    if (round.length > 1) pipRuns += 1;
  }
  return { tiles: tiles.length, dots, pipRuns };
};

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
      // A NAMED card, not the first row: the cost is the subject, so the run has
      // to know what cost it is looking at, and a land or a costless card would
      // measure nothing while reporting a sweep.
      await page.goto(`${BASE}/collection?view=rows&q=${encodeURIComponent(CARD)}`, {
        waitUntil: "networkidle",
      });
      await page.waitForTimeout(3_000);
      // A role locator with an escaped pattern, not an interpolated attribute
      // selector: a card name carrying a quote or a bracket would make that
      // selector invalid or change what it means.
      const pattern = new RegExp(`^${CARD.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},`);
      // Pressed up to three times: the row paints before React hydrates it, so a
      // first click on a cold dev server lands on markup with no handler and
      // nothing happens. There is no state to wait for, only the absence of a
      // dialog, so the retry IS the wait.
      const row = onPageRole(page, "button", pattern).first();
      let opened = false;
      for (let attempt = 0; attempt < 3 && !opened; attempt += 1) {
        await row.click({ timeout: 10_000 }).catch(() => {});
        opened = await page
          .waitForSelector('[role="dialog"]', { timeout: 10_000 })
          .then(() => true)
          .catch(() => false);
      }
      if (!opened) {
        failures += !report(
          `${width}px · a card to open`,
          false,
          `the modal never opened for ${CARD} — name another with PROBE_CARD`,
        );
        await context.close();
        continue;
      }
      await page.waitForTimeout(1_500);

      const cost = await page.evaluate(READ_COST);
      // A land has no cost and a run that opened one would measure nothing while
      // reporting a clean sweep, so an empty cost FAILS rather than passing.
      failures += !report(
        `${width}px · the modal's cost draws printed symbols`,
        cost !== null
          && cost.length > 0
          && cost.every((p) => p.url?.includes("/mana/"))
          && cost.every((p) => p.text === ""),
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

      // The bytes, and specifically THIS COST'S bytes. Markup alone cannot tell a
      // resolved symbol from a 404, and a 404 is what a slug that drifted from
      // its filename produces. Asked of the cost's own files rather than of
      // everything under `/mana/` the page fetched: the filter control draws the
      // five hues on `/collection` too, so a sweep of all requests reports five
      // healthy files over a modal whose every pip failed.
      // Resolved against BASE. `getComputedStyle` returns these ABSOLUTE, which is
      // why the reading works and why the slug mutation named `/mana/3-typo.svg`
      // rather than throwing — but a relative value would make `new URL` throw
      // `Invalid URL` and take the whole check down with it, and a base costs
      // nothing to pass and cannot change an already-absolute URL.
      const wanted = [
        ...new Set((cost ?? []).map((p) => p.url && new URL(p.url, BASE).pathname).filter(Boolean)),
      ];
      const served = wanted.filter((path) => loaded.get(path)?.status === 200 && loaded.get(path)?.svg);
      failures += !report(
        `${width}px · the cost's own symbols resolved`,
        wanted.length > 0 && served.length === wanted.length,
        wanted.length === 0
          ? "the cost asked for no art at all"
          : `${served.length}/${wanted.length} served as SVG`
            + (served.length === wanted.length
              ? ""
              : `; failed: ${wanted.filter((p) => !served.includes(p)).join(", ")}`),
      );

      await page.keyboard.press("Escape");

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
      // Three clauses, and the dot is the load-bearing one: a run that never
      // reached the card view reports zero pip runs while measuring nothing, and
      // only the dots tell that apart from the view drawn correctly.
      failures += !report(
        `${width}px · the card view draws no pips over art`,
        tiles.tiles > 0 && tiles.dots > 0 && tiles.pipRuns === 0,
        `${tiles.tiles} tiles, ${tiles.dots} with a marked slot, ${tiles.pipRuns} still drawing a pip run`
          + (tiles.tiles === 0 || tiles.dots === 0
            ? " — NOT a pass: the card view was never reached"
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
