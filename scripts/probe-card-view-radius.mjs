// probe:card-view-radius — a card tile's corner clears Scryfall's matte at every width, in a real browser.
//
// Scryfall's card images carry a corner matte whose radius is ~3.1% of the rendered width, so a tile
// whose own corner rounds less than that lets the matte show. The deck Card view's tile used a fixed
// 9px (10px from md), which was enough up to ~290px of tile and not at 480-767px, where two columns
// stretch a tile to ~361px (3.1% = 11px). The tile's root now carries a size container and the shell
// and the art box round by max(9px, 3.4cqw). This reads the COMPUTED radius in the page, at the
// widths that matter (390, 480, 600, 767, 1300), on the precon page's read-only tile (it draws the
// same constants as the deck tile and needs no deck), for the shell's top-left corner against the
// shell's width and the art button's bottom-left corner against its width. The bar is 3.1%.
//
// Needs a server with PRECONS_ENABLED=true and precons seeded (pnpm db:seed:precons). Writes nothing.
//
//   PRECONS_ENABLED=true pnpm build && PRECONS_ENABLED=true node node_modules/next/dist/bin/next start -p 3612
//   PROBE_BASE=http://localhost:3612 pnpm probe:card-view-radius
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
if (/the-99\.dev|vercel\.app/.test(BASE) && !/staging/.test(BASE)) throw new Error(`refusing ${BASE}`);

const MATTE = 0.031;
const WIDTHS = [390, 480, 600, 767, 1300];
const VIEW_KEY = "the99:precons:openView";

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} - ${detail}`);
  if (!ok) failures += 1;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test") ? await signIn.create({ identifier: email }) : await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
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
  return page.evaluate(() => window.Clerk.user?.id ?? null);
}


await clerkSetup();
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  await signIn(page);
  await page.goto(`${BASE}/decks/precons?view=rows`, { waitUntil: "domcontentloaded" });
  const href = await page.locator('a[href^="/decks/precons/"]').first().getAttribute("href", { timeout: 30_000 });
  if (!href) throw new Error("no precon link on /decks/precons: seed them (pnpm db:seed:precons).");
  await page.evaluate((key) => localStorage.setItem(key, "card"), VIEW_KEY);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
    const tile = page.locator('[data-testid="read-only-card-tile"]').first();
    await tile.waitFor({ state: "attached", timeout: 30_000 });
    const m = await tile.evaluate((li) => {
      const shell = li.firstElementChild;
      const art = shell.querySelector("button");
      const px = (v) => parseFloat(v);
      const s = getComputedStyle(shell);
      const a = getComputedStyle(art);
      return {
        shellW: shell.getBoundingClientRect().width, shellR: px(s.borderTopLeftRadius),
        artW: art.getBoundingClientRect().width, artR: px(a.borderBottomLeftRadius),
      };
    });
    report(`shell corner at ${width}`, m.shellR >= MATTE * m.shellW - 0.01, `${m.shellR.toFixed(2)}px of ${m.shellW.toFixed(0)}px = ${((100 * m.shellR) / m.shellW).toFixed(2)}% (bar ${(MATTE * 100).toFixed(1)}%)`);
    report(`art corner at ${width}`, m.artR >= MATTE * m.artW - 0.01, `${m.artR.toFixed(2)}px of ${m.artW.toFixed(0)}px = ${((100 * m.artR) / m.artW).toFixed(2)}%`);
  }
} finally {
  await browser.close();
}
console.log(failures === 0 ? "\nall ok" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
