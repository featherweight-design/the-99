// Read-only: how much card art a cold load of /decks/precons asks for, in tiles and in rows, at 1300
// and 390 (Precons R4). It writes nothing to any database: it signs in through `window.Clerk`, loads
// each page in a fresh context carrying that session, scrolls nothing, and counts the image requests
// that reach Scryfall and the bytes that land, up to the load event plus a settle.
//
//   MEASURE_BASE=https://<deployment> node scripts/measure-precons-art.mjs
//
// The account is `E2E_AUDIT_USER_EMAIL` (a `+clerk_test` address takes Clerk's fixed code), so it only
// signs in where that account exists in the deployment's Clerk instance.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.MEASURE_BASE;
if (!BASE) throw new Error("Set MEASURE_BASE to the deployment under test.");
const SETTLE_MS = Number(process.env.MEASURE_SETTLE_MS ?? 6000);
const RUNS = Number(process.env.MEASURE_RUNS ?? 3);

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

await clerkSetup();
const browser = await chromium.launch();
const login = await browser.newContext();
const page = await login.newPage();
await signIn(page);
const state = await login.storageState();
await login.close();

const cases = [
  { label: "tiles (default)", path: "/decks/precons" },
  { label: "rows", path: "/decks/precons?view=rows" },
];
const widths = [{ label: "1300", width: 1300, height: 900 }, { label: "390", width: 390, height: 844 }];
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const out = [];
for (const c of cases) {
  for (const w of widths) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const ctx = await browser.newContext({ storageState: state, viewport: { width: w.width, height: w.height } });
      const p = await ctx.newPage();
      let asked = 0, bytes = 0;
      p.on("request", (r) => { if (r.resourceType() === "image" && /scryfall/.test(r.url())) asked++; });
      // Counted when a request FINISHES, from its own transfer size: a response's body is not whole
      // when the response event fires.
      p.on("requestfinished", async (r) => {
        if (r.resourceType() !== "image" || !/scryfall/.test(r.url())) return;
        try { bytes += (await r.sizes()).responseBodySize; } catch { /* the page went away */ }
      });
      const t0 = Date.now();
      await p.goto(`${BASE}${c.path}`, { waitUntil: "load", timeout: 120_000 });
      const load = Date.now() - t0;
      await p.waitForTimeout(SETTLE_MS);
      runs.push({ asked, kb: Math.round(bytes / 1024), load });
      await ctx.close();
    }
    out.push({ view: c.label, width: w.label, asked: median(runs.map((r) => r.asked)), kb: median(runs.map((r) => r.kb)), loadMs: median(runs.map((r) => r.load)) });
  }
}
await browser.close();
console.log(`| view | width | art asked | art KB | load event (ms) |\n|---|---|---|---|---|`);
for (const r of out) console.log(`| ${r.view} | ${r.width} | ${r.asked} | ${r.kb} | ${r.loadMs} |`);
