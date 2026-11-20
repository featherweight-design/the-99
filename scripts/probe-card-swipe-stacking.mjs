// probe:card-swipe-stacking: the card left stays above the card arriving, in both swipe directions (Hugh, 2026-11-15).
//
// At 390, from a card opened off the deck page's list, a committed swipe pages to the neighbor. The card left becomes the peek on the side
// it shrinks to, and the card arriving is the main card: in DOM order the PREVIOUS peek sits under the main card and the NEXT peek over
// it, so a swipe LEFT drew the arriving card on top of the card left, and a swipe right did not. Frozen at several instants of the
// swap, wherever the two overlap the topmost element at the overlap's centre must be the card left, in both directions. A probe that
// never sees an overlap fails (it would be measuring nothing).
//
// The card left and the card arriving keep a 12px gap through the swap, so they never overlap and nothing is asserted between them.
// What it found: the card arriving enters from the far peek's side, over that peek's rest position. The next peek is later in DOM order, so
// swiping LEFT drew it over the arriving card (a translucent strip across it); swiping right drew the previous peek under it, correctly.
//
//   PROBE_BASE=http://localhost:3415 PROBE_DECK_ID=<id of a deck of three or more cards the audit user owns> node scripts/probe-card-swipe-stacking.mjs
//
// Read-only (it writes nothing); needs a browser, `E2E_AUDIT_USER_EMAIL` and `CLERK_SECRET_KEY`; never production.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECK = process.env.PROBE_DECK_ID;
if (!DECK) throw new Error("Set PROBE_DECK_ID to a deck of three or more cards the probe account owns.");
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname)) throw new Error(`PROBE_BASE must be a local server, not ${BASE}.`);

let failures = 0;
const fail = (m) => { failures++; console.log(`  FAIL ${m}`); };
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

async function openCard(browser, state) {
  const context = await browser.newContext({ storageState: state, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "no-preference" });
  const page = await context.newPage();
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector("[data-decklist-row]", { timeout: 60_000 });
  await page.waitForTimeout(3000);
  // The second row, so both neighbors stand.
  await page.locator("main [data-decklist-row]").filter({ visible: true }).nth(1).click();
  await page.locator("#card-modal-title").waitFor({ timeout: 30_000 });
  await page.locator("[data-testid=phone-peek-next]").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(800);
  return { page, context };
}

await clerkSetup();
const browser = await chromium.launch();
try {
  const auth = await browser.newContext();
  await signIn(await auth.newPage());
  const state = await auth.storageState();
  await auth.close();

  for (const dir of ["left", "right"]) {
    const { page, context } = await openCard(browser, state);
    const r0 = await page.evaluate(READ);
    if (!r0.card || !r0.next || !r0.prev) throw new Error("The card and both peeks must stand: open a card with neighbors on both sides.");
    const pitch = r0.next.mid - r0.card.mid;
    const y = r0.card.top + r0.card.width * 0.5;
    const from = dir === "left" ? 300 : 90;
    await hold(page, [from, y], dir === "left" ? from - pitch * 0.7 : from + pitch * 0.7);
    await page.mouse.up();
    await page.waitForFunction(() => document.getAnimations().some((a) => a.animationName?.includes("phone")), null, { timeout: 5000 }).catch(() => {});
    // The far peek is the arriving card's own neighbor, which the card enters over.
        const far = dir === "left" ? "next" : "prev";
    const over = { far: { seen: 0, wrong: 0, at: [] } };
    for (const t of [0, 20, 40, 60, 100, 140, 180]) {
      const box = await page.evaluate(([time, f]) => {
        for (const a of document.getAnimations()) { a.pause(); a.currentTime = time; }
        const r = (sel) => { const b = document.querySelector(sel)?.getBoundingClientRect(); return b ? { l: b.left, r: b.right, t: b.top, b: b.bottom } : null; };
        return { card: r("[data-testid=modal-art-mobile]"), far: r(`[data-testid=phone-peek-${f}]`) };
      }, [t, far]);
      if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/stack-${dir}-${t}.png` });
      if (!box.card) continue;
      for (const [which, peek, want] of [["far", box.far, (id) => id?.startsWith("modal-art-mobile")]]) {
        if (!peek) continue;
        const l = Math.max(box.card.l, peek.l, 0);
        const rr = Math.min(box.card.r, peek.r, 390);
        const tt = Math.max(box.card.t, peek.t);
        const bb = Math.min(box.card.b, peek.b);
        if (rr - l < 6 || bb - tt < 6) continue;
        const top = await page.evaluate(([x, yy]) => document.elementFromPoint(x, yy)?.closest("[data-testid]")?.getAttribute("data-testid") ?? null, [(l + rr) / 2, (tt + bb) / 2]);
        over[which].seen++;
        over[which].at.push(`${t}ms:${top}`);
        if (!want(top)) over[which].wrong++;
      }
    }
    // The card arriving enters over the far peek: that overlap must exist (else nothing was measured) and the card must be on top of it.
    if (over.far.seen === 0) fail(`swiping ${dir}: the arriving card never overlapped the far ${far} peek in the sampled frames (the probe measured nothing)`);
    else if (over.far.wrong > 0) fail(`swiping ${dir}: in ${over.far.wrong} of ${over.far.seen} frames the far ${far} peek is drawn OVER the arriving card (${over.far.at.join(" ")})`);
    else ok(`swiping ${dir}: the arriving card is over the far ${far} peek in all ${over.far.seen} overlapping frames (${over.far.at.join(" ")})`);
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} failure(s)` : "\nall checks passed");
process.exit(failures ? 1 : 0);
