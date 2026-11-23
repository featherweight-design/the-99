// pnpm probe:you-have-it-r2c (run: tsx scripts/probe-you-have-it-r2c.mts): You have it R2, PR 3, the offerer's answer sheet,
// in a real browser against a real database. The signed-in `+clerk_test` account is the OFFERER; a per-run made-up id is the
// friend (the wanter) who answers two of the reader's offers, one Yes and one No, through `answerOffer` (so the offerer's
// feed items are the real ones). Then, on Home:
//   1. each answer item reads `Your offer` (kicker and press), never `Your request`;
//   2. pressing `Your offer ›` opens a sheet titled `Your offer`: the row (Accepted / Declined, the friend's words, the
//      hand-over line or `Nothing else changes.`, `Offered <date> · N copies`), NO Clear, and the foot `Request history ›`
//      linking to /friends/requests;
//   3. the item's diamond goes on open; the foot link lands on /friends/requests; Close returns focus to the press;
//   4. no horizontal overflow at 390 and 1300. Shots per width.
// Writes: the friend (purged in a finally), the friendship, two offers and the offerer's feed items they write. SCRATCH
// BRANCH ONLY: refused on production, staging and local-dev by `neon.branch_id`. Fails on main, where the answer item has no press.
//   YHI_PROBE_URL=<scratch branch URL> YHI_PROBE_BRANCH=br-... PROBE_BASE=http://localhost:3200 \
//     E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app PROBE_SHOTS=<dir> tsx scripts/probe-you-have-it-r2c.mts
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Page } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { onPage } from "./lib/surface.mjs";
import { mkdirSync } from "node:fs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? "/private/tmp/claude-501/yhi/r2c";
const BRANCH = process.env.YHI_PROBE_BRANCH;
const url = process.env.YHI_PROBE_URL;
if (!url || !BRANCH) throw new Error("probe:you-have-it-r2c: set YHI_PROBE_URL and YHI_PROBE_BRANCH");
assertScratchBranch(BRANCH, "probe:you-have-it-r2c");
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
  const { answerOffer } = await import("../src/lib/social/spare-offers");
  const { purgeAccount } = await import("../src/lib/account/purge");

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  try {
    await clerkSetup();
    const viewer = await signIn(page);
    console.log(`target ${BRANCH}, offerer signed in, friend ${WANTER}`);
    await friends.ensureProfile(viewer, "Alpha");
    await friends.ensureProfile(WANTER, "Max");
    const inv = await friends.createInvite(WANTER);
    if (!inv.ok) throw new Error("createInvite refused");
    await friends.redeemInvite(viewer, inv.token);
    const { rows: cards } = await db.execute<{ oracle_id: string; name: string }>(sql`
      select c.oracle_id, c.name from cards c where exists (select 1 from printings p where p.oracle_id = c.oracle_id) order by c.oracle_id limit 2`);
    const f = (n: string) => n.split(" // ")[0];
    const [yes, no] = cards;
    const offer = async (o: string, copies: number, ago: number) => {
      const { rows } = await db.execute<{ id: string }>(sql`
        insert into spare_requests (asker_user_id, holder_user_id, oracle_id, status, copies, initiated_by, created_at)
        values (${WANTER}, ${viewer}, ${o}, 'open', ${copies}, 'holder', now() - (${ago} || ' days')::interval) returning id`);
      return rows[0].id;
    };
    const yesId = await offer(yes.oracle_id, 2, 3);
    const noId = await offer(no.oracle_id, 1, 4);
    const a = await answerOffer(WANTER, yesId, "yes");
    const b = await answerOffer(WANTER, noId, "no");
    check("the friend's answers land", a.ok && b.ok);

    for (const vp of VIEWPORTS) {
      console.log(`\n== ${vp.label}`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      const itemOf = (name: string, words: string) => onPage(page, `li:has-text("${words} ${f(name)}")`).first();
      const yesItem = itemOf(yes.name, "said yes to");
      await yesItem.waitFor({ state: "attached", timeout: 30_000 });
      const itemText = ((await yesItem.textContent()) ?? "").replace(/\s+/g, " ");
      check(`${vp.label} item kicker reads Your offer`, itemText.includes("Your offer") && !itemText.includes("Your request"), itemText.slice(0, 120));
      check(`${vp.label} item has the Your offer press`, (await yesItem.locator('button:has-text("Your offer")').count()) === 1);
      // Only the first visit sees it unseen: a Home visit moves the reader's own cursor.
      if (vp === VIEWPORTS[0]) check(`${vp.label} item starts unseen`, (await yesItem.locator("[data-feed-unseen]").count()) === 1);
      await page.screenshot({ path: `${SHOTS}/home-${vp.label}.png`, fullPage: false });

      for (const [label, name, words, kind, detail, meta] of [
        ["Accepted", yes.name, "said yes to", "Accepted", "Hand it over when you meet", /Offered .+ · 2 copies/],
        ["Declined", no.name, "passed on", "Declined", "Nothing else changes.", /Offered .+ · 1 copy/],
      ] as const) {
        const item = itemOf(name, words);
        await item.locator('button:has-text("Your offer")').first().click();
        const dialog = onPage(page, '[role="dialog"]').first();
        await dialog.waitFor({ state: "visible", timeout: 15_000 });
        const row = onPage(page, '[data-testid="offer-sheet-row"]').first();
        const t = ((await row.textContent()) ?? "").replace(/\s+/g, " ");
        const d = ((await dialog.textContent()) ?? "").replace(/\s+/g, " ");
        check(`${vp.label} ${label} sheet: titled Your offer`, d.startsWith("Your offer") || d.includes("Your offer"), d.slice(0, 80));
        check(`${vp.label} ${label} sheet: kicker, words, line`, t.includes(kind) && t.includes(f(name)) && t.includes(detail), t.slice(0, 200));
        check(`${vp.label} ${label} sheet: offered date and copies`, meta.test(t), t.slice(-60));
        check(`${vp.label} ${label} sheet: no Clear`, (await dialog.getByRole("button", { name: /clear/i }).count()) === 0);
        const link = dialog.getByRole("link", { name: /Request history/ });
        check(`${vp.label} ${label} sheet: foot goes to Request history`, (await link.count()) === 1 && (await link.getAttribute("href")) === "/friends/requests");
        check(`${vp.label} ${label}: diamond gone from the item`, (await item.locator("[data-feed-unseen]").count()) === 0);
        const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
        check(`${vp.label} ${label} no horizontal overflow`, sw[0] <= sw[1], `${sw[0]} vs ${sw[1]}`);
        await page.screenshot({ path: `${SHOTS}/${label.toLowerCase()}-${vp.label}.png` });
        if (label === "Accepted") {
          await page.keyboard.press("Escape");
          await dialog.waitFor({ state: "detached", timeout: 10_000 });
          const back = await page.evaluate(() => document.activeElement?.textContent ?? "");
          check(`${vp.label} Close hands focus back to the press`, back.includes("Your offer"), back.slice(0, 40));
        } else {
          await link.click();
          await page.waitForURL("**/friends/requests", { timeout: 20_000 });
          check(`${vp.label} the foot lands on Request history`, new URL(page.url()).pathname === "/friends/requests");
        }
      }
    }
  } finally {
    if (process.env.YHI_KEEP === "1") console.log(`kept friend ${WANTER} for a contact sheet; the scratch branch is deleted at the end`);
    else try {
      await purgeAccount(WANTER, { stripe: () => null });
    } catch (err) {
      console.error("cleanup: purge of the friend failed", err);
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
