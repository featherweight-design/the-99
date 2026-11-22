// Presses the life tracker's panel badges and Out face (design handoff F10, F12, F14, gap T5) at phone and desktop
// width. It starts a game on the fixture table, then writes four entries into the device's saved game (localStorage,
// so nothing reaches the database and it may run against local-dev): seat B's commander deals seat A 6, seat A casts
// its commander once (tax +2), seat A takes 2 poison, and seat B's commander deals seat C 21. After a reload it
// measures what the boards draw: the badge pills (24px on the phone's name row, 28px in the tablet foot, the from-
// commander's art and name, "Tax +2", the counter), each badge opening the sheet on its tab, the Out face (the word in
// Cinzel 26, the cause naming the commander, the art at .22), the 0.45s rotateY flip, its reversal on Undo, and no
// flip under reduced motion. On main the badges are counters only, the Out face greys the whole panel with "Out ·" in
// the cause and there is no flip, so the checks fail.
//
//   PROBE_BASE=http://localhost:3393 node scripts/probe-tracker-badges.mjs
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
  { label: "phone 390x844", width: 390, height: 844, badge: 24, font: "11.5px", reduced: false },
  { label: "desktop 1300x900", width: 1300, height: 900, badge: 28, font: "12.5px", reduced: false },
  { label: "phone 390x844, reduced motion", width: 390, height: 844, badge: 24, font: "11.5px", reduced: true },
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

const shot = async (page, name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};
const style = (loc, props) =>
  loc.evaluate((el, ps) => {
    const cs = getComputedStyle(el);
    return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
  }, props);
