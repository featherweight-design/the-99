// Proves the buttons that sit in a grid (Rule 0's seat tiles, the collection grid's tiles) cannot collapse when a browser
// shrinks a button grid item to its content instead of stretching it (Hugh, 2026-11-22: iPad Safari drew Rule 0's tiles ~50px
// wide, "You" as a bar). Real WebKit stretches the button, so each run FORCES the shrink the way Safari did it: the Rule 0
// tile gets `width: fit-content !important` (the art box must still be at least 60px, its own floor), and the collection tile
// gets `justify-self: start` (it must still be as wide as its grid column, its own `w-full`). Runs in Chromium AND WebKit at
// 1180x820 and 1366x1024 (iPad landscape). Writes nothing. Needs the fixture from `scripts/seed-rule-zero-fixture.mts` for
// Rule 0, and a collection for the grid (skipped, and said so, when the account has none).
//
//   PROBE_BASE=http://localhost:3391 node scripts/probe-safari-button-tiles.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, webkit } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");
const SIZES = [
  { label: "ipad-landscape", width: 1180, height: 820 },
  { label: "ipad-pro-landscape", width: 1366, height: 1024 },
];

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

await clerkSetup();
for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch();
  for (const w of SIZES) {
    const tag = `${engineName} ${w.label} ${w.width}x${w.height}`;
    const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: true, deviceScaleFactor: 2 });
    const page = await context.newPage();
    try {
      await signIn(page);
      await page.waitForTimeout(2500);

      // Rule 0's seat tiles, with the shrink forced.
      await page.goto(`${BASE}/friends`, { waitUntil: "networkidle" });
      const row = page.locator("[data-testid='pod-rule-zero']").first();
      await row.waitFor({ timeout: 20_000 });
      await page.waitForTimeout(1500);
      await row.evaluate((el) => el.click());
      const group = page.getByRole("dialog").getByRole("group").filter({ has: page.getByRole("checkbox") }).first();
      await group.waitFor({ timeout: 20_000 });
      const natural = await group.evaluate((g) => { const col = parseFloat(getComputedStyle(g).gridTemplateColumns.split(" ")[0]); return [...g.querySelectorAll("[role=checkbox]")].map((t) => [t.getBoundingClientRect().width, col]); });
      natural.forEach(([tile, cell], k) => check(`${tag} Rule 0 tile ${k}: the button fills its grid column`, Math.abs(tile - cell) <= 1 && tile >= 90, `tile ${tile.toFixed(1)} cell ${cell.toFixed(1)}`));
      await page.addStyleTag({ content: "[role=checkbox]{width:fit-content !important;justify-self:start !important}" });
      await page.waitForTimeout(400);
      const arts = await group.evaluate((g) => [...g.querySelectorAll("[role=checkbox]")].map((t) => t.querySelector("[aria-hidden]").getBoundingClientRect().width));
      check(`${tag}: ${arts.length} Rule 0 tiles`, arts.length >= 2);
      arts.forEach((a, k) => check(`${tag} Rule 0 tile ${k}: art keeps at least 60px when the tile shrinks`, a >= 60, `art ${a.toFixed(1)}`));

      // The collection grid's tiles, with the shrink forced.
      await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded" }).catch(() => page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded" }));
      const tiles = page.locator("[data-collection-tile]");
      await tiles.first().waitFor({ timeout: 20_000 }).catch(() => {});
      if ((await tiles.count()) === 0) {
        console.log(`SKIP  ${tag}: no collection tiles for this account`);
      } else {
        await page.addStyleTag({ content: "[data-collection-tile]{justify-self:start !important}" });
        await page.waitForTimeout(400);
        const measured = await page.evaluate(() => {
          const t = document.querySelector("[data-collection-tile]");
          const g = t.parentElement;
          const cols = getComputedStyle(g).gridTemplateColumns.split(" ").map(parseFloat);
          return { tile: t.getBoundingClientRect().width, col: cols[0] };
        });
        check(`${tag}: collection tile as wide as its column`, Math.abs(measured.tile - measured.col) <= 1, `tile ${measured.tile.toFixed(1)} col ${measured.col}`);
      }
    } catch (e) {
      check(`${tag}: ran`, false, String(e).slice(0, 200));
    }
    await context.close();
  }
  await browser.close();
}
console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
