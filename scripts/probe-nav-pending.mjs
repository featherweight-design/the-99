// probe:nav-pending — navigation pending and its escalation to the full screen, in a real browser
// at 1300x900 and 390x844, on Chromium's "Slow 4G" profile (the navigation-pending handoff and its
// escalation addendum). Every check here is a fact about time or paint, which jsdom has neither of.
//
//   1. A DIRECT load of /collection streams its loading screen inside the shell's <main>: the page
//      segment's own loading.tsx is gone, and the shell's Suspense fallback is what draws it now.
//   2. Home to /commanders by the nav slot: the pip paints at 120ms or later and never before; the
//      escalation screen is up by ~550ms and not before 400ms; `aria-busy` is on the shell's <main>
//      alone; a press under the screen lands on the screen; and after the commit the screen lets
//      pointer events through and is gone within a few frames.
//   3. Home's "Update collection" ghost link: its track paints, and at DPR 1 it is 2px tall (a
//      1.5px strip has no whole device pixel there). A screenshot of the button is saved.
//   4. A kept route (a deck's import page, by its header button, which reports): its own screen
//      shows and the escalation never does.
//   5. An inline TEXT link that carries only a PendingReporter (/about's route link to /discover):
//      a slow press still escalates, and no mark is painted.
//   6. The account menu's About row, whose press unmounts the link: the menu reports the
//      navigation, so a slow press still escalates.
//   7. The About dismiss (`Got it`) on /about?next=/commanders: the action returns the destination
//      and the page navigates there itself, so a slow arrival escalates. It asserts THAT it
//      escalates, not WHEN: its clock also holds the action's round trip, so a lower bound would
//      pass on a build with no 400ms gate. Checks 1 and 2 prove the gate. Needs a server with
//      ABOUT_SHEET_ENABLED off, the only mode that offers the dismiss; on one with it on, the
//      check fails and says so, and the rest of the run carries on.
//   8. A row link's track, on a commander row (/commanders) and a set row (/collection/sets): the
//      track paints inside the pressed row at 120ms or later. A screenshot cannot hold it, since
//      the window between 120ms and the 400ms screen is too short to shoot reliably.
//
// Mutations it is built to fail: the shell's <Suspense> removed (check 1 reads no screen), and the
// 400ms gate set to 0 (check 2 reads the screen before the pip).
//
// Point it at a `next start` on local-dev or a scratch branch, signed in as E2E_AUDIT_USER_EMAIL.
// It writes that account's About row and nothing else: every entry seen so no sheet covers a page,
// then one version behind with no entry seen for check 7. The row as it stood before the run is
// captured first and put back when the run ends. Never production.
//
//   PROBE_BASE=http://localhost:3061 pnpm probe:nav-pending
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { captureAboutSeen, clearAboutSheet, markEveryEntrySeen, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? path.join(os.tmpdir(), "probe-nav-pending");
mkdirSync(SHOTS, { recursive: true });

// Chromium's own "Slow 4G" figures, as `measure:load`'s slow profile uses them.
const SLOW_4G = { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1e6) / 8 * 0.9, uploadThroughput: (750 * 1e3) / 8 * 0.9 };
const WIDTHS = [
  { label: "1300", viewport: { width: 1300, height: 900 } },
  { label: "390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];

let failures = 0;
function report(ok, label, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? " ok " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function signIn(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const userId = await page.evaluate(async (email) => {
    const s = window.Clerk.client.signIn;
    let a = await s.create({ identifier: email });
    if (a.status !== "complete") {
      const f = a.supportedFirstFactors?.find((x) => x.strategy === "email_code");
      await s.prepareFirstFactor({ strategy: "email_code", emailAddressId: f?.emailAddressId });
      a = await s.attemptFirstFactor({ strategy: "email_code", code: "424242" });
    }
    if (a.status !== "complete") throw new Error(`sign-in status ${a.status}`);
    await window.Clerk.setActive({ session: a.createdSessionId });
    return window.Clerk.user.id;
  }, EMAIL);
  // Captured BEFORE the first write to it, and put back in the run's `finally`: check 7 sets the
  // account behind on About, and the dismiss it presses writes the version.
  const aboutRow = await captureAboutSeen(userId);
  await clearAboutSheet(page, userId);
  const state = await context.storageState();
  await context.close();
  return { state, userId, aboutRow };
}

// Stamps, from the moment it is armed, the first frame each pending signal is PAINTED: the pip or
// track at non-zero opacity, the escalation screen at non-zero opacity, and the frame it is gone.
const WATCH = () => {
  window.__navArm = () => {
    const seen = (window.__nav = { t0: performance.now(), mark: null, overlay: null, overlayGone: null, busy: [], hit: null });
    // The clock restarts at the press itself, not at the arm: a Playwright click spends time on
    // actionability and dispatch before the event fires, and counting that would let a mark whose
    // delay was cut short still read past 120ms. Capture phase, once, so it fires first and only
    // for the press being measured. A code-started push has no click and keeps the arm's clock.
    document.addEventListener("click", () => { seen.t0 = performance.now(); }, { capture: true, once: true });
    const tick = () => {
      const now = performance.now() - seen.t0;
      const mark = document.querySelector("[data-pending]");
      if (seen.mark == null && mark && Number(getComputedStyle(mark).opacity) > 0) seen.mark = now;
      const overlay = document.querySelector('[data-testid="pending-overlay"]');
      if (seen.overlay == null && overlay && Number(getComputedStyle(overlay).opacity) > 0) {
        seen.overlay = now;
        seen.busy = [...document.querySelectorAll("[aria-busy]")].map((e) => e.tagName.toLowerCase());
        seen.overlayInsideMain = [...document.querySelectorAll("main")].some((m) => m.contains(overlay));
        const r = overlay.getBoundingClientRect();
        const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        seen.hit = overlay.contains(at);
      }
      if (seen.overlay != null && seen.overlayGone == null && !overlay) seen.overlayGone = now;
      if (seen.ownScreen == null && document.querySelector("main [role=status] h1")) seen.ownScreen = now;
      if (now < 30_000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
};

async function slowPage(context) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  return { page, throttle: (on) => cdp.send("Network.emulateNetworkConditions", on ? SLOW_4G : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }) };
}

async function run(browser, state, width, userId) {
  console.log(`\n${width.label}px`);
  const context = await browser.newContext({ viewport: width.viewport, isMobile: width.isMobile, hasTouch: width.hasTouch, deviceScaleFactor: 1, storageState: state });
  await context.addInitScript(WATCH);

  // 1. Direct load: the shell's fallback streams the route's screen.
  {
    const { page, throttle } = await slowPage(context);
    await throttle(true);
    await page.addInitScript(() => {
      const look = () => {
        const status = document.querySelector("main [role=status] h1");
        if (status && !window.__screen) window.__screen = status.textContent;
        if (!window.__screen) requestAnimationFrame(look);
      };
      requestAnimationFrame(look);
    });
    // Not `load`: on Slow 4G that waits on every card image the grid asks for. The screen, or the
    // page's own content arriving without one, is what this asks about.
    await page.goto(`${BASE}/collection`, { waitUntil: "commit", timeout: 120_000 });
    await page.waitForFunction(
      () => window.__screen || document.querySelector("main [data-testid], main ul, main table"),
      null,
      { timeout: 120_000, polling: 50 },
    );
    const screen = await page.evaluate(() => window.__screen ?? null);
    report(screen === "Reading your collection", "direct load of /collection streams its screen", screen ?? "no screen");
    await page.close();
  }

  // 2. Home to /commanders by the nav slot.
  {
    const { page, throttle } = await slowPage(context);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
    await throttle(true);
    const slot = page.locator(width.label === "390" ? 'nav[aria-label="Primary"].fixed a[href="/commanders"]' : 'aside nav[aria-label="Primary"] a[href="/commanders"]');
    await page.evaluate(() => window.__navArm());
    await slot.click();
    await page.waitForURL((u) => u.pathname === "/commanders", { timeout: 120_000 });
    await page.waitForFunction(() => window.__nav.overlayGone != null || performance.now() - window.__nav.t0 > 60_000, null, { timeout: 120_000, polling: 50 });
    const nav = await page.evaluate(() => window.__nav);
    report(nav.mark != null && nav.mark >= 120, "the pip paints at 120ms, never before", `pip at ${Math.round(nav.mark)}ms`);
    report(nav.overlay != null && nav.overlay >= 390 && nav.overlay <= 700, "the screen is up by ~550ms and not before 400ms", `screen at ${nav.overlay == null ? "never" : `${Math.round(nav.overlay)}ms`}`);
    report(nav.overlay == null || nav.mark < nav.overlay, "the pip paints before the screen", "");
    report(nav.busy.length === 1 && nav.busy[0] === "main", "aria-busy is on the shell's <main> alone", nav.busy.join(",") || "none");
    report(nav.overlayInsideMain === false, "the screen is a sibling of <main>, never inside it", "");
    report(nav.hit === true, "a press under the screen lands on the screen", "");
    report(nav.overlayGone != null, "the screen is gone after the commit", nav.overlayGone == null ? "still up" : `gone at ${Math.round(nav.overlayGone)}ms`);
    const busyAfter = await page.evaluate(() => document.querySelectorAll("[aria-busy]").length);
    report(busyAfter === 0, "nothing is left busy after the commit", `${busyAfter}`);
    await throttle(false);
    await page.close();
  }

  // 3. The ghost link's track, at DPR 1.
  {
    const { page, throttle } = await slowPage(context);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
    await throttle(true);
    const link = page.locator('main a[href="/collection/replace"]').first();
    await link.click();
    const track = link.locator("[data-pending]");
    await track.waitFor({ state: "attached", timeout: 10_000 });
    await page.waitForTimeout(400);
    const h = await track.evaluate((el) => el.getBoundingClientRect().height).catch(() => null);
    report(h === 2, "the track is 2px at DPR 1", `${h}px`);
    const shot = path.join(SHOTS, `track-${width.label}.png`);
    await link.screenshot({ path: shot }).catch(() => {});
    console.log(`       screenshot: ${shot}`);
    await page.waitForURL((u) => u.pathname === "/collection/replace", { timeout: 120_000 });
    await throttle(false);
    await page.close();
  }

  // 4. A kept route shows neither signal: its own loading.tsx commits at press, so pending ends
  //    before the 120ms mark (the handoff's rule). Pressed through the deck header's "Update from
  //    a list" button link, which carries a track and REPORTS (a deck tile does not until PR 2),
  //    so "no mark" is the boundary working and not a link that never told anyone. The provider's
  //    own kept rule, for a pending that outlasts 400ms, is unit-tested.
  {
    const { page, throttle } = await slowPage(context);
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle", timeout: 120_000 });
    const deckHref = await page.locator("main li a[href^='/decks/']").first().getAttribute("href");
    await page.goto(`${BASE}${deckHref}`, { waitUntil: "networkidle", timeout: 120_000 });
    const link = page.locator(`main a[href="${deckHref}/import"]`).filter({ visible: true }).first();
    await throttle(true);
    await page.evaluate(() => window.__navArm());
    await link.click();
    await page.waitForURL((u) => u.pathname === `${deckHref}/import`, { timeout: 120_000 });
    await page.waitForTimeout(1_000);
    const nav = await page.evaluate(() => window.__nav);
    report(nav.ownScreen != null, `a kept route (${deckHref}/import) shows its own screen at press`, nav.ownScreen == null ? "none" : `at ${Math.round(nav.ownScreen)}ms`);
    report(nav.mark == null && nav.overlay == null, "and neither the mark nor the escalation", `mark ${nav.mark == null ? "none" : Math.round(nav.mark) + "ms"}, screen ${nav.overlay == null ? "none" : Math.round(nav.overlay) + "ms"}`);
    await throttle(false);
    await page.close();
  }

  // 5. An inline text link with no mark (PR 2's `PendingReporter`): an About entry's route link
  //    (plain mono text, no chrome) still escalates to its route's screen, and paints no mark of its
  //    own. /collection's "By set" link is not the subject: it is drawn as a bordered chip.
  {
    const { page, throttle } = await slowPage(context);
    await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    const link = page.locator('main a[href="/discover"]').filter({ hasText: "/discover", visible: true }).first();
    await link.waitFor({ state: "visible", timeout: 120_000 });
    await page.waitForFunction(() => window.next?.router, null, { timeout: 120_000 });
    await throttle(true);
    await page.evaluate(() => window.__navArm());
    await link.click();
    await page.waitForURL((u) => u.pathname === "/discover", { timeout: 120_000 });
    const nav = await page.evaluate(() => window.__nav);
    report(nav.overlay != null && nav.overlay >= 390, "an inline link's slow press escalates to its screen", nav.overlay == null ? "never" : `screen at ${Math.round(nav.overlay)}ms`);
    report(nav.mark == null, "and draws no mark of its own", nav.mark == null ? "" : `mark at ${Math.round(nav.mark)}ms`);
    await throttle(false);
    await page.close();
  }

  // 6. The account menu's About row: its press closes the menu and unmounts the link, so the menu
  //    reports the navigation itself. A slow press still escalates to /about's screen. The trigger
  //    is the shell's own control, so it is found by its name rather than scoped to the page.
  {
    const { page, throttle } = await slowPage(context);
    await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    const trigger = page.getByRole("button", { name: /^Account: / }).filter({ visible: true }).first();
    await trigger.waitFor({ state: "visible", timeout: 120_000 });
    await page.waitForFunction(() => window.next?.router, null, { timeout: 120_000 });
    await trigger.click();
    const about = page.getByRole("menuitem", { name: "About The 99" });
    await about.waitFor({ state: "visible", timeout: 30_000 });
    await throttle(true);
    await page.evaluate(() => window.__navArm());
    await about.click();
    await page.waitForURL((u) => u.pathname === "/about", { timeout: 120_000 });
    const nav = await page.evaluate(() => window.__nav);
    report(nav.overlay != null && nav.overlay >= 390, "the account menu's About press escalates after the menu closes", nav.overlay == null ? "never" : `screen at ${Math.round(nav.overlay)}ms`);
    await throttle(false);
    await page.close();
  }

  // 8. A row link's track: pressed on a commander row and a set row, it paints INSIDE that row, at
  //    120ms or later, like the ghost link's in check 3 and the nav slot's pip in check 2.
  for (const [path, selector] of [
    ["/commanders", "a[href^='/commanders/']"],
    ["/collection/sets", "a[href^='/collection/sets/']"],
  ]) {
    const { page, throttle } = await slowPage(context);
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    const row = page.locator(`main ${selector}`).filter({ visible: true }).first();
    await row.waitFor({ state: "visible", timeout: 120_000 });
    await page.waitForFunction(() => window.next?.router, null, { timeout: 120_000 });
    await throttle(true);
    await page.evaluate(() => window.__navArm());
    await row.click();
    // Painted, not merely present: the strip has a real box inside the pressed link's own rect, and
    // its sweeping segment overlaps the strip with a background that is not transparent. A track
    // with no height, or a segment with no fill, leaves `[data-pending]` in the DOM and draws nothing.
    const inRow = await page
      .waitForFunction((sel) => {
        const nav = window.__nav;
        if (nav.mark == null) return null;
        const link = [...document.querySelectorAll(`main ${sel}`)].find((a) => a.querySelector("[data-pending]"));
        if (!link) return { mark: nav.mark, inRow: false, why: "no track in the pressed row" };
        const track = link.querySelector("[data-pending]");
        const seg = track.firstElementChild;
        const l = link.getBoundingClientRect();
        const t = track.getBoundingClientRect();
        const g = seg?.getBoundingClientRect();
        const overlap = g ? Math.max(0, Math.min(g.right, t.right) - Math.max(g.left, t.left)) * Math.max(0, Math.min(g.bottom, t.bottom) - Math.max(g.top, t.top)) : 0;
        const fill = seg ? getComputedStyle(seg).backgroundColor : "";
        const alpha = /rgba\([^)]*,\s*([\d.]+)\)/.exec(fill)?.[1];
        const visibleFill = fill !== "" && fill !== "transparent" && (alpha == null || Number(alpha) > 0);
        const withinLink = t.left >= l.left - 0.5 && t.right <= l.right + 0.5 && t.bottom <= l.bottom + 0.5 && t.top >= l.top - 0.5;
        const ok = t.height > 0 && t.width > 0 && withinLink && overlap > 0 && visibleFill;
        return {
          mark: nav.mark,
          inRow: ok,
          why: ok ? "" : `track ${t.width.toFixed(0)}x${t.height.toFixed(1)}, within the row ${withinLink}, segment overlap ${overlap.toFixed(1)}, fill ${fill}`,
        };
      }, selector, { timeout: 5_000, polling: 16 })
      .then((h) => h.jsonValue(), () => null);
    report(
      inRow != null && inRow.inRow && inRow.mark >= 120,
      `a ${path === "/commanders" ? "commander" : "set"} row's track paints inside the row, at 120ms or later`,
      inRow == null ? "no mark" : `mark at ${Math.round(inRow.mark)}ms${inRow.inRow ? ", painted inside the row" : `, ${inRow.why}`}`,
    );
    await throttle(false);
    await page.close();
  }

  // 7. The About dismiss (`Got it`), offered to a reader SENT to /about while behind: the action
  //    returns the destination and the page navigates there itself, so a slow arrival at a route
  //    that is not kept escalates to its screen. The account is set one version behind with no
  //    entry seen, the state the gate sends a reader in from, and marked seen again afterwards.
  {
    const sql = neon(requireEnv(["DATABASE_URL"]).DATABASE_URL);
    const version = JSON.parse(readFileSync(new URL("../src/lib/copy/about.version.json", import.meta.url), "utf8")).version;
    await sql`update user_prefs set about_version_seen = ${version - 1}, about_seen_ids = ${[]}::text[] where user_id = ${userId}`;
    try {
      const { page, throttle } = await slowPage(context);
      await page.goto(`${BASE}/about?next=${encodeURIComponent("/commanders")}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      const dismiss = page.getByRole("button", { name: /^Got it/ }).filter({ visible: true }).first();
      const offered = await dismiss.waitFor({ state: "visible", timeout: 60_000 }).then(() => true, () => false);
      if (!offered) {
        report(false, "the About dismiss escalates to its destination's screen", "no Got it on /about: is ABOUT_SHEET_ENABLED on for this server?");
      } else {
        await page.waitForFunction(() => window.next?.router, null, { timeout: 120_000 });
        await throttle(true);
        await page.evaluate(() => window.__navArm());
        await dismiss.click();
        await page.waitForURL((u) => u.pathname === "/commanders", { timeout: 120_000 });
        const nav = await page.evaluate(() => window.__nav);
        // No lower bound: this clock includes the action's round trip (see the header).
        report(nav.overlay != null, "the About dismiss escalates to its destination's screen", nav.overlay == null ? "never" : `screen at ${Math.round(nav.overlay)}ms from the press`);
        await throttle(false);
      }
      await page.close();
    } finally {
      await markEveryEntrySeen(userId);
    }
  }

  await context.close();
}

await clerkSetup();
const browser = await chromium.launch();
try {
  const { state, userId, aboutRow } = await signIn(browser);
  try {
    for (const width of WIDTHS) await run(browser, state, width, userId);
  } finally {
    await restoreAboutSeen(aboutRow);
  }
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
