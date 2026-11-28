// probe:friend-trades-sheet — every press friend trades PR 5 adds to a friend's Spares tab does what it says, at 390 (touch)
// and 1300 wide (handoff `design_handoff_the99_friend_trades`, Spares S0/S0w/S9 and the trade sheet's states).
//
// WHAT IT PROVES, each press a real tap or click at the control's centre:
//  READS, at both widths:
//  - `?trade=<id>` opens that trade's sheet once and leaves the address; a reload does not reopen it.
//  - a Trades row's press opens its sheet; the sheet's Close closes it.
//  - the spares sheet's Trade press closes the spares sheet and opens the trade sheet with that card already in the trade.
//  - held (Q10): Sol's tab draws the cap line and Propose another trade held (disabled); Sol's spares sheet row says Offer waiting, no Trade press.
//  - Propose a trade opens the picker; Your spares lists the cards the friend wants first; the Offered chip opens its
//    popover (Q9) and Escape closes it, leaving the sheet open.
//  - Counter on an offer opens the picker holding the offer's cards; Keep theirs returns to Yes / No.
//  - Counter on the reader's own offer that needs a look opens the picker (Revise).
//  - Propose a new trade on an ended trade opens an empty picker.
//  - nothing wider than the page, with the sheet open.
//  WRITES, once each (so the phone and desktop legs press different trades):
//  - phone: Send offer (Tam) draws Sent; See the trade opens it as the reader's offer; Withdraw ends it (Tam is free again).
//  - phone: the sheet's Mark traded on the accepted trade turns it into You marked it.
//  - desktop: a row's Mark traded on Rin's marked trade turns it into Traded.
//  - desktop: Yes on Rin's offer accepts it; Rescind trade then ends it.
// On main none of this exists (no Trades box, no Trade press, no sheet), so every leg fails there.
//
// FIXTURE: a SCRATCH branch seeded by scripts/seed-trade-sheet-fixture.mts, its printed ids exported, and a dev server on
// that branch. It writes, so reseed before each run. It refuses any branch but the one named:
//   TRADES_PROBE_DATABASE_URL=postgres://... TRADES_PROBE_BRANCH=br-... PROBE_BASE=http://localhost:3517 \
//     E2E_AUDIT_USER_EMAIL=...+clerk_test@... node scripts/probe-friend-trades-sheet.mjs
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
assertScratchBranch(branch, "probe-friend-trades-sheet");
const ID = Object.fromEntries(["RIN_PUBLIC_ID", "SOL_PUBLIC_ID", "TAM_PUBLIC_ID", "UMA_PUBLIC_ID", "TRADE_ACCEPTED", "TRADE_THEM_MARKED",
  "TRADE_DECLINED", "TRADE_THEIRS", "TRADE_LOOK_YOURS"].map((k) => {
  if (!process.env[k]) throw new Error(`export ${k} from the seed's output`);
  return [k, process.env[k]];
}));

const WIDTHS = [{ label: "phone", width: 390, height: 844, touch: true }, { label: "desktop", width: 1300, height: 900, touch: false }];
const SHEET = '[data-testid="trade-sheet"]';
const PICKER = '[data-testid="trade-picker"]';
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
const count = (page, selector) => page.locator(selector).count();
const tab = async (page, friend) => {
  await visit(page, `${BASE}/friends/${ID[`${friend}_PUBLIC_ID`]}/spares`);
  await shown(page, '[data-testid="spare-tile-press"]', 60_000);
};
const land = async (page, friend, trade) => {
  await visit(page, `${BASE}/friends/${ID[`${friend}_PUBLIC_ID`]}/spares?trade=${ID[trade]}`);
  return shown(page, SHEET, 60_000);
};
const close = (page, touch) => press(page, touch, page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }));
const rowOf = (page, state) => page.locator(`[data-testid="trade-row"][data-row-state="${state}"]`).first();

