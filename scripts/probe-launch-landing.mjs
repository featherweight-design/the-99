// The app loader's landing on the installed desktop app and tablet (design/design_handoff_the99_app_loader/addendum-desktop,
// READINESS eng clarification 6): where the flying mark's crown lands must be the rail lockup's crown, not the phone header's.
// Signs in as the audit user (the same route as `probe-bottom.mjs`), stands in for the installed app by answering
// `(display-mode: standalone)` true BEFORE the head script runs, clears the session's seen flag, loads `/`, then freezes every
// animation at 1500 ms (past the 1472 ms landing) and compares the flyer's centre diamond with the shell's crown.
//
// Windows: desktop 1280x800 (62px rail), tablet 1180x820 (touch, 88px rail) and, as the regression, a 390x844 phone (header).
// A negative control forces the old phone landing at the desktop window and must FAIL the same measurement.
//
// Run by hand against a dev server on a free port: `PROBE_BASE=http://localhost:3210 node scripts/probe-launch-landing.mjs`.
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
const TOLERANCE = 1.5;

async function signIn(page) {
  // Exempts this browser from the bot and new-device checks, which otherwise
  // stop sign-in at an emailed code no fixture can answer.
  await setupClerkTestingToken({ page });

  // Sign in through `window.Clerk` on the app's own origin rather than through
  // the hosted portal. The portal hands the session back across origins, and
  // that handoff loops forever against a dev instance on localhost.
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });

  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = await signIn.create({ identifier: email, password });

        // The instance trusts devices, so a fresh browser owes an emailed code
        // on top of the password. A `+clerk_test` address always accepts
        // 424242 and sends no mail, which is what makes this runnable headless.
        if (attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find(
            (f) => f.strategy === "email_code",
          );
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor?.emailAddressId,
          });
          attempt = await signIn.attemptFirstFactor({
            strategy: "email_code",
            code: "424242",
          });
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
  { label: "desktop 1280x800", viewport: { width: 1280, height: 800 }, touch: false, expect: "rail" },
  { label: "tablet 1180x820 (touch)", viewport: { width: 1180, height: 820 }, touch: true, expect: "rail" },
  { label: "phone 390x844 (regression)", viewport: { width: 390, height: 844 }, touch: true, expect: "header" },
];

// The crown's centre diamond: the largest polygon in the svg that is not inside the overlay and sits nearest the top-left.
const MEASURE = () => {
  const centre = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
  };
  const fly = document.querySelector(".launch-loader .ll-dc");
  const shell = [...document.querySelectorAll("svg")]
    .filter((s) => !s.closest(".launch-loader"))
    .map((s) => ({ s, r: s.getBoundingClientRect() }))
    .filter(({ r }) => r.top >= 0 && r.top < 90 && r.left >= 0 && r.left < 120 && r.width > 20 && r.height > 20)
    .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left)[0];
  if (!fly || !shell) return { error: `fly ${!!fly} shell ${!!shell}` };
  const diamonds = [...shell.s.querySelectorAll("polygon, path, rect")]
    .map((p) => ({ p, r: p.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0)
    .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height);
  const big = diamonds[0]?.p;
  const cs = getComputedStyle(document.querySelector(".launch-loader"));
  const flyCs = getComputedStyle(document.querySelector(".launch-loader .ll-fly"));
  return {
    fly: centre(fly),
    shell: big ? centre(big) : null,
    attr: document.documentElement.getAttribute("data-launch"),
    vars: [cs.getPropertyValue("--ll-land-x"), cs.getPropertyValue("--ll-land-y"), cs.getPropertyValue("--ll-land-s")],
    flyTransform: flyCs.transform,
  };
};

