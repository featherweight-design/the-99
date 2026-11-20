// Custom deck order drag (Arrange mode on /decks, #2990), pressed with real pointer events: a drag from the ⠿ handle
// moves the row to the slot it is dropped on, in either direction, by 1, 2 and 5 slots, to the ends and past them,
// and NOTHING SNAPS BACK: the order after the drop is the order the drag showed, and the drag is never cancelled
// mid-way (pointer capture survives the reorder). Mouse and touch (CDP touch events), at 390 and 1300.
//
// Read-only: it presses ⠿ and never presses Done, so nothing is saved; each case re-enters Arrange fresh.
//   PROBE_BASE=http://localhost:3724 node scripts/probe-deck-drag-order.mjs
// Needs an account with 3+ decks (the fixture has them). Point it at local-dev or a scratch branch, NEVER production.
// PROBE_SHOTS=<dir> saves a mid-drag frame for the one traced case.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS;
let failed = 0;
const check = (width, label, ok, saw) => {
  if (!ok) failed++;
  console.log(`${ok ? "  ok  " : " FAIL "} [${width}] ${label} — ${saw}`);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const s = window.Clerk.client.signIn;
      let a = await s.create({ identifier: email });
      const f = a.supportedFirstFactors?.find((x) => x.strategy === "email_code");
      await s.prepareFirstFactor({ strategy: "email_code", emailAddressId: f?.emailAddressId });
      a = await s.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (a.status !== "complete") return `sign-in status: ${a.status}`;
      await window.Clerk.setActive({ session: a.createdSessionId });
      return null;
    } catch (e) { return e?.errors?.[0]?.longMessage ?? String(e); }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const SIZES = { phone: { width: 390, height: 844, touch: true }, desktop: { width: 1300, height: 900, touch: false } };
const handles = (page) => page.getByRole("button", { name: /^Move / });
/** The order as DRAWN: handles sorted by where they sit on screen (mid-drag the DOM order is held, the transforms show the order). */
const visualOrder = (page) => handles(page).evaluateAll((els) => els.map((e) => [e.getBoundingClientRect().top, e.getAttribute("aria-label")]).sort((a, b) => a[0] - b[0]).map((x) => x[1]));
const order = (page) => handles(page).evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));

async function enterArrange(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  for (let i = 0; i < 8 && (await handles(page).count()) === 0; i++) {
    const trigger = page.getByRole("button", { name: /sort/i }).locator("visible=true").first();
    await trigger.click({ timeout: 5_000 }).catch(() => {});
    const item = page.getByRole("menuitem", { name: /^Arrange/ }).locator("visible=true").first();
    if (await item.count()) await item.click().catch(() => {});
    await handles(page).first().waitFor({ timeout: 3_000 }).catch(() => {});
  }
}

/** One drag from `handle`'s centre to y: a mouse, or CDP touch events; `steps` moves, each its own event. */
async function drag(page, cdp, touch, from, toY, steps, onMid) {
  const x = from.x;
  const ys = Array.from({ length: steps }, (_, i) => from.y + ((toY - from.y) * (i + 1)) / steps);
  if (touch) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: from.y }] });
    for (const y of ys) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    if (onMid) await onMid();
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.mouse.move(x, from.y);
    await page.mouse.down();
    for (const y of ys) await page.mouse.move(x, y);
    if (onMid) await onMid();
    await page.mouse.up();
  }
  await page.waitForTimeout(250);
}