async function reads(page, touch, tag) {
  // Landing.
  const landed = await land(page, "RIN", "TRADE_THEIRS");
  report(`${tag}: ?trade= opens that trade's sheet`, landed && (await count(page, '[data-testid="spare-yes"]')) > 0, `sheet ${landed}`);
  report(`${tag}: ?trade= leaves the address`, !new URL(page.url()).searchParams.has("trade"), page.url().replace(BASE, ""));
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  report(`${tag}: nothing wider than the page with the sheet open`, wide <= 0, `overflow ${wide}px`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await shown(page, '[data-testid="trades-head"]', 60_000);
  report(`${tag}: a reload does not reopen the sheet`, !(await shown(page, SHEET, 3000)), "no sheet after reload");

  // A row's press, then Close.
  await press(page, touch, rowOf(page, "offer").locator('[data-testid="trade-row-open"]'));
  const opened = await shown(page, SHEET);
  await close(page, touch);
  report(`${tag}: a Trades row's press opens its sheet, Close closes it`, opened && (await gone(page, SHEET)), `opened ${opened}`);

  // The Trade press from the spares sheet.
  await tab(page, "RIN");
  await press(page, touch, page.locator('[data-testid="spare-tile-press"]').first());
  await shown(page, '[data-testid="friend-spare-trade"]');
  await press(page, touch, page.locator('[data-testid="friend-spare-trade"]').first());
  const picker = await shown(page, PICKER);
  const sparesGone = await gone(page, '[data-testid="spares-sheet"]', 5000);
  report(`${tag}: Trade press closes the spares sheet and opens the trade sheet`, picker && sparesGone, `picker ${picker}, spares sheet gone ${sparesGone}`);
  // Rin's side is filled, so the picker turns to Your spares; the pressed card shows as In the trade on Rin's side.
  const onYours = await page.locator('[data-testid="trade-pick-you"]').getAttribute("aria-selected").catch(() => null);
  await press(page, touch, page.locator('[data-testid="trade-pick-them"]'));
  const picked = await count(page, '[data-testid="trade-pick-press"][aria-pressed="true"]');
  report(`${tag}: the pressed card is already in the trade, the picker on Your spares`, picked === 1 && onYours === "true", `${picked} picked on Rin's side, Your spares pressed ${onYours}`);
  await close(page, touch);

  // Held (Q10).
  await tab(page, "SOL");
  const cap = await shown(page, '[data-testid="trades-cap"]');
  const propose = await page.locator('[data-testid="trades-propose"]').isDisabled().catch(() => false);
  report(`${tag}: held, Sol's tab draws the cap line and holds Propose another trade`, cap && propose, `cap ${cap}, Propose disabled ${propose}`);
  await press(page, touch, page.locator('[data-testid="spare-tile-press"]').first());
  const held = await shown(page, '[data-testid="friend-spare-trade-held"]');
  const tradeOnSol = await count(page, '[data-testid="friend-spare-trade"]');
  report(`${tag}: held, Sol's spares sheet row says Offer waiting, no Trade press`, held && tradeOnSol === 0, `held ${held}, Trade press ${tradeOnSol}`);

  // Propose, Your spares, the Offered popover.
  await tab(page, "RIN");
  await press(page, touch, page.locator('[data-testid="trades-propose"]'));
  report(`${tag}: Propose a trade opens the picker`, await shown(page, PICKER), "picker");
  await press(page, touch, page.locator('[data-testid="trade-pick-you"]'));
  await shown(page, '[data-testid="trade-chip-wants"]');
  const wantsFirst = await page.locator('[data-testid="trade-pick-tile"]').first().locator('[data-testid="trade-chip-wants"]').count();
  report(`${tag}: Your spares lists the cards Rin wants first`, wantsFirst === 1, `first tile carries Wants: ${wantsFirst === 1}`);
  await press(page, touch, page.locator('[data-testid="trade-chip-offered"]').first());
  const pop = await shown(page, '[data-testid="trade-offered-pop"]');
  const fits = await page.evaluate(() => {
    const p = document.querySelector('[data-testid="trade-offered-pop"]')?.getBoundingClientRect();
    const s = document.querySelector('[data-testid="trade-sheet"]')?.closest('[role="dialog"]')?.getBoundingClientRect()
      ?? document.querySelector('[data-testid="trade-sheet"]')?.getBoundingClientRect();
    return p && s ? { ok: p.left >= s.left - 0.5 && p.right <= s.right + 0.5, saw: `pop ${Math.round(p.left)}-${Math.round(p.right)}, sheet ${Math.round(s.left)}-${Math.round(s.right)}` } : { ok: false, saw: "missing" };
  });
  report(`${tag}: the Offered popover sits inside the sheet (not clipped)`, fits.ok, fits.saw);
  await page.keyboard.press("Escape");
  const popGone = await gone(page, '[data-testid="trade-offered-pop"]', 5000);
  report(`${tag}: the Offered chip opens its popover, Escape closes it`, pop && popGone, `open ${pop}, closed ${popGone}`);
  report(`${tag}: Escape on the popover leaves the sheet open`, await shown(page, SHEET, 2000), "sheet still open");
  await close(page, touch);

  // Counter, then Keep theirs.
  await land(page, "RIN", "TRADE_THEIRS");
  await press(page, touch, page.locator('[data-testid="trade-counter"]'));
  const counter = await shown(page, PICKER);
  const holding = await count(page, '[data-testid="trade-pick-press"][aria-pressed="true"]');
  report(`${tag}: Counter opens the picker holding the offer's cards`, counter && holding > 0, `picker ${counter}, ${holding} picked`);
  await press(page, touch, page.locator('[data-testid="trade-keep"]'));
  const back = await shown(page, '[data-testid="spare-yes"]');
  report(`${tag}: Keep theirs returns to Yes / No`, back && (await gone(page, PICKER, 3000)), `Yes ${back}`);

  // Revise, on the reader's own offer that needs a look.
  await land(page, "UMA", "TRADE_LOOK_YOURS");
  await press(page, touch, page.locator('[data-testid="trade-counter"]'));
  report(`${tag}: Counter on your own offer that needs a look opens the picker (Revise)`, await shown(page, PICKER), "picker");

  // Propose a new trade from an ended one.
  await land(page, "RIN", "TRADE_DECLINED");
  await press(page, touch, page.locator('[data-testid="trade-new"]'));
  const fresh = await shown(page, PICKER);
  const none = await count(page, '[data-testid="trade-pick-press"][aria-pressed="true"]');
  report(`${tag}: Propose a new trade on an ended trade opens an empty picker`, fresh && none === 0, `picker ${fresh}, ${none} picked`);
}

async function phoneWrites(page, touch, tag) {
  // Send, See the trade, Withdraw.
  await tab(page, "TAM");
  await press(page, touch, page.locator('[data-testid="trades-propose"]'));
  await shown(page, PICKER);
  const noSend = await count(page, '[data-testid="trade-send"]');
  await press(page, touch, page.locator('[data-testid="trade-pick-press"]').first());
  await press(page, touch, page.locator('[data-testid="trade-pick-you"]'));
  await press(page, touch, page.locator('[data-testid="trade-pick-press"]').first());
  report(`${tag}: Send offer appears only once each side has a card`, noSend === 0 && (await shown(page, '[data-testid="trade-send"]')), `before ${noSend}`);
  await press(page, touch, page.locator('[data-testid="trade-send"]'));
  report(`${tag}: Send offer draws Sent`, await shown(page, '[data-testid="trade-sent"]'), "sent");
  await press(page, touch, page.locator('[data-testid="trade-sent-open"]'));
  const yours = await shown(page, '[data-testid="trade-withdraw"]');
  report(`${tag}: See the trade opens it as your offer`, yours, "Withdraw shown");
  await press(page, touch, page.locator('[data-testid="trade-withdraw"]'));
  report(`${tag}: Withdraw ends the offer`, await shown(page, '[data-testid="trade-new"]'), "ended, Propose a new trade shown");
  await close(page, touch);

  // The sheet's Mark traded.
  await land(page, "RIN", "TRADE_ACCEPTED");
  await press(page, touch, page.locator('[data-testid="trade-mark"]'));
  const marked = await gone(page, '[data-testid="trade-mark"]');
  await close(page, touch).catch(() => {});
  await tab(page, "RIN");
  const states = await page.locator('[data-testid="trade-row"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-row-state")).join(","));
  report(`${tag}: the sheet's Mark traded marks it`, marked && (await count(page, `[data-testid="trade-row"][data-row-state="youMarked"]`)) === 2, `press gone ${marked}, rows ${states}`);
}

async function desktopWrites(page, touch, tag) {
  // A row's Mark traded.
  await tab(page, "RIN");
  const before = await page.locator('[data-testid="trade-row"][data-row-state="traded"]').count();
  await press(page, touch, rowOf(page, "themMarked").locator('[data-testid="trade-row-mark"]'));
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="trade-row"][data-row-state="traded"]').length > n, before, { timeout: 15_000 })
    .then(() => report(`${tag}: a row's Mark traded makes it Traded`, true, `traded rows ${before} -> more`),
      () => report(`${tag}: a row's Mark traded makes it Traded`, false, `traded rows stayed ${before}`));

  // Yes, then Rescind.
  await land(page, "RIN", "TRADE_THEIRS");
  await press(page, touch, page.locator('[data-testid="spare-yes"]'));
  const accepted = await shown(page, '[data-testid="trade-rescind"]');
  report(`${tag}: Yes accepts Rin's offer`, accepted, "Rescind shown");
  await press(page, touch, page.locator('[data-testid="trade-rescind"]'));
  report(`${tag}: Rescind trade ends it`, await shown(page, '[data-testid="trade-new"]'), "ended");
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
      await (size.touch ? phoneWrites : desktopWrites)(page, size.touch, tag);
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
