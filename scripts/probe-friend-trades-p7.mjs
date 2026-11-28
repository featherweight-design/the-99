// probe:friend-trades-p7 — every press friend trades PR 7 adds away from a friend's Spares tab does what it says, at 390
// (touch) and 1300 wide (handoff `design_handoff_the99_friend_trades`, Lists L1/RH and MakeTrade A1 to A3).
//
// WHAT IT PROVES, each press a real tap or click at the control's centre:
//  - /friends: the Requests box's Trades tab shows trade rows; past five, the foot names the rest (trades-more).
//  - /friends: a Trades row's press opens its trade sheet over Friends, in place (the address does not change).
//  - the box's Request history link lands on /friends/requests; its Trades segment shows trade rows; a row's press
//    opens the sheet there, in place.
//  - /friends Waiting on you: Yes to an ask draws the receipt with Make it a trade (A1); its press opens the picker with
//    the Yes card on the reader's side (Your yes, A3).
//  - Home: Yes on the lead's ask turns its action line into Make it a trade (A2), which opens the sheet over Home.
//  - Home What's new: Yes on a row's ask draws Make it a trade on the row (A1), which opens the sheet.
//  - nothing wider than the page, with the sheet open.
//  WRITES: each width answers three asks Yes. The phone leg also sends the Make it a trade offer from the Waiting on
//  you receipt (Tam's ask, the newest) and sees Sent; desktop does not send, since that offer holds Tam's cap.
// On main none of this exists (no Trades tab, no Make it a trade, no sheet off the Spares tab), so every leg fails there.
//
// FIXTURE: a SCRATCH branch seeded by scripts/seed-trade-sheet-fixture.mts (it seeds eight open asks; this probe
// answers six of them, three a width), and a dev server on that branch. It writes, so reseed before each run. It refuses any branch but the one
// named, reading the worktree's DATABASE_URL unless TRADES_PROBE_DATABASE_URL names one:
//   TRADES_PROBE_BRANCH=br-... PROBE_BASE=http://localhost:3527 E2E_AUDIT_USER_EMAIL=...+clerk_test@... \
//     node scripts/probe-friend-trades-p7.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const TARGET = process.env.TRADES_PROBE_DATABASE_URL ?? process.env.DATABASE_URL;
const NAMED = process.env.TRADES_PROBE_BRANCH;
if (!TARGET || !NAMED) throw new Error("set TRADES_PROBE_BRANCH (the seeded scratch branch) and a database URL");
const [{ branch }] = await neon(TARGET)`select current_setting('neon.branch_id', true) as branch`;
if (branch !== NAMED) throw new Error(`database reports ${branch}, not ${NAMED}`);
assertScratchBranch(branch, "probe-friend-trades-p7");

const WIDTHS = [{ label: "phone", width: 390, height: 844, touch: true }, { label: "desktop", width: 1300, height: 900, touch: false }];
const T = (id) => `[data-testid="${id}"]`;
const SHEET = T("trade-sheet");
/** A Waiting on you row holding an ask for a spare (not an offer, which has no Make it a trade). */
const ASK_ROW = `${T("waiting-row")}[data-kind="spare-request"]:not([data-offer])`;
const PICKER = T("trade-picker");
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
/**
 * One real tap or click at the element's centre, after it is visible (never `locator.click`, which waits out movement).
 * It waits for React to own the element, then scrolls it to the viewport's middle: at the page's foot the phone's fixed tab bar would take the tap.
 */
async function press(page, touch, locator) {
  await locator.waitFor({ state: "visible", timeout: 20_000 });
  // Hydrated: a press on server HTML React has not yet claimed does nothing.
  await locator.evaluate((el) => new Promise((done) => {
    const owned = () => Object.keys(el).some((k) => k.startsWith("__reactProps$"));
    const t0 = Date.now();
    (function poll() { if (owned() || Date.now() - t0 > 20_000) done(); else setTimeout(poll, 50); })();
  }));
  await locator.evaluate((el) => el.scrollIntoView({ block: "center" }));
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
/**
 * Presses the sheet's Close, then waits for the sheet to go and the page to stop moving: the scroll lock hands the
 * page back its scroll a beat after the sheet leaves, and a press measured before that lands somewhere else.
 */
async function close(page, touch) {
  await press(page, touch, page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }));
  await gone(page, SHEET);
  let last = -1;
  for (let i = 0; i < 20; i++) {
    const y = await page.evaluate(() => scrollY);
    if (y === last) return;
    last = y;
    await page.waitForTimeout(250);
  }
}
const path = (page) => new URL(page.url()).pathname;
const wide = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Presses a row's open, and reports whether the sheet came up over the same page. */
async function opensInPlace(page, touch, tag, label, rowOpen) {
  const before = path(page);
  await press(page, touch, rowOpen);
  const up = await shown(page, SHEET);
  report(`${tag}: ${label} opens its sheet in place`, up && path(page) === before, `sheet ${up}, ${before} -> ${path(page)}`);
  if (!up) return;
  await close(page, touch);
  report(`${tag}: ${label}: the sheet's Close closes it`, await gone(page, SHEET), "sheet gone");
}

