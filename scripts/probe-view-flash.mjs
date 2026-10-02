// Proves desktop /collection draws its real view from the server: no rows painted before the grid.
//
//   PROBE_BASE=http://localhost:<port> [RUNS=3] [CASES=bare,stored,hinted,art] pnpm probe:view-flash
//
// The server could not know a reader's width or their stored view, so it drew rows and the
// grid replaced them at hydration: 1.9s of rows on main, 3.0s with the first-window payload, on
// every cold desktop visit at the slow profile below. A cookie now mirrors the stored choice
// (`collection_view`), a second carries the width class (`collection_wide`), and a visit with
// neither draws both views split by CSS until hydration picks one.
//
// Each case loads a bare `/collection` at 1300x900 on Chrome's Slow 4G (562.5ms, 180,000 B/s)
// with a 4x CPU throttle, and an init script stamps, frame by frame from before the document
// parses, the first time each view is LAID OUT in <main> (a hidden view has no height, so the
// CSS split's rows never count) and when React hydrates <main>. The assertion is that rows are
// never laid out; hydration time is printed per case, for a before/after against main.
//
//   bare    no cookies: the first visit, drawn as the CSS split.
//   stored  collection_view=grid: a reader who chose the grid.
//   hinted  collection_wide=1: a reader the width cookie says is on desktop.
//   art     no cookies, at 390 and 1300: the dual render's grid art. At 390 the hidden grid half
//           requests none of its art before hydration (its first-screen tiles are lazy, and a hidden
//           lazy image is never fetched); at 1300 the grid's on-screen tiles ARE requested, so the
//           phone's saving did not cost desktop its first art.
//
// The two selectors are the views' root classes (rows-view.tsx, grid-view.tsx). If either root
// changes, change them here, or every case reads "never" and passes about nothing: a case where
// the grid is never laid out FAILS for that reason.
//
// Measured on main with all three cases, this FAILS (rows on screen before the grid). It makes
// no writes. Point it at a `next dev` or `next start` serving the worktree under test.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test")
          ? await signIn.create({ identifier: email })
          : await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
          });
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


