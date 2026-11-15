// While the app loader plays, the page must not scroll or show a vertical scrollbar. The loader lifts <main> 10px (`ll-page`),
// which grew the document's scroll area and flashed a scrollbar under the overlay (Hugh, 2026-11-15).
// Stands in for the installed app (display-mode standalone), freezes every ll- animation at 500 ms (inside the held translate), then
// wheels the page and reads scrollY: a root that cannot scroll draws no scrollbar. macOS Chromium draws overlay scrollbars with no gutter to measure.
// Windows: phone 390x844 (touch) and desktop 1280x800. A negative control un-clips the root and must FAIL the same measure.
//
// Run by hand against a dev server on a free port: `PROBE_BASE=http://localhost:3412 node scripts/probe-launch-scrollbar.mjs`.
// Needs a browser and the audit user (`E2E_AUDIT_USER_*`, `CLERK_SECRET_KEY`); never against production.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3002";

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_client_trust") {
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
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const WINDOWS = [
  { label: "phone 390x844", viewport: { width: 390, height: 844 }, touch: true },
  { label: "desktop 1280x800", viewport: { width: 1280, height: 800 }, touch: false },
];

async function measure(browser, win, { unclip } = {}) {
  const ctx = await browser.newContext({ viewport: win.viewport, hasTouch: win.touch, isMobile: win.touch, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await signIn(page);
  await ctx.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (q) => (/display-mode:\s*standalone/.test(q) ? { ...real("all"), matches: true, media: q } : real(q));
    try { sessionStorage.removeItem("the99.launch.seen"); } catch { /* blocked */ }
    const hold = () => {
      if (!document.documentElement) return false;
      const style = document.createElement("style");
      style.textContent = ".launch-loader, .launch-loader *, html[data-launch] main { animation-play-state: paused !important; }";
      document.documentElement.appendChild(style);
      return true;
    };
    if (!hold()) new MutationObserver((_, observer) => hold() && observer.disconnect()).observe(document, { childList: true });
  });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForSelector(".launch-loader", { state: "attached", timeout: 30_000 });
  await page.waitForFunction(() => document.getAnimations().some((a) => a.animationName === "ll-page"), null, { timeout: 30_000 });
  if (unclip) await page.addStyleTag({ content: "html[data-launch]:has(.launch-loader){overflow:visible!important}" });
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      if (!a.animationName?.startsWith("ll-")) continue;
      a.pause();
      a.currentTime = 500;
    }
  });
  await page.waitForTimeout(150);
  // A real wheel, not scrollTo: programmatic scrolling ignores overflow. A root that cannot be scrolled draws no scrollbar (or indicator).
  await page.mouse.move(win.viewport.width / 2, win.viewport.height / 2);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => ({
    scrollY: window.scrollY,
    overflowPx: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    translate: getComputedStyle(document.querySelector("main")).transform,
  }));
  await ctx.close();
  return m;
}

const results = [];
function check(ok, label, detail) {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const win of WINDOWS) {
    const m = await measure(browser, win);
    check(m.translate !== "none", `${win.label}: <main> is held at its 10px lift`, `transform ${m.translate}`);
    check(m.scrollY === 0, `${win.label}: the root cannot be scrolled (so draws no scrollbar) while the loader plays`, `scrollY ${m.scrollY} (page is ${m.overflowPx}px taller than the window)`);
  }
  const control = await measure(browser, WINDOWS[1], { unclip: true });
  check(control.scrollY > 0, "control: unclipped root at 1280x800 scrolls", `scrollY ${control.scrollY}`);
} finally {
  await browser.close();
}
process.exit(results.every(Boolean) ? 0 : 1);
