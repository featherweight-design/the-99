// probe:card-art-corners — no card tile shows the image's own corner matte, in PAINTED
// PIXELS, and the hover preview hangs off the pointer rather than straddling it.
//
// WHY PIXELS. Scryfall's `normal` images are JPEGs, so they carry no alpha and the area
// outside the card's rounded corner is a painted matte — white on some printings, black on
// others (5 of 12 sampled on 2026-09-21 are white). A tile whose art box has square bottom
// corners therefore draws a pale notch above its caption on those printings and nothing at
// all on the rest, which is why it shipped: the defect is a property of the CARD, not of
// the component, and every unit test on these tiles passes either way. jsdom computes no
// styles and loads no images, so the only instrument that can see it is a screenshot.
//
// It reads the corner out of a real screenshot of the art box and fails on a near-white
// pixel there. A class-list assertion would be the weaker check twice over — it cannot say
// the radius is BIG ENOUGH for the width the box actually renders at, and it cannot see a
// second element painting over the clip.
//
// THE FIXTURE IS CHOSEN BY ITS MATTE, and that is the whole reason this probe can measure
// anything. It reads each tile's background image URL, fetches the bytes, samples the
// image's own corner pixel, and measures the first tile whose matte is WHITE. A run that
// picks a black-matte printing reads a dark corner on a broken build and reports a pass —
// so a surface with no white-matte card on screen FAILS as "measured nothing" rather than
// passing quietly.
//
// THE HOVER PREVIEW is here rather than in `probe:hover-preview` because that script is
// explicit about what it cannot reach: the vertical rule needs the pointer near the
// window's foot AND inside a row, and both of its surfaces have furniture there. This one
// asks a different question — where the box sits RELATIVE TO THE POINTER at a height where
// both answers are available — which needs neither the foot of the window nor a clamp.
//
// Run by hand, and not part of `pnpm test`:
//   node scripts/probe-card-art-corners.mjs
//   PROBE_BASE=http://localhost:3612 node scripts/probe-card-art-corners.mjs
//
// Point it at `local-dev`. It makes no writes.
import { Buffer } from "node:buffer";

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";

import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 }, hasTouch: false },
  // `hasTouch` IS THE PHONE. A 390px context with Playwright's default pointer reports
  // `(pointer: fine)`, so the app opens hover affordances there and a run that omitted it
  // would measure a surface no phone draws.
  { label: 390, viewport: { width: 390, height: 844 }, hasTouch: true },
];

/**
 * A pixel this bright inside a card's corner is the JPEG's matte. The card's own art
 * reaches it nowhere: the corner is inside the black border on every frame Magic prints,
 * so the only thing that can be white there is the matte.
 */
const WHITE = 210;
/** The corner square to read, in CSS px. The matte's arc is ~3.1% of the box's width. */
const CORNER = 7;

