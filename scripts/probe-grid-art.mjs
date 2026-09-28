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
// It makes no writes. Point it at `local-dev` or a scratch branch.
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

/** The grid's tiles: the art box each one wraps, reached by the aspect ratio only it carries. */
const TILE = 'button:has(div[style*="aspect-ratio"])';

async function walk(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const label = String(width);
  try {
    await signIn(page);
    const asked = new Set();
    page.on("request", (r) => { if (r.url().includes(IMAGE_HOST)) asked.add(r.url()); });
    await page.goto(`${BASE}/collection?view=grid`, { waitUntil: "load", timeout: 120_000 });
    if (new URL(page.url()).pathname !== "/collection") {
      throw new Error(`${label}: landed on ${page.url()}, not /collection (the About gate?)`);
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
    report(`${label}: a first screen asks for its own art, not the window's`,
      tiles >= 50 && asked.size > 0 && asked.size <= ceiling,
      `${asked.size} images asked for, ${shown} tiles on screen (ceiling ${ceiling}), ${tiles} tiles in the window`);
    if (tiles < 50) report(`${label}: the window is big enough to tell`, false, `${tiles} tiles; need 50 or more`);

    const first = await page.evaluate((sel) => {
      const tile = document.querySelector(`main ${sel}`);
      const img = tile?.querySelector("img");
      if (!img) return null;
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
    report(`${label}: the first tile's art paints`, first?.painted === true, JSON.stringify(first));
    report(`${label}: drawn as the background was (cover, centred, filling its box)`,
      first?.fit === "cover" && first?.position === "50% 50%" && first?.fills === true,
      `${first?.fit} ${first?.position} fills ${first?.fills}`);
    report(`${label}: the 1px inner edge sits over the art`,
      first?.edgeAbove === true && /inset/.test(first?.edge ?? ""), `${first?.edge}`);

    const before = asked.size;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2500);
    report(`${label}: scrolling to the foot asks for the art coming into view`,
      asked.size > before, `${before} then ${asked.size}`);
  } finally {
    await context.close();
  }
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    await walk(browser, 1300, 900);
    await walk(browser, 390, 844);
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
