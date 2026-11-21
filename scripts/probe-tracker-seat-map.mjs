// probe:tracker-seat-map — setup's seat map (F02, F02b, F02c), at 390x844 and 1300x820. The device is drawn small
// with a 64px face on the side of it each player sits on; dragging a face onto another swaps their seats, and so do the
// arrow keys; with "I'll pick" a tap rings that face 3px and captions it "Goes first". Start then lays the panels out
// in the map's order: the seat a face was dragged to is the panel that player gets. It writes nothing to the database
// (the game lives in the browser). The audit account must sit at the table (`scripts/seed-rule-zero-fixture.mts`'s S4
// on a scratch branch); production and staging are refused.
//
//   PROBE_BASE=http://localhost:3393 node scripts/probe-tracker-seat-map.mjs
// Optional: SETUP_TABLE (default the fixture's S4), PROBE_SHOTS=<dir> to keep a photograph of each step.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertNotSharedBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL"]);
if (!EMAIL.includes("+clerk_test")) throw new Error("Use a +clerk_test account (see the local-auth note).");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error("This probe runs against a local dev server only.");
const TABLE = process.env.SETUP_TABLE ?? "7a0e0000-0000-4000-8000-000000000013";
const SHOTS = process.env.PROBE_SHOTS;
const WIDTHS = [
  { label: 390, viewport: { width: 390, height: 844 } },
  { label: 1300, viewport: { width: 1300, height: 820 } },
];

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const faces = (page) =>
  page.locator("[data-testid=seat-map] [data-slot]").evaluateAll((els) =>
    els
      .map((e) => {
        const r = e.getBoundingClientRect();
        const m = e.closest("[data-testid=seat-map]").getBoundingClientRect();
        return { slot: Number(e.dataset.slot), label: e.getAttribute("aria-label"), pressed: e.getAttribute("aria-pressed"), x: r.x - m.x, y: r.y - m.y, w: r.width, h: r.height, radius: getComputedStyle(e).borderRadius, shadow: getComputedStyle(e).boxShadow, cx: r.x + r.width / 2, cy: r.y + r.height / 2, caption: e.parentElement.querySelector("em")?.textContent ?? null };
      })
      .sort((a, b) => a.slot - b.slot),
  );
const who = (label) => label?.split(/[,.]/)[0].replace(/ goes first$/, "") ?? "";

async function shot(page, name) {
  if (!SHOTS) return;
  await page.waitForTimeout(800); // the faces' art fades in
  await page.screenshot({ path: `${SHOTS}/tracker-seat-map-${name}.png` });
}

