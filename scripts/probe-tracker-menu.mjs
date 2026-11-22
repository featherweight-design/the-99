// Presses the life tracker strip's Menu (addendum #3115, gap T7b, board M1) at phone width (390x844) and tablet width
// (1180x820) on the fixture's four-seat S4 table, and on the tablet's three-seat T10 "Along one side", whose strip runs
// along the top edge. It checks Menu is the strip's last button, after Undo: the ⋯ icon, named Menu, with a menu popup.
// A press lights it and opens a 300px `role="menu"` popover above it (below it on a top-edge strip), centred on it or
// clamped 8px inside the screen, holding one 64px row: Back to the table and its line naming this phone or tablet.
// Focus moves to the row on open and back to Menu on close; Esc, a tap outside and Menu again each close it, and the
// old bottom-bar dialog is gone. Opening it ends a monarch pick. Leaving with life still counting on a panel lands that
// change first, keeps the game on the device, and goes back to the table, which offers Back to the game.
// Writes only the device's saved game (localStorage), so it may run against local-dev with the fixture seeded.
//
//   PROBE_BASE=http://localhost:3393 node scripts/probe-tracker-menu.mjs
// Optional: SHOTS=<dir>.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");
const SHOTS = process.env.SHOTS;
const S4 = "7a0e0000-0000-4000-8000-000000000013";
const T10 = "7a0e0000-0000-4000-8000-000000000010";

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

// A fresh game on the table: the saved one cleared, setup's Start (on `layout` when named), the first roll dismissed.
const startGame = async (page, table, layout) => {
  await page.goto(`${BASE}/friends/table/${table}/play`, { waitUntil: "networkidle", timeout: 180_000 });
  await page.evaluate((k) => localStorage.removeItem(k), `the99.tracker.${table}`);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Start", exact: true }).waitFor({ timeout: 60_000 });
  await page.evaluate(() => document.querySelectorAll("[data-seat-notice-stack], nextjs-portal").forEach((n) => n.remove()));
  if (layout) await page.getByRole("radio", { name: layout, exact: true }).evaluate((el) => el.click());
  await page.getByRole("button", { name: "Start", exact: true }).evaluate((el) => el.click());
  await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 });
  await page.evaluate(() => document.querySelector("[data-testid=first-roll] > button")?.click());
  await page.getByTestId("first-roll").waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(600);
};

