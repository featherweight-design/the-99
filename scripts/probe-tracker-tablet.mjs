// Presses the life tracker's undrawn-tablet layouts and its upright turn (addendum #3115, gap T7a) on a tablet-sized
// screen (1180x820, so its short side is 600px or more). It opens setup on the fixture's two-seat T5 and three-seat T10
// and reads the Table group: tablet 2 offers "Face to face" (T1), tablet 3 "One at the end" then "Along one side"
// (T2, T3), with no fallback to the phone's drawings. It starts each and measures every panel against the drawn cells.
// It turns the same screen upright (820x1180, `screen.orientation.angle` stubbed to 90 and then 270) mid-game on the
// four-seat S4 and checks the board redraws turned the matching way (V4: `turned(tablet-4, 3)` at 90, `turned(..., 1)` at
// 270), with a 0.2s fade, and that setup's minis draw upright (40x56). Last, a game saved on the old fallback (phone-2 on
// a tablet) draws as tablet-2 with its seats in the same order, and phone-3-end draws as before.
// Writes only the device's saved game (localStorage), so it may run against local-dev with the fixture seeded.
//
//   PROBE_BASE=http://localhost:3393 node scripts/probe-tracker-tablet.mjs
// Optional: SHOTS=<dir>.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");
const SHOTS = process.env.SHOTS;
const T5 = "7a0e0000-0000-4000-8000-000000000005";
const T10 = "7a0e0000-0000-4000-8000-000000000010";
const S4 = "7a0e0000-0000-4000-8000-000000000013";
const SCREEN = { width: 1180, height: 820 };

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

// The drawn cells, as `layouts.ts` holds them, and the addendum's quarter turn.
const TABLET = { w: 1180, h: 820 };
const CELLS = {
  "tablet-2": [[10, 452, 1160, 358], [10, 10, 1160, 358]],
  "tablet-3-end": [[10, 452, 900, 358], [10, 10, 900, 358], [920, 10, 250, 800]],
  "tablet-3-side": [[790, 84, 380, 726], [400, 84, 380, 726], [10, 84, 380, 726]],
  "phone-3-end": null,
};
const quarter = ({ canvas, cells }) => ({ canvas: { w: canvas.h, h: canvas.w }, cells: cells.map(([x, y, w, h]) => [canvas.h - (y + h), x, h, w]) });
const turned = (l, q) => {
  let out = l;
  for (let i = 0; i < q; i++) out = quarter(out);
  return out;
};

// As `probe-tracker-panel.mjs`: the audit account's fixed 424242 code through `window.Clerk` on the app's origin.
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

const shot = async (page, name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};

// The screen's angle, stubbed: Chromium's emulation never turns `screen.orientation`.
const stubAngle = () => {
  window.__angle = 0;
  try {
    Object.defineProperty(ScreenOrientation.prototype, "angle", { configurable: true, get: () => window.__angle });
  } catch {}
};
const setAngle = (page, deg) =>
  page.evaluate((d) => {
    window.__angle = d;
    screen.orientation?.dispatchEvent(new Event("change"));
  }, deg);

const openSetup = async (page, table) => {
  await page.goto(`${BASE}/friends/table/${table}/play`, { waitUntil: "networkidle" });
  await page.evaluate((k) => localStorage.removeItem(k), `the99.tracker.${table}`);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Start", exact: true }).waitFor({ timeout: 20_000 });
  await page.evaluate(() => document.querySelectorAll("[data-seat-notice-stack]").forEach((n) => n.remove()));
};
const tableNames = (page) => page.getByRole("radiogroup").first().getByRole("radio").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
const start = async (page) => {
  await page.getByRole("button", { name: "Start", exact: true }).evaluate((el) => el.click());
  await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(600);
};
// Each panel's box as a fraction of the board, against the cells as a fraction of the canvas.
const boxes = (page) =>
  page.getByTestId("tracker-panel").evaluateAll((els) => {
    const stage = els[0].closest('[data-testid="tracker-play"]').firstElementChild.getBoundingClientRect();
    return els.map((el) => {
      const r = el.getBoundingClientRect();
      return { seat: Number(el.getAttribute("data-seat")), x: (r.left - stage.left) / stage.width, y: (r.top - stage.top) / stage.height, w: r.width / stage.width, h: r.height / stage.height, ratio: stage.width / stage.height };
    });
  });
const matches = (got, { canvas, cells }) => {
  if (got.length !== cells.length) return `${got.length} panels for ${cells.length} cells`;
  if (Math.abs(got[0].ratio - canvas.w / canvas.h) > 0.01) return `board ${got[0].ratio.toFixed(3)} for ${(canvas.w / canvas.h).toFixed(3)}`;
  for (let i = 0; i < cells.length; i++) {
    const [x, y, w, h] = cells[i];
    const e = [x / canvas.w, y / canvas.h, w / canvas.w, h / canvas.h];
    const g = [got[i].x, got[i].y, got[i].w, got[i].h];
    if (g.some((v, j) => Math.abs(v - e[j]) > 0.012)) return `panel ${i}: ${g.map((v) => v.toFixed(3))} for ${e.map((v) => v.toFixed(3))}`;
  }
  return "";
};

