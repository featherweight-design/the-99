// probe:tracker-first-roll — Random's d20 for who goes first (T3), at 390x844 and 1300x820. Start under Random throws a
// d20 for every seat; once they land each seat's number rings up on its own panel, turned the way that panel faces, and
// the highest roll's ring reads "Goes first" over the panel that is now active. A tap clears the dice. At 1300 it also
// measures the tablet 2+2 board (F18): four 575-wide panels with a 10px gap. (A tie rerolls among the tied seats only;
// `first-roll.test.ts` pins that, since the probe cannot choose the numbers.) It writes nothing to the database (the
// game lives in the browser). The audit account must sit at the table (`scripts/seed-rule-zero-fixture.mts`'s S4 on a
// scratch branch); production and staging are refused.
//
//   PROBE_BASE=http://localhost:3393 node scripts/probe-tracker-first-roll.mjs
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

async function shot(page, name) {
  if (!SHOTS) return;
  await page.screenshot({ path: `${SHOTS}/tracker-first-roll-${name}.png` });
}

const box = (r) => ({ x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 });

async function walk(browser, width) {
  const context = await browser.newContext({ viewport: width.viewport });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`  page error: ${String(e.message).split("\n")[0]}`));
  const L = (s) => `${width.label}: ${s}`;
  const phone = width.viewport.width < 768;
  try {
    await signIn(page);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE}/friends/table/${TABLE}/play`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.addStyleTag({ content: "[data-seat-notice-stack]{display:none!important}" });
    const setup = page.getByTestId("tracker-setup");
    await setup.waitFor({ timeout: 60_000 });
    report(L("Random is the default"), (await setup.getByRole("button", { name: "Random", exact: true }).getAttribute("aria-pressed")) === "true");
    await setup.getByRole("button", { name: "Start", exact: true }).click();

    const roll = page.getByTestId("first-roll");
    if (!report(L("Start under Random throws the d20s"), await roll.waitFor({ state: "attached", timeout: 15_000 }).then(() => true, () => false))) {
      await shot(page, `${width.label}-no-dice`);
      return;
    }
    await page.locator("[data-testid=first-roll][data-done]").waitFor({ state: "attached", timeout: 30_000 });
    await page.waitForTimeout(400); // the rings fade in
    const got = await page.evaluate(() => {
      const panels = [...document.querySelectorAll("[data-testid=tracker-panel]")].map((p) => ({
        seat: Number(p.getAttribute("data-seat")),
        active: p.hasAttribute("data-active"),
        rect: p.getBoundingClientRect().toJSON(),
        turn: getComputedStyle(p).transform,
      }));
      const rings = [...document.querySelectorAll("[data-first-roll-seat]")].map((r) => ({
        seat: Number(r.getAttribute("data-first-roll-seat")),
        value: Number(r.getAttribute("data-value")),
        first: r.hasAttribute("data-first"),
        dim: r.hasAttribute("data-dim") && getComputedStyle(r.firstElementChild).filter.includes("brightness"),
        rect: r.firstElementChild.getBoundingClientRect().toJSON(),
        turn: getComputedStyle(r.firstElementChild).transform,
        caption: r.querySelector("em")?.textContent ?? null,
      }));
      return { panels, rings, live: document.querySelector("[data-testid=first-roll] [aria-live]")?.textContent ?? "" };
    });
    const { panels, rings } = got;
    report(L("one d20 per seat, each 1 to 20"), rings.length === panels.length && panels.length === 4 && rings.every((r) => r.value >= 1 && r.value <= 20), rings.map((r) => `${r.seat}:${r.value}`).join(" "));
    const inside = rings.every((r) => {
      const p = panels.find((x) => x.seat === r.seat);
      const a = box(r.rect), b = box(p.rect);
      return p && Math.abs(a.cx - b.cx) < 2 && Math.abs(a.cy - b.cy) < 2 && p.turn === r.turn;
    });
    report(L("each number sits at the center of its own panel, turned the way the panel faces"), inside, rings.map((r) => `${r.seat} ${r.turn}`).join(" | "));
    const firsts = rings.filter((r) => r.first);
    const top = Math.max(...rings.map((r) => r.value));
    const active = panels.filter((p) => p.active);
    report(L("the highest roll reads Goes first"), firsts.length === 1 && firsts[0].value === top && firsts[0].caption === "Goes first", firsts.map((r) => `${r.seat}:${r.value} ${r.caption}`).join());
    report(L("every other seat's number dims"), rings.every((r) => r.dim === !r.first), rings.map((r) => `${r.seat}:${r.dim ? "dim" : "lit"}`).join(" "));
    report(L("the winner's panel is the active one"), active.length === 1 && active[0].seat === firsts[0]?.seat, `${active.map((p) => p.seat)} vs ${firsts[0]?.seat}`);
    report(L("the live region names who goes first"), /go(es)? first$/.test(got.live.trim()), got.live);
    await shot(page, `${width.label}-rolled`);

    await page.getByRole("button", { name: "Play", exact: true }).click();
    report(L("a tap clears the dice"), (await roll.count()) === 0);
    const still = await page.locator("[data-active]").getAttribute("data-seat");
    report(L("the game plays on from the winner"), Number(still) === firsts[0]?.seat, `${still}`);

    if (!phone) {
      // F18: the tablet 2+2 board, four 575-wide panels (of the 1180 canvas) with a 10px gap between the columns.
      const canvas = await page.evaluate(() => {
        const ps = [...document.querySelectorAll("[data-testid=tracker-panel]")].map((p) => p.getBoundingClientRect());
        const board = document.querySelector("[data-testid=tracker-panel]").closest("[style*=aspect-ratio]").getBoundingClientRect();
        return { scale: board.width / 1180, ps: ps.map((r) => ({ x: r.left - board.left, w: r.width })) };
      });
      const ws = canvas.ps.map((r) => Math.round(r.w / canvas.scale));
      const xs = [...new Set(canvas.ps.map((r) => Math.round(r.x / canvas.scale)))].sort((a, b) => a - b);
      report(L("F18: four panels 575 wide, columns at 10 and 595"), ws.every((w) => w === 575) && xs.join() === "10,595", `${ws.join()} at ${xs.join()}`);
    }
    await shot(page, `${width.label}-board`);
  } catch (error) {
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/tracker-first-roll-stopped-${width.label}.png` }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

const [{ branch } = {}] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
assertNotSharedBranch(branch, "probe:tracker-first-roll");
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