const menuBox = (page) => page.getByRole("menu", { name: "Menu" }).boundingBox();
const isOpen = async (page) => (await page.getByRole("menu", { name: "Menu" }).count()) > 0;

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const { label, device, viewport } of [
    { label: "phone 390x844", device: "phone", viewport: { width: 390, height: 844 } },
    { label: "tablet 1180x820", device: "tablet", viewport: { width: 1180, height: 820 } },
  ]) {
    console.log(`\n## ${label}`);
    const context = await browser.newContext({ viewport, screen: viewport, hasTouch: true, isMobile: device === "phone" });
    const page = await context.newPage();
    await signIn(page);
    await startGame(page, S4);

    // The button: the strip's last, after Undo, the ⋯ icon with no text.
    const btn = page.getByTestId("strip-menu");
    const order = await page.getByTestId("tracker-spine").evaluate((el) => [...el.querySelectorAll("button[data-testid^=strip-]")].map((b) => b.getAttribute("data-testid")));
    check("Menu is the strip's last button, after Undo", order.at(-1) === "strip-menu" && order.at(-2) === "strip-undo", order.join(" "));
    const attrs = await btn.evaluate((el) => ({ name: el.getAttribute("aria-label"), pop: el.getAttribute("aria-haspopup"), text: el.textContent.trim(), svg: !!el.querySelector("svg") }));
    check("Menu: named Menu, a menu popup, the ⋯ icon and no text", attrs.name === "Menu" && attrs.pop === "menu" && attrs.svg && !attrs.text, JSON.stringify(attrs));

    // Opening: lit, a 300px menu above the button, centred on it or clamped 8px inside the screen.
    await btn.evaluate((el) => el.click());
    await page.waitForTimeout(350);
    const bb = await btn.boundingBox();
    const mb = await menuBox(page);
    const lit = await btn.evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()]);
    const accent = await page.evaluate((c) => {
      const s = document.createElement("span");
      s.style.color = c;
      document.body.append(s);
      const v = getComputedStyle(s).color;
      s.remove();
      return v;
    }, lit[1]);
    check("open: Menu is lit with the accent", lit[0] === accent, `${lit[0]} vs ${accent}`);
    check("open: the menu is 300px wide", !!mb && Math.round(mb.width) === 300, mb && String(Math.round(mb.width)));
    check("open: the menu sits above Menu", !!mb && mb.y + mb.height <= bb.y, mb && `menu bottom ${Math.round(mb.y + mb.height)}, button top ${Math.round(bb.y)}`);
    const centred = !!mb && Math.abs(mb.x + mb.width / 2 - (bb.x + bb.width / 2)) <= 1;
    const clamped = !!mb && (Math.round(mb.x) === 8 || Math.round(viewport.width - (mb.x + mb.width)) === 8);
    check("open: centred on Menu, or clamped 8px inside the screen", centred || clamped, mb && `menu ${Math.round(mb.x)}..${Math.round(mb.x + mb.width)}, button centre ${Math.round(bb.x + bb.width / 2)}`);
    check("open: the menu lies inside the screen", !!mb && mb.x >= 8 - 0.5 && mb.x + mb.width <= viewport.width - 8 + 0.5 && mb.y >= 0);
    const row = page.getByRole("menuitem");
    const rowInfo = await row.evaluateAll((els) => els.map((el) => ({ href: el.getAttribute("href"), text: el.textContent, h: el.getBoundingClientRect().height, min: getComputedStyle(el).minHeight })));
    check("open: one row, back to the table", rowInfo.length === 1 && rowInfo[0].href === `/friends/table/${S4}`, JSON.stringify(rowInfo.map((r) => r.href)));
    // M1's `.mi`: at least 64px, taller when its line wraps (it does at 300px, as drawn).
    check("open: the row is at least 64px tall", rowInfo.length === 1 && rowInfo[0].min === "64px" && rowInfo[0].h >= 64, rowInfo[0] && `${rowInfo[0].min}, ${rowInfo[0].h}`);
    check(`open: Back to the table, and its line names this ${device}`, rowInfo.length === 1 && rowInfo[0].text.includes("Back to the table") && rowInfo[0].text.includes(`The game stays on this ${device}. Back to the game picks it up.`), rowInfo[0]?.text);
    check("open: focus is on the row", await row.first().evaluate((el) => document.activeElement === el));
    check("open: no bottom-bar dialog", (await page.getByRole("dialog").count()) === 0);
    await shot(page, `menu-open-${device}`);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    // The dice button lights the same way while its menu is open (the same strip rule).
    await page.getByTestId("strip-dice").evaluate((el) => el.click());
    await page.waitForTimeout(350);
    const diceBg = await page.getByTestId("strip-dice").evaluate((el) => getComputedStyle(el).backgroundColor);
    check("the dice button is lit with the accent while its menu is open", diceBg === accent, `${diceBg} vs ${accent}`);
    await page.getByTestId("strip-dice").evaluate((el) => el.click());
    await page.waitForTimeout(200);
    await btn.evaluate((el) => el.click());
    await page.waitForTimeout(350);

    // Closing: Esc, a tap outside, Menu again; focus back on Menu.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    check("Esc closes it", !(await isOpen(page)));
    check("closed: focus is back on Menu", await btn.evaluate((el) => document.activeElement === el));
    await btn.evaluate((el) => el.click());
    await page.waitForTimeout(250);
    await page.mouse.click(4, 4);
    await page.waitForTimeout(200);
    check("a tap outside closes it", !(await isOpen(page)));
    await btn.evaluate((el) => el.click());
    await page.waitForTimeout(250);
    await btn.evaluate((el) => el.click());
    await page.waitForTimeout(200);
    check("Menu again closes it", !(await isOpen(page)));

    // One popover at a time: a monarch pick ends when Menu opens.
    await page.getByTestId("strip-monarch").evaluate((el) => el.click());
    await page.waitForTimeout(200);
    const picking = await page.getByTestId("strip-monarch").getAttribute("aria-pressed");
    await btn.evaluate((el) => el.click());
    await page.waitForTimeout(250);
    const after = await page.getByTestId("strip-monarch").getAttribute("aria-pressed");
    check("opening it ends a monarch pick", picking === "true" && after === "false", `${picking} then ${after}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // Leaving with life still counting: the change lands first, the game stays, the table offers it back.
    const k = `the99.tracker.${S4}`;
    const before = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).game.log.length, k);
    const plus = await page.getByTestId("half-plus").first().boundingBox();
    await page.touchscreen.tap(plus.x + plus.width / 2, plus.y + plus.height / 2);
    await page.waitForTimeout(150);
    await btn.evaluate((el) => el.click());
    await page.waitForTimeout(250);
    await page.getByRole("menuitem").evaluate((el) => el.click());
    await page.waitForURL(`${BASE}/friends/table/${S4}`, { timeout: 30_000 }).catch(() => {});
    check("leaving goes back to the table", page.url() === `${BASE}/friends/table/${S4}`, page.url());
    const saved = await page.evaluate((k) => {
      const g = JSON.parse(localStorage.getItem(k) ?? "null")?.game;
      return g ? { n: g.log.length, last: g.log.at(-1) } : null;
    }, k);
    check("leaving lands the pending life and keeps the game", !!saved && saved.n === before + 1 && saved.last?.t === "life" && saved.last.delta === 1, JSON.stringify(saved));
    const resume = await page.getByText("Back to the game", { exact: true }).first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    check("the table offers Back to the game", resume);
    await shot(page, `menu-left-${device}`);

    if (device === "tablet") {
      // A strip along the top edge (tablet three along one side) opens its Menu below the button.
      await startGame(page, T10, "Along one side");
      await page.getByTestId("strip-menu").evaluate((el) => el.click());
      await page.waitForTimeout(350);
      const b2 = await page.getByTestId("strip-menu").boundingBox();
      const m2 = await menuBox(page);
      check("top-edge strip: the menu opens below Menu", !!m2 && m2.y >= b2.y + b2.height, m2 && `menu top ${Math.round(m2.y)}, button bottom ${Math.round(b2.y + b2.height)}`);
      check("top-edge strip: the menu lies inside the screen", !!m2 && m2.x >= 7.5 && m2.x + m2.width <= viewport.width - 7.5 && m2.y + m2.height <= viewport.height);
      await shot(page, "menu-open-tablet-3-side");
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
