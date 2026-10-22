// probe:card-swipe-steady — paging the phone's card details holds the shelf still.
//
// At 390 with a touch pointer this opens a card from a deck's list and swipes to the next card, back,
// and four times in quick succession, sampling the sheet's top and the card's laid-out width on every
// frame. Both must hold where the teaser put them: a sheet that dips and eases back, with the card
// growing and shrinking in the band above it, is the stutter. The modal remounts per card, and a
// height it measures on mount (the stand-ins door's strip) used to ease the sheet up from where it
// mounted on every page. A press on the grip must still ease the sheet to full, so the hold that
// fixes it cannot have taken the snap's motion with it. At 1300 ArrowRight pages and the dialog's
// box holds.
//
//   PROBE_BASE=http://localhost:3410 node scripts/probe-card-swipe-steady.mjs
//
// PROBE_SHOPPING=1 opens from the Shopping tab of the account's deck with the most cards to buy,
// where the stand-ins door draws (needs a server with SWAP_TOOLS_ENABLED on). PROBE_MIN=1 swipes
// the sheet to its min snap first. PROBE_HEIGHT sets the phone's height (default 844; 664 is a
// phone browser with its bars showing, where the card is sized from the band). PROBE_ENGINE=webkit
// runs WebKit, with PROBE_MOUSE=1 since it takes no CDP touch. PROBE_DECK_ID picks the deck.
//
// Writes only the probe account's About row, and restores it.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium, webkit } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname)) throw new Error(`PROBE_BASE must be a local server, not ${BASE}.`);
const sql = neon(DATABASE_URL);
const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
if (!branch || branch === PRODUCTION || branch === STAGING) throw new Error(`Refusing branch ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev or a scratch branch.`);

let failures = 0;
const fail = (m) => {
  failures++;
  console.log(`  FAIL ${m}`);
};
const ok = (m) => console.log(`  ok   ${m}`);

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  return page.evaluate(() => window.Clerk.user.id);
}

/** Samples the sheet's top and the phone card's width on every frame until stopped. */
const START_SAMPLER = () => {
  const frames = [];
  let on = true;
  const tick = () => {
    if (!on) return;
    const sheet = document.querySelector("[data-testid=card-sheet]")?.getBoundingClientRect();
    // Its laid-out width, not its box on screen: a paged card arrives scaled from its peek, by design.
    const card = document.querySelector("[data-testid=modal-art-mobile]");
    const dialog = document.querySelector("[role=dialog]")?.getBoundingClientRect();
    frames.push({
      t: performance.now(),
      name: document.querySelector("#card-modal-title")?.textContent?.trim() ?? null,
      top: sheet ? sheet.top : null,
      cardW: card ? card.offsetWidth : null,
      dialog: dialog ? { top: dialog.top, height: dialog.height, width: dialog.width } : null,
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.__swipeSampler = { frames, stop: () => (on = false) };
};
const STOP_SAMPLER = () => {
  window.__swipeSampler.stop();
  return window.__swipeSampler.frames;
};

/** A finger, not a mouse: CDP touch events, which the page reads as `pointerType: "touch"`. */
async function drag(page, [x0, y0], [x1, y1], steps = 10) {
  if (process.env.PROBE_MOUSE !== "1") {
    const cdp = await page.context().newCDPSession(page);
    const at = (x, y) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(x0, y0) });
    for (let i = 1; i <= steps; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps) });
      await page.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach();
    return;
  }
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps);
  await page.mouse.up();
}

/** Every frame's sheet top against the teaser's resting top; the worst drift is the stutter. */
function judge(label, frames, restTop, restW) {
  const tops = frames.filter((f) => f.top !== null);
  const worst = tops.reduce((m, f) => Math.max(m, Math.abs(f.top - restTop)), 0);
  const widths = frames.filter((f) => f.cardW !== null);
  const worstW = widths.reduce((m, f) => Math.max(m, Math.abs(f.cardW - restW)), 0);
  const names = [...new Set(frames.map((f) => f.name))];
  if (names.length < 2) fail(`${label}: the swipe did not page (${names.join(", ")})`);
  if (worst > 0.5) {
    const bad = tops.filter((f) => Math.abs(f.top - restTop) > 0.5).map((f) => f.top.toFixed(1));
    fail(`${label}: the sheet left its teaser top ${restTop.toFixed(1)} on ${bad.length} of ${tops.length} frames (worst ${worst.toFixed(1)}px: ${bad.slice(0, 12).join(", ")})`);
  } else ok(`${label}: the sheet held ${restTop.toFixed(1)} on all ${tops.length} frames (${names.join(" → ")})`);
  if (worstW > 0.5) fail(`${label}: the card's width left ${restW.toFixed(1)} by up to ${worstW.toFixed(1)}px`);
  else ok(`${label}: the card held ${restW.toFixed(1)}px wide on every frame`);
}