/**
 * Answers Yes in `ask` (else in `scope`), then reports whether Make it a trade drew in `scope` and opens the picker
 * holding Your yes.
 */
async function askBack(page, touch, tag, label, scope, ask = scope) {
  await press(page, touch, page.locator(`${ask} ${T("spare-yes")}`).first());
  const drawn = await shown(page, `${scope} ${T("ask-back")}`);
  report(`${tag}: ${label}: Yes draws Make it a trade`, drawn, `press ${drawn}`);
  if (!drawn && process.env.P7_DEBUG) await page.screenshot({ path: `${process.env.P7_DEBUG}/ab-${tag}.png` });
  if (!drawn) return false;
  const before = path(page);
  await press(page, touch, page.locator(`${scope} ${T("ask-back")}`).first());
  const picker = await shown(page, PICKER);
  const yes = picker && (await page.locator(SHEET).getByText("Your yes", { exact: false }).count()) > 0;
  report(`${tag}: ${label}: Make it a trade opens the picker with Your yes, in place`, picker && yes && path(page) === before,
    `picker ${picker}, your yes ${yes}, ${before} -> ${path(page)}`);
  const over = await wide(page);
  report(`${tag}: ${label}: nothing wider than the page with the sheet open`, over <= 0, `overflow ${over}px`);
  return picker;
}

async function run(page, touch, tag) {
  // The Requests box's Trades tab, its foot, a row.
  await visit(page, `${BASE}/friends`);
  await shown(page, T("requests-box"), 60_000);
  // `:visible`: while the page streams, Next holds the box's next draw in a hidden div beside the drawn one.
  await press(page, touch, page.locator(`${T("requests-tab-trades")}:visible`));
  const rows = await shown(page, `${T("requests-trades")} ${T("trade-row")}`);
  const n = await count(page, `${T("requests-trades")} ${T("trade-row")}`);
  report(`${tag}: the Trades tab shows trade rows`, rows && n > 0 && n <= 5, `${n} rows`);
  report(`${tag}: past five rows the foot names the rest`, await shown(page, T("trades-more")), "trades-more shown");
  await opensInPlace(page, touch, tag, "a box Trades row", page.locator(`${T("requests-trades")} ${T("trade-row-open")}`).first());

  // Request history, from the box's link, and its Trades segment.
  await press(page, touch, page.locator(`${T("requests-box")} a[href="/friends/requests"]`));
  await page.waitForURL((u) => u.pathname === "/friends/requests", { timeout: 30_000 }).catch(() => {});
  if (process.env.P7_DEBUG && path(page) !== "/friends/requests") await page.screenshot({ path: `${process.env.P7_DEBUG}/rh-${tag}.png` });
  report(`${tag}: the box's Request history link lands on /friends/requests`, path(page) === "/friends/requests", path(page));
  await press(page, touch, page.locator(`${T("rh-tab-trades")}:visible`));
  const rh = await shown(page, `${T("rh-trades")} ${T("trade-row")}`);
  report(`${tag}: Request history's Trades segment shows trade rows`, rh, `rows ${await count(page, `${T("rh-trades")} ${T("trade-row")}`)}`);
  await opensInPlace(page, touch, tag, "a Request history Trades row", page.locator(`${T("rh-trades")} ${T("trade-row-open")}`).first());

  // Waiting on you (A1), the phone leg sending the offer.
  await visit(page, `${BASE}/friends`);
  await shown(page, `${ASK_ROW} ${T("spare-yes")}`, 60_000);
  const picker = await askBack(page, touch, tag, "Waiting on you", T("waiting-receipt"), ASK_ROW);
  if (picker && touch) {
    const noSend = await count(page, T("trade-send"));
    await press(page, touch, page.locator(T("trade-pick-press")).first());
    report(`${tag}: Send offer appears once the friend's side has a card`, noSend === 0 && (await shown(page, T("trade-send"))), `before ${noSend}`);
    await press(page, touch, page.locator(T("trade-send")));
    report(`${tag}: Make it a trade's Send offer draws Sent`, await shown(page, T("trade-sent")), "sent");
  }
  if (picker) await close(page, touch);

  // Home: the lead (A2), then a What's new row (A1).
  await visit(page, `${BASE}/`);
  await shown(page, `[data-lead-actions] ${T("spare-yes")}`, 60_000);
  if (await askBack(page, touch, tag, "Home's lead", "[data-lead-actions]")) await close(page, touch);
  await visit(page, `${BASE}/`);
  await shown(page, `[data-row-ask] ${T("spare-yes")}`, 60_000);
  // The row's ask presses give way to its receipt, so the row is named by its key, read before the Yes.
  const key = await page.locator("li[data-feed-key]:has([data-row-ask])").first().getAttribute("data-feed-key");
  await askBack(page, touch, tag, "a What's new row", `li[data-feed-key="${key}"]`);
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
      await run(page, size.touch, tag);
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
