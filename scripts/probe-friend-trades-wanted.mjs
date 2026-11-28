// probe:friend-trades-wanted — what friend trades PR 6 adds to a friend's Spares tab and the Friends list does what it
// says, at 390 (touch) and 1300 wide (handoff `design_handoff_the99_friend_trades`, Spares S0/S4, Ask S1, Friends).
//
// WHAT IT PROVES, each press a real tap or click at the control's centre. Read-only: it writes nothing.
//  - Rin's Spares tab (a trade waits on the reader) carries the strip's accent diamond; Uma's (the reader's offer waits on Uma) does not.
//  - the Wanted call-out draws both directions on Rin's tab, and no Trade press there (Rin has live trades, S4).
//  - You want writes `?wanted=wishlist,deck` to the address without a navigation and cuts the grid to the wanted
//    spares (its count); All clears it and the whole grid comes back. The key line shows while there is a switch.
//  - the spares sheet's page-friend row draws the trade line (Wants your ... · N trades open), inside its row.
//  - /friends: Rin's want chip names its direction on desktop, a phone keeps the figure and the panel's key names it;
//    its press lands on Rin's Spares tab with You want on.
// On main none of this exists (no call-out, no chips, no line), so every leg fails there.
//
// FIXTURE: the PR 5 trade fixture (scripts/seed-trade-sheet-fixture.mts) on a SCRATCH branch, its ids exported, and a
// dev server on that branch. It refuses any branch but the one named:
//   TRADES_PROBE_DATABASE_URL=postgres://... TRADES_PROBE_BRANCH=br-... PROBE_BASE=http://localhost:3517 \
//     E2E_AUDIT_USER_EMAIL=...+clerk_test@... node scripts/probe-friend-trades-wanted.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const TARGET = process.env.TRADES_PROBE_DATABASE_URL;
const NAMED = process.env.TRADES_PROBE_BRANCH;
if (!TARGET || !NAMED) throw new Error("set TRADES_PROBE_DATABASE_URL and TRADES_PROBE_BRANCH (the seeded scratch branch)");
const [{ branch }] = await neon(TARGET)`select current_setting('neon.branch_id', true) as branch`;
if (branch !== NAMED) throw new Error(`database reports ${branch}, not ${NAMED}`);
assertScratchBranch(branch, "probe-friend-trades-wanted");
const ID = Object.fromEntries(["RIN_PUBLIC_ID", "UMA_PUBLIC_ID"].map((k) => {
  if (!process.env[k]) throw new Error(`export ${k} from the seed's output`);
  return [k, process.env[k]];
}));

const WIDTHS = [{ label: "phone", width: 390, height: 844, touch: true }, { label: "desktop", width: 1300, height: 900, touch: false }];
let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
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
}

/** Waits out the page's finite animations (a sheet sliding in), so a press lands where a person's would; spinners are skipped. */
const calm = (page) => page.evaluate(() => Promise.all(document.getAnimations()
  .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
  .map((a) => a.finished.catch(() => {}))));
