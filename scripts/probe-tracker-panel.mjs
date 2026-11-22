// Presses the life tracker's in-game panel (design handoff F04, F12, F18, F19, gap T4) at phone and desktop width and
// measures what the boards draw: the life number in Cinzel sized from the cell, the − and + glyphs on the tap halves
// with named labels, the round sheet button that opens the player sheet, End turn in the name row (phone, pane W) or
// the foot toward the strip (tablet grid, pane F), the pane's 16px or 18px corners and the .5 wash over the art.
// It only reads and taps: Start and every change live on the device (localStorage), so it writes nothing to the
// database and may run against local-dev. On main the name opens the sheet, the halves draw no glyph and say
// "Lose 1 life", and there is no sheet button or foot, so the checks fail.
//
//   PROBE_BASE=http://localhost:3393 node scripts/probe-tracker-panel.mjs
// Optional: PANEL_TABLE (default the fixture's S4, four seats), SHOTS=<dir>.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");
const TABLE = process.env.PANEL_TABLE ?? "7a0e0000-0000-4000-8000-000000000013";
const SHOTS = process.env.SHOTS;
// The phone draws pane W (name row on top, End turn in it); the desktop is a tablet board whose four-seat grid draws
// pane F (name on the outer edge, a 52px foot toward the strip).
const WIDTHS = [
  { label: "phone 390x844", width: 390, height: 844, pane: "who", radius: 16, chevron: 44, glyph: 30, life: [80, 115] },
  { label: "desktop 1300x900", width: 1300, height: 900, pane: "foot", radius: 18, chevron: 52, glyph: 36, life: [130, 175] },
];

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

