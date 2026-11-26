// Card swipe on phone: the gap between the finger lifting and the card starting to move. A release that pages must go straight
// into the transition. Drags a card left, on Wishlist and in Search, with real touch events (CDP), and reads, frame by frame in the page, when the
// finger lifted (pointerup) and when the arrival animation first leaves its delay and runs (the card visibly moves).
//
//   PROBE_BASE=http://localhost:3432 WL_FIXTURE_FILE=<file> [PROBE_MAX_GAP_MS=60] node scripts/probe-card-swipe-release.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
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
}

const lines = JSON.parse(readFileSync(process.env.WL_FIXTURE_FILE, "utf8"));
const MAX = Number(process.env.PROBE_MAX_GAP_MS ?? 60);
await clerkSetup();
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await signIn(page);
  const cdp = await context.newCDPSession(page);
  const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  const gaps = [];
  for (const surface of ["Wishlist", "Search", "Wishlist", "Search", "Wishlist", "Search"]) {
    await page.goto(`${BASE}/collection/wishlist`, { waitUntil: "networkidle" });
    if (surface === "Wishlist") {
      const tiles = page.getByTestId("wishlist-tile");
      await tiles.first().waitFor({ timeout: 20_000 });
      await tiles.nth(1).locator("button").first().tap();
    } else {
      await page.getByRole("button", { name: /search/i }).first().tap();
      const dlg = page.getByRole("dialog", { name: "Search all cards" });
      await dlg.waitFor({ timeout: 8_000 });
      await dlg.getByRole("combobox").fill("Ambassador");
      const opt = dlg.getByRole("option", { name: /^Ambassador Laquatus/ });
      await opt.waitFor({ timeout: 15_000 });
      await opt.tap();
    }
    await page.getByTestId("card-band").waitFor({ timeout: 10_000 });
    await page.waitForTimeout(3000); // the neighbors are read ahead
    await page.evaluate(() => {
      window.__rel = null;
      const snap = () => {
        const b = document.querySelector('[data-testid="card-band"]');
        const r = b?.getBoundingClientRect();
        return { b, x: r?.x, w: r?.width, tf: b ? getComputedStyle(b).transform : null, anims: document.getAnimations().length };
      };
      window.addEventListener("pointerup", (e) => {
        const at = performance.now();
        const base = snap();
        window.__rel = { at, base, moved: null };
        // Motion is the arrival animation passing its delay, not the band being swapped in: a paged card mounts held at the
        // peek's place (the animation's backwards fill), and only moves from there when its delay is over.
        const enter = () => document.getAnimations().filter((a) => /^phone-(card|peek)-enter$/.test(a.animationName ?? ""));
        const tick = () => {
          const all = enter();
          if (window.__rel.swapped == null && all.length) window.__rel.swapped = performance.now();
          if (all.some((a) => (a.currentTime ?? 0) > a.effect.getTiming().delay)) { window.__rel.moved = performance.now(); return; }
          if (performance.now() - at < 2000) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, true);
    });
    const y = 300;
    await touch("touchStart", 300, y);
    for (let i = 1; i <= 8; i++) { await touch("touchMove", 300 - i * 20, y); await page.waitForTimeout(16); }
    await touch("touchEnd", 140, y);
    await page.waitForTimeout(1500);
    const rel = await page.evaluate(() => window.__rel && { gap: window.__rel.moved === null ? null : window.__rel.moved - window.__rel.at, swap: window.__rel.swapped ? window.__rel.swapped - window.__rel.at : null });
    console.log("RUN", surface, JSON.stringify(rel));
    gaps.push(rel?.gap ?? null);
  }
  console.log("GAPS_MS", JSON.stringify(gaps));
  check(`release goes straight into the transition (every gap under ${MAX}ms)`, gaps.every((g) => g !== null && g <= MAX), JSON.stringify(gaps));
  await context.close();
} finally {
  await browser.close();
}
if (failed) {
  console.log(`\n${failed} check(s) FAILED`);
  process.exit(1);
}
console.log("\nall checks passed");
