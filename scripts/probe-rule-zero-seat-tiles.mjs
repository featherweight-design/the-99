// Proves Rule 0's "Who's playing?" seat picker draws its player tiles at their full width (Hugh, 2026-11-22: on Safari
// on an iPad in landscape the tiles collapsed to ~50px pills, "You" to a bar, and each checkbox sat over the initials).
// A <button> that is a grid item does not stretch in WebKit, so a tile with no width of its own shrinks to its content.
// It opens the picker from the fixture's Sunday league pod ("Rule 0 check") at 1180x820 and 820x1180 (iPad), 390x844 and
// 1300x900, in Chromium AND WebKit (Safari's engine), and per tile checks: the tile is as wide as its grid column, the art
// box is as wide as the tile and at least 60px, and the checkbox box lies inside the art box. The "chromium-fit" run emulates Safari's shrink-to-fit button. Writes nothing (it only opens the picker). Needs the fixture from `scripts/seed-rule-zero-fixture.mts`.
//
//   PROBE_BASE=http://localhost:3391 node scripts/probe-rule-zero-seat-tiles.mjs
// Optional: PROBE_SHOTS=<dir>.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, webkit } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");
const SHOTS = process.env.PROBE_SHOTS;
const WIDTHS = [
  { label: "ipad-landscape", width: 1180, height: 820 },
  { label: "ipad-portrait", width: 820, height: 1180 },
  { label: "phone", width: 390, height: 844 },
  { label: "desktop", width: 1300, height: 900 },
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
// "chromium-fit" emulates Safari: a <button> grid item does not stretch there (justify-self: start is the same shrink-to-fit),
// which is what collapsed the tiles on the iPad. Playwright's own WebKit stretches the button, so only this run fails on a tile
// with no width of its own.
for (const [engineName, engine, fit] of [["chromium", chromium, false], ["webkit", webkit, false], ["chromium-fit", chromium, true]]) {
  const browser = await engine.launch();
  for (const w of WIDTHS) {
    const tag = `${engineName} ${w.label} ${w.width}x${w.height}`;
    const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: true, isMobile: w.width < 1300, deviceScaleFactor: 2 });
    const page = await context.newPage();
    try {
      await signIn(page);
      await page.waitForTimeout(2500);
      await page.goto(`${BASE}/friends`, { waitUntil: "networkidle" });
      const row = page.locator("[data-testid='pod-rule-zero']").first();
      await row.waitFor({ timeout: 20_000 });
      await page.waitForTimeout(1500);
      await row.evaluate((el) => el.click());
      const group = page.getByRole("dialog").getByRole("group").filter({ has: page.getByRole("checkbox") }).first();
      await group.waitFor({ timeout: 20_000 });
      if (fit) await page.addStyleTag({ content: "[role=checkbox]{justify-self:start}" });
      await page.waitForTimeout(500);
      const tiles = await group.evaluate((g) => {
        const gr = g.getBoundingClientRect();
        const cols = getComputedStyle(g).gridTemplateColumns.split(" ").map(parseFloat);
        return [...g.querySelectorAll("[role=checkbox]")].map((t, idx) => {
          const r = t.getBoundingClientRect();
          const art = t.querySelector("[aria-hidden]");
          const a = art.getBoundingClientRect();
          const box = art.querySelector("span.absolute");
          const b = box?.getBoundingClientRect();
          return {
            tile: r.width, col: cols[idx % cols.length], art: a.width, artH: a.height,
            outside: b ? b.right > a.right + 1 || b.left < a.left - 1 || b.top < a.top - 1 || b.bottom > a.bottom + 1 : false,
            gridW: gr.width,
          };
        });
      });
      check(`${tag}: ${tiles.length} tiles`, tiles.length >= 2);
      tiles.forEach((t, k) => {
        check(`${tag} tile ${k}: as wide as its column`, Math.abs(t.tile - t.col) <= 1, `tile ${t.tile.toFixed(1)} col ${t.col}`);
        check(`${tag} tile ${k}: art at least 60px wide and as wide as the tile`, t.art >= 60 && Math.abs(t.art - t.tile) <= 1, `art ${t.art.toFixed(1)}`);
        check(`${tag} tile ${k}: checkbox box inside the art`, !t.outside);
      });
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${engineName}-${w.label}.png` });
    } catch (e) {
      check(`${tag}: ran`, false, String(e).slice(0, 200));
    }
    await context.close();
  }
  await browser.close();
}
console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
