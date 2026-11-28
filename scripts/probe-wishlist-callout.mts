// pnpm probe:wishlist-callout: the Wishlist tab's call-out and a deck kept off it, pressed through the real screen at
// phone and desktop width (#3441). Fails on main twice over:
//   (a) Add them draws the deck boxes in the same page, with no reload: on main the first pass ran after the response,
//       so the refresh read no lines and the boxes came only with a reload;
//   (b) a deck opened from its box, kept off through its ⋯ menu, and Back: the box is gone. On main Keep off never
//       revalidated the tab, so Back drew the box again.
// Each width starts from the offer: the reader's switch off, the offer unanswered, no deck kept off and no synced
// lines. That reset writes the reader's rows, so the probe runs on a SCRATCH branch only and refuses anything else.
//
//   PROBE_BRANCH=br-… PROBE_USER=user_… PROBE_DECK="<deck name>" PROBE_BASE=http://localhost:3441 pnpm probe:wishlist-callout
// PROBE_USER is the Clerk id of E2E_AUDIT_USER_EMAIL; PROBE_DECK one of its decks with cards it does not own; the dev
// server at PROBE_BASE runs on the same branch.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Page } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const BRANCH = process.env.PROBE_BRANCH;
const USER = process.env.PROBE_USER;
const DECK = process.env.PROBE_DECK;
if (!BRANCH || !USER || !DECK) throw new Error("set PROBE_BRANCH, PROBE_USER and PROBE_DECK");

const { db } = await import("../src/db");
const { sql } = await import("drizzle-orm");
const { rows: who } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
if (who[0]?.b !== BRANCH) throw new Error(`database reports ${who[0]?.b}, not ${BRANCH}; nothing written`);
assertScratchBranch(who[0]?.b, "probe:wishlist-callout");

async function reset() {
  await db.execute(sql`update user_prefs set wishlist_sync = false, wishlist_offer_dismissed_at = null where user_id = ${USER}`);
  await db.execute(sql`update decks set off_wishlist = false where user_id = ${USER} and off_wishlist`);
  await db.execute(sql`delete from wishlist_synced_decks where user_id = ${USER}`);
  await db.execute(sql`delete from wishlist_synced where user_id = ${USER}`);
  await db.execute(sql`delete from wishlist_sync_state where user_id = ${USER}`);
}

async function signIn(page: Page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as unknown as { Clerk?: { loaded: boolean } }).Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clerk = (window as any).Clerk;
        let attempt = email.includes("+clerk_test")
          ? await clerk.client.signIn.create({ identifier: email })
          : await clerk.client.signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const factor = attempt.supportedFirstFactors?.find((f: any) => f.strategy === "email_code");
          await clerk.client.signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
          attempt = await clerk.client.signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (error as any)?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const failures: string[] = [];
const check = (ok: boolean, what: string, got?: unknown) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${what}${ok ? "" : `  (got ${JSON.stringify(got)})`}`);
  if (!ok) failures.push(what);
};

async function run(viewport: { width: number; height: number }, label: string) {
  await reset();
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport })).newPage();
  const box = () => page.getByTestId("wishlist-box").filter({ hasText: `For ${DECK}` });
  try {
    await signIn(page);
    await page.goto(`${BASE}/collection/wishlist`, { waitUntil: "domcontentloaded" });
    const offer = page.getByTestId("wishlist-offer");
    await offer.waitFor({ timeout: 30_000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    // A mark on the window: a reload or a hard navigation clears it, a client refresh keeps it.
    await page.evaluate(() => ((window as unknown as { __probe3441?: number }).__probe3441 = 1));

    // (a) Add them, then the deck's box in the same page.
    await offer.getByRole("button", { name: "Add them" }).click();
    await offer.waitFor({ state: "detached", timeout: 15_000 });
    const drawn = await box().first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    const same = await page.evaluate(() => (window as unknown as { __probe3441?: number }).__probe3441 === 1);
    check(drawn && same, `${label}: (a) Add them draws "For ${DECK}" with no reload`, { drawn, same });
    if (!drawn) return;

    // (b) Open the deck from its box, keep it off through the ⋯ menu, and Back.
    await box().first().getByRole("link", { name: `Open deck, ${DECK}` }).click();
    await page.waitForURL(/\/decks\/[^/]+$/, { timeout: 20_000 });
    const trigger = page.getByRole("button", { name: `Actions for ${DECK}` }).first();
    await trigger.waitFor({ timeout: 20_000 });
    await trigger.click();
    const keep = page.getByRole("checkbox", { name: "Keep off my wishlist" }).first();
    await keep.waitFor({ timeout: 10_000 });
    await keep.click();
    // Saved: the switch reads on when the menu is opened again.
    await page.waitForTimeout(1500);
    await trigger.click();
    const kept = await page.locator("[data-keep-off-wishlist='on']").first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
    check(kept, `${label}: (b) Keep off my wishlist saved`);
    await page.keyboard.press("Escape");
    await page.goBack();
    await page.waitForURL(/\/collection\/wishlist/, { timeout: 20_000 });
    await page.getByTestId("wishlist-behind").or(page.getByTestId("wishlist-tile")).first().waitFor({ timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const left = await box().count();
    check(left === 0, `${label}: (b) Back draws no box for the deck kept off`, `${left} box`);
    if (process.env.PROBE_SHOT) await page.screenshot({ path: `${process.env.PROBE_SHOT}-${label}.png` });
  } catch (error) {
    await page.screenshot({ path: `${process.env.PROBE_SHOT ?? "probe-wishlist-callout"}-${label}-fail.png` }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
}

await clerkSetup();
await run({ width: 390, height: 844 }, "phone");
await run({ width: 1300, height: 900 }, "desktop");
await reset();
if (failures.length) {
  console.log(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("\nall passed");
process.exit(0);
