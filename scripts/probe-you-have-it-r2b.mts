// pnpm probe:you-have-it-r2b (run: tsx scripts/probe-you-have-it-r2b.mts): You have it R2, PR 2, the below-threshold hint, in a
// real browser against a real database. The signed-in `+clerk_test` account is the reader (raised to an Offer threshold of 2
// for the run); a per-run made-up id is the friend and wants three cards: one the reader can offer (spare >= 2), one under
// the threshold (one spare), one they hold none of. Then, on a friend's Wishlist tab:
//   1. the under tile draws a press (dashed, own aria `... under your threshold of 2`), the key names `under your threshold`,
//      the call-out says `1 more is under your threshold`, the filter counts and shows the offerable card only;
//   2. its sheet draws the row `under your threshold of 2`, NO Offer, the foot, and `Change it in Settings` linking to
//      /settings#settings-spares, which loads Settings with the Spares heading in view and the new pointer sentence;
//   3. with only the under card wanted, the call-out reads `You have 1 spare under your threshold` and draws no filter;
//   4. no horizontal overflow at 390 and 1300. Shots per width.
// Writes: the friend (purged in a finally), the friendship, wishlist rows, the reader's `spare_min` (restored). SCRATCH BRANCH
// ONLY: refused on production, staging and local-dev by `neon.branch_id`. Fails on main, where an under spare draws nothing.
//   YHI_PROBE_URL=<scratch branch URL> YHI_PROBE_BRANCH=br-... PROBE_BASE=http://localhost:3200 \
//     E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app PROBE_SHOTS=<dir> tsx scripts/probe-you-have-it-r2b.mts
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Page } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { onPage } from "./lib/surface.mjs";
import { mkdirSync } from "node:fs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? "/private/tmp/claude-501/yhi/r2b";
const BRANCH = process.env.YHI_PROBE_BRANCH;
const url = process.env.YHI_PROBE_URL;
if (!url || !BRANCH) throw new Error("probe:you-have-it-r2b: set YHI_PROBE_URL and YHI_PROBE_BRANCH");
assertScratchBranch(BRANCH, "probe:you-have-it-r2b");
process.env.DATABASE_URL = url; // `src/db` reads it at import time, after `env.mjs` loaded `.env`.
mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { label: "390", width: 390, height: 844 },
  { label: "1300", width: 1300, height: 900 },
];
const run = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const WANTER = `probe-yhi-w-${run}`;

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
  const friends = await import("../src/lib/social/friends");
  const { loadOwnOffered } = await import("../src/lib/social/spares");
  const { purgeAccount } = await import("../src/lib/account/purge");

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  let viewer = "";
  let priorMin: number | null = null;
  try {
    await clerkSetup();
    viewer = await signIn(page);
    console.log(`target ${BRANCH}, reader signed in, friend ${WANTER}`);
    priorMin = ((await db.execute<{ m: number }>(sql`select spare_min as m from user_prefs where user_id = ${viewer}`)).rows[0]?.m) ?? null;
    await db.execute(sql`insert into user_prefs (user_id, spare_min) values (${viewer}, 1) on conflict (user_id) do update set spare_min = 1`);
    // At a threshold of 1 every spare is offered, with its count: pick one with two or more and one with exactly one.
    const { rows: mine } = await db.execute<{ oracle_id: string }>(sql`select oracle_id from collection_items where user_id = ${viewer} group by oracle_id limit 400`);
    const counts = await loadOwnOffered(viewer, mine.map((r) => r.oracle_id));
    const hi = [...counts].find(([, n]) => n >= 2)?.[0];
    const lo = [...counts].find(([, n]) => n === 1)?.[0];
    if (!hi || !lo) throw new Error(`the reader needs a card with 2+ spares and one with exactly 1 (has ${counts.size} spare cards)`);
    await db.execute(sql`update user_prefs set spare_min = 2 where user_id = ${viewer}`);
    const nameOf = async (id: string) => ((await db.execute<{ name: string }>(sql`select name from cards where oracle_id = ${id}`)).rows[0].name.split(" // ")[0]);
    const loName = await nameOf(lo);

    await friends.ensureProfile(viewer, "Alpha");
    await friends.ensureProfile(WANTER, "Max");
    const inv = await friends.createInvite(WANTER);
    if (!inv.ok) throw new Error("createInvite refused");
    await friends.redeemInvite(viewer, inv.token);
    const pub = (await db.execute<{ p: string }>(sql`select public_id::text as p from social_profiles where user_id = ${WANTER}`)).rows[0].p;
    const want = (o: string) => db.execute(sql`insert into wishlist_items (user_id, oracle_id, quantity) values (${WANTER}, ${o}, 1)`);
    await want(hi);
    await want(lo);
    const { rows: other } = await db.execute<{ oracle_id: string }>(sql`
      select c.oracle_id from cards c where c.oracle_id not in (${hi}, ${lo}) and exists (select 1 from printings p where p.oracle_id = c.oracle_id)
        and not exists (select 1 from collection_items ci where ci.user_id = ${viewer} and ci.oracle_id = c.oracle_id) order by c.oracle_id limit 1`);
    await want(other[0].oracle_id);

    for (const vp of VIEWPORTS) {
      console.log(`\n== ${vp.label}`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/friends/${pub}/wishlist`, { waitUntil: "domcontentloaded" });
      const callout = onPage(page, '[data-testid="have-callout"]').first();
      await callout.waitFor({ state: "attached", timeout: 30_000 });
      const ct = ((await callout.textContent()) ?? "").replace(/\s+/g, " ");
      check(`${vp.label} call-out counts the offerable card and names the under one`, /You have 1 to spare/.test(ct) && ct.includes("1 more is under your threshold."), ct.slice(0, 200));
      const key = ((await onPage(page, '[data-testid="have-key"]').first().textContent()) ?? "");
      check(`${vp.label} key names the under tile`, key.includes("under your threshold") && key.includes("you can spare"), key);
      check(`${vp.label} two presses`, (await onPage(page, '[data-testid="have-press"]').count()) === 2);
      const under = onPage(page, `[data-testid="have-press"][aria-label*="${loName}"]`).first();
      check(`${vp.label} the under press has its own aria`, ((await under.getAttribute("aria-label")) ?? "") === `You have a spare ${loName}, under your threshold of 2`, (await under.getAttribute("aria-label")) ?? "");
      const bs = await under.evaluate((el: Element) => getComputedStyle(el).borderTopStyle);
      check(`${vp.label} the under press is dashed`, bs === "dashed", bs);
      const tiles = () => onPage(page, "ul.grid > li").count();
      for (let t = 0; t < 8 && (await tiles()) !== 1; t++) {
        await onPage(page, 'button:has-text("You can spare")').first().click();
        await page.waitForTimeout(400);
      }
      check(`${vp.label} the filter holds the offerable card only`, (await tiles()) === 1);
      await onPage(page, 'button:has-text("All")').first().click();
      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      check(`${vp.label} no horizontal overflow`, sw[0] <= sw[1], `${sw[0]} vs ${sw[1]}`);
      await page.screenshot({ path: `${SHOTS}/wishlist-${vp.label}.png`, fullPage: true });

      await under.click();
      const sheet = onPage(page, '[data-testid="have-sheet"]').first();
      await sheet.waitFor({ state: "visible", timeout: 10_000 });
      await page.waitForTimeout(700);
      const st = ((await sheet.textContent()) ?? "").replace(/\s+/g, " ");
      check(`${vp.label} sheet row reads under your threshold of 2`, st.includes("under your threshold of 2") && st.includes("1 spare"), st.slice(0, 220));
      check(`${vp.label} sheet draws no Offer`, (await sheet.locator('[data-testid="have-offer"]').count()) === 0);
      check(`${vp.label} sheet foot`, st.includes("You offer a card only when you have 2 or more spare copies."));
      const link = sheet.locator('[data-testid="have-settings"]');
      check(`${vp.label} sheet links to Settings Spares`, (await link.getAttribute("href")) === "/settings#settings-spares");
      await page.screenshot({ path: `${SHOTS}/sheet-${vp.label}.png` });
      await link.click();
      await page.waitForURL(/\/settings/, { timeout: 30_000 });
      const head = onPage(page, "#settings-spares").first();
      await head.waitFor({ state: "attached", timeout: 30_000 });
      const pointer = onPage(page, "text=This also decides which cards you can offer from a friend’s wishlist.").first();
      check(`${vp.label} Settings carries the pointer sentence`, (await pointer.count()) === 1);
      await page.waitForTimeout(500);
      const hb = await head.boundingBox();
      check(`${vp.label} the Spares heading is in view after the link`, !!hb && hb.y >= -2 && hb.y < vp.height, `y=${hb?.y}`);
      await page.screenshot({ path: `${SHOTS}/settings-${vp.label}.png` });
    }

    // Only the under card wanted: no offerable spare, so no filter and the call-out speaks of the threshold alone.
    await db.execute(sql`delete from wishlist_items where user_id = ${WANTER} and oracle_id = ${hi}`);
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/friends/${pub}/wishlist`, { waitUntil: "domcontentloaded" });
      const callout = onPage(page, '[data-testid="have-callout"]').first();
      await callout.waitFor({ state: "attached", timeout: 30_000 });
      const ct = ((await callout.textContent()) ?? "").replace(/\s+/g, " ");
      check(`${vp.label} only-under call-out`, ct.includes("You have 1 spare under your threshold") && ct.includes(loName) && ct.includes("change it in Settings › Spares"), ct.slice(0, 220));
      check(`${vp.label} only-under draws no filter`, (await onPage(page, 'button:has-text("You can spare")').count()) === 0);
      await page.screenshot({ path: `${SHOTS}/only-under-${vp.label}.png`, fullPage: true });
    }
  } finally {
    try {
      if (viewer) {
        if (priorMin === null) await db.execute(sql`delete from user_prefs where user_id = ${viewer} and spare_min = 2`).catch(() => null);
        else await db.execute(sql`update user_prefs set spare_min = ${priorMin} where user_id = ${viewer}`);
      }
      if (process.env.YHI_KEEP !== "1") await purgeAccount(WANTER, { stripe: () => null });
    } catch (err) {
      console.error("cleanup failed", err);
    }
    await browser.close();
  }
  console.log(failed ? `\n${failed} FAILED` : "\nall passed");
  process.exit(failed ? 1 : 0);
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
