// Proves the build-skew guard (`src/components/shell/skew-guard.tsx`): a tab whose build differs from the one `/api/live`
// reports reloads once and does not loop, holds off while a form holds an edit, and reloads on a stale-chunk error.
// `/api/live` is STUBBED in the browser, so nothing is written and no account is needed: /sign-in is signed out. The dev server
// must be started with a deployment id, which is what arms the guard (a local server has none, so it never fires):
//
//   VERCEL_DEPLOYMENT_ID=dpl_probeA pnpm dev -p 3397      (then)      PROBE_BASE=http://localhost:3397 node scripts/probe-build-skew.mjs
import { chromium } from "playwright";

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");
const MINE = process.env.PROBE_DEPLOYMENT ?? "dpl_probeA";

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();

// The tab asks which build answers at most once in five minutes, and not on load. Moving its clock forward 10 minutes and
// firing `visibilitychange` is the tab coming back after a long time away.
async function comeBack(page) {
  await page.waitForLoadState("domcontentloaded");
  await wait(2500);
  await page.evaluate(() => {
    if (!window.__skewOffset) {
      const real = Date.now.bind(Date);
      window.__skewOffset = 0;
      Date.now = () => real() + window.__skewOffset;
    }
    window.__skewOffset += 10 * 60 * 1000;
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

async function open(width, healthId, delayMs = 0) {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 800 } });
  const page = await context.newPage();
  const loads = { n: 0 };
  // `domcontentloaded` fires once per document, so a soft URL change (Clerk rewrites the address) is not counted as a reload.
  page.on("domcontentloaded", () => loads.n++);
  await page.route("**/api/live", async (route) => {
    if (delayMs) await wait(delayMs);
    await route.fulfill({ json: { status: "ok", deploymentId: healthId } });
  });
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });
  return { context, page, loads };
}

for (const width of [390, 1300]) {
  const tag = `${width}px`;

  // 1. A different deployment: exactly one reload, then the loop guard holds it.
  {
    const { context, page, loads } = await open(width, "dpl_probeB");
    await comeBack(page);
    for (let i = 0; i < 60 && loads.n < 2; i++) await wait(250);
    // Back again on the reloaded document, the mismatch still showing: the loop guard must hold it.
    await comeBack(page);
    await wait(3000);
    check(`${tag} mismatch: reloads once and then stops`, loads.n === 2, `${loads.n} document loads`);
    await context.close();
  }

  // 2. The same deployment: no reload.
  {
    const { context, page, loads } = await open(width, MINE);
    await comeBack(page);
    await wait(2000);
    check(`${tag} same deployment: no reload`, loads.n === 1, `${loads.n} document loads`);
    await context.close();
  }

  // 3. A mismatch while a field is focused and edited: no reload until the edit is gone and focus leaves.
  {
    const { context, page, loads } = await open(width, "dpl_probeB", 1500);
    await page.evaluate(() => {
      const form = document.createElement("form");
      form.innerHTML = '<input id="probe-field" value="" />';
      // Beside <body>, outside what React renders, so hydration cannot drop it.
      document.documentElement.append(form);
      const input = document.getElementById("probe-field");
      input.focus();
      input.value = "half-typed";
    });
    await comeBack(page);
    await wait(3000);
    check(`${tag} dirty focused form: no reload`, loads.n === 1, `${loads.n} document loads`);
    await page.evaluate(() => document.getElementById("probe-field").blur());
    await wait(1500);
    check(`${tag} dirty form after blur: still no reload`, loads.n === 1, `${loads.n} document loads`);
    await page.evaluate(() => {
      document.getElementById("probe-field").value = "";
      document.getElementById("probe-field").focus();
      document.getElementById("probe-field").blur();
    });
    await page.waitForLoadState("domcontentloaded");
    await wait(3000);
    check(`${tag} edit cleared and blurred: reloads`, loads.n === 2, `${loads.n} document loads`);
    await context.close();
  }

  // 4. A stale-chunk error on a current build: one reload.
  {
    const { context, page, loads } = await open(width, MINE);
    await wait(2500);
    await page.evaluate(() => {
      const error = new Error("Loading chunk 123 failed.");
      error.name = "ChunkLoadError";
      window.dispatchEvent(new ErrorEvent("error", { error, message: error.message }));
    });
    await wait(4000);
    check(`${tag} ChunkLoadError: reloads once`, loads.n === 2, `${loads.n} document loads`);
    await context.close();
  }
}

await browser.close();
console.log(failed ? `${failed} FAILED` : "all passed");
process.exit(failed ? 1 : 0);