let failures = 0;
function report(label, ok, detail) {
  // The count lives here rather than at each call site: a check that forgot to add one
  // printed FAIL and then "All checks passed" over the top — the trap `probe:card-mark`
  // and `probe:commander-availability` both had to fix.
  if (!ok) failures += 1;
  console.log(`${ok ? " ok  " : " FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
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
        if (attempt.status === "needs_first_factor") {
          const factor = attempt.supportedFirstFactors.find((f) => f.strategy === "email_code");
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
 * Every art box on the page that is painting a Scryfall card image, as an element HANDLE.
 *
 * Handles rather than rects, because the box is photographed with `elementHandle.screenshot`
 * — which scrolls the element into view for itself. A `clip` read off a rect fails outright
 * ("clipped area is either empty or outside the resulting image") the moment a tile sits
 * below the fold, which on a 99-card grid is most of them.
 */
async function readArtBoxes(page) {
  const handles = await page.$$("main *");
  const boxes = [];
  for (const handle of handles) {
    const info = await handle.evaluate((el) => {
      const cs = getComputedStyle(el);
      // Either way a surface paints its art: a CSS background, or (the /collection grid,
      // since its art loads lazily) an <img> clipped by its box — whose radius is the box's.
      const isImg = el.tagName === "IMG";
      const url = isImg
        ? el.currentSrc || el.getAttribute("src")
        : (cs.backgroundImage.match(/url\("?([^")]+)"?\)/) ?? [])[1];
      if (!url || !url.includes("cards.scryfall.io")) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) return null;
      // A CARD-SHAPED box, 63:88. The deck page also paints its commander banner
      // from a Scryfall image at 560x288, and the first version measured THAT while
      // naming the tile — a probe reporting on a surface it never reached. The
      // banner crops its art and has no caption under it, so it is a different
      // ruling as well as a different element.
      if (Math.abs(r.width / r.height - 63 / 88) > 0.02) return null;
      const clip = isImg && el.parentElement ? getComputedStyle(el.parentElement) : cs;
      return { url, w: r.width, h: r.height, radius: clip.borderBottomLeftRadius };
    });
    if (info) boxes.push({ ...info, handle });
  }
  return boxes;
}

/**
 * Does this printing's JPEG carry a WHITE matte outside its rounded corner?
 *
 * Decoding a JPEG needs a decoder this repository does not have, so the sample is taken in
 * the PAGE — an `<img>` drawn to a canvas, same-origin rules satisfied by `crossOrigin`,
 * which `cards.scryfall.io` serves. A card whose corner pixel is dark cannot show the
 * defect at any radius and is no use as a fixture.
 */
function hasWhiteMatte(page, url) {
  return page.evaluate(async (src) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    try {
      await img.decode();
    } catch {
      return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    try {
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return Math.min(r, g, b) > 210;
    } catch {
      // A tainted canvas is a missing CORS header, not a black matte. Say so rather than
      // reporting every card as dark, which would silently disable the whole probe.
      return null;
    }
  }, url);
}

/**
 * The whitest pixel in each of the art box's two BOTTOM corners, as `max(min(r,g,b))`.
 *
 * The darkest channel per pixel, so a saturated colour never reads as white; the maximum of
 * those over the corner square is how white its whitest pixel is.
 *
 * THE BOX IS SCROLLED IN AND RE-MEASURED FIRST, and the sample is clipped out of a VIEWPORT
 * screenshot at that rect. `elementHandle.screenshot()` looked like the tidier way to do it
 * and was wrong: on the deck's Card view it returned a frame whose content was inset and
 * whose foot held the caption below the art, so the corner square landed on the tile plate
 * and read 14 — a clean pass on a build with the clip removed. A rect and a clip in the same
 * coordinate space cannot drift like that.
 */
async function cornerSamples(page, box) {
  // CENTRED rather than `scrollIntoViewIfNeeded`, which stops as soon as the element is
  // nominally visible: it left a 250.03px tile with its foot 0.03px past a 900px viewport,
  // and a clip one hundredth of a pixel outside the image is refused outright.
  await box.handle.evaluate((el) => el.scrollIntoView({ block: "center" }));
  // A lazy <img> starts loading only once it is near the viewport, so a corner sampled at once
  // reads the box's own ground. Wait for the picture itself (or its failure) first.
  await box.handle.evaluate((el) =>
    el.tagName === "IMG" && !el.complete
      ? new Promise((resolve) => { el.addEventListener("load", resolve, { once: true }); el.addEventListener("error", resolve, { once: true }); })
      : null,
  );
  await page.waitForTimeout(250);
  const rect = await box.handle.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height,
             inView: r.top >= 0 && r.bottom <= window.innerHeight
                     && r.left >= 0 && r.right <= window.innerWidth };
  });
  if (!rect.inView) return null;
  const side = Math.min(CORNER, Math.floor(rect.w / 4), Math.floor(rect.h / 4));
  const bottom = Math.round(rect.y + rect.h) - side;
  const squares = [
    { side: "bottom-left", x: Math.round(rect.x) },
    { side: "bottom-right", x: Math.round(rect.x + rect.w) - side },
  ];
  const out = [];
  for (const square of squares) {
    const png = await page.screenshot({
      clip: { x: square.x, y: bottom, width: side, height: side },
    });
    const max = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, img.width, img.height);
      let worst = 0;
      for (let p = 0; p < data.length; p += 4) {
        worst = Math.max(worst, Math.min(data[p], data[p + 1], data[p + 2]));
      }
      return worst;
    }, Buffer.from(png).toString("base64"));
    out.push({ side: square.side, max });
  }
  return out;
}

async function measureSurface(page, label, surface) {
  const boxes = await readArtBoxes(page);
  if (!report(`${label}px · ${surface} · found card art`, boxes.length > 0, `${boxes.length} box(es)`)) {
    return;
  }

  // The FIRST white-matte printing on screen. Black-matte cards cannot show the defect, so
  // a run that measured one would pass on a broken build.
  //
  // EVERY box is examined rather than a leading slice of them. A cap looked harmless — the
  // matte is white on 5 of 12 printings sampled, so the first few tiles almost always carry
  // one — but "almost always" is the shape of a check that fails for a reason unrelated to
  // the code, on the one grid whose first N happen to be black. It costs nothing to be sure:
  // the loop stops at the first white matte, and the images are already decoded by the page.
  let fixture = null;
  let tainted = 0;
  let examined = 0;
  for (const box of boxes) {
    examined += 1;
    const white = await hasWhiteMatte(page, box.url);
    if (white === null) tainted += 1;
    if (white) { fixture = box; break; }
  }
  if (!report(
    `${label}px · ${surface} · a white-matte printing is on screen to measure`,
    fixture !== null,
    fixture
      ? `${Math.round(fixture.w)}x${Math.round(fixture.h)}px box, radius ${fixture.radius}, ${fixture.url.slice(-28)} (${examined} examined)`
      : `none among ${examined} tiles${tainted ? `, ${tainted} unreadable` : ""}`,
  )) {
    return;
  }

  const samples = await cornerSamples(page, fixture);
  // A box that will not fit on screen cannot be sampled honestly, and saying so beats
  // reporting a pass over pixels nobody read.
  if (!report(
    `${label}px · ${surface} · the art box fits on screen to be photographed`,
    samples !== null,
    samples ? null : "the tile is larger than the viewport",
  )) {
    return;
  }
  for (const { max, side } of samples) {
    report(
      `${label}px · ${surface} · no matte at the art's ${side}`,
      max < WHITE,
      `brightest ${max} (white is ${WHITE}+)`,
    );
  }
}