const clear = (page) => page.evaluate(() => document.querySelectorAll("[data-seat-notice-stack]").forEach((n) => n.remove()));

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const w of WIDTHS) {
    console.log(`\n## ${w.label}`);
    const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: true, reducedMotion: w.reduced ? "reduce" : "no-preference" });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/friends/table/${TABLE}/play`, { waitUntil: "networkidle" });
    await page.evaluate((k) => localStorage.removeItem(k), KEY);
    await page.reload({ waitUntil: "networkidle" });
    const start = page.getByRole("button", { name: "Start", exact: true });
    await start.waitFor({ timeout: 20_000 });
    await start.evaluate((el) => el.click());
    await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 });

    // Seat A is the first panel, B the second, C the third; B's commander does the damage.
    await page.waitForFunction((k) => localStorage.getItem(k) !== null, KEY, { timeout: 10_000 }).catch(() => {
      throw new Error(`no saved game under ${KEY}`);
    });
    const order = await page.getByTestId("tracker-panel").evaluateAll((els) => els.map((el) => Number(el.getAttribute("data-seat"))));
    const [A, B, C] = order;
    // The from seat's commander, by card name, from the table as it was at Start.
    const fromName = await page.evaluate(
      ({ k, b }) => JSON.parse(localStorage.getItem(k)).game.config.snapshot?.players?.find((p) => p.seat === b)?.commander ?? null,
      { k: KEY, b: B },
    );
    await page.evaluate(
      ({ k, A, B, C }) => {
        const saved = JSON.parse(localStorage.getItem(k));
        saved.game.log.push(
          { t: "damage", seat: A, from: B, cmdr: 0, delta: 6 },
          { t: "tax", seat: A, cmdr: 0, delta: 1 },
          { t: "counter", seat: A, key: "poison", delta: 2 },
          { t: "damage", seat: C, from: B, cmdr: 0, delta: 21 },
        );
        localStorage.setItem(k, JSON.stringify(saved));
      },
      { k: KEY, A, B, C },
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 });
    await clear(page);
    await page.waitForTimeout(800);
    await shot(page, `${w.width}${w.reduced ? "-reduced" : ""}-badges`);

    const a = page.locator(`[data-testid="tracker-panel"][data-seat="${A}"]`);
    const badges = a.getByTestId("panel-front").getByTestId("panel-badge");
    const labels = await badges.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    console.log(`      badges: ${JSON.stringify(labels)}`);
    const dmg = labels.find((l) => / 6\. Open it in the sheet$/.test(l ?? ""));
    check("damage pill: the commander's name and 6", !!dmg && (!fromName || dmg.startsWith(fromName)), `${dmg} / ${fromName}`);
    check("tax pill: Tax +2", labels.includes("Tax +2. Open it in the sheet"));
    check("counter pill: Poison 2", labels.includes("Poison 2. Open it in the sheet"));
    check("order: damage, tax, counters", labels.indexOf(dmg) < labels.indexOf("Tax +2. Open it in the sheet") && labels.indexOf("Tax +2. Open it in the sheet") < labels.indexOf("Poison 2. Open it in the sheet"));
    const first = badges.first();
    const bs = await first.evaluate((el) => ({ h: el.offsetHeight, r: getComputedStyle(el).borderRadius, f: getComputedStyle(el).fontSize, ff: getComputedStyle(el).fontFamily, bg: getComputedStyle(el).backgroundColor }));
    check(`badge ${w.badge}px tall`, bs.h === w.badge, String(bs.h));
    check(`badge font ${w.font} mono`, bs.f === w.font && /mono/i.test(bs.ff), `${bs.f} ${bs.ff.slice(0, 30)}`);
    check("badge is a pill", parseFloat(bs.r) >= w.badge / 2, bs.r);
    check("badge ground is translucent", /rgba\(.*0\.82\)|oklab|color-mix|\/ 0\.82/.test(bs.bg), bs.bg);
    const img = first.locator("img");
    if (await img.count()) {
      const iw = await img.evaluate((el) => el.offsetWidth);
      check(`damage pill art ${w.badge === 24 ? 18 : 20}px`, iw === (w.badge === 24 ? 18 : 20), String(iw));
    } else console.log("SKIP  damage pill art (the from seat has no art)");
    const where = await first.evaluate((el) => (el.closest('[data-testid="panel-foot"]') ? "foot" : el.closest('[data-testid="panel-who"]') ? "who" : "none"));
    check(`badges sit in the ${w.badge === 24 ? "who" : "foot"} row`, where === (w.badge === 24 ? "who" : "foot"), where);
    // The badges never overflow the panel: the row clips them inside the pane.
    const fits = await a.getByTestId("panel-badges").evaluate((el) => {
      const row = el.parentElement.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return r.left >= row.left - 1 && r.right <= row.right + 1;
    });
    check("badges stay inside their row", fits);
    // The pill's hit area reaches past its edge (P1 44px target): a press 6px above it still lands on it, on the
    // unturned desktop seat (a turned phone seat's "above" is sideways on screen).
    if (w.badge === 28) {
      const reach = await a.getByRole("button", { name: "Tax +2. Open it in the sheet", exact: true }).first().evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top - 6);
        return hit === el || el.contains(hit);
      });
      check("a press just above a pill lands on it", reach);
    }

    // Each pill opens the sheet on its tab.
    for (const [label, tab] of [[dmg, /damage/i], ["Tax +2. Open it in the sheet", /tax/i], ["Poison 2. Open it in the sheet", /counter/i]]) {
      if (!label) continue;
      await a.getByRole("button", { name: label, exact: true }).first().evaluate((el) => el.click());
      const dialog = page.getByRole("dialog");
      const opened = await dialog.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      const selected = opened ? await dialog.locator('[aria-selected="true"], [aria-current="page"], [aria-pressed="true"]').first().textContent().catch(() => "") : "";
      check(`"${label.split(".")[0]}" opens the sheet on ${tab.source}`, opened && tab.test(selected ?? ""), selected ?? "");
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
    }

    // Seat C is out: the panel shows its back face.
    const c = page.locator(`[data-testid="tracker-panel"][data-seat="${C}"]`);
    check("seat C is out", (await c.getAttribute("data-out")) !== null);
    const flip = c.getByTestId("panel-flip");
    const fs = await style(flip, ["transform", "transition-duration", "transform-style"]);
    check("flip turns the panel 180deg", /matrix3d\(-1,/.test(fs.transform), fs.transform);
    check(`flip lasts ${w.reduced ? "0s (reduced motion)" : "0.45s"}`, fs["transition-duration"] === (w.reduced ? "0s" : "0.45s"), fs["transition-duration"]);
    check("faces keep their 3D", fs["transform-style"] === "preserve-3d", fs["transform-style"]);
    const back = c.getByTestId("panel-back");
    const word = back.locator("strong");
    const ws = await style(word, ["font-family", "font-size", "font-weight"]);
    check('Out face says "Out"', ((await word.textContent()) ?? "").trim() === "Out");
    check("Out in Cinzel 26 bold", /cinzel/i.test(ws["font-family"]) && ws["font-size"] === "26px" && ws["font-weight"] === "700", `${ws["font-family"].slice(0, 20)} ${ws["font-size"]} ${ws["font-weight"]}`);
    const cause = ((await back.getByTestId("panel-out-cause").textContent()) ?? "").trim();
    check("cause names the commander and the round", /^21 commander damage from .+ · round \d+$/.test(cause) && (!fromName || cause.includes(fromName)), cause);
    const outArt = back.getByTestId("panel-out-art");
    if (await outArt.count()) {
      const os = await style(outArt, ["opacity", "filter"]);
      check("out art at .22 and grey", os.opacity === "0.22" && /grayscale\(1\)/.test(os.filter), `${os.opacity} ${os.filter}`);
    } else console.log("SKIP  out art (seat C has no art)");
    check("the front face is inert while out", await c.getByTestId("panel-front").evaluate((el) => el.inert === true));
    const undoBtn = back.getByTestId("panel-undo");
    const undoH = await undoBtn.evaluate((el) => el.offsetHeight);
    check("Undo is 44px tall", undoH === 44, String(undoH));
    await shot(page, `${w.width}${w.reduced ? "-reduced" : ""}-out`);

    // Undo turns it back: mid-turn the transform is neither face, then the front again.
    await undoBtn.evaluate((el) => el.click());
    await page.waitForTimeout(180);
    const mid = await flip.evaluate((el) => getComputedStyle(el).transform);
    await page.waitForTimeout(600);
    const end = await flip.evaluate((el) => getComputedStyle(el).transform);
    const turning = !/^matrix3d\(-1,/.test(mid) && mid !== "none" && !/^matrix\(1, 0, 0, 1/.test(mid);
    if (w.reduced) check("reduced motion: no mid-turn frame", !turning, mid);
    else check("Undo turns the panel back over (mid-turn frame)", turning, mid);
    check("after Undo the front shows", (await c.getAttribute("data-out")) === null && !/^matrix3d\(-1,/.test(end), end);
    await page.evaluate((k) => localStorage.removeItem(k), KEY);
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
