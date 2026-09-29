// probe:grid-art — the /collection grid asks only for the art it can show.
//
// The grid drew each tile's art as a CSS background, and a browser fetches a CSS background for
// every rendered element whether or not it is on screen: opening the grid asked for all 200
// windowed tiles' Scryfall images at once, about 22MB, and on Chrome's Slow 4G the page's load
// event never came inside 90s (plans/2026-09-28-list-payload-shrink.md, PR 1). The art is now a
// native `loading="lazy"` <img>. What only a browser can say:
//
//   - A first screen asks for about its own art and not the window's: counted as the Scryfall
//     image requests the page made, never as a class or an attribute, which a build can carry
//     while still fetching everything.
//   - The art it shows PAINTS, drawn the way the background drew it (`object-fit: cover`,
//     centred), under the 1px inner edge, which must sit above the picture and not under it.
//   - Scrolling to the foot asks for more, so the lazy path actually loads what comes into view.
//
// At 1300x900 and at 390x844 with `?view=grid`, since the phone's default view draws no art.
// Then the same checks on the deck page's Card view and its Consider shelves, expanded, which
// drew their art as backgrounds too (a 99-card deck asked for every card at once, an expanded
// shelf for every candidate): the account's first deck on /decks, or the one `PROBE_DECK` names. It makes no writes. Point it at `local-dev` or
// a scratch branch.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const IMAGE_HOST = "cards.scryfall.io";

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
  return ok;
}

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

/**
 * The two surfaces that draw a tile's art as a lazy img: the /collection grid, whose tile wraps
 * its art box, and the deck page's Card view, whose art box IS the tile's trigger. Each is
 * reached by the aspect ratio only its art box carries.
 */
const SURFACES = {
  grid: { tile: 'button:has(div[style*="aspect-ratio"])', label: "grid", minTiles: 50 },
  deck: { tile: 'button[style*="aspect-ratio"]', label: "deck card view", minTiles: 50 },
  consider: { tile: '[role="tabpanel"] button[style*="aspect-ratio"]', label: "deck consider", minTiles: 20 },
};

/**
 * The account's FIRST deck on /decks, or the one `PROBE_DECK` names. The first is not always a
 * big one: a Card view under 50 tiles fails "the window is big enough to tell" rather than
 * measuring nothing, and `PROBE_DECK` is how to name a bigger one.
 */
async function openDeck(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "load", timeout: 120_000 });
  // `/decks/import` and `/decks/new` are links on this page too, and neither is a deck.
  // The list streams in behind the route's loading screen, so wait for a deck's own link.
  const href = process.env.PROBE_DECK
    ? `/decks/${process.env.PROBE_DECK}`
    : await page
        .waitForFunction(
          () =>
            [...document.querySelectorAll('main a[href^="/decks/"]')]
              .map((a) => a.getAttribute("href"))
              .find((h) => h && /^\/decks\/[^/?]+$/.test(h) && !["/decks/import", "/decks/new"].includes(h)) ?? false,
          null,
          { timeout: 60_000 },
        )
        .then((h) => h.jsonValue())
        .catch(() => null);
  if (!href) throw new Error("no deck on /decks to open");
  await page.goto(`${BASE}${href}`, { waitUntil: "load", timeout: 120_000 });
}

/**
 * Counted from the moment the Card view is on screen. The chosen view lives in localStorage, so
 * a fresh context opens on the List view, which asks for card images of its own: the count
 * starts at the press, or the List view's cost would land on this surface.
 */
async function openDeckCardView(page, asked) {
  await openDeck(page);
  const toggle = page.getByRole("button", { name: "Card view" }).first();
  await toggle.waitFor({ timeout: 60_000 });
  asked.clear();
  await toggle.click();
}

/**
 * The Consider shelves, EXPANDED: at the default cap a shelf draws a handful of tiles, and the
 * eager build's cost was every candidate once `Show all` is pressed. Counted from the presses.
 */