const browser = await chromium.launch();
try {
  await clerkSetup();
  for (const { label, viewport, hasTouch } of WIDTHS) {
    const context = await browser.newContext({ viewport, hasTouch });
    const page = await context.newPage();
    try {
      await signIn(page);

      // `/collection`'s grid, EXPLICITLY `view=grid`: with no parameter the view resolves
      // to `isDesktop ? "grid" : "rows"`, and the rows draw no card art at all — so a 390
      // run taking the default would measure nothing and say it passed.
      await page.goto(`${BASE}/collection?view=grid`, { waitUntil: "domcontentloaded" });
      // Wait for the ART itself. A container, a button or a link can all be present (or
      // hidden behind a breakpoint) while no tile has painted, and this probe's whole
      // subject is a painted pixel.
      await page.waitForFunction(
        () => [...document.querySelectorAll("main *")].some((el) =>
          (getComputedStyle(el).backgroundImage || "").includes("cards.scryfall.io")
          || (el.tagName === "IMG" && el.complete && (el.currentSrc || "").includes("cards.scryfall.io"))),
        null,
        { timeout: 30_000 },
      );
      await page.waitForTimeout(1500);
      await measureSurface(page, label, "collection grid");

      // The deck's Card view is reached by a PRESS rather than a URL, which is how it once
      // shipped with no mark and no key behind a clean URL sweep.
      await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      const links = onPage(page, 'a[href^="/decks/"]');
      let href = null;
      for (let i = 0; i < (await links.count()); i += 1) {
        const value = await links.nth(i).getAttribute("href");
        if (value && /^\/decks\/[0-9a-f-]{36}$/.test(value)) { href = value; break; }
      }
      if (!report(`${label}px · deck card view · found a deck to open`, href !== null)) continue;
      await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      const toggle = page.getByRole("button", { name: "Card view" }).first();
      if (!report(`${label}px · deck card view · the view control is there`, await toggle.count() > 0)) {
        continue;
      }
      await toggle.click();
      await page.waitForTimeout(2500);
      await measureSurface(page, label, "deck card view");

      // THE HOVER PREVIEW, on the decklist behind that view. Asserted as a RELATION to the
      // pointer — below it where the box fits, above it where it does not — never against
      // a coordinate, which would be a fact about one window height.
      await page.getByRole("button", { name: "List view" }).first().click().catch(() => {});
      await page.waitForTimeout(1200);
      if (label === 390) {
        // The preview is `hidden md:block` AND refuses a coarse pointer. Both are the
        // design; there is nothing to measure here and saying so beats a silent skip.
        console.log(" note 390px · hover preview · not drawn on a phone, by design");
        continue;
      }
      // `[data-decklist-row]` is the attribute `probe:hover-preview` uses, and the
      // rows are divs rather than list items — an `li` sweep finds the shell's own
      // lists and hovers furniture.
      const rows = onPage(page, "[data-decklist-row]");
      const count = await rows.count();
      let opened = null;
      for (let i = 0; i < Math.min(count, 10) && !opened; i += 1) {
        const row = rows.nth(i);
        const r = await row.boundingBox();
        if (!r || r.width < 80) continue;
        await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
        await page.waitForTimeout(500);
        const box = page.locator('[data-testid="hover-preview"]');
        if (await box.count()) opened = { row: r, box: await box.boundingBox() };
      }
      if (!report(
        `${label}px · hover preview · opened over a row`,
        opened !== null,
        // A row whose card has no art is a no-op by design, so this says which of the two
        // it could not tell apart rather than blaming the placement.
        opened ? null : "no row opened the preview — art missing, or the box never mounted",
      )) {
        continue;
      }
      const cursorY = opened.row.y + opened.row.height / 2;
      const fitsBelow = cursorY + 18 + 352 + 8 <= viewport.height;
      report(
        `${label}px · hover preview · hangs ${fitsBelow ? "below" : "above"} the pointer`,
        fitsBelow ? opened.box.y >= cursorY : opened.box.y + opened.box.height <= cursorY + 1,
        `cursor ${Math.round(cursorY)}px, box ${Math.round(opened.box.y)}→${Math.round(opened.box.y + opened.box.height)}px`,
      );
      report(
        `${label}px · hover preview · does not straddle the pointer`,
        opened.box.y >= cursorY - 1 || opened.box.y + opened.box.height <= cursorY + 1,
        "the retired rule centred the box on the cursor",
      );
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
// `process.exit` inside a `finally` swallows a throw — the trap three probes here have
// already paid for. The exit code is set at the end, after every check has run.
process.exitCode = failures === 0 ? 0 : 1;
