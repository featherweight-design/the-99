// pnpm probe:find-a-deck (run: tsx scripts/probe-find-a-deck.mts): tool discovery PR A, the collection's Find a deck
// call-out and buttons, in a real browser against a real database. The signed-in `+clerk_test` account must have a deck
// with a commander and at least one card in no deck (local-dev's snapshot does). At 390 and 1300:
//   1. on All (`/collection?view=rows`), the call-out draws (`all`), and `Show them` narrows the list to `avail=free`;
//   2. on Free alone the call-out drops `Show them`, and each row carries a Find a deck button: the strip on a phone,
//      the side button from md, the other one hidden;
//   3. pressing the row's button opens the card window straight on the Find a deck view (`fits-view`), Back returns to
//      the card's details, and Escape hands focus back to the button;
//   4. in the grid, each tile carries the button and it opens the same view;
//   5. the ✕ hides the call-out, writes `user_prefs.find_a_deck_closed_at`, and a reload draws none;
//   6. no horizontal overflow. Shots per width.
// Writes: the reader's own `find_a_deck_closed_at` (reset to null before each width and in a finally). SCRATCH BRANCH
// ONLY: refused on production, staging and local-dev by `neon.branch_id`. Fails on main, where no call-out draws.
//   FAD_PROBE_URL=<scratch branch URL> FAD_PROBE_BRANCH=br-... PROBE_BASE=http://localhost:3200 \
//     E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app PROBE_SHOTS=<dir> tsx scripts/probe-find-a-deck.mts
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Page } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { onPage } from "./lib/surface.mjs";
import { mkdirSync } from "node:fs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? "/private/tmp/claude-501/find-a-deck";
const BRANCH = process.env.FAD_PROBE_BRANCH;
const url = process.env.FAD_PROBE_URL;
if (!url || !BRANCH) throw new Error("probe:find-a-deck: set FAD_PROBE_URL and FAD_PROBE_BRANCH");
assertScratchBranch(BRANCH, "probe:find-a-deck");
process.env.DATABASE_URL = url; // `src/db` reads it at import time, after `env.mjs` loaded `.env`.
mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { label: "390", width: 390, height: 844, place: "strip", hidden: "side" },
  { label: "1300", width: 1300, height: 900, place: "side", hidden: "strip" },
] as const;

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function signIn(page: Page): Promise<string> {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as any).Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = (window as any).Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f: any) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await (window as any).Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error: any) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  const id = await page.evaluate(() => (window as any).Clerk.user?.id as string | undefined);
  if (!id) throw new Error("no Clerk user id after sign-in");
  return id;
}

