// probe:friend-trades-p8 — trading from a deck or All shopping does what it says, at 390 (touch) and 1300 wide
// (handoff `design_handoff_the99_friend_trades`, FromDeck D2 to D4).
//
// WHAT IT PROVES, each press a real tap or click at the control's centre:
//  - a deck's Shopping: the sheet a friend-spare press opens (Before you buy, with stand-ins) draws Trade beside Ask; Trade
//    closes that sheet and opens the trade sheet with the card in it (never two sheets); its back reopens the first sheet.
//  - All shopping: the same on the spares sheet.
//  - a friend's Spares tab: `?from=deck/<id>` names the reader's deck in the head's back link and links to it,
//    `?from=shopping` reads All shopping; a deck id the reader does not own, or junk, draws the plain Friends link.
//  - nothing wider than the page, with the trade sheet open.
//  WRITES (desktop, last): Send offer from All shopping draws Sent, and Open the trade lands on the friend's Spares tab
//  with the trade open and the head reading All shopping. That offer holds the friend's cap (Q10), so reseed (or withdraw
//  it) before a second run.
// On main none of this exists (no Trade on these sheets, no named back), so every leg fails there.
//
// FIXTURE: a SCRATCH branch seeded by scripts/seed-trade-sheet-fixture.mts, plus a deck of the reader's (SPARES_DECK,
// named SPARES_DECK_NAME) holding a card (SPARES_CARD) the friend RIN_PUBLIC_ID spares and the reader does not own:
//   TRADES_PROBE_BRANCH=br-... PROBE_BASE=http://localhost:3418 E2E_AUDIT_USER_EMAIL=...+clerk_test@... \
//     SPARES_DECK=... SPARES_DECK_NAME=... SPARES_CARD=... RIN_PUBLIC_ID=... node scripts/probe-friend-trades-p8.mjs
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
assertScratchBranch(branch, "probe-friend-trades-p8");

const WIDTHS = [{ label: "phone", width: 390, height: 844, touch: true }, { label: "desktop", width: 1300, height: 900, touch: false }];
const T = (id) => `[data-testid="${id}"]`;
const SHEET = T("trade-sheet");
/** A Waiting on you row holding an ask for a spare (not an offer, which has no Make it a trade). */
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
const wide = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const { SPARES_DECK: DECK, SPARES_DECK_NAME: DECK_NAME, SPARES_CARD: CARD, RIN_PUBLIC_ID: RIN } =
  requireEnv(["SPARES_DECK", "SPARES_DECK_NAME", "SPARES_CARD", "RIN_PUBLIC_ID"]);
const TRADE = T("friend-spare-trade");
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** From the sheet `opener` brings up: Trade swaps it for the trade sheet holding the card, and back brings it back. */
async function tradeAndBack(page, touch, tag, label, opener, first) {
  await press(page, touch, opener);
  const drawn = await shown(page, TRADE);
  const firstUp = await shown(page, first);
  report(`${tag}: ${label}: the sheet draws Trade beside Ask`, drawn && firstUp && (await count(page, T("friend-spare-ask"))) > 0, `trade ${drawn}, sheet ${firstUp}`);
  if (!drawn) return false;
  await press(page, touch, page.locator(TRADE).first());
  const up = await shown(page, SHEET);
  const left = await gone(page, first);
  const holds = up && (await page.locator(SHEET).innerHTML()).includes(CARD);
  const dialogs = await page.getByRole("dialog").count();
  report(`${tag}: ${label}: Trade swaps the sheet for the trade sheet holding ${CARD}`, up && left && holds && dialogs === 1, `trade sheet ${up}, first gone ${left}, holds ${holds}, dialogs ${dialogs}`);
  const over = await wide(page);
  report(`${tag}: ${label}: nothing wider than the page with the trade sheet open`, over <= 0, `overflow ${over}px`);
  if (!up) return false;
  await press(page, touch, page.getByRole("button", { name: "Back to your friends’ spares" }));
  const back = await shown(page, first);
  const closed = await gone(page, SHEET);
  report(`${tag}: ${label}: back reopens the sheet Trade left`, back && closed && (await shown(page, TRADE)), `sheet ${back}, trade sheet gone ${closed}`);
  return true;
}

