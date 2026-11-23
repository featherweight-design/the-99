// pnpm probe:you-have-it-3a (run: tsx scripts/probe-you-have-it-3a.mts): "You have it" UI 3a, the WANTER's side of an
// offer, driven in a real browser against a real database:
//   1. /friends: the Waiting on you row for an offer (data-offer, kind `Spare offer`, title, detail), the per-friend
//      chip ([data-spare-chip], href to the friend's wishlist, aria), no horizontal overflow, chip clear of the row's
//      other controls, at 390 and 1300;
//   2. Home: the lead story for the offer (data-lead-story, same title and detail);
//   3. pressing Yes on the row answers the offer: the receipt reads `You said yes to <card> from <friend>`, and the row
//      keeps data-offer.
// The signed-in `+clerk_test` account is the WANTER (the reader); a per-run made-up id is the OFFERER. Writes: the offerer
// (purged in a finally), the friendship, one wishlist row each side. SCRATCH BRANCH ONLY (it migrates nothing, but the
// reader's wishlist row is written): refused on production, staging and local-dev by `neon.branch_id`.
//
//   YHI_PROBE_URL=<scratch branch URL> YHI_PROBE_BRANCH=br-… PROBE_BASE=http://localhost:3200 \
//     E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app PROBE_SHOTS=<dir> tsx scripts/probe-you-have-it-3a.mts
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Page } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { onPage } from "./lib/surface.mjs";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? "/private/tmp/claude-501/yhi/3a";
const BRANCH = process.env.YHI_PROBE_BRANCH;
const url = process.env.YHI_PROBE_URL;
if (!url || !BRANCH) throw new Error("probe:you-have-it-3a: set YHI_PROBE_URL and YHI_PROBE_BRANCH");
assertScratchBranch(BRANCH, "probe:you-have-it-3a");
process.env.DATABASE_URL = url; // `src/db` reads it at import time, after `env.mjs` loaded `.env`.
mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { label: "390", width: 390, height: 844 },
  { label: "1300", width: 1300, height: 900 },
];
const run = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const OFFERER = `probe-yhi-o-${run}`;

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
  const offers = await import("../src/lib/social/spare-offers");
  const { loadOwnOffered } = await import("../src/lib/social/spares");
  const { applyCollectionChange } = await import("../src/lib/collection/write");
  const { purgeAccount } = await import("../src/lib/account/purge");

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  let viewer = "";
  const wished: string[] = [];
  try {
    await clerkSetup();
    viewer = await signIn(page);
    console.log(`target ${BRANCH}, viewer (wanter) signed in, offerer ${OFFERER}`);

    // Fixture. X: the offerer owns it, the viewer wants 2. Z: the viewer can spare it, the offerer wants it (the chip).
    const { rows: mine } = await db.execute<{ oracle_id: string }>(sql`
      select oracle_id from collection_items where user_id = ${viewer} group by oracle_id having sum(quantity) >= 2 limit 60`);
    let Z: string | null = null;
    if (mine.length) {
      const got = await loadOwnOffered(viewer, mine.map((r) => r.oracle_id));
      Z = [...got.keys()][0] ?? null;
    }
    if (!Z) throw new Error("the reader owns no card they can spare on this branch; cannot draw the chip");

    await friends.ensureProfile(viewer, "Alpha");
    await friends.ensureProfile(OFFERER, "Max");
    const inv = await friends.createInvite(OFFERER);
    if (!inv.ok) throw new Error("createInvite refused");
    await friends.redeemInvite(viewer, inv.token);
    const viewerPublic = (await db.execute<{ p: string }>(sql`select public_id::text as p from social_profiles where user_id = ${viewer}`)).rows[0].p;
    const offererPublic = (await db.execute<{ p: string }>(sql`select public_id::text as p from social_profiles where user_id = ${OFFERER}`)).rows[0].p;

    // Home's lead is the first UNSEEN item and a Home visit sees it, so every Home visit below gets a fresh offer (own card).
    let n = 0;
    const makeOffer = async () => {
      const { rows: picked } = await db.execute<{ oracle_id: string; name: string }>(sql`
        select c.oracle_id, c.name from cards c where exists (select 1 from printings p where p.oracle_id = c.oracle_id)
          and not exists (select 1 from collection_items ci where ci.user_id = ${viewer} and ci.oracle_id = c.oracle_id)
        order by c.oracle_id limit 1 offset ${1200 + 37 * n++}`);
      const X = picked[0].oracle_id;
      const xName = picked[0].name;
      const { rows: pr } = await db.execute<{ set_code: string; collector_number: string; scryfall_id: string }>(sql`
        select set_code, collector_number, scryfall_id from printings where oracle_id = ${X} order by scryfall_id limit 1`);
      const add = await applyCollectionChange(OFFERER, { kind: "add", items: [{ oracleId: X, setCode: pr[0].set_code,
        collectorNumber: pr[0].collector_number, scryfallId: pr[0].scryfall_id, finish: "nonfoil" as const, condition: null, quantity: 1 }] }, { id: randomUUID() });
      if (add.status !== "applied") throw new Error(`offerer add refused: ${add.status}`);
      // Direct rows: `setWishlistQuantity` reads request headers (the store), which a script has none of.
      await db.execute(sql`insert into wishlist_items (user_id, oracle_id, quantity) values (${viewer}, ${X}, 2)`);
      wished.push(X);
      const made = await offers.offerSpare(OFFERER, viewerPublic, X);
      if (!made.ok) throw new Error(`offerSpare refused: ${JSON.stringify(made)}`);
      const face = xName.split(" // ")[0];
      console.log(`fixture: offer of "${xName}" from Max`);
      return { name: xName, shortName: face.split(",")[0], titleRe: new RegExp(`Max is offering you ${face.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) };
    };
    await db.execute(sql`insert into wishlist_items (user_id, oracle_id, quantity) values (${OFFERER}, ${Z}, 1)`);

    for (const vp of VIEWPORTS) {
      console.log(`\n== ${vp.label}`);
      const { titleRe } = await makeOffer();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/friends`, { waitUntil: "domcontentloaded" });
      const row = onPage(page, '[data-testid="waiting-row"][data-offer]').first();
      await row.waitFor({ state: "attached", timeout: 30_000 });
      await row.scrollIntoViewIfNeeded();
      const text = ((await row.textContent()) ?? "").replace(/\s+/g, " ");
      check(`${vp.label} /friends: Waiting row carries data-offer`, (await row.getAttribute("data-offer")) !== null);
      check(`${vp.label} row kind reads Spare offer`, /Spare offer/.test(text), text.slice(0, 80));
      check(`${vp.label} row title`, titleRe.test(text), `want ${titleRe}`);
      check(`${vp.label} row detail`, /Max has 1 spare\. You want 2\./.test(text));
      check(`${vp.label} Yes and No presses`, (await row.locator('[data-testid="spare-yes"]').count()) === 1 && (await row.locator('[data-testid="spare-no"]').count()) === 1);
      const chip = onPage(page, "[data-spare-chip]").first();
      await chip.waitFor({ state: "attached", timeout: 10_000 });
      const href = await chip.getAttribute("href");
      check(`${vp.label} chip links to the friend's wishlist`, href === `/friends/${offererPublic}/wishlist`, href ?? "null");
      const aria = (await chip.getAttribute("aria-label")) ?? "";
      check(`${vp.label} chip aria`, aria === "You can spare 1 of Max’s wanted card" || aria === "You can spare 1 of Max’s wanted cards", aria);
      check(`${vp.label} chip text is the count`, ((await chip.textContent()) ?? "").trim() === "1");
      const geo = await page.evaluate(() => {
        const chip = document.querySelector("main [data-spare-chip]") as HTMLElement;
        const r = chip.getBoundingClientRect();
        const li = chip.closest("li") as HTMLElement | null;
        const others = li ? [...li.querySelectorAll("a,button")].filter((e) => e !== chip && !e.contains(chip) && !chip.contains(e)) : [];
        const overlaps = others
          .map((e) => ({ e, b: (e as HTMLElement).getBoundingClientRect() }))
          .filter(({ b }) => b.width > 0 && b.height > 0 && b.left < r.right - 1 && b.right > r.left + 1 && b.top < r.bottom - 1 && b.bottom > r.top + 1)
          .map(({ e }) => `${e.tagName.toLowerCase()}:${(e.getAttribute("aria-label") ?? e.textContent ?? "").trim().slice(0, 30)}`);
        return { w: r.width, h: r.height, right: r.right, vw: window.innerWidth, sw: document.documentElement.scrollWidth, overlaps };
      });
      check(`${vp.label} no horizontal overflow`, geo.sw <= geo.vw, `scrollWidth ${geo.sw} vs ${geo.vw}`);
      check(`${vp.label} chip inside viewport and 44px tall`, geo.right <= geo.vw && geo.h >= 44, `right ${geo.right}, h ${geo.h}`);
      check(`${vp.label} chip overlaps no other control in its row`, geo.overlaps.length === 0, geo.overlaps.join(" | "));
      await page.screenshot({ path: `${SHOTS}/friends-${vp.label}.png`, fullPage: true });
      await row.screenshot({ path: `${SHOTS}/friends-row-${vp.label}.png` });
      await chip.locator("xpath=ancestor::li[1]").screenshot({ path: `${SHOTS}/friends-chiprow-${vp.label}.png` });

      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      const lead = onPage(page, '[data-lead-story="spare-request"]').first();
      await lead.waitFor({ state: "attached", timeout: 30_000 }).catch(async (e: unknown) => {
        await page.screenshot({ path: `${SHOTS}/home-${vp.label}-NOLEAD.png` });
        console.log("home body:", ((await page.locator("main").textContent()) ?? "").replace(/\s+/g, " ").slice(0, 300));
        throw e;
      });
      const lt = ((await lead.textContent()) ?? "").replace(/\s+/g, " ");
      check(`${vp.label} Home lead is the offer (title)`, titleRe.test(lt), lt.slice(0, 120));
      check(`${vp.label} Home lead detail`, /Max has 1 spare\. You want 2\./.test(lt));
      check(`${vp.label} Home lead has Yes and No`, (await lead.locator('[data-testid="spare-yes"]').count()) >= 1 && (await lead.locator('[data-testid="spare-no"]').count()) >= 1);
      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      check(`${vp.label} Home no horizontal overflow`, sw[0] <= sw[1], `${sw[0]} vs ${sw[1]}`);
      await page.screenshot({ path: `${SHOTS}/home-${vp.label}.png` });
    }

    console.log("\n== press Yes on the /friends row");
    await page.setViewportSize({ width: 1300, height: 900 });
    const { shortName } = await makeOffer();
    await page.goto(`${BASE}/friends`, { waitUntil: "domcontentloaded" });
    const row = onPage(page, '[data-testid="waiting-row"][data-offer]').first();
    await row.waitFor({ state: "attached", timeout: 30_000 });
    await row.locator('[data-testid="spare-yes"]').click();
    const receipt = onPage(page, '[data-testid="waiting-row"][data-offer]').first();
    await page.waitForFunction(() => /You said yes to/.test(document.querySelector("main")?.textContent ?? ""), null, { timeout: 15_000 }).catch(() => {});
    const body = ((await onPage(page, "*").first().textContent()) ?? "").replace(/\s+/g, " ");
    check("receipt names the card and the friend", new RegExp(`You said yes to .*${shortName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.* from Max`).test(body), body.match(/You said yes to[^.]*/)?.[0] ?? "no receipt text");
    check("receipt kind reads Spare offer · accepted", /Spare offer · accepted/.test(body));
    check("the row keeps data-offer after the answer", (await receipt.count()) === 1);
    const st = (await db.execute<{ s: string }>(sql`select status::text as s from spare_requests where holder_user_id = ${OFFERER} and initiated_by = 'holder' order by created_at desc limit 1`)).rows[0]?.s;
    check("the offer row is accepted in the database", st === "accepted" || st === "yes", String(st));
    await page.screenshot({ path: `${SHOTS}/friends-receipt-1300.png`, fullPage: true });
  } finally {
    try {
      await purgeAccount(OFFERER, { stripe: () => null });
    } catch (e) {
      console.error("cleanup: purge of the offerer failed", e);
    }
    for (const w of wished) await db.execute(sql`delete from wishlist_items where user_id = ${viewer} and oracle_id = ${w}`);
    await browser.close();
  }
  console.log(failed ? `\n${failed} FAILED` : "\nall passed");
  process.exit(failed ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
