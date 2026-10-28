// probe:card-swipe — the phone card swipe is one motion (Hugh, 2026-10-28).
//
// At 390, from a card opened off the deck page's list, a horizontal drag carries the swap with the
// finger: halfway to the neighbor, the card has shrunk halfway to the peek's size and opacity and
// the neighbor has grown halfway to the card's, and a drag back undoes both before the finger lifts.
// A release that does not page eases both home. A release that pages hands over WITHOUT A SNAP:
// sampled every frame, the arriving card's first frame is the size the swipe had grown its peek
// to, it only grows from there, and the card left behind shrinks on from the size it was let go
// at. Under reduced motion the band still slides and nothing scales. At 1300 the desktop details
// draw no phone band and page from the footer as before.
//
// It reports the frame rate over a drag and its settle under 4x CPU throttling (a phone profile),
// and the layouts the drag caused, which must be none: the swipe writes transform and opacity only.
//
//   PROBE_BASE=http://localhost:3187 PROBE_DECK_ID=<id> [PROBE_SHOTS=<dir>] node scripts/probe-card-swipe.mjs
//
// PROBE_SHOTS also records a video of each phone run. Writes only the probe account's About row,
// and restores it.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? null;

// It writes the probe account's About row, so it runs only against a local server and a database
// no other reader uses, judged by the branch the database reports rather than by its URL.
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname)) throw new Error(`PROBE_BASE must be a local server, not ${BASE}.`);
const [{ branch }] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
if (!branch || branch === PRODUCTION || branch === STAGING) throw new Error(`Refusing branch ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev or a scratch branch.`);
const DECK = process.env.PROBE_DECK_ID;
if (!DECK) throw new Error("Set PROBE_DECK_ID to a deck of three or more cards the probe account owns.");

let failures = 0;
const fail = (m) => {
  failures++;
  console.log(`  FAIL ${m}`);
};
const ok = (m) => console.log(`  ok   ${m}`);
const near = (a, b, tol) => Math.abs(a - b) <= tol;

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

/**
 * The card and both peeks as drawn: each one's rendered width over its laid-out width is the scale
 * every transform on it adds up to (the entrance's and the swipe's), and its opacity is computed.
 */
const READ = () => {
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { scale: r.width / el.offsetWidth, opacity: Number(getComputedStyle(el).opacity), mid: r.left + r.width / 2, width: r.width, top: r.top, left: r.left };
  };
  return {
    name: document.querySelector("#card-modal-title")?.textContent?.trim() ?? null,
    card: box("[data-testid=modal-art-mobile]"),
    prev: box("[data-testid=phone-peek-prev]"),
    next: box("[data-testid=phone-peek-next]"),
  };
};