async function openConsider(page, asked) {
  await openDeck(page);
  const tab = onPage(page, "#tab-consider").first();
  await tab.waitFor({ timeout: 60_000 });
  await tab.click();
  await onPage(page, SURFACES.consider.tile).first().waitFor({ timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  asked.clear();
  // The FIRST visible `Show all`, found again after every press: a pressed one turns into `Show
  // fewer`, so a list of locators taken up front shifts under its own clicks and skips shelves.
  let pressed = 0;
  for (let guard = 0; guard < 20; guard += 1) {
    const next = onPage(page, 'button[aria-label^="Show all"]').filter({ visible: true }).first();
    if ((await next.count()) === 0) break;
    await next.click();
    pressed += 1;
  }
  if (pressed === 0) throw new Error("the Consider tab drew no Show all to press");
}

async function walk(browser, width, height, surface) {
  const { tile: TILE } = SURFACES[surface];
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const label = `${SURFACES[surface].label} ${width}`;
  try {
    await signIn(page);
    const asked = new Set();
    page.on("request", (r) => { if (r.url().includes(IMAGE_HOST)) asked.add(r.url()); });
    if (surface === "grid") {
      await page.goto(`${BASE}/collection?view=grid`, { waitUntil: "load", timeout: 120_000 });
      if (new URL(page.url()).pathname !== "/collection") {
        throw new Error(`${label}: landed on ${page.url()}, not /collection (the About gate?)`);
      }
    } else if (surface === "deck") {
      await openDeckCardView(page, asked);
    } else {
      await openConsider(page, asked);
    }
    await onPage(page, TILE).first().waitFor({ timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    const tiles = await onPage(page, TILE).count();
    const shown = await page.evaluate((sel) => [...document.querySelectorAll(`main ${sel}`)]
      .filter((b) => { const r = b.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).length, TILE);
    // Not "one screen": Chrome loads a lazy image once it is within a FIXED distance of the
    // viewport (1250px on a fast connection, 2500px on a slow one), so the first load asks for
    // several rows below the fold by design. Measured: 66 of 200 at 1300, 22 of 200 at 390. The
    // property is that it is a fraction of the window, so the ceiling is half of it; the eager
    // build asks for every tile.
    const ceiling = Math.floor(tiles / 2);
    // THE TILES' OWN ART, as whichever form a tile draws it in (a lazy img, or the background the
    // eager build painted): the deck page also asks for its commander's art and whatever its list
    // view drew before the press, and neither is a tile's.
    const tileArt = new Set(await page.evaluate((sel) => [...document.querySelectorAll(`main ${sel}`)].map((t) => {
      const img = t.querySelector("img");
      if (img) return img.getAttribute("src");
      const bg = /url\("?([^")]+)"?\)/.exec(getComputedStyle(t).backgroundImage);
      return bg ? bg[1] : null;
    }).filter(Boolean), TILE));
    const tileAsked = [...asked].filter((u) => tileArt.has(u)).length;
    // The grid's window is 200 tiles and its ceiling is half of it. A deck is at most 99 cards,
    // and at 1300 its tiles are small enough that the lazy distance reaches about 58% of them
    // (measured: 51 of 88), so there the ceiling is three quarters of the tiles with art: over
    // what the lazy build asks for, and well under the background build's every one.
    const limit = surface === "grid" ? ceiling : Math.floor(tileArt.size * 0.75);
    // NOT on the Consider shelves: a shelf draws a few tiles before its `Show all` and those load
    // before the count starts, so the request count reads the same for the background build
    // (measured: 14 against the lazy build's 20) and would pass over it. The img checks below are
    // what fail there, all eight of them.
    if (surface !== "consider") report(`${label}: a first screen asks for its own art, not the window's`,
      tiles >= SURFACES[surface].minTiles && tileAsked > 0 && tileAsked <= limit,
      `${tileAsked} tile images asked for (${asked.size} images in all), ${shown} tiles on screen (limit ${limit}), ${tileArt.size} of ${tiles} tiles with art`);
    const { minTiles } = SURFACES[surface];
    if (tiles < minTiles) report(`${label}: the window is big enough to tell`, false, `${tiles} tiles; need ${minTiles} or more`);

    // The first tile WITH ART: `imageUri` is nullable, and a card with none draws the identity
    // gradient and no img, which is correct and says nothing about how art is drawn. It is
    // brought into view and loaded before it is read, since a lazy image off screen has asked
    // for nothing yet.
    const first = await page.evaluate(async (sel) => {
      const img = [...document.querySelectorAll(`main ${sel}`)]
        .map((t) => t.querySelector("img"))
        .find(Boolean);
      if (!img) return null;
      img.scrollIntoView({ block: "center" });
      if (!img.complete) {
        await new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
          setTimeout(resolve, 15_000);
        });
      }
      const edge = img.nextElementSibling;
      const cs = getComputedStyle(img);
      const box = img.parentElement.getBoundingClientRect();
      const r = img.getBoundingClientRect();
      return {
        painted: img.complete && img.naturalWidth > 0 && img.currentSrc.includes("cards.scryfall.io"),
        fit: cs.objectFit, position: cs.objectPosition,
        fills: Math.abs(r.width - box.width) < 1 && Math.abs(r.height - box.height) < 1,
        edge: edge ? getComputedStyle(edge).boxShadow : null,
        edgeAbove: edge ? Boolean(img.compareDocumentPosition(edge) & Node.DOCUMENT_POSITION_FOLLOWING)
          && getComputedStyle(edge).position === "absolute" : false,
      };
    }, TILE);
    report(`${label}: the first tile with art paints`, first?.painted === true, JSON.stringify(first));
    report(`${label}: drawn as the background was (cover, centred, filling its box)`,
      first?.fit === "cover" && first?.position === "50% 50%" && first?.fills === true,
      `${first?.fit} ${first?.position} fills ${first?.fills}`);
    report(`${label}: the 1px inner edge sits over the art`,
      first?.edgeAbove === true && /inset/.test(first?.edge ?? ""), `${first?.edge}`);

    const before = asked.size;
    // EVERY tile brought into view in turn, not only the window scrolled: a surface can lay its
    // tiles out where one scroll does not reach them (the Consider shelves at 1300).
    await page.evaluate(async (sel) => {
      window.scrollTo(0, document.body.scrollHeight);
      for (const tile of document.querySelectorAll(`main ${sel}`)) {
        tile.scrollIntoView({ block: "nearest", inline: "nearest" });
        await new Promise((r) => setTimeout(r, 20));
      }
    }, TILE);
    await page.waitForTimeout(2500);
    // Every tile brought into view PAINTS: the lazy path loads what comes into view. Read off the
    // imgs rather than counted as requests, because a shelf's first tiles loaded before the
    // Consider presses started the count, and an image already loaded asks for nothing again.
    const painted = await page.evaluate(async (sel) => {
      const imgs = [...document.querySelectorAll(`main ${sel}`)].map((t) => t.querySelector("img")).filter(Boolean);
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline && imgs.some((i) => !(i.complete && i.naturalWidth > 0))) {
        await new Promise((r) => setTimeout(r, 250));
      }
      return { imgs: imgs.length, painted: imgs.filter((i) => i.complete && i.naturalWidth > 0).length };
    }, TILE);
    report(`${label}: every tile brought into view paints its art`,
      painted.imgs > 0 && painted.painted === painted.imgs && asked.size >= before,
      `${painted.painted} of ${painted.imgs} painted; ${before} then ${asked.size} asked`);
  } finally {
    await context.close();
  }
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    for (const surface of ["grid", "deck", "consider"]) {
      await walk(browser, 1300, 900, surface);
      await walk(browser, 390, 844, surface);
    }
  } finally {
    await browser.close();
  }
}

run()
  .catch((error) => { failures += 1; console.error(error); })
  .finally(() => {
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exitCode = failures === 0 ? 0 : 1;
  });
