// "Precons I own" (/decks/precons?pick=own) must not load behind the list's skeleton: its loading frame has to sit where the
// loaded pick page's blocks sit. Signs in as the audit user, opens /decks, pushes the pick route client-side and measures the
// loading screen the frame it appears (a MutationObserver: the response carries the skeleton and the page together, so the
// probe cannot hold it open), then measures the same blocks on the loaded page, at 390 and 1300. The title, the first row's
// top, the shortest of the first eight rows and the foot must agree within TOL px. On main the list's skeleton draws a
// different frame, so every block misses and this exits 1. `PROBE_BASE=http://localhost:3231 node scripts/probe-precons-skeleton.mjs`
// (webpack dev: `pnpm dev --webpack`). PROBE_SHOTS=<dir> keeps the two screens as PNGs.
// Needs a browser and the audit user (`E2E_AUDIT_USER_*`, `CLERK_SECRET_KEY`); never production. Exits 1 on any miss.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3002";
const TOL = 4;
const WINDOWS = [{ name: "phone", width: 390, height: 844 }, { name: "desktop", width: 1300, height: 900 }];

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
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


const BLOCKS = {
  title: "h1",
  firstRow: "ul > li",
};

// Runs in the page: one block's top and height, for the blocks the probe compares.
function readBlocks(root, blocks) {
  const scopeEl = root === "pick" ? document.querySelector("h1").closest("header").parentElement : document.querySelector(root);
  const out = {};
  for (const [name, sel] of Object.entries(blocks)) {
    const r = scopeEl?.querySelector(sel)?.getBoundingClientRect();
    out[name] = r ? { top: Math.round(r.top + window.scrollY), height: Math.round(r.height) } : null;
  }
  // The sticky foot: the last block of the screen.
  const foot = [...(scopeEl?.children ?? [])].at(-1)?.getBoundingClientRect();
  // A row wraps on a long name (the loaded first row at 390 is 5px over the floor), so rows are compared by their shortest.
  const heights = [...(scopeEl?.querySelectorAll("ul > li") ?? [])].slice(0, 8).map((el) => el.getBoundingClientRect().height);
  out.rowFloor = heights.length ? { top: out.firstRow?.top ?? 0, height: Math.round(Math.min(...heights)) } : null;
  out.foot = foot ? { top: Math.round(foot.top), height: Math.round(foot.height) } : null;
  return out;
}

async function measure(browser, win) {
  const page = await (await browser.newContext({ viewport: { width: win.width, height: win.height } })).newPage();
  await signIn(page);
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForLoadState("load");
  await page.waitForTimeout(4000);
  // The loading screen only exists between the press and the page's arrival, and the response carries both, so the probe
  // cannot hold it open: an observer measures it the frame it appears.
  await page.evaluate(([src, blocks]) => {
    const read = new Function(`return (${src})`)();
    window.__skeleton = null;
    new MutationObserver((_, obs) => {
      if (document.querySelector("[data-loading-screen]")) {
        obs.disconnect();
        requestAnimationFrame(() => { window.__skeleton = read("[data-loading-screen]", blocks); });
      }
    }).observe(document.body, { childList: true, subtree: true });
  }, [readBlocks.toString(), BLOCKS]);
  await page.evaluate(() => window.next.router.push("/decks/precons?pick=own"));
  await page.waitForFunction(() => window.__skeleton, null, { timeout: 120_000 });
  const skeleton = await page.evaluate(() => window.__skeleton);
  // PROBE_SHOTS=<dir> keeps the two screens for a contact sheet (skeleton, then loaded).
  if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/${win.name}-skeleton.png` });
  await page.waitForFunction(() => !document.querySelector("[data-loading-screen]") && document.querySelector("main ul > li"), null, { timeout: 180_000 });
  await page.waitForTimeout(800);
  const loaded = await page.evaluate(([src, blocks]) => new Function(`return (${src})`)()("pick", blocks), [readBlocks.toString(), BLOCKS]);
  if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/${win.name}-loaded.png` });
  if (process.env.PROBE_DEBUG) console.log(win.name, JSON.stringify(await page.evaluate(() => {
    const q = (sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); return r && [Math.round(r.top + scrollY), Math.round(r.height), Math.round(r.width)]; };
    return { header: q("h1"), field: q("fieldset"), search: q("fieldset > div > div"), pips: q("fieldset [role=group]"), result: q("fieldset > p"), h2: q("h2"), li: q("h2 + ul > li"), thumb: q("h2 + ul > li img, h2 + ul > li label > span"), label: q("h2 + ul > li label") };
  })));
  await page.context().close();
  return { skeleton, loaded };
}

await clerkSetup();
const browser = await chromium.launch();
let failed = 0;
try {
  for (const win of WINDOWS) {
    const { skeleton, loaded } = await measure(browser, win);
    for (const block of ["title", "firstRow", "rowFloor", "foot"]) {
      const s = skeleton[block];
      const l = loaded[block];
      // the first row's own height depends on its name wrapping: its position is compared here, its height as `rowFloor`
      const ok = s && l && Math.abs(s.top - l.top) <= TOL && (block === "firstRow" || Math.abs(s.height - l.height) <= TOL);
      if (!ok) failed++;
      console.log(`${ok ? "ok  " : "FAIL"} ${win.name} ${block}: skeleton ${JSON.stringify(s)} loaded ${JSON.stringify(l)}`);
    }
  }
} finally {
  await browser.close();
}
if (failed) {
  console.error(`probe-precons-skeleton: ${failed} block(s) off by more than ${TOL}px`);
  process.exit(1);
}
console.log("probe-precons-skeleton: ok");