await clerkSetup();
const browser = await (process.env.PROBE_ENGINE === "webkit" ? webkit : chromium).launch();
let aboutCapture = null;
try {
  const auth = await browser.newContext();
  const userId = await signIn(await auth.newPage());
  const state = await auth.storageState();
  await auth.close();
  aboutCapture = await captureAboutSeen(userId);
  const deck =
    process.env.PROBE_DECK_ID ??
    (process.env.PROBE_SHOPPING === "1"
      ? await sql`select d.id from decks d where d.user_id = ${userId} order by (select count(*) from deck_cards dc where dc.deck_id = d.id and not exists (select 1 from collection_items ci where ci.user_id = d.user_id and ci.oracle_id = dc.oracle_id)) desc limit 1`
      : await sql`select d.id from decks d where d.user_id = ${userId} order by (select count(*) from deck_cards dc where dc.deck_id = d.id) desc limit 1`)[0]?.id;
  if (!deck) throw new Error("The probe account owns no deck: set PROBE_DECK_ID.");

  const phone = await browser.newContext({ storageState: state, viewport: { width: 390, height: Number(process.env.PROBE_HEIGHT ?? 844) }, hasTouch: true, isMobile: true });
  const page = await phone.newPage();
  await page.goto(`${BASE}/decks/${deck}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await clearAboutSheet(page, userId);
  // The About sheet's redirect may already have fired on the first load: come back to the deck.
  if (!new URL(page.url()).pathname.startsWith("/decks/")) await page.goto(`${BASE}/decks/${deck}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await onPage(page, "[data-decklist-row]").first().waitFor({ timeout: 60_000 });
  if (process.env.PROBE_SHOPPING === "1") {
    await onPageRole(page, "tab", /^Shopping \d+/).first().click();
    await page.waitForTimeout(800);
  }
  await onPage(page, "[data-decklist-row]").filter({ visible: true }).nth(1).click();
  await page.locator("#card-modal-title").waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1200);
  const strip = await page.locator("[data-testid=card-sheet] [data-testid=stand-in-door]").count();
  // The Shopping run exists for the strip: without one it measures the case that was already steady.
  if (process.env.PROBE_SHOPPING === "1" && strip === 0)
    throw new Error("PROBE_SHOPPING=1 opened a card with no stand-ins strip: run a server with SWAP_TOOLS_ENABLED on, and a deck whose second Shopping row is an unlocked card.");
  console.log(`  phone: door strip ${strip ? "drawn" : "absent"}`);
  if (process.env.PROBE_MIN === "1") {
    await drag(page, [195, 200], [195, 520], 12);
    await page.waitForTimeout(1200);
  }
  const rest = await page.evaluate(() => ({
    top: document.querySelector("[data-testid=card-sheet]").getBoundingClientRect().top,
    w: document.querySelector("[data-testid=modal-art-mobile]").offsetWidth,
    snap: document.querySelector("[data-testid=card-sheet]").getAttribute("data-sheet"),
  }));
  console.log(`  phone: resting at ${rest.snap}, sheet top ${rest.top}`);

  for (const [label, from, to] of [
    ["phone: swipe to the next card", [330, 300], [60, 305]],
    ["phone: swipe back", [60, 300], [330, 305]],
  ]) {
    await page.evaluate(START_SAMPLER);
    await drag(page, from, to);
    await page.waitForTimeout(1200);
    const frames = await page.evaluate(STOP_SAMPLER);
    judge(label, frames, rest.top, rest.w);
  }
  // Quick repeated swipes, each landing while the last card is still arriving.
  {
    await page.evaluate(START_SAMPLER);
    for (let i = 0; i < 4; i++) {
      await drag(page, [330, 300], [60, 305], 6);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(1500);
    const frames = await page.evaluate(STOP_SAMPLER);
    judge("phone: four quick swipes", frames, rest.top, rest.w);
  }
  // The hold is for a measurement alone: a real snap still eases. The grip raises the sheet to full,
  // and some frame between must catch it partway.
  if (process.env.PROBE_MIN !== "1") {
    await page.evaluate(START_SAMPLER);
    await page.locator("[data-testid=card-sheet] [data-sheet-grip]").click();
    await page.waitForTimeout(800);
    const frames = await page.evaluate(STOP_SAMPLER);
    const tops = frames.map((f) => f.top).filter((t) => t !== null);
    const end = tops.at(-1);
    const between = tops.filter((t) => t < rest.top - 1 && t > end + 1);
    if (end >= rest.top) fail(`phone: the grip left the sheet at ${end}, not raised`);
    else if (between.length === 0) fail("phone: the grip's snap to full jumped, with no frame between");
    else ok(`phone: the grip still eases the sheet to full (${between.length} frames between ${rest.top.toFixed(0)} and ${end.toFixed(0)})`);
  }
  await phone.close();

  const desk = await browser.newContext({ storageState: state, viewport: { width: 1300, height: 900 } });
  const dpage = await desk.newPage();
  await dpage.goto(`${BASE}/decks/${deck}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await clearAboutSheet(dpage, userId);
  if (!new URL(dpage.url()).pathname.startsWith("/decks/")) await dpage.goto(`${BASE}/decks/${deck}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await onPage(dpage, "[data-decklist-row]").first().waitFor({ timeout: 60_000 });
  await onPage(dpage, "[data-decklist-row]").filter({ visible: true }).nth(1).click();
  await dpage.locator("#card-modal-title").waitFor({ timeout: 30_000 });
  await dpage.waitForTimeout(800);
  const box = await dpage.evaluate(() => document.querySelector("[role=dialog]").getBoundingClientRect().toJSON());
  await dpage.evaluate(START_SAMPLER);
  await dpage.keyboard.press("ArrowRight");
  await dpage.waitForTimeout(1000);
  const dframes = await dpage.evaluate(STOP_SAMPLER);
  const names = new Set(dframes.map((f) => f.name));
  const moved = dframes.filter((f) => f.dialog && (Math.abs(f.dialog.top - box.top) > 0.5 || Math.abs(f.dialog.height - box.height) > 0.5));
  if (names.size < 2) fail("desktop: ArrowRight did not page");
  else if (moved.length) fail(`desktop: the dialog's box moved on ${moved.length} frames while paging`);
  else ok(`desktop: paging held the dialog at ${box.width}x${box.height} on all ${dframes.length} frames`);
  await desk.close();
} finally {
  try {
    if (aboutCapture) await restoreAboutSeen(aboutCapture);
  } finally {
    await browser.close();
  }
}
console.log(failures ? `\n${failures} failure(s)` : "\nall checks passed");
process.exit(failures ? 1 : 0);