async function throttle(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 562.5, downloadThroughput: 180_000, uploadThroughput: 84_375 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  const setup = await browser.newContext();
  const sp = await setup.newPage();
  await signIn(sp);
  const state = await setup.storageState();
  await setup.close();
  const host = new URL(BASE).hostname;
  const CASES = {
    bare: [],
    stored: [{ name: "collection_view", value: "grid" }],
    hinted: [{ name: "collection_wide", value: "1" }],
  };
  const wanted = (process.env.CASES ?? "bare,stored,hinted").split(",").map((c) => c.trim()).filter((c) => c !== "art");
  for (const name of wanted) {
    if (!CASES[name]) throw new Error(`unknown case ${name}; known: ${Object.keys(CASES).join(", ")}`);
  }
  for (const name of wanted) {
    console.log(`── ${name} ──`);
    const hydrations = [];
    for (let i = 0; i < Number(process.env.RUNS ?? 3); i++) {
      const ctx = await browser.newContext({ storageState: state, viewport: { width: 1300, height: 900 } });
      // A context's storage state carries no view cookie of ours, so each case starts from exactly
      // the cookies it names.
      await ctx.clearCookies({ name: "collection_view" });
      await ctx.clearCookies({ name: "collection_wide" });
      if (CASES[name].length) await ctx.addCookies(CASES[name].map((c) => ({ ...c, domain: host, path: "/" })));
      const page = await ctx.newPage();
      // Stamps the first frame each view is laid out in <main>, from before the document parses.
      await page.addInitScript(() => {
        const t = (window.__flash = { rows: null, grid: null, hydrated: null });
        const tick = () => {
          const main = document.querySelector("main");
          if (main) {
            const now = performance.now();
            const seen = (sel) => [...main.querySelectorAll(sel)].some((el) => el.getBoundingClientRect().height > 0);
            if (t.rows === null && seen('div[class*="gap-[6px]"][class*="flex-col"]')) t.rows = now;
            if (t.grid === null && seen('div[class*="grid-cols-2"][class*="minmax(178px"]')) t.grid = now;
            if (t.hydrated === null && Object.keys(main).some((k) => k.startsWith("__reactFiber$"))) t.hydrated = now;
          }
          if (t.grid === null || t.hydrated === null) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await throttle(page);
      await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded", timeout: 120000 });
      const settled = await page
        .waitForFunction(() => window.__flash?.grid !== null && window.__flash?.hydrated !== null, null, { timeout: 120000 })
        .then(() => true, () => false);
      const f = await page.evaluate(() => window.__flash);
      const r = (v) => (v === null ? "never" : Math.round(v));
      report(
        `${name} run ${i}: the grid is laid out`,
        settled && f.grid !== null,
        `grid ${r(f.grid)}ms, hydrated ${r(f.hydrated)}ms`,
      );
      report(
        `${name} run ${i}: rows are never laid out at 1300`,
        f.rows === null,
        f.rows === null ? "rows never drawn" : `rows from ${r(f.rows)}ms, on screen ${Math.round((f.grid ?? f.rows) - f.rows)}ms before the grid`,
      );
      if (f.hydrated !== null) hydrations.push(f.hydrated);
      await ctx.close();
    }
    hydrations.sort((a, b) => a - b);
    if (hydrations.length) console.log(`   ${name}: median hydration ${Math.round(hydrations[Math.floor(hydrations.length / 2)])}ms`);
  }
  // ── The first visit's grid art, both sides ─────────────────────────────────────────
  //
  // With no cookies the server draws both views, and the grid half's first-screen tiles are eager:
  // their src is in the server HTML. A browser fetches a non-lazy <img> even under display:none, so
  // on a phone the hidden grid would download that art for nothing; the dual render marks those
  // tiles lazy, which a hidden subtree never fetches. Two sides, because either alone passes a
  // wrong build: at 390 no grid tile's art may be requested before hydration, and at 1300 the
  // grid's on-screen tiles must be, or the fix cost desktop its first art.
  //
  // Read from Resource Timing, whose startTime shares the clock of the hydration stamp, against
  // the grid tiles' OWN src attributes, so a row thumbnail or the commander art never counts.
  if (!process.env.CASES || process.env.CASES.split(",").includes("art")) {
    for (const { width, height, side } of [
      { width: 390, height: 844, side: "phone" },
      { width: 1300, height: 900, side: "desktop" },
    ]) {
      const ctx = await browser.newContext({ storageState: state, viewport: { width, height } });
      await ctx.clearCookies({ name: "collection_view" });
      await ctx.clearCookies({ name: "collection_wide" });
      const page = await ctx.newPage();
      // The tiles are read the FIRST frame the grid exists, before hydration: on a phone,
      // hydration collapses the dual render to rows and the grid half leaves the document, so a
      // read taken afterwards finds no tiles and measures nothing.
      await page.addInitScript(() => {
        const t = (window.__flash = { hydrated: null, tiles: null });
        const tick = () => {
          const main = document.querySelector("main");
          if (main && t.tiles === null) {
            const grid = main.querySelector('div[class*="grid-cols-2"][class*="minmax(178px"]');
            const imgs = grid ? [...grid.querySelectorAll("img[src]")] : [];
            if (imgs.length) {
              t.tiles = imgs.map((img) => {
                const r = img.getBoundingClientRect();
                return { src: img.src, onScreen: r.height > 0 && r.top < window.innerHeight };
              });
            }
          }
          if (main && t.hydrated === null && Object.keys(main).some((k) => k.startsWith("__reactFiber$"))) {
            t.hydrated = performance.now();
          }
          if (t.hydrated === null) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await throttle(page);
      await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForFunction(() => window.__flash?.hydrated !== null, null, { timeout: 120000 });
      // Give a request issued at parse time its chance to show up in the timeline.
      await page.waitForTimeout(1000);
      const art = await page.evaluate(() => {
        const hydrated = window.__flash.hydrated;
        const before = new Set(
          performance.getEntriesByType("resource")
            .filter((e) => e.startTime < hydrated && /scryfall\.io/.test(e.name))
            .map((e) => e.name),
        );
        const tiles = window.__flash.tiles ?? [];
        const onScreen = tiles.filter((tile) => tile.onScreen);
        return {
          tiles: tiles.length,
          requested: tiles.filter((tile) => before.has(tile.src)).length,
          onScreen: onScreen.length,
          onScreenRequested: onScreen.filter((tile) => before.has(tile.src)).length,
        };
      });
      if (side === "phone") {
        report(
          "390, no cookies: the grid half is in the document with eager art",
          art.tiles > 0,
          `${art.tiles} grid tiles carry a src; none means this check lost its subject`,
        );
        report(
          "390, no cookies: none of the hidden grid's art is requested before hydration",
          art.requested === 0,
          `${art.requested} of ${art.tiles} grid tiles requested`,
        );
      } else {
        report(
          "1300, no cookies: the grid's on-screen tiles are requested before hydration",
          art.onScreen > 0 && art.onScreenRequested === art.onScreen,
          `${art.onScreenRequested} of ${art.onScreen} on-screen tiles requested`,
        );
      }
      await ctx.close();
    }
  }

  await browser.close();
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}
run().catch((e) => { console.error(e); process.exitCode = 1; });