// The audit account is a `+clerk_test` address: Clerk's fixed 424242 code, through `window.Clerk` on the app's origin
// (as `probe-rollup-ui.mjs`, which says why the hosted portal cannot be driven).
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

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const w of WIDTHS) {
    console.log(`\n## ${w.label}`);
    const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: true });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/friends/table/${TABLE}/play`, { waitUntil: "networkidle" });
    const start = page.getByRole("button", { name: "Start", exact: true });
    await start.waitFor({ timeout: 20_000 }).catch(async () => {
      await shot(page, `${w.width}-no-start`);
      throw new Error(`no Start button at ${page.url()}: ${((await page.locator("main").innerText().catch(() => "")) || "").slice(0, 200)}`);
    });
    await start.evaluate((el) => el.click());
    await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 });
    await page.evaluate(() => document.querySelectorAll("[data-seat-notice-stack]").forEach((n) => n.remove()));
    // The d20 for who goes first may be on screen; a tap clears it.
    const roll = page.getByTestId("first-roll");
    if (await roll.count()) await page.getByRole("button", { name: /play/i }).first().evaluate((el) => el.click()).catch(() => {});
    await page.waitForTimeout(800);
    await shot(page, `${w.width}-board`);

    const panels = page.getByTestId("tracker-panel");
    check("four panels on the board", (await panels.count()) === 4, String(await panels.count()));
    const panel = panels.first();
    check(`pane variant is ${w.pane}`, (await panel.getAttribute("data-pane")) === w.pane, String(await panel.getAttribute("data-pane")));
    // The corners and the inset edge live on the panel's faces, since T5 turns the panel over to its Out face.
    const ps = await style(panel.getByTestId("panel-front"), ["border-top-left-radius", "border-top-width"]);
    check(`panel corners ${w.radius}px`, ps["border-top-left-radius"] === `${w.radius}px`, ps["border-top-left-radius"]);
    check("panel draws no real border (inset shadow instead)", ps["border-top-width"] === "0px", ps["border-top-width"]);

    const life = panel.getByTestId("life-number");
    const ls = await style(life, ["font-family", "font-size", "font-weight", "line-height"]);
    check("life number is Cinzel", /cinzel/i.test(ls["font-family"]), ls["font-family"].slice(0, 40));
    const size = parseFloat(ls["font-size"]);
    check(`life number ${w.life[0]} to ${w.life[1]}px`, size >= w.life[0] && size <= w.life[1], ls["font-size"]);
    check("life number weight 700", ls["font-weight"] === "700", ls["font-weight"]);

    const minus = panel.getByTestId("half-minus");
    const plus = panel.getByTestId("half-plus");
    check("minus half draws −", ((await minus.textContent()) ?? "").trim() === "\u2212", (await minus.textContent()) ?? "");
    check("plus half draws +", ((await plus.textContent()) ?? "").trim() === "+", (await plus.textContent()) ?? "");
    const gs = await style(minus, ["font-size"]);
    check(`glyph ${w.glyph}px`, gs["font-size"] === `${w.glyph}px`, gs["font-size"]);
    const ml = (await minus.getAttribute("aria-label")) ?? "";
    check("minus label names the player", /^(You lose|.+ loses) 1 life$/.test(ml), ml);

    // The pending change hangs off the number and never moves it.
    const before = await life.boundingBox();
    await minus.dispatchEvent("pointerdown");
    check("minus half draws pressed while the finger is down", (await minus.getAttribute("data-pressed")) !== null);
    await minus.dispatchEvent("pointerup");
    await page.waitForTimeout(150);
    const after = await life.boundingBox();
    const pend = panel.getByTestId("life-pending");
    check("pending delta shows", (await pend.count()) === 1);
    check("minus half is not held pressed while pending", (await minus.getAttribute("data-pressed")) === null);
    check("life number does not move for the delta", Math.abs((before?.x ?? 0) - (after?.x ?? 1)) < 12, `${before?.x} vs ${after?.x}`);
    await shot(page, `${w.width}-pending`);
    await page.waitForTimeout(2200);

    const sheetBtn = panel.getByTestId("panel-sheet");
    check("sheet button present", (await sheetBtn.count()) === 1);
    if (await sheetBtn.count()) {
      const box = await sheetBtn.evaluate((el) => ({ width: el.offsetWidth, height: el.offsetHeight }));
      check(`sheet button ${w.chevron}px round`, box.width === w.chevron && box.height === w.chevron, `${box.width}x${box.height}`);
      const where = await sheetBtn.evaluate((el) => (el.closest('[data-testid="panel-foot"]') ? "foot" : el.closest('[data-testid="panel-who"]') ? "who" : "none"));
      check(`sheet button sits in the ${w.pane} row`, where === w.pane, where);
    }
    const active = page.locator("[data-active]");
    const end = active.getByTestId("end-turn");
    check("End turn on the active seat", (await end.count()) === 1);
    if (await end.count()) {
      const where = await end.evaluate((el) => (el.closest('[data-testid="panel-foot"]') ? "foot" : el.closest('[data-testid="panel-who"]') ? "who" : "none"));
      check(`End turn sits in the ${w.pane} row`, where === w.pane, where);
      // offsetHeight, not the bounding box: a seat turned 90 degrees draws its row sideways.
      const eh = await end.evaluate((el) => el.offsetHeight);
      check(`End turn ${w.pane === "foot" ? 48 : 40}px tall`, eh === (w.pane === "foot" ? 48 : 40), String(eh));
      check("End turn carries its arrow", (await end.locator("svg").count()) === 1);
    }
    // The turn ring is drawn in the panel's own pixels, so its dash is whole and its corners follow the pane's radius.
    const ring = await active.getByTestId("turn-ring").evaluate((svg) => {
      const vb = svg.getAttribute("viewBox")?.split(" ").map(Number) ?? [];
      const paths = [...svg.querySelectorAll("path")].map((p) => p.getAttribute("d") ?? "");
      return { vb, w: svg.clientWidth, h: svg.clientHeight, paths };
    });
    check("turn ring viewBox matches the panel", ring.vb[2] === ring.w && ring.vb[3] === ring.h, `${ring.vb.join(" ")} vs ${ring.w}x${ring.h}`);
    check("turn ring rounds its corners", ring.paths.length === 4 && ring.paths.every((d) => d.includes("A")), String(ring.paths.length));
    const name = panel.getByTestId("panel-name");
    check("name is not a button", (await name.evaluate((el) => el.closest("button") === null)));
    const art = panel.getByTestId("panel-art");
    if (await art.count()) {
      const wash = panel.getByTestId("panel-wash");
      check("wash over the art", (await wash.count()) === 1);
    } else console.log("SKIP  wash (first seat has no art)");

    // The round button opens the player sheet.
    if (await sheetBtn.count()) {
      await sheetBtn.evaluate((el) => el.click());
      const opened = await page.getByRole("dialog").waitFor({ timeout: 10_000 }).then(() => true, () => false);
      check("sheet button opens the sheet", opened);
      await shot(page, `${w.width}-sheet`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
