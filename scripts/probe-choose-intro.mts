// pnpm probe:choose-intro (run: tsx scripts/probe-choose-intro.mts): the Help me choose intro (handoff
// `design_handoff_the99_help_me_choose/addendum-intro`), in a real browser against a real database. At 390, 1300,
// 1180x820 and 820x1180, with the reader's `user_prefs.choose_intro_seen_at` reset to null first:
//   1. /commanders/choose draws the intro open, above the form, with its title and both tiles;
//   2. the paid tile's "Go to Anything else?" moves focus to the form's box;
//   3. Hide folds it to one line and writes the mark; a reload draws it folded;
//   4. pressing the folded line opens it again and leaves the mark set;
//   5. no horizontal overflow. Shots per width.
// Writes: the reader's own `choose_intro_seen_at` (reset to null before each width and in a finally). SCRATCH BRANCH
// ONLY: refused on production, staging and local-dev by `neon.branch_id`. Fails on main, where no intro draws.
//   HMC_INTRO_PROBE_URL=<scratch branch URL> HMC_INTRO_PROBE_BRANCH=br-... PROBE_BASE=http://localhost:3258 \
//     E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app PROBE_SHOTS=<dir> tsx scripts/probe-choose-intro.mts
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Page } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { onPage } from "./lib/surface.mjs";
import { mkdirSync } from "node:fs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? "/private/tmp/claude-501/choose-intro";
const BRANCH = process.env.HMC_INTRO_PROBE_BRANCH;
const url = process.env.HMC_INTRO_PROBE_URL;
if (!url || !BRANCH) throw new Error("probe:choose-intro: set HMC_INTRO_PROBE_URL and HMC_INTRO_PROBE_BRANCH");
assertScratchBranch(BRANCH, "probe:choose-intro");
process.env.DATABASE_URL = url; // `src/db` reads it at import time, after `env.mjs` loaded `.env`.
mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { label: "390", width: 390, height: 844 },
  { label: "1300", width: 1300, height: 900 },
  { label: "1180x820", width: 1180, height: 820 },
  { label: "820x1180", width: 820, height: 1180 },
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
  const reset = (id: string) => db.execute(sql`update user_prefs set choose_intro_seen_at = null where user_id = ${id}`);
  const mark = async (id: string) => {
    const { rows } = await db.execute<{ at: string | null }>(sql`select choose_intro_seen_at as at from user_prefs where user_id = ${id}`);
    return rows[0]?.at ?? null;
  };

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
      await reset(viewer);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/commanders/choose`, { waitUntil: "domcontentloaded" });
      const open = onPage(page, '[data-choose-intro="open"]').first();
      await open.waitFor({ state: "visible", timeout: 45_000 });
      check(`${vp.label} no mark: the intro draws open`, await open.isVisible());
      check(`${vp.label} the title draws`, (await open.getByRole("heading", { name: "Describe the deck. See which commanders fit it." }).count()) === 1);
      const box = onPage(page, "#choose-words").first();
      const above = await page.evaluate(() => {
        const a = document.querySelector('main [data-choose-intro]')?.getBoundingClientRect();
        const b = document.getElementById("choose-words")?.getBoundingClientRect();
        return a && b ? a.top < b.top : false;
      });
      check(`${vp.label} the intro sits above the form`, above);
      await page.waitForTimeout(3000);
      const art = await open.evaluate((el: Element) =>
        [...el.querySelectorAll("img")]
          .filter((i) => i.getClientRects().length > 0)
          .map((i) => ({ w: i.naturalWidth, o: Number(getComputedStyle(i).opacity) })),
      );
      const wantArt = vp.width >= 768 ? 3 : 1;
      check(`${vp.label} the example draws ${wantArt} pieces of art, loaded and shown`, art.length === wantArt && art.every((a: { w: number; o: number }) => a.w > 0 && a.o > 0.5), JSON.stringify(art));
      await page.screenshot({ path: `${SHOTS}/open-${vp.label}.png` });

      const jump = onPage(page, "[data-choose-intro-jump]").first();
      const jbox = await jump.boundingBox();
      check(`${vp.label} the jump is at least 44px tall`, (jbox?.height ?? 0) >= 44, `${jbox?.height}`);
      await jump.click();
      await page.waitForTimeout(400);
      const focused = await page.evaluate(() => document.activeElement?.id ?? "");
      check(`${vp.label} the jump focuses Anything else?`, focused === "choose-words", focused);
      const inView = await box.evaluate((el: Element) => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight;
      });
      check(`${vp.label} the box is in view after the jump`, inView);

      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      check(`${vp.label} no horizontal overflow`, sw[0] <= sw[1], `${sw[0]} vs ${sw[1]}`);

      await page.evaluate(() => window.scrollTo(0, 0));
      await onPage(page, '[data-choose-intro="open"] button').filter({ hasText: /^Hide$/ }).first().click();
      const folded = onPage(page, '[data-choose-intro="folded"]').first();
      await folded.waitFor({ state: "visible", timeout: 5_000 });
      check(`${vp.label} Hide folds it to one line`, await folded.isVisible());
      const fbox = await folded.boundingBox();
      check(`${vp.label} the folded line is at least 44px tall`, (fbox?.height ?? 0) >= 44, `${fbox?.height}`);
      await page.waitForTimeout(1500);
      check(`${vp.label} Hide writes the mark`, (await mark(viewer)) != null);
      await page.screenshot({ path: `${SHOTS}/folded-${vp.label}.png` });

      await page.reload({ waitUntil: "domcontentloaded" });
      await folded.waitFor({ state: "visible", timeout: 45_000 });
      check(`${vp.label} a reload draws it folded`, (await onPage(page, '[data-choose-intro="open"]').count()) === 0);
      // The folded line is server-drawn; wait for hydration before pressing it.
      await page.waitForLoadState("load");
      await page.waitForTimeout(1500);

      await folded.click();
      await open.waitFor({ state: "visible", timeout: 5_000 });
      check(`${vp.label} the folded press opens it again`, await open.isVisible());
      await page.waitForTimeout(800);
      check(`${vp.label} opening it again leaves the mark set`, (await mark(viewer)) != null);
    }
  } finally {
    if (viewer) await reset(viewer).catch((err) => console.error("cleanup: reset failed", err));
    await browser.close();
  }
  console.log(failed ? `\n${failed} FAILED` : "\nall passed");
  process.exit(failed ? 1 : 0);
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