async function landing(browser, win, { forcePhone } = {}) {
  const ctx = await browser.newContext({ viewport: win.viewport, hasTouch: win.touch, isMobile: win.touch, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await signIn(page);
  // The installed app: answer display-mode standalone before any document script (the head script reads it while parsing).
  await ctx.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (q) => (/display-mode:\s*standalone/.test(q) ? { ...real("all"), matches: true, media: q } : real(q));
    // Every document of the run starts as a cold start: a Clerk handshake redirect would otherwise load a second document that finds the
    // seen flag the first one wrote (the real app does exactly that, which is the point of the flag).
    try { sessionStorage.removeItem("the99.launch.seen"); } catch { /* blocked storage: nothing to clear */ }
        // Held from the first frame, so a slow dev compile can never let the 3 s run finish (the overlay removes itself at its end).
    const hold = () => {
      if (!document.documentElement) return false;
      const style = document.createElement("style");
      style.textContent = ".launch-loader, .launch-loader * { animation-play-state: paused !important; }";
      document.documentElement.appendChild(style);
      return true;
    };
    // At document creation there may be no <html> yet: wait for it.
    if (!hold()) new MutationObserver((_, observer) => hold() && observer.disconnect()).observe(document, { childList: true });
  });
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  try {
    await page.waitForSelector(".launch-loader .ll-dc", { state: "attached", timeout: 30_000 });
  } catch (error) {
    const seen = await page.evaluate(() => ({
      url: location.pathname,
      attr: document.documentElement.getAttribute("data-launch"),
      overlay: !!document.querySelector(".launch-loader"),
      standalone: matchMedia("(display-mode: standalone)").matches,
      signedIn: !!window.Clerk?.user, nav: !!document.querySelector("nav"), text: document.body.innerText.slice(0, 90),
    }));
    throw new Error(`no loader (${JSON.stringify(seen)}): ${error.message.split("\n")[0]}`);
  }
  if (forcePhone) {
    await page.addStyleTag({ content: ".launch-loader{--ll-land-x:66.75px!important;--ll-land-y:24.75px!important;--ll-land-s:0.156!important}" });
  }
  // Freeze every animation at 1500 ms, past the landing at 1472 ms.
  try {
    await page.waitForFunction(() => document.getAnimations().some((a) => a.animationName === "ll-lift"), null, { timeout: 30_000 });
  } catch (error) {
    const seen = await page.evaluate(() => ({
      attr: document.documentElement.getAttribute("data-launch"),
      display: getComputedStyle(document.querySelector(".launch-loader")).display,
      anims: document.getAnimations().map((a) => a.animationName).slice(0, 8),
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches, seen: sessionStorage.getItem("the99.launch.seen"), standalone: matchMedia("(display-mode: standalone)").matches, w: innerWidth,
    }));
    throw new Error(`no ll-lift animation (${JSON.stringify(seen)})`);
  }
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      if (!a.animationName?.startsWith("ll-")) continue;
      a.pause();
      a.currentTime = 1500;
    }
  });
  await page.waitForTimeout(150);
  const m = await page.evaluate(MEASURE);
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
    const m = await landing(browser, win);
    if (m.error || !m.shell) {
      check(false, `${win.label}: measured`, m.error ?? "no shell crown");
      continue;
    }
    const dx = Math.abs(m.fly.x - m.shell.x);
    const dy = Math.abs(m.fly.y - m.shell.y);
    check(m.attr === "1" || m.attr === null, `${win.label}: the loader played (head script marked the document)`);
    if (dx > TOLERANCE || dy > TOLERANCE) console.log("      debug", JSON.stringify({ vars: m.vars, flyTransform: m.flyTransform }));
    check(dx <= TOLERANCE && dy <= TOLERANCE, `${win.label}: the flyer's crown lands on the ${win.expect}'s`, `dx ${dx.toFixed(2)} dy ${dy.toFixed(2)} (fly ${m.fly.x.toFixed(1)},${m.fly.y.toFixed(1)} shell ${m.shell.x.toFixed(1)},${m.shell.y.toFixed(1)})`);
  }
  // Negative control: the old phone landing at the desktop window must miss by more than the tolerance.
  const control = await landing(browser, WINDOWS[0], { forcePhone: true });
  const miss = control.shell ? Math.hypot(control.fly.x - control.shell.x, control.fly.y - control.shell.y) : 0;
  check(miss > 10, "control: the old phone landing at 1280x800 misses the rail's crown", `miss ${miss.toFixed(1)}px`);
} finally {
  await browser.close();
}
process.exit(results.every(Boolean) ? 0 : 1);