/** The head's back link on Rin's Spares tab, for `from`. */
async function head(page, tag, from, text, href) {
  await visit(page, `${BASE}/friends/${RIN}/spares?from=${encodeURIComponent(from)}`);
  const link = page.locator(T("friend-head-back"));
  await link.waitFor({ state: "visible", timeout: 30_000 });
  // The tab names its origin after hydration (the layout's head reads it from the page), so wait for the text.
  await page.waitForFunction(([sel, want]) => document.querySelector(sel)?.textContent?.includes(want), [T("friend-head-back"), text], { timeout: 10_000 }).catch(() => {});
  const saw = (await link.textContent())?.trim();
  const to = await link.getAttribute("href");
  report(`${tag}: from=${from.slice(0, 24)} draws "${text}" to ${href}`, saw?.includes(text) && to === href, `"${saw}" -> ${to}`);
}

async function run(page, touch, tag, writes) {
  // A deck's Shopping: a card with stand-ins opens Before you buy, whose friends section takes Trade.
  await visit(page, `${BASE}/decks/${DECK}`);
  await shown(page, "[role=tablist]", 60_000);
  await press(page, touch, page.getByRole("tab", { name: /^Shopping \d+/ }));
  await tradeAndBack(page, touch, tag, "a deck", page.getByRole("button", { name: new RegExp(`[Ff]riends with a spare of ${escape(CARD)}`) }).first(), T("stand-ins-sheet"));
  // All shopping: the spares sheet.
  await visit(page, `${BASE}/decks/shopping`);
  await shown(page, T("spare-glyph"), 60_000);
  const cartPress = page.getByRole("button", { name: new RegExp(`^Friends with a spare of ${escape(CARD)}`) }).first();
  await tradeAndBack(page, touch, tag, "All shopping", cartPress, T("spares-sheet"));
  // The head's way back: named for an owned deck or All shopping, else the plain Friends link.
  await head(page, tag, `deck/${DECK}`, `‹ ${DECK_NAME}`, `/decks/${DECK}`);
  await head(page, tag, "shopping", "‹ All shopping", "/decks/shopping");
  await head(page, tag, "deck/00000000-0000-4000-8000-000000000000", "Friends", "/friends");
  await head(page, tag, "https://example.com/x", "Friends", "/friends");
  if (!writes) return;
  // Send from All shopping, then Open the trade lands on Rin's Spares tab named for All shopping.
  await visit(page, `${BASE}/decks/shopping`);
  await shown(page, T("spare-glyph"), 60_000);
  await press(page, touch, cartPress);
  await press(page, touch, page.locator(TRADE).first());
  await shown(page, SHEET);
  await press(page, touch, page.locator(T("trade-pick-you")));
  await press(page, touch, page.locator(T("trade-pick-press")).first());
  await press(page, touch, page.locator(T("trade-send")));
  report(`${tag}: Send offer from All shopping draws Sent`, await shown(page, T("trade-sent")), "sent");
  await press(page, touch, page.locator(T("trade-sent-open")));
  await page.waitForURL((u) => u.pathname === `/friends/${RIN}/spares`, { timeout: 20_000 }).catch(() => {});
  const u = new URL(page.url());
  const opened = await shown(page, SHEET, 20_000);
  await page.waitForFunction((sel) => document.querySelector(sel)?.textContent?.includes("All shopping"), T("friend-head-back"), { timeout: 10_000 }).catch(() => {});
  const named = (await page.locator(T("friend-head-back")).textContent({ timeout: 10_000 }).catch(() => null))?.includes("All shopping");
  report(`${tag}: Open the trade lands on Rin's Spares tab with the trade open, named for All shopping`,
    u.pathname === `/friends/${RIN}/spares` && u.searchParams.get("from") === "shopping" && opened && named,
    `${u.pathname}${u.search}, sheet ${opened}, head named ${named}`);
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
      await run(page, size.touch, tag, !size.touch);
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
