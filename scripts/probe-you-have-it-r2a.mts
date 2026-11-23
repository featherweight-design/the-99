// pnpm probe:you-have-it-r2a (run: tsx scripts/probe-you-have-it-r2a.mts): You have it R2, PR 1, offers in Request history, in a real
// browser against a real database. The signed-in `+clerk_test` account is the reader; a per-run made-up id is the friend.
// Seeds three offers the reader made (open, yes, no), one withdrawn, and one offer the friend made to the reader, then:
//   1. /friends/requests, tab From you, draws the reader's offers (kicker `Offered` while open, `You offered ... to ...`,
//      `... said yes to ...`, `... passed on ...`) and does NOT draw the friend's offer to the reader;
//   2. tab To you draws `... offered you ...` under `Waiting on you` and not the reader's own offers or the withdrawn one;
//   3. no horizontal overflow at 390 and 1300. Shots: from-you / to-you at each width.
// Writes: the friend (purged in a finally), the friendship, five spare_requests rows. SCRATCH BRANCH ONLY: refused on
// production, staging and local-dev by `neon.branch_id`. Fails on main, where the history reads asks only.
//
// YHI_KEEP=1 leaves the seed in place (for the contact sheet); the scratch branch is deleted afterwards.
//   YHI_PROBE_URL=<scratch branch URL> YHI_PROBE_BRANCH=br-... PROBE_BASE=http://localhost:3200 \
//     E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app PROBE_SHOTS=<dir> tsx scripts/probe-you-have-it-r2a.mts
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Page } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { onPage } from "./lib/surface.mjs";
import { mkdirSync } from "node:fs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? "/private/tmp/claude-501/yhi/r2a";
const BRANCH = process.env.YHI_PROBE_BRANCH;
const url = process.env.YHI_PROBE_URL;
if (!url || !BRANCH) throw new Error("probe:you-have-it-r2a: set YHI_PROBE_URL and YHI_PROBE_BRANCH");
assertScratchBranch(BRANCH, "probe:you-have-it-r2a");
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
  const { purgeAccount } = await import("../src/lib/account/purge");

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  try {
    await clerkSetup();
    const viewer = await signIn(page);
    console.log(`target ${BRANCH}, reader signed in, friend ${WANTER}`);
    await friends.ensureProfile(viewer, "Alpha");
    await friends.ensureProfile(WANTER, "Max");
    const inv = await friends.createInvite(WANTER);
    if (!inv.ok) throw new Error("createInvite refused");
    await friends.redeemInvite(viewer, inv.token);
    const { rows: cards } = await db.execute<{ oracle_id: string; name: string }>(sql`
      select c.oracle_id, c.name from cards c where exists (select 1 from printings p where p.oracle_id = c.oracle_id) order by c.oracle_id limit 5`);
    const f = (n: string) => n.split(" // ")[0];
    const [a, b, c, d, e] = cards;
    const ins = (asker: string, holder: string, o: string, status: string, ago: number) => db.execute(sql`
      insert into spare_requests (asker_user_id, holder_user_id, oracle_id, status, copies, initiated_by, created_at, answered_at, withdrawn_at)
      values (${asker}, ${holder}, ${o}, ${status}, 1, 'holder', now() - (${ago} || ' days')::interval,
        ${status === "yes" || status === "no" ? sql`now() - interval '1 day'` : null}, ${status === "withdrawn" ? sql`now() - interval '1 day'` : null})`);
    await ins(WANTER, viewer, a.oracle_id, "open", 2);
    await ins(WANTER, viewer, b.oracle_id, "yes", 5);
    await ins(WANTER, viewer, c.oracle_id, "no", 6);
    await ins(WANTER, viewer, d.oracle_id, "withdrawn", 7);
    await ins(viewer, WANTER, e.oracle_id, "open", 1); // the friend's offer to the reader
    for (const vp of VIEWPORTS) {
      console.log(`\n== ${vp.label}`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/friends/requests`, { waitUntil: "domcontentloaded" });
      const panel = onPage(page, '[role="tabpanel"]').first();
      await panel.waitFor({ state: "attached", timeout: 30_000 });
      const text = async () => ((await panel.textContent()) ?? "").replace(/\s+/g, " ");
      let t = await text();
      check(`${vp.label} From you: the open offer`, t.includes(`You offered ${f(a.name)} to Max`) && t.includes("Offered"), t.slice(0, 160));
      check(`${vp.label} From you: yes and no`, t.includes(`Max said yes to ${f(b.name)}`) && t.includes(`Max passed on ${f(c.name)}`));
      check(`${vp.label} From you: withdrawn`, t.includes(`You withdrew your offer of ${f(d.name)} to Max`));
      check(`${vp.label} From you: not the friend's offer`, !t.includes(f(e.name)));
      await page.screenshot({ path: `${SHOTS}/from-you-${vp.label}.png`, fullPage: true });
      for (let k = 0; k < 8; k++) {
        await onPage(page, '[role="tab"]:has-text("To you")').first().click();
        await page.waitForTimeout(300);
        if ((await text()).includes("offered you")) break;
      }
      t = await text();
      check(`${vp.label} To you: the friend's offer waits on you`, t.includes(`Max offered you ${f(e.name)}`) && t.includes("Waiting on you"), t.slice(0, 160));
      check(`${vp.label} To you: not the reader's own offers, nor the withdrawn one`, !t.includes(f(a.name)) && !t.includes(f(d.name)));
      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      check(`${vp.label} no horizontal overflow`, sw[0] <= sw[1], `${sw[0]} vs ${sw[1]}`);
      await page.screenshot({ path: `${SHOTS}/to-you-${vp.label}.png`, fullPage: true });
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