async function run(browser, name, { width, height, touch: phone }, input) {
  const touch = input === "touch";
  const label = `${name}/${input}`;
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: phone && touch, serviceWorkers: "block" });
  const page = await ctx.newPage();
  const cdp = touch ? await ctx.newCDPSession(page) : null;
  try {
    await signIn(page);
    await enterArrange(page);
    const base = await order(page);
    if (base.length < 3) { check(label, "the account has 3+ decks to arrange", false, `n=${base.length}`); return; }
    const n = base.length;
    // [from index, slots to move (negative is up)]: 1, 2 and 5 either way, from mid-list, and the ends, pressed past them.
    // The rows are scrolled to the middle of the window first, so every target is on screen (the autoscroll has its own case).
    const mid = Math.floor(n / 2);
    const cases = [[mid, 1], [mid, 2], [mid, 5], [mid, -1], [mid, -2], [mid, -5], [0, 1], [0, 2], [n - 1, -1], [n - 1, -2], [0, -3], [n - 1, 3]];
    let traced = false;
    for (const [from, delta] of cases) {
      const to = Math.max(0, Math.min(n - 1, from + delta));
      await enterArrange(page);
      const start = await order(page);
      // Start the handle clear of the autoscroll zone (80px at each window edge) on the side it is NOT dragged toward,
      // so the target stays on screen and outside the zone.
      await handles(page).nth(from).evaluate((e, [d, h]) => {
        e.scrollIntoView({ block: "center" });
        const y = e.getBoundingClientRect().top;
        if (d > 0) window.scrollBy(0, y - 130);
        else if (d < 0) window.scrollBy(0, y - (h - 190));
      }, [delta, height]);
      await page.waitForTimeout(150);
      const boxes = await handles(page).evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
      const pitch = n > 1 ? boxes[1].y - boxes[0].y : 80;
      // The slot's own centre: the drop y that should land the row at `to` (the gap ± half a row, then the shift).
      const toY = boxes[from].y + (to - from) * pitch + Math.sign(to - from) * pitch * 0.05;
      let mid = null;
      let lostMid = false;
      await page.evaluate(() => { window.__lost = 0; document.addEventListener("lostpointercapture", () => { window.__lost++; }, true); });
      const expected = start.slice();
      expected.splice(to, 0, expected.splice(from, 1)[0]);
      await drag(page, cdp, touch, boxes[from], toY, 24, async () => {
        await page.waitForTimeout(200); // the last move's frame (CDP touch events are not paced like a mouse)
        mid = await visualOrder(page);
        lostMid = (await page.evaluate(() => window.__lost)) > 0;
        if (process.env.PROBE_SHOTS && !traced && from === 0 && delta === 2) { traced = true; await page.screenshot({ path: `${process.env.PROBE_SHOTS}/deck-drag-${name}-${input}-mid.png` }); }
      });
      const final = await order(page);
      const tag = `from ${from} by ${delta}`;
      check(label, `${tag}: the drag is not cancelled mid-way (pointer capture survives the reorder)`, !lostMid, `lostMid=${lostMid}`);
      check(label, `${tag}: the order drawn mid-drag is the order after the drop (nothing snaps back)`, JSON.stringify(mid) === JSON.stringify(final), `mid=${mid?.indexOf(start[from])} final=${final.indexOf(start[from])}`);
      check(label, `${tag}: the row lands at slot ${to}`, JSON.stringify(final) === JSON.stringify(expected), `landed=${final.indexOf(start[from])}`);
    }
    // Smoothness: no jump at pickup, and the lifted row stays under the pointer (the same grab offset) all the way down.
    await enterArrange(page);
    const mid2 = Math.floor(n / 2);
    await handles(page).nth(mid2).evaluate((e) => { e.scrollIntoView({ block: "center" }); window.scrollBy(0, e.getBoundingClientRect().top - 130); });
    await page.waitForTimeout(150);
    const tops = () => handles(page).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
    const before = await tops();
    const hb = await handles(page).nth(mid2).boundingBox();
    const hx = hb.x + hb.width / 2;
    const y0 = hb.y + hb.height / 2;
    const send = async (type, y) => touch
      ? cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: hx, y }] })
      : type === "touchStart" ? (await page.mouse.move(hx, y), page.mouse.down()) : type === "touchMove" ? page.mouse.move(hx, y) : page.mouse.up();
    await send("touchStart", y0);
    await page.waitForTimeout(150);
    const pickedUp = await tops();
    const jump = Math.max(...pickedUp.map((t, i) => Math.abs(t - before[i])));
    check(label, "no jump at pickup: no row moves when the handle is pressed", jump <= 1, `max=${jump.toFixed(1)}px`);
    let worst = 0;
    for (let i = 1; i <= 12; i++) {
      const y = y0 + i * 30;
      await send("touchMove", y);
      await page.waitForTimeout(40);
      const box = await handles(page).nth(mid2).boundingBox();
      worst = Math.max(worst, Math.abs(box.y + box.height / 2 - y));
    }
    check(label, "the lifted row stays under the pointer through a 360px drag", worst <= 3, `worst=${worst.toFixed(1)}px`);
    await send("touchEnd", y0 + 360);
    await page.waitForTimeout(300);

    // Edge autoscroll: held at the bottom edge, the first deck rides the scroll to the end of the list.
    await enterArrange(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    const first = await handles(page).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const startOrder = await order(page);
    await drag(page, cdp, touch, first, height - 20, 20, async () => { await page.waitForTimeout(6_000); });
    const after = await order(page);
    check(label, "held at the bottom edge, the first deck autoscrolls down to the last slots", after.indexOf(startOrder[0]) >= n - 3, `landed=${after.indexOf(startOrder[0])} of ${n}`);
  } catch (e) {
    failed++;
    console.log(` FAIL [${label}] threw — ${String(e).split("\n")[0]}`);
  } finally {
    await ctx.close();
  }
}

await clerkSetup();
const browser = await chromium.launch();
for (const [name, size] of Object.entries(SIZES)) for (const input of ["mouse", "touch"]) await run(browser, name, size, input);
await browser.close();
console.log(failed ? `${failed} FAILED` : "all checks passed");
process.exit(failed ? 1 : 0);