/** Records READ every animation frame until `window.__stop()`, with each frame's time. */
const RECORD = (read) => {
  const fn = new Function(`return (${read})()`);
  const frames = [];
  let on = true;
  const tick = (t) => {
    if (!on) return;
    frames.push({ t, ...fn() });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.__stop = () => {
    on = false;
    return frames;
  };
};

/** A drag the gesture reads as held, not flicked: moves 16ms apart, and a pause before any release. */
async function hold(page, [x0, y], x1, steps = 12) {
  await page.mouse.move(x0, y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x0 + ((x1 - x0) * i) / steps, y);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(120);
}

async function openCard(context, userId) {
  const page = await context.newPage();
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await clearAboutSheet(page, userId);
  await onPage(page, "[data-decklist-row]").first().waitFor({ timeout: 60_000 }).catch(async (e) => {
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/open-failed.png` });
    throw new Error(`no decklist row at ${page.url()}: ${e.message.split("\n")[0]}`);
  });
  // The second row, so both neighbors stand.
  await onPage(page, "[data-decklist-row]").filter({ visible: true }).nth(1).click();
  await page.locator("#card-modal-title").waitFor({ timeout: 30_000 });
  await page.locator("[data-testid=phone-peek-next]").waitFor({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(800);
  return page;
}

await clerkSetup();
const browser = await chromium.launch();
let aboutCapture = null;
try {
  const auth = await browser.newContext();
  const userId = await signIn(await auth.newPage());
  const state = await auth.storageState();
  await auth.close();
  aboutCapture = await captureAboutSeen(userId);

  // ---- Phone, motion welcome ----
  const phone = await browser.newContext({
    storageState: state,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
    ...(SHOTS ? { recordVideo: { dir: SHOTS, size: { width: 390, height: 844 } } } : {}),
  });
  const page = await openCard(phone, userId);
  const rest = await page.evaluate(READ);
  if (!rest.card || !rest.next || !rest.prev) throw new Error("The card and both peeks must stand: open a card with neighbors on both sides.");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/swipe-0-rest.png` });
  const pitch = rest.next.mid - rest.card.mid;
  const y = rest.card.top + rest.card.width * 0.5;
  const x0 = 300;

  // Halfway to the next card, finger down.
  await hold(page, [x0, y], x0 - pitch / 2);
  const half = await page.evaluate(READ);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/swipe-1-half.png` });
  // At half the pitch: the card at 1 - 0.2625/2 and .75, the neighbor at the same size and .75.
  const want = 1 - 0.2625 / 2;
  if (!near(half.card.scale, want, 0.02) || !near(half.card.opacity, 0.75, 0.03))
    fail(`halfway, the card is at scale ${half.card.scale.toFixed(3)} and opacity ${half.card.opacity.toFixed(2)}, want ${want.toFixed(3)} and .75`);
  else ok(`halfway, the card has shrunk to ${half.card.scale.toFixed(3)} at ${half.card.opacity.toFixed(2)}`);
  if (!near(half.next.width, half.card.width, 2) || !near(half.next.opacity, 0.75, 0.03))
    fail(`halfway, the neighbor is ${half.next.width.toFixed(1)}px at ${half.next.opacity.toFixed(2)}, the card ${half.card.width.toFixed(1)}px: they should meet at the same size and .75`);
  else ok(`halfway, the neighbor has grown to meet it (${half.next.width.toFixed(1)}px each, ${half.next.opacity.toFixed(2)})`);

  // Back to where the finger started, still down: both undo.
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(x0 - pitch / 2 + (pitch / 2) * (i / 8), y);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(120);
  const back = await page.evaluate(READ);
  if (!near(back.card.scale, 1, 0.01) || !near(back.next.width, rest.next.width, 1.5)) fail(`dragged back, the card is at ${back.card.scale.toFixed(3)} and the neighbor ${back.next.width.toFixed(1)}px (rest ${rest.next.width.toFixed(1)})`);
  else ok("dragged back before the lift, both return with the finger");
  await page.mouse.up();
  await page.waitForTimeout(600);

  // A short drag released: no page, and both ease home.
  await hold(page, [x0, y], x0 - pitch * 0.15);
  await page.mouse.up();
  await page.waitForTimeout(600);
  const home = await page.evaluate(READ);
  if (home.name !== rest.name) fail(`a 15% drag paged to ${home.name}`);
  else if (!near(home.card.scale, 1, 0.005) || !near(home.next.opacity, 0.5, 0.01) || !near(home.card.mid, rest.card.mid, 1)) fail(`a cancelled drag left the card at ${home.card.scale.toFixed(3)}, ${home.card.mid.toFixed(1)}px, the neighbor at ${home.next.opacity}`);
  else ok("a cancelled drag eases card and neighbor home");

  // A committed swipe, sampled every frame, under 4x CPU throttling (a phone profile).
  const cdp = await phone.newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const before = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  await page.evaluate(`(${RECORD.toString()})(${JSON.stringify(READ.toString())})`);
  await hold(page, [x0, y], x0 - pitch * 0.6, 16);
  const atRelease = await page.evaluate(READ);
  const mid = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  await page.mouse.up();
  await page.waitForFunction((n) => document.querySelector("#card-modal-title")?.textContent?.trim() !== n, rest.name, { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(900);
  const frames = await page.evaluate(() => window.__stop());
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/swipe-3-paged.png` });

  // The drag itself laid nothing out.
  const layouts = mid.LayoutCount - before.LayoutCount;
  if (layouts > 0) fail(`the drag caused ${layouts} layout(s); it writes transform and opacity only`);
  else ok("the drag caused no layout");

  // Frame rate, over the whole recording (the drag, the release and the glide).
  const gaps = frames.slice(1).map((f, i) => f.t - frames[i].t);
  const sorted = [...gaps].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const fps = (1000 * gaps.length) / (frames.at(-1).t - frames[0].t);
  const dropped = gaps.filter((g) => g > 1000 / 60 * 1.5).length;
  console.log(`  info at 4x CPU throttle: ${fps.toFixed(1)} fps over ${gaps.length} frames, p95 frame ${p95.toFixed(1)}ms, ${dropped} over 25ms`);
  if (fps < 55) fail(`the swipe ran at ${fps.toFixed(1)} fps under a phone profile`);

  // The hand-over: find the first frame of the new card.
  const first = frames.findIndex((f) => f.name && f.name !== rest.name);
  if (first < 0) fail("the committed swipe never paged");
  else {
    const arrived = frames.slice(first).filter((f) => f.card);
    const f0 = arrived[0];
    // The peek it grew from, at release: its rendered width.
    const grown = atRelease.next.width;
    if (!near(f0.card.width, grown, grown * 0.04))
      fail(`the arriving card's first frame is ${f0.card.width.toFixed(1)}px wide; the swipe had grown it to ${grown.toFixed(1)}px (a snap)`);
    else ok(`the arriving card's first frame is ${f0.card.width.toFixed(1)}px, the ${grown.toFixed(1)}px the swipe left it`);
    if (!near(f0.card.mid, atRelease.next.mid, 4)) fail(`the arriving card's first frame is centred at ${f0.card.mid.toFixed(1)}, its peek was let go at ${atRelease.next.mid.toFixed(1)}`);
    else ok("it starts exactly where its peek was let go");
    let shrank = 0;
    for (let i = 1; i < arrived.length; i++) if (arrived[i].card.width < arrived[i - 1].card.width - 0.5) shrank++;
    if (shrank) fail(`the arriving card shrank on ${shrank} frame(s) of its glide`);
    else ok(`it only grows, over ${arrived.length} frames, to ${arrived.at(-1).card.width.toFixed(1)}px`);
    // The card left behind is the new previous peek.
    const left = f0.prev;
    if (!left) fail("no previous peek on the arriving frame");
    else if (!near(left.width, atRelease.card.width, atRelease.card.width * 0.04) || !near(left.mid, atRelease.card.mid, 4))
      fail(`the card left behind starts ${left.width.toFixed(1)}px at ${left.mid.toFixed(1)}, it was let go ${atRelease.card.width.toFixed(1)}px at ${atRelease.card.mid.toFixed(1)}`);
    else ok(`the card left behind shrinks on from ${left.width.toFixed(1)}px, where it was let go`);
  }
  await phone.close();

  // ---- Phone, reduced motion ----
  const still = await browser.newContext({ storageState: state, viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const spage = await openCard(still, userId);
  const srest = await spage.evaluate(READ);
  const spitch = srest.next.mid - srest.card.mid;
  await hold(spage, [x0, y], x0 - spitch / 2);
  const shalf = await spage.evaluate(READ);
  if (!near(shalf.card.scale, 1, 0.005) || !near(shalf.next.opacity, 0.5, 0.01)) fail(`reduced motion: halfway the card is at ${shalf.card.scale.toFixed(3)}, the neighbor at ${shalf.next.opacity}`);
  else if (!near(shalf.card.mid, srest.card.mid - spitch / 2, 4)) fail("reduced motion: the band did not follow the finger");
  else ok("reduced motion: the band slides with the finger and nothing scales");
  await spage.mouse.up();
  await still.close();

  // ---- Desktop: unchanged ----
  const desk = await browser.newContext({ storageState: state, viewport: { width: 1300, height: 900 } });
  const dpage = await desk.newPage();
  await dpage.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await clearAboutSheet(dpage, userId);
  await onPage(dpage, "[data-decklist-row]").first().waitFor({ timeout: 60_000 });
  await onPage(dpage, "[data-decklist-row]").filter({ visible: true }).nth(1).click();
  await dpage.locator("#card-modal-title").waitFor({ timeout: 30_000 });
  await dpage.waitForTimeout(600);
  if (SHOTS) await dpage.screenshot({ path: `${SHOTS}/desktop-0-open.png` });
  if (await dpage.locator("[data-testid=card-band]").isVisible()) fail("desktop: the phone's card band is drawn at 1300");
  const dname = await dpage.evaluate(() => document.querySelector("#card-modal-title")?.textContent?.trim());
  await dpage.keyboard.press("ArrowRight");
  await dpage.waitForFunction((n) => document.querySelector("#card-modal-title")?.textContent?.trim() !== n, dname, { timeout: 15_000 }).catch(() => {});
  await dpage.waitForTimeout(600);
  const dnext = await dpage.evaluate(() => document.querySelector("#card-modal-title")?.textContent?.trim());
  if (SHOTS) await dpage.screenshot({ path: `${SHOTS}/desktop-1-paged.png` });
  if (dnext === dname) fail("desktop: → did not page");
  else ok(`desktop: unchanged, no phone band, → pages to ${dnext}`);
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
