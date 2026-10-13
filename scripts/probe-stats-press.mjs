// probe:stats-press — pressing `Stats` on /decks answers in the frame it lands, in a real browser at
// 1300x900 and 390x844 under Chrome's Slow 4G and a 4x CPU (the profile `measure:load` calls slow).
//
// The Stats press asks the server (the first read this visit) and flips in place when it lands, which
// on a slow connection is seconds. It used to show nothing in between. This proves, in the page and on
// the press's own pointerdown (never a harness wait, which re-checks on a backoff):
//  - FEEDBACK: the first animation frame whose Stats tab is filled AND marked `aria-busy` comes within
//    FEEDBACK_MS of the pointerdown, and before the view has changed. (The fill is read off the class list: the
//    off segment's `active:bg-[var(--elevated)]` would satisfy a substring match.)
//  - THE SELECTION: in that same frame Tiles has let go of the selected fill (it never shares it with Stats).
//  - THE MARK: the pending diamond (`[data-pending]`) is fully opaque in that tab, after its 120ms beat, while
//    the read runs.
//  - THE RESULT: Stats then lands (`[data-decks-stats]`), the tab loses the mark and its busy flag, and
//    the feedback came BEFORE it (the read was still pending at the feedback frame).
//
// Needs a server with LINEUP_ENABLED=true and an account with at least one deck. It writes nothing.
// Run it against `next start`, never production: a production build under that profile read 44-50ms
// at both widths (2026-10-13), where `next dev` (React in development mode) reads 110-117ms and fails
// the bar for that reason alone.
//
//   LINEUP_ENABLED=true pnpm build && LINEUP_ENABLED=true node node_modules/next/dist/bin/next start -p 3612
//   PROBE_BASE=http://localhost:3612 pnpm probe:stats-press
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
if (/the-99\.dev|vercel\.app/.test(BASE) && !/staging/.test(BASE)) throw new Error(`refusing ${BASE}`);

/** Under a frame at 60Hz plus the dev server's render: the press may not wait on the network. */
const FEEDBACK_MS = 100;
const SLOW_4G = { offline: false, latency: 562.5, downloadThroughput: 180_000, uploadThroughput: 84_375 };
const WIDTHS = [{ width: 1300, height: 900 }, { width: 390, height: 844 }];

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
  return page.evaluate(() => window.Clerk.user?.id ?? null);
}

/** Armed in the page: the pointerdown, then the first frame with the tab filled and busy, then the view's arrival. */
const ARM = () => {
  const s = { at: null, feedback: null, tilesFilled: null, mark: false, statsBefore: null, landed: null };
  window.__stats = s;
  window.addEventListener("pointerdown", () => { s.at ??= performance.now(); }, { capture: true, once: true });
  const tick = () => {
    if (window.__stats !== s) return;
    const tab = document.querySelector('[data-decks-view="stats"]');
    const landed = !!document.querySelector("[data-decks-stats]");
    if (s.at != null && s.feedback == null && tab?.getAttribute("aria-busy") === "true"
        && tab.classList.contains("bg-[var(--elevated)]")) {
      s.feedback = performance.now();
      s.tilesFilled = document.querySelector('[data-decks-view="tiles"]')?.classList.contains("bg-[var(--elevated)]") ?? null;
      s.statsBefore = landed;
    }
    // Present is not drawn: the mark rides `.anim-pending-in`, which holds it at opacity 0 for 120ms.
    // The wrapper is opaque after its beat; the mark itself is the 4px diamond inside it (which also pulses, so
    // only its box is read), so a wrapper with no diamond in it does not count.
    const wrap = tab?.querySelector("[data-pending]");
    const pip = wrap?.querySelector(".anim-pending-pip");
    if (s.feedback != null && wrap && pip && Number(getComputedStyle(wrap).opacity) >= 0.99
        && pip.offsetWidth === 4 && pip.offsetHeight === 4) s.mark = true;
    if (s.at != null && landed) { s.landed = performance.now(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const browser = await chromium.launch();
try {
  await clerkSetup();
  for (const size of WIDTHS) {
    const context = await browser.newContext({ viewport: size });
    const page = await context.newPage();
    const tag = `@${size.width}`;
    try {
      await signIn(page);
      await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
      const tab = onPageRole(page, "tab", "Stats").first();
      await tab.waitFor({ timeout: 60_000 });
      // Hydrated before the profile goes on, or the press is a no-op that reads as no feedback.
      await page.waitForTimeout(1500);
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", SLOW_4G);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.evaluate(ARM);
      await tab.click();
      await page.waitForFunction(() => window.__stats.landed != null, null, { timeout: 90_000 });
      const s = await page.evaluate(() => window.__stats);
      const fb = s.feedback == null ? null : s.feedback - s.at;
      report(`${tag}: the press draws feedback within ${FEEDBACK_MS}ms of the pointerdown`, fb != null && fb <= FEEDBACK_MS, fb == null ? "never drew" : `${Math.round(fb)}ms`);
      report(`${tag}: Tiles let go of the selected fill in the frame Stats took it`, s.feedback != null && s.tilesFilled === false, s.tilesFilled == null ? "no frame" : s.tilesFilled ? "Tiles still filled" : "Tiles cleared");
      report(`${tag}: it came before Stats did`, s.feedback != null && s.statsBefore === false && s.landed - s.at > (fb ?? 0) + 300, `feedback ${fb == null ? "-" : Math.round(fb)}ms, Stats ${Math.round(s.landed - s.at)}ms`);
      report(`${tag}: the pending mark is drawn while the read runs`, s.mark, s.mark ? "drawn" : "never drawn");
      const done = await page.evaluate(() => {
        const t = document.querySelector('[data-decks-view="stats"]');
        return { busy: t?.getAttribute("aria-busy"), mark: !!t?.querySelector("[data-pending]"), selected: t?.getAttribute("aria-selected") };
      });
      report(`${tag}: once Stats lands the tab is selected, with no mark and no busy flag`, done.selected === "true" && !done.mark && done.busy === null, JSON.stringify(done));
    } finally {
      await context.close();
    }
  }
} catch (error) {
  console.error(error);
  failures += 1;
} finally {
  await browser.close();
}
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
