// Every badge fits (design handoff addendum-badge-fit): a seat holding damage from every other commander, five counters,
// tax and both marks (11 badges) must draw each chip whole inside its row, count what it left out in a "+N", and open a
// read-only quick look from +N that lists every badge and closes on its X, a tap off it or Escape. At phone 390x844,
// desktop 1300x900 and iPad 1180x820 and 820x1180. It writes only the device's saved game (localStorage), so it may run
// against local-dev. On main the row is one clipped line (chips cut at its edge, no +N, no quick look), so it fails.
//
//   PROBE_BASE=http://localhost:3417 node scripts/probe-tracker-badge-fit.mjs
// Optional: PANEL_TABLE (default the fixture's S4, four seats), SHOTS=<dir>.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");
const TABLE = process.env.PANEL_TABLE ?? "7a0e0000-0000-4000-8000-000000000013";
const SHOTS = process.env.SHOTS;
const KEY = `the99.tracker.${TABLE}`;
const WIDTHS = [
  { label: "phone 390x844", width: 390, height: 844 },
  { label: "desktop 1300x900", width: 1300, height: 900 },
  { label: "iPad 1180x820", width: 1180, height: 820 },
  { label: "iPad 820x1180", width: 820, height: 1180 },
];

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
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

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const w of WIDTHS) {
    console.log(`\n## ${w.label}`);
    const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: true });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/friends/table/${TABLE}/play`, { waitUntil: "networkidle" });
    await page.evaluate((k) => localStorage.removeItem(k), KEY);
    await page.reload({ waitUntil: "networkidle" });
    const start = page.getByRole("button", { name: "Start", exact: true });
    await start.waitFor({ timeout: 20_000 });
    await start.evaluate((el) => el.click());
    await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 });
    await page.waitForFunction((k) => localStorage.getItem(k) !== null, KEY, { timeout: 10_000 });
    const order = await page.getByTestId("tracker-panel").evaluateAll((els) => els.map((el) => Number(el.getAttribute("data-seat"))));
    const [A, ...others] = order;
    await page.evaluate(
      ({ k, A, others }) => {
        const saved = JSON.parse(localStorage.getItem(k));
        const log = saved.game.log;
        others.forEach((o, i) => log.push({ t: "damage", seat: A, from: o, cmdr: 0, delta: 6 + i }));
        log.push({ t: "tax", seat: A, cmdr: 0, delta: 2 });
        for (const [key, delta] of [["poison", 3], ["energy", 2], ["experience", 1], ["rad", 4], ["tickets", 1]]) log.push({ t: "counter", seat: A, key, delta });
        log.push({ t: "monarch", seat: A }, { t: "initiative", seat: A });
        localStorage.setItem(k, JSON.stringify(saved));
      },
      { k: KEY, A, others },
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.querySelectorAll("[data-seat-notice-stack]").forEach((n) => n.remove()));
    await page.waitForTimeout(800);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${w.width}x${w.height}-fit.png` });

    const a = page.locator(`[data-testid="tracker-panel"][data-seat="${A}"]`);
    const row = a.getByTestId("panel-front").getByTestId("panel-badges");
    const total = others.length + 1 + 5 + 2;
    // Chips are the row's own children: the ruler is a nested div, not a chip.
    const read = () =>
      row.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const chips = [...el.querySelectorAll(":scope > [data-testid='panel-badge']")].map((c) => c.getBoundingClientRect());
        const more = el.querySelector(":scope > [data-testid='panel-badge-more']");
        return {
          n: chips.length,
          cut: chips.filter((c) => c.left < r.left - 1 || c.right > r.right + 1 || c.top < r.top - 12 || c.bottom > r.bottom + 12).length,
          more: more ? more.textContent.trim() : null,
          words: chips.filter((c) => c.width < 12).length,
        };
      });
    const s = await read();
    console.log(`      chips ${s.n} of ${total}, more ${JSON.stringify(s.more)}`);
    check("no chip is cut at the row's edge", s.n > 0 && s.cut === 0, `${s.cut} cut`);
    check(`chips drawn + the +N figure count every badge (${total})`, s.n + (s.more ? Number(s.more.replace("+", "")) : 0) === total, `${s.n} + ${s.more}`);
    check("the badges sit in the controls row (panel-foot) on every board", await row.evaluate((el) => !!el.closest("[data-testid='panel-foot']")));
    const compact = await row.evaluate((el) => [...el.querySelectorAll(":scope > [data-testid='panel-badge']")].every((c) => !/[A-Za-z]{3}/.test(c.textContent ?? "")));
    check("chips show a figure, never the words", compact);

    const toggle = row.getByTestId("panel-badge-more");
    if (!(await toggle.count())) {
      // The first turn is random: a seat without End turn has the room for all 11. Then no +N is right, and the ruler must agree.
      const holds = await row.evaluate((el) => {
        const ruler = el.querySelector("[data-testid='panel-badges-ruler']");
        const kids = [...ruler.children].slice(0, -1);
        const need = kids.reduce((n, k) => n + k.getBoundingClientRect().width, 0) + (parseFloat(getComputedStyle(el).columnGap) || 6) * (kids.length - 1);
        return need <= el.clientWidth + 1;
      });
      check("with no +N the row really holds every badge", holds, `${s.n} chips`);
      await context.close();
      continue;
    }
    await toggle.evaluate((el) => el.click());
    const peek = a.getByRole("region", { name: "Every badge" });
    const opened = await peek.waitFor({ timeout: 5000 }).then(() => true, () => false);
    check("+N opens the quick look", opened);
    if (opened) {
      const rows = await peek.getByTestId("peek-row").count();
      check(`the quick look lists every badge (${total})`, rows === total, String(rows));
      check("+N turns into a close control while open", (await toggle.getAttribute("aria-expanded")) === "true");
      const box = await peek.boundingBox();
      const inView = !!box && box.x >= -1 && box.y >= -1 && box.x + box.width <= w.width + 1 && box.y + box.height <= w.height + 1;
      check("the quick look stays inside the screen", inView, JSON.stringify(box));
      const onTop = await peek.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + 12);
        return !!hit && el.contains(hit);
      });
      check("nothing draws over the quick look", onTop);
      await page.waitForTimeout(600);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${w.width}x${w.height}-peek.png` });
      await toggle.evaluate((el) => el.click());
      check("the close control closes it", await peek.waitFor({ state: "detached", timeout: 3000 }).then(() => true, () => false));
      await toggle.evaluate((el) => el.click());
      await peek.waitFor({ timeout: 3000 });
      await page.keyboard.press("Escape");
      check("Escape closes it", await peek.waitFor({ state: "detached", timeout: 3000 }).then(() => true, () => false));
      await toggle.evaluate((el) => el.click());
      await peek.waitFor({ timeout: 3000 });
      await page.mouse.click(w.width / 2, w.height / 2);
      check("a tap off it closes it", await peek.waitFor({ state: "detached", timeout: 3000 }).then(() => true, () => false));
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