async function walk(browser, width) {
  const context = await browser.newContext({ viewport: width.viewport });
  const page = await context.newPage();
  const L = (s) => `${width.label}: ${s}`;
  const phone = width.viewport.width < 768;
  try {
    await signIn(page);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE}/friends/table/${TABLE}/play`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.addStyleTag({ content: "[data-seat-notice-stack]{display:none!important}" });
    const setup = page.getByTestId("tracker-setup");
    await setup.waitFor({ timeout: 60_000 });
    const map = page.getByTestId("seat-map");
    if (!report(L("setup draws the seat map"), (await map.count()) === 1)) return;
    const lead = (await setup.locator("p").first().innerText()).trim();
    report(L("the lead asks to drag each player to their side"), /flat and drag each player to the side they sit on\./.test(lead), lead);

    const device = await page.getByTestId("seat-map-device").boundingBox();
    const want = phone ? { w: 150, h: 290 } : { w: 290, h: 202 };
    report(L(`the device is drawn ${want.w}x${want.h}`), Math.round(device.width) === want.w && Math.round(device.height) === want.h, `${device.width}x${device.height}`);
    let f = await faces(page);
    report(L("four faces, 64px and round"), f.length === 4 && f.every((x) => Math.round(x.w) === 64 && Math.round(x.h) === 64 && parseFloat(x.radius) >= 32), f.map((x) => `${x.w}x${x.h} ${x.radius}`).join(", "));
    report(L("each face is labelled with where it sits and how to move it"), f.every((x) => /, .+\. Drag to move$/.test(x.label ?? "")), f.map((x) => x.label).join(" | "));
    if (phone) {
      // F02: faces on the two long sides at top 46 and 214 of the 330 map, the left pair flush left.
      const tops = f.map((x) => Math.round(x.y));
      report(L("F02 places the faces at 214, 46, 46, 214"), tops.join() === "214,46,46,214", tops.join());
      report(L("the left faces sit flush left (84px block)"), Math.round(f[0].x) === 10 && Math.round(f[1].x) === 10, `x ${f[0].x}, ${f[1].x}`);
    }
    await shot(page, `${width.label}-map`);

    // Drag the bottom-left face (cell 0) onto the top-right face (cell 2): they swap.
    const before = f.map((x) => who(x.label));
    await page.mouse.move(f[0].cx, f[0].cy);
    await page.mouse.down();
    await page.mouse.move(f[0].cx + 30, f[0].cy - 30, { steps: 4 });
    await page.mouse.move(f[2].cx, f[2].cy, { steps: 8 });
    await page.waitForTimeout(100);
    const lifted = (await faces(page))[0].shadow;
    report(L("a dragged face is lifted with the accent ring"), /8px 20px/.test(lifted), lifted);
    await page.mouse.up();
    await page.waitForTimeout(300);
    f = await faces(page);
    let after = f.map((x) => who(x.label));
    report(L("dropping a face on another swaps their seats"), after[0] === before[2] && after[2] === before[0] && after[1] === before[1] && after[3] === before[3], `${before.join(",")} -> ${after.join(",")}`);

    // The keyboard: ArrowUp on cell 0 (bottom-left) swaps it with cell 1 (top-left), and keeps focus on the player.
    const moving = after[0];
    await page.locator("[data-testid=seat-map] [data-slot='0']").focus();
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(300);
    f = await faces(page);
    const now = f.map((x) => who(x.label));
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
    report(L("an arrow key swaps a face with its neighbour that way"), now[1] === moving && now[0] === after[1], `${after.join(",")} -> ${now.join(",")}`);
    report(L("focus stays on the player who moved"), who(focused) === moving, focused);
    const live = await map.locator("[aria-live]").innerText();
    report(L("the move is announced"), live.includes("now"), live);
    after = now;

    // I'll pick: the lead changes, a tap rings the face 3px and captions it.
    await setup.getByRole("button", { name: "I’ll pick" }).click();
    const pickLead = (await setup.locator("p").first().innerText()).trim();
    report(L("I'll pick leads with the tap"), pickLead === "Tap who goes first. Drag a face to move their seat.", pickLead);
    await page.locator("[data-testid=seat-map] [data-slot='3']").click();
    f = await faces(page);
    const ringed = f.filter((x) => x.pressed === "true");
    report(L("a tap picks that face: pressed, ringed 3px, captioned Goes first"), ringed.length === 1 && ringed[0].slot === 3 && /0px 0px 0px 3px/.test(ringed[0].shadow) && ringed[0].caption === "Goes first", ringed.map((x) => `${x.slot} ${x.shadow} ${x.caption}`).join());
    report(L("the pick reads who goes first"), /goes first\. Tap someone else to change it$/.test(ringed[0]?.label ?? ""), ringed[0]?.label);
    await shot(page, `${width.label}-pick`);

    // Start lays the panels out in the map's order.
    await setup.getByRole("button", { name: "Start", exact: true }).click();
    await page.getByTestId("panel-name").first().waitFor({ timeout: 30_000 });
    const panels = await page.getByTestId("panel-name").allInnerTexts();
    const expect = after.map((n) => (n === "You" ? "You" : n));
    report(L("Start seats each panel where the map put them"), panels.map((t) => t.trim().split("\n")[0]).join() === expect.join(), `${panels.join(",")} vs ${expect.join(",")}`);
    const firstName = who(ringed[0]?.label);
    const active = await page.locator("[data-active] [data-testid=panel-name]").allInnerTexts();
    report(L("the picked face goes first"), active.length === 1 && active[0].trim().split("\n")[0] === firstName, `${active.join()} vs ${firstName}`);
    await shot(page, `${width.label}-board`);

    if (phone) {
      // F02b: one player on each side draws a 170-high device with faces at both ends.
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.addStyleTag({ content: "[data-seat-notice-stack]{display:none!important}" });
      await setup.waitFor({ timeout: 60_000 });
      await setup.getByRole("radio", { name: "One player on each side" }).click();
      await page.waitForTimeout(400); // the faces glide 200ms to their new sides
      const d2 = await page.getByTestId("seat-map-device").boundingBox();
      const m2 = await map.boundingBox();
      f = await faces(page);
      report(L("F02b: the device is 150x170 in a 378 map (362, plus the caption's line under the bottom face)"), Math.round(d2.height) === 170 && Math.round(m2.height) === 378, `${d2.width}x${d2.height} in ${m2.height}`);
      report(L("F02b: faces at the top end (0) and bottom end (276)"), Math.round(f[2].y) === 0 && Math.round(f[0].y) === 276, f.map((x) => Math.round(x.y)).join());
      await shot(page, `${width.label}-around`);
    }
  } catch (error) {
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/tracker-seat-map-stopped-${width.label}.png` }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

const [{ branch } = {}] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
assertNotSharedBranch(branch, "probe:tracker-seat-map");
await clerkSetup();
const browser = await chromium.launch();
try {
  for (const width of WIDTHS) {
    try {
      await walk(browser, width);
    } catch (error) {
      report(`${width.label}: the walk stopped`, false, String(error?.message ?? error).split("\n")[0]);
    }
  }
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