await clerkSetup();
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: SCREEN, screen: SCREEN, hasTouch: true });
  await context.addInitScript(stubAngle);
  const page = await context.newPage();
  await signIn(page);

  console.log("\n## tablet 2 and 3, held landscape (T1, T2, T3)");
  for (const [table, want] of [
    [T5, ["Face to face"]],
    [T10, ["One at the end", "Along one side"]],
  ]) {
    await openSetup(page, table);
    const names = await tableNames(page);
    check(`${want.length + 1 === 2 ? "two" : "three"} seats: the tablet offers ${want.join(", ")}`, JSON.stringify(names) === JSON.stringify(want), JSON.stringify(names));
    for (const name of want) {
      await openSetup(page, table);
      await page.getByRole("radio", { name, exact: true }).evaluate((el) => el.click());
      const mini = await page.getByRole("radio", { name, exact: true }).locator("svg").first().evaluate((el) => [el.getAttribute("width"), el.getAttribute("height")]);
      check(`${name}: its mini draws the tablet landscape, 56x40`, mini.join("x") === "56x40", mini.join("x"));
      await start(page);
      const id = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).game.config.layout, `the99.tracker.${table}`);
      const expected = { "Face to face": "tablet-2", "One at the end": "tablet-3-end", "Along one side": "tablet-3-side" }[name];
      check(`${name}: the game saves ${expected}`, id === expected, id);
      const bad = matches(await boxes(page), { canvas: TABLET, cells: CELLS[expected] });
      check(`${name}: every panel sits on its drawn cell`, !bad, bad);
      await shot(page, `tablet-${expected}`);
    }
  }

  console.log("\n## the screen turned upright mid-game (V4)");
  await openSetup(page, S4);
  await start(page);
  const id4 = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).game.config.layout, `the99.tracker.${S4}`);
  const natural = await boxes(page);
  const order0 = natural.map((b) => b.seat);
  // The canvas's cells, read back off the landscape board, so the turn is checked against what was drawn.
  const drawn = { canvas: TABLET, cells: natural.map((b) => [b.x * TABLET.w, b.y * TABLET.h, b.w * TABLET.w, b.h * TABLET.h]) };
  for (const [deg, q] of [
    [90, 3],
    [270, 1],
  ]) {
    await setAngle(page, 0);
    await page.setViewportSize(SCREEN);
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      window.__fades = 0;
      const el = document.querySelector('[data-testid="tracker-play"]');
      const orig = el.animate.bind(el);
      el.animate = (k, o) => {
        if (o?.duration === 200) window.__fades++;
        return orig(k, o);
      };
    });
    await page.evaluate((d) => (window.__angle = d), deg);
    await page.setViewportSize({ width: SCREEN.height, height: SCREEN.width });
    await setAngle(page, deg);
    await page.waitForTimeout(600);
    const got = await boxes(page);
    const bad = matches(got, turned(drawn, q));
    check(`angle ${deg}: ${id4} redraws turned ${q === 1 ? "a quarter clockwise" : "a quarter counter-clockwise"}`, !bad, bad);
    check(`angle ${deg}: the same seats in the same cells`, JSON.stringify(got.map((b) => b.seat)) === JSON.stringify(order0));
    check(`angle ${deg}: the board fades in over 0.2s`, (await page.evaluate(() => window.__fades)) >= 1);
    await shot(page, `upright-${deg}`);
  }
  await openSetup(page, S4);
  const minis = await page.getByRole("radiogroup").first().locator("svg").evaluateAll((els) => els.map((el) => `${el.getAttribute("width")}x${el.getAttribute("height")}`));
  check("upright: setup's minis draw the tablet upright, 40x56", minis.length > 0 && minis.every((m) => m === "40x56"), minis.join(" "));
  await setAngle(page, 0);
  await page.setViewportSize(SCREEN);

  console.log("\n## games saved on the old tablet fallback");
  for (const [table, legacy, want] of [
    [T5, "phone-2", "tablet-2"],
    [T10, "phone-3-end", "phone-3-end"],
  ]) {
    await openSetup(page, table);
    await start(page);
    const k = `the99.tracker.${table}`;
    const before = (await boxes(page)).map((b) => b.seat);
    await page.evaluate(({ k, legacy }) => {
      const saved = JSON.parse(localStorage.getItem(k));
      saved.game.config.layout = legacy;
      localStorage.setItem(k, JSON.stringify(saved));
    }, { k, legacy });
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 });
    await page.waitForTimeout(600);
    const got = await boxes(page);
    if (CELLS[want]) {
      const bad = matches(got, { canvas: TABLET, cells: CELLS[want] });
      check(`${legacy} saved on a tablet draws as ${want}`, !bad, bad);
    } else {
      // Drawn as the phone layout, as before: the phone's portrait board, not the tablet's.
      check(`${legacy} saved on a tablet still draws as ${legacy}`, got.length === 3 && got[0].ratio < 1, `ratio ${got[0]?.ratio.toFixed(3)}`);
    }
    check(`${legacy}: no seat moves`, JSON.stringify(got.map((b) => b.seat)) === JSON.stringify(before), `${before} then ${got.map((b) => b.seat)}`);
    await shot(page, `legacy-${legacy}`);
  }
  await context.close();
} finally {
  await browser.close();
}
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