async function main() {
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows: who } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (who[0]?.b !== BRANCH) throw new Error(`database reports ${who[0]?.b}, not ${BRANCH}; nothing written`);
  const reopen = (id: string) => db.execute(sql`update user_prefs set find_a_deck_closed_at = null where user_id = ${id}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  let viewer: string | null = null;
  try {
    await clerkSetup();
    viewer = await signIn(page);
    console.log(`target ${BRANCH}, reader signed in`);

    for (const vp of VIEWPORTS) {
      console.log(`\n== ${vp.label}`);
      await reopen(viewer);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/collection?view=rows`, { waitUntil: "domcontentloaded" });
      const callout = onPage(page, "[data-find-a-deck-callout]").first();
      await callout.waitFor({ state: "visible", timeout: 30_000 });
      check(`${vp.label} All: the call-out draws`, (await callout.getAttribute("data-find-a-deck-callout")) === "all");
      const title = ((await callout.textContent()) ?? "").replace(/\s+/g, " ");
      check(`${vp.label} All: the title counts the Free cards`, /\d+ of your cards? (are|is) in no deck/.test(title), title.slice(0, 120));
      check(`${vp.label} All: no button beside a card yet`, (await onPage(page, "[data-find-a-deck]").count()) === 0);
      await page.screenshot({ path: `${SHOTS}/all-${vp.label}.png` });

      await callout.locator("[data-find-a-deck-show]").click();
      await page.waitForFunction(() => new URLSearchParams(location.search).get("avail") === "free", null, { timeout: 15_000 });
      check(`${vp.label} Show them narrows to Free`, new URL(page.url()).searchParams.get("avail") === "free");
      await onPage(page, '[data-find-a-deck-callout="free"]').first().waitFor({ state: "visible", timeout: 15_000 });
      check(`${vp.label} Free: no Show them`, (await onPage(page, "[data-find-a-deck-show]").count()) === 0);

      const shown = onPage(page, `[data-find-a-deck="${vp.place}"]`).first();
      await shown.waitFor({ state: "visible", timeout: 15_000 });
      check(`${vp.label} Free rows: the ${vp.place} button shows`, await shown.isVisible());
      check(`${vp.label} Free rows: the ${vp.hidden} button is hidden`, !(await onPage(page, `[data-find-a-deck="${vp.hidden}"]`).first().isVisible()));
      const box = await shown.boundingBox();
      check(`${vp.label} the button is at least 34px tall`, (box?.height ?? 0) >= 34, `${box?.height}`);
      await page.screenshot({ path: `${SHOTS}/free-rows-${vp.label}.png` });

      const aria = (await shown.getAttribute("aria-label")) ?? "";
      await shown.click();
      // The card window is portalled outside <main>, so this one is page-scoped.
      const picker = page.locator('[role="dialog"] [data-testid="fits-view"]').first();
      await picker.waitFor({ state: "visible", timeout: 20_000 });
      check(`${vp.label} the row button opens on Find a deck`, await picker.isVisible());
      // The view's body waits for the deck list and the panel; it must arrive, not hang blank.
      await picker.locator("section").first().waitFor({ state: "visible", timeout: 30_000 });
      check(`${vp.label} the view's body draws`, (await picker.locator("section").count()) > 0);
      await page.screenshot({ path: `${SHOTS}/fits-from-row-${vp.label}.png` });
      await page.locator('[role="dialog"] [data-testid="fits-view-back"]').first().click();
      await picker.waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
      check(`${vp.label} Back leaves Find a deck for the card's details`, (await picker.count()) === 0 && (await page.locator('[role="dialog"]').count()) > 0);
      await page.keyboard.press("Escape");
      await picker.waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(400);
      const back = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
      check(`${vp.label} Escape hands focus back to the button`, back === aria, `${back} vs ${aria}`);

      await page.goto(`${BASE}/collection?view=grid&avail=free`, { waitUntil: "domcontentloaded" });
      const tile = onPage(page, '[data-find-a-deck="tile"]').first();
      await tile.waitFor({ state: "visible", timeout: 30_000 });
      await page.screenshot({ path: `${SHOTS}/free-grid-${vp.label}.png` });
      await tile.click();
      await picker.waitFor({ state: "visible", timeout: 20_000 });
      check(`${vp.label} the tile button opens on Find a deck`, await picker.isVisible());
      // Escape steps back out of the view first, then closes the window.
      for (let i = 0; i < 3 && (await page.locator('[role="dialog"]').count()) > 0; i++) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      }
      check(`${vp.label} the window closes`, (await page.locator('[role="dialog"]').count()) === 0);

      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      check(`${vp.label} no horizontal overflow`, sw[0] <= sw[1], `${sw[0]} vs ${sw[1]}`);

      await onPage(page, "[data-find-a-deck-dismiss]").first().click();
      check(`${vp.label} the ✕ hides the call-out`, (await onPage(page, "[data-find-a-deck-callout]").count()) === 0);
      await page.waitForTimeout(1500);
      const { rows } = await db.execute<{ at: string | null }>(sql`select find_a_deck_closed_at as at from user_prefs where user_id = ${viewer}`);
      check(`${vp.label} the ✕ writes the close`, rows[0]?.at != null);
      await page.reload({ waitUntil: "domcontentloaded" });
      await onPage(page, '[data-find-a-deck="tile"]').first().waitFor({ state: "visible", timeout: 30_000 });
      check(`${vp.label} a reload draws no call-out`, (await onPage(page, "[data-find-a-deck-callout]").count()) === 0);
    }
  } finally {
    if (viewer) await reopen(viewer).catch((err) => console.error("cleanup: reopen failed", err));
    await browser.close();
  }
  console.log(failed ? `\n${failed} FAILED` : "\nall passed");
  process.exit(failed ? 1 : 0);
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