/** A navigation the app's own address write cut short (net::ERR_ABORTED) is tried once more. */
async function visit(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
  } catch (error) {
    if (!String(error.message).includes("ERR_ABORTED")) throw error;
    await page.goto(url, { waitUntil: "domcontentloaded" });
  }
}
/** One real tap or click at the element's centre, after it is visible (never `locator.click`, which waits out movement). */
async function press(page, touch, locator) {
  await locator.waitFor({ state: "visible", timeout: 20_000 });
  await locator.scrollIntoViewIfNeeded();
  await calm(page);
  const box = await locator.boundingBox();
  if (!box) throw new Error("no box to press");
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  if (touch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}
const shown = (page, selector, timeout = 15_000) => page.locator(selector).first().waitFor({ state: "visible", timeout }).then(() => true, () => false);
const gone = (page, selector, timeout = 10_000) => page.locator(selector).first().waitFor({ state: "hidden", timeout }).then(() => true, () => false);

const tiles = (page) => page.locator('main [data-testid="spare-tile-press"]').count();

async function reads(page, touch, tag) {
  const rin = `${BASE}/friends/${ID.RIN_PUBLIC_ID}/spares`;
  await visit(page, rin);
  report(`${tag}: the call-out draws`, await shown(page, '[data-testid="wanted-callout"]'), "wanted-callout visible");
  report(`${tag}: Rin's Spares tab carries the waits diamond`, await shown(page, '[data-testid="friend-tab-spares-waits"]'), "diamond visible");
  const callout = page.locator('[data-testid="wanted-callout"]');
  const rows = await callout.locator('[data-testid="todo-row"], li, [role="listitem"]').count();
  const pressCount = await callout.getByRole("button", { name: /^Trade/ }).count();
  report(`${tag}: no Trade press in the call-out while Rin has live trades`, pressCount === 0, `Trade presses=${pressCount}, rows=${rows}`);
  report(`${tag}: the key line shows beside the switch`, await shown(page, '[data-testid="wanted-key"]'), "wanted-key visible");

  const all = await tiles(page);
  const want = callout.getByRole("radio", { name: /^You want/ });
  const wantCount = Number((await want.textContent())?.match(/(\d+)\s*$/)?.[1] ?? NaN);
  const before = page.url();
  await press(page, touch, want);
  await page.waitForFunction(() => new URL(location.href).searchParams.get("wanted") === "wishlist,deck", null, { timeout: 10_000 }).catch(() => {});
  const url = new URL(page.url());
  report(`${tag}: You want writes ?wanted=wishlist,deck`, url.searchParams.get("wanted") === "wishlist,deck", `url=${url.pathname}${url.search}`);
  report(`${tag}: You want is the chosen segment`, (await want.getAttribute("aria-checked")) === "true", `aria-checked=${await want.getAttribute("aria-checked")}`);
  await page.waitForFunction((n) => document.querySelectorAll('main [data-testid="spare-tile-press"]').length === n, wantCount, { timeout: 10_000 }).catch(() => {});
  const cut = await tiles(page);
  report(`${tag}: the grid cuts to the wanted spares`, cut === wantCount && cut < all, `tiles ${all} -> ${cut}, You want count ${wantCount}`);
  await press(page, touch, callout.getByRole("radio", { name: /^All/ }));
  await page.waitForFunction((n) => document.querySelectorAll('main [data-testid="spare-tile-press"]').length === n, all, { timeout: 10_000 }).catch(() => {});
  report(`${tag}: All brings the whole grid back`, (await tiles(page)) === all && !new URL(page.url()).searchParams.has("wanted"), `tiles=${await tiles(page)}, was ${before === page.url() ? "same url" : page.url()}`);

  await press(page, touch, page.locator('main [data-testid="spare-tile-press"]').first());
  const line = page.locator('[role="dialog"] [data-testid="friend-spare-trade-line"]');
  const drawn = await shown(page, '[role="dialog"] [data-testid="friend-spare-trade-line"]');
  const text = drawn ? (await line.first().textContent()) ?? "" : "";
  report(`${tag}: the spares sheet draws the trade line on Rin's row`, drawn && /^Wants your .+· \d+ trades? open$/.test(text), `line=${JSON.stringify(text)}`);
  if (drawn) {
    const row = line.first().locator("xpath=ancestor::li[1]");
    const [lb, rb] = [await line.first().boundingBox(), await row.boundingBox()];
    const inside = lb && rb && lb.x >= rb.x - 0.5 && lb.x + lb.width <= rb.x + rb.width + 0.5;
    report(`${tag}: the trade line stays inside its row`, Boolean(inside), `line ${lb?.x.toFixed(0)}..${(lb.x + lb.width).toFixed(0)}, row ${rb?.x.toFixed(0)}..${(rb.x + rb.width).toFixed(0)}`);
    const rinRow = await row.getAttribute("data-friend");
    report(`${tag}: the line sits on the page friend's row`, rinRow === ID.RIN_PUBLIC_ID, `data-friend=${rinRow === ID.RIN_PUBLIC_ID ? "Rin" : "other"}`);
  }
  await page.keyboard.press("Escape");

  await visit(page, `${BASE}/friends/${ID.UMA_PUBLIC_ID}/spares`);
  await shown(page, '[data-testid="friend-tab-spares"]');
  report(`${tag}: Uma's Spares tab has no diamond`, (await page.locator('[data-testid="friend-tab-spares-waits"]').count()) === 0, "no waits diamond");

  await visit(page, `${BASE}/friends`);
  const chip = page.locator(`main a[data-want-chip][href^="/friends/${ID.RIN_PUBLIC_ID}/spares"]`);
  report(`${tag}: Rin's row carries the want chip`, await shown(page, `main a[data-want-chip][href^="/friends/${ID.RIN_PUBLIC_ID}/spares"]`), "want chip visible");
  const word = chip.locator("span.hidden");
  const wordShown = await word.isVisible().catch(() => false);
  const keyShown = await page.locator('main [data-testid="friends-chip-key"]').isVisible().catch(() => false);
  report(`${tag}: ${touch ? "a phone keeps the figure and the key names it" : "desktop names the direction, no key"}`,
    touch ? !wordShown && keyShown : wordShown && !keyShown, `word ${wordShown ? "shown" : "hidden"}, key ${keyShown ? "shown" : "hidden"}`);
  await press(page, touch, chip);
  await page.waitForURL((u) => u.pathname === `/friends/${ID.RIN_PUBLIC_ID}/spares`, { timeout: 20_000 }).catch(() => {});
  await shown(page, '[data-testid="wanted-callout"]');
  const on = await page.locator('[data-testid="wanted-callout"]').getByRole("radio", { name: /^You want/ }).getAttribute("aria-checked").catch(() => null);
  report(`${tag}: the want chip lands on Rin's Spares with You want on`, new URL(page.url()).searchParams.get("wanted") === "wishlist,deck" && on === "true", `url=${new URL(page.url()).search}, You want=${on}`);
}

const browser = await chromium.launch();
try {
  await clerkSetup();
  for (const size of WIDTHS) {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: size.touch, isMobile: size.touch });
    const page = await context.newPage();
    const tag = `@${size.width}`;
    try {
      await signIn(page);
      await reads(page, size.touch, tag);
    } catch (error) {
      console.error(`${tag}:`, error.message);
      failures += 1;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
