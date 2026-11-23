// pnpm probe:you-have-it-3b (run: tsx scripts/probe-you-have-it-3b.mts): "You have it" UI 3b, the OFFERER's side, in a real
// browser against a real database. The signed-in `+clerk_test` account is the OFFERER (the reader); a per-run made-up id is
// the WANTER, a friend whose wishlist wants a card the reader can spare:
//   1. the friend's Wishlist tab draws the call-out (`You have 2 to spare`), the filter, the key and a press on the tile;
//   2. the filter `You can spare` narrows the tiles to the spare card;
//   3. pressing the tile opens `You have this`; pressing Offer turns the row to `Offered` and the press's aria to
//      `, offered`, and a holder-initiated spare_requests row exists;
//   4. no horizontal overflow at 390 and 1300.
// Writes: the wanter (purged in a finally), the friendship, one wishlist row. SCRATCH BRANCH ONLY: refused on production,
// staging and local-dev by `neon.branch_id`.
//
//   YHI_PROBE_URL=<scratch branch URL> YHI_PROBE_BRANCH=br-… PROBE_BASE=http://localhost:3200 \
//     E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app PROBE_SHOTS=<dir> tsx scripts/probe-you-have-it-3b.mts
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Page } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { onPage } from "./lib/surface.mjs";
import { mkdirSync } from "node:fs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? "/private/tmp/claude-501/yhi/3b";
const BRANCH = process.env.YHI_PROBE_BRANCH;
const url = process.env.YHI_PROBE_URL;
if (!url || !BRANCH) throw new Error("probe:you-have-it-3b: set YHI_PROBE_URL and YHI_PROBE_BRANCH");
assertScratchBranch(BRANCH, "probe:you-have-it-3b");
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
  try {
    await clerkSetup();
    viewer = await signIn(page);
    console.log(`target ${BRANCH}, viewer (offerer) signed in, wanter ${WANTER}`);

    const { rows: mine } = await db.execute<{ oracle_id: string }>(sql`
      select oracle_id from collection_items where user_id = ${viewer} group by oracle_id having sum(quantity) >= 2 limit 60`);
    const got = mine.length ? await loadOwnOffered(viewer, mine.map((r) => r.oracle_id)) : new Map<string, number>();
    const Z = [...got.keys()][0];
    if (!Z) throw new Error("the reader owns no card they can spare on this branch");
    const Z2 = [...got.keys()][1] ?? null;
    const { rows: nm } = await db.execute<{ name: string }>(sql`select name from cards where oracle_id = ${Z}`);
    const face = nm[0].name.split(" // ")[0];
    const face2 = Z2 ? ((await db.execute<{ name: string }>(sql`select name from cards where oracle_id = ${Z2}`)).rows[0].name.split(" // ")[0]) : "";

    await friends.ensureProfile(viewer, "Alpha");
    await friends.ensureProfile(WANTER, "Max");
    const inv = await friends.createInvite(WANTER);
    if (!inv.ok) throw new Error("createInvite refused");
    await friends.redeemInvite(viewer, inv.token);
    const wanterPublic = (await db.execute<{ p: string }>(sql`select public_id::text as p from social_profiles where user_id = ${WANTER}`)).rows[0].p;
    await db.execute(sql`insert into wishlist_items (user_id, oracle_id, quantity) values (${WANTER}, ${Z}, 1)`);
    // The friend's own open ask of a second spare card, for the asked row (title, Yes / No on their own line).
    if (Z2) {
      await db.execute(sql`insert into wishlist_items (user_id, oracle_id, quantity) values (${WANTER}, ${Z2}, 1)`);
      await db.execute(sql`insert into spare_requests (asker_user_id, holder_user_id, oracle_id, status, copies, initiated_by) values (${WANTER}, ${viewer}, ${Z2}, 'open', 1, 'asker')`);
    }
    // A card the reader cannot spare, so the filter has something to hide.
    const { rows: other } = await db.execute<{ oracle_id: string }>(sql`
      select c.oracle_id from cards c where c.oracle_id <> ${Z} and exists (select 1 from printings p where p.oracle_id = c.oracle_id)
        and not exists (select 1 from collection_items ci where ci.user_id = ${viewer} and ci.oracle_id = c.oracle_id) order by c.oracle_id limit 1`);
    await db.execute(sql`insert into wishlist_items (user_id, oracle_id, quantity) values (${WANTER}, ${other[0].oracle_id}, 1)`);

    for (const vp of VIEWPORTS) {
      console.log(`\n== ${vp.label}`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/friends/${wanterPublic}/wishlist`, { waitUntil: "domcontentloaded" });
      const callout = onPage(page, '[data-testid="have-callout"]').first();
      await callout.waitFor({ state: "attached", timeout: 30_000 });
      const ct = ((await callout.textContent()) ?? "").replace(/\s+/g, " ");
      check(`${vp.label} call-out title`, /You have 2 to spare/.test(ct), ct.slice(0, 100));
      check(`${vp.label} call-out names the card`, ct.includes(face), ct.slice(0, 140));
      check(`${vp.label} key line`, /you can spare/.test(((await onPage(page, '[data-testid="have-key"]').first().textContent()) ?? "")));
      // The key sits on its own line under the switch at both widths (the mock draws it under, never beside).
      const kb = await onPage(page, '[data-testid="have-key"]').first().boundingBox();
      const sb = await onPage(page, '[role="tablist"], [role="radiogroup"]').first().boundingBox().catch(() => null);
      check(`${vp.label} key sits under the switch`, !!kb && (!sb || kb.y >= sb.y + sb.height - 1), `${kb?.y} vs ${sb ? sb.y + sb.height : "n/a"}`);
      check(`${vp.label} one press per spare card`, (await onPage(page, '[data-testid="have-press"]').count()) === (Z2 ? 2 : 1));
      const tiles = () => onPage(page, 'ul.grid > li').count();
      const before = await tiles();
      // The press can land before hydration: press again until the tiles narrow (a few tries), then judge.
      for (let t = 0; t < 8 && (await tiles()) !== (Z2 ? 2 : 1); t++) {
        await onPage(page, 'button:has-text("You can spare")').first().click();
        await page.waitForTimeout(400);
      }
      check(`${vp.label} filter narrows to the spare card`, (await tiles()) === (Z2 ? 2 : 1) && before === (Z2 ? 3 : 2), `${before} -> ${await tiles()}`);
      await onPage(page, 'button:has-text("All")').first().click();
      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      check(`${vp.label} no horizontal overflow`, sw[0] <= sw[1], `${sw[0]} vs ${sw[1]}`);
      await page.screenshot({ path: `${SHOTS}/wishlist-${vp.label}.png`, fullPage: true });

      const press = onPage(page, `[data-testid="have-press"][aria-label*="${face}"]`).first();
      await press.click();
      const sheet = onPage(page, '[data-testid="have-sheet"]').first();
      await sheet.waitFor({ state: "visible", timeout: 10_000 });
      // Offer is the shared Ask press: an outline, never a solid fill; the row's mark sits in a tile.
      const offerStyle = await sheet.locator('[data-testid="have-offer"]').first().evaluate((el: Element) => { const c = getComputedStyle(el); return [c.backgroundColor, c.borderTopWidth, c.fontWeight]; });
      check(`${vp.label} Offer is the outlined Ask press`, offerStyle[0] === "rgba(0, 0, 0, 0)" && offerStyle[1] === "1px" && Number(offerStyle[2]) >= 600, offerStyle.join(" "));
      check(`${vp.label} sheet row draws the spare glyph in its tile`, (await sheet.locator('span:has(> svg)').count()) > 0);
      check(`${vp.label} sheet opens with the card and Offer`, (await sheet.textContent())?.includes(face) === true && (await sheet.locator('[data-testid="have-offer"]').count()) === 1);
      await page.waitForTimeout(700); // the sheet's own entrance
      await page.screenshot({ path: `${SHOTS}/sheet-${vp.label}.png` });
      if (vp.label === "1300") {
        await sheet.locator('[data-testid="have-offer"]').click();
        await sheet.locator('[data-testid="have-offered"]').waitFor({ state: "visible", timeout: 15_000 });
        check("Offer turns the row to Offered", true);
        check("Offered carries its mark", (await sheet.locator('[data-testid="have-offered"] svg').count()) === 1);
        const st = (await db.execute<{ n: string }>(sql`select count(*)::text as n from spare_requests where holder_user_id = ${viewer} and asker_user_id = ${WANTER} and initiated_by = 'holder'`)).rows[0].n;
        check("a holder-initiated request exists", st === "1", st);
        await page.keyboard.press("Escape");
        const aria = (await press.getAttribute("aria-label")) ?? "";
        check("the press reads offered", /offered$/.test(aria), aria);
        await page.screenshot({ path: `${SHOTS}/wishlist-offered-${vp.label}.png`, fullPage: true });
      } else await page.keyboard.press("Escape");
      if (Z2) {
        // The friend's ask of the second spare: the row names them and the count, Yes / No sit under the row.
        await onPage(page, `[data-testid="have-press"][aria-label*="${face2}"]`).first().click();
        const asked = onPage(page, '[data-testid="have-sheet"]').first();
        await asked.waitFor({ state: "visible", timeout: 10_000 });
        await page.waitForTimeout(700);
        const at = ((await asked.textContent()) ?? "").replace(/\s+/g, " ");
        check(`${vp.label} asked row names the friend and the count`, /Max asked for 1/.test(at), at.slice(0, 160));
        const yb = await asked.locator('[data-testid="spare-yes"]').boundingBox();
        const rb = await asked.locator('[data-testid="have-offer"], [data-testid="have-offered"]').count();
        check(`${vp.label} asked row carries Yes and No`, !!yb && rb === 0);
        await page.screenshot({ path: `${SHOTS}/sheet-asked-${vp.label}.png` });
        await page.keyboard.press("Escape");
      }
      // /friends: the per-friend chip draws the shared spare glyph, not a gift box.
      // A press-driven navigation can still be in flight (ERR_ABORTED): go again once it settles.
      await page.goto(`${BASE}/friends`, { waitUntil: "domcontentloaded" }).catch(async () => {
        await page.waitForTimeout(1000);
        await page.goto(`${BASE}/friends`, { waitUntil: "domcontentloaded" });
      });
      const chip = onPage(page, "[data-spare-chip]").first();
      await chip.waitFor({ state: "attached", timeout: 30_000 });
      check(`${vp.label} chip draws the shared spare glyph`, (await chip.locator("svg path[d^='M3.5 19']").count()) === 1 && (await chip.locator("svg path[d^='M20 12v8']").count()) === 0);
      await page.screenshot({ path: `${SHOTS}/friends-${vp.label}.png` });
    }
  } finally {
    try {
      await purgeAccount(WANTER, { stripe: () => null });
    } catch (e) {
      console.error("cleanup: purge of the wanter failed", e);
    }
    await browser.close();
  }
  console.log(failed ? `\n${failed} FAILED` : "\nall passed");
  process.exit(failed ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
