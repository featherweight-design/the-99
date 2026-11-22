// The life tracker's sheet on a tablet (tablet addendum, 2026-11-22, boards Sheet and Damage): it takes the half of the
// table nearest its seat over a veil, Commander damage draws one art card per opponent with a partner pair split into two
// halves, each half stacking its count over - and + (R1.1, D3), and the Table tab sits in the row with the others. It plays
// a saved six-seat game ("Three and three") on the fixture's S4 table with a partner pair in seat 1, presses seat 0's
// panel to open its sheet, and measures at 1180x820, 820x1180 (turned), 1300x900 and 390x844:
//   - tablet and desktop: a veil, the sheet half the table deep (380px floor) and full width, five damage cards across,
//     both partner steppers inside their half (no overflow) and every damage button at least 44px square;
//   - every screen: the Table tab right after Mana, not pushed to the far end;
//   - tablet: End game ("How did it end?") opens inside the half sheet with its outcome tiles on screen;
//   - phone: the full-height sheet, no veil, the row damage cards unchanged.
// On main the tablet sheet is full height with no veil, the damage tab draws rows, and Table sits at the far end.
// Writes only the device's saved game (localStorage). Needs the fixture seeded on a scratch branch (docs/probes.md) and
// the dev server started with INVITE_CODE_SECRET set, or the roster cannot seal and the play route answers not found.
//
//   PROBE_BASE=http://localhost:3471 node scripts/probe-tracker-tablet-sheet.mjs
// Optional: SHOTS=<dir>.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");
const SHOTS = process.env.SHOTS;
const S4 = "7a0e0000-0000-4000-8000-000000000013";

const player = (seat, name, commander, partner = null) => ({ seat, you: seat === 0, name, art: null, partnerArt: null, commander, partner, deck: null });
const PLAYERS = [player(0, "Hugh", "Sai"), player(1, "Max", "Ishai", "Bruse Tarl"), player(2, "Ana", "Atraxa"), player(3, "Colin", "Edgar"), player(4, "Dee", "Krenko"), player(5, "Eli", "Kinnan")];

const SCREENS = [
  { name: "tablet-landscape", viewport: { width: 1180, height: 820 }, layout: "tablet-6", angle: 0, tablet: true },
  { name: "tablet-portrait", viewport: { width: 820, height: 1180 }, layout: "tablet-6", angle: 90, tablet: true },
  { name: "desktop-1300", viewport: { width: 1300, height: 900 }, layout: "tablet-6", angle: 0, tablet: true },
  { name: "phone-390", viewport: { width: 390, height: 844 }, layout: "phone-6", angle: 0, tablet: false },
];

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

// As `probe-tracker-tablet.mjs`: the audit account's fixed 424242 code through `window.Clerk` on the app's origin.
async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
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

// The screen's angle, stubbed: Chromium's emulation never turns `screen.orientation`.
const stubAngle = (deg) => {
  Object.defineProperty(ScreenOrientation.prototype, "angle", { configurable: true, get: () => deg });
};

async function openGame(browser, s, reducedMotion) {
  const context = await browser.newContext({ viewport: s.viewport, screen: s.viewport, deviceScaleFactor: 1, reducedMotion });
  await context.addInitScript(stubAngle, s.angle);
  const page = await context.newPage();
  await signIn(page);
  await page.goto(`${BASE}/friends/table/${S4}/play`, { waitUntil: "networkidle", timeout: 180_000 });
  const angle = await page.evaluate(() => screen.orientation.angle);
  if (angle !== s.angle) throw new Error(`${s.name}: the orientation stub did not take (angle ${angle}, wanted ${s.angle})`);
  await page.evaluate(
    ({ table, layout, players }) => {
      const game = {
        config: { tableId: table, startingLife: 40, seats: players.map((p) => ({ seat: p.seat, commanders: p.partner ? 2 : 1 })), first: 0, layout, startedAt: Date.now(), snapshot: { players, roster: "probe" } },
        log: [],
      };
      localStorage.setItem(`the99.tracker.${table}`, JSON.stringify({ v: 1, game, expiresAt: Date.now() + 3_600_000 }));
    },
    { table: S4, layout: s.layout, players: PLAYERS },
  );
  await page.reload({ waitUntil: "networkidle" });
  try {
    await page.getByTestId("tracker-play").waitFor({ timeout: 20_000 });
  } catch (error) {
    throw new Error(`${s.name}: the saved game did not resume at ${page.url()} (is the fixture's S4 seeded, with the audit account seated?)`, { cause: error });
  }
  // The fixture seats the account at every table, so its seat notices stack over the phone's strip; they are not the sheet.
  await page.addStyleTag({ content: "[data-seat-notice-stack]{display:none !important}" });
  return { context, page };
}

// Press seat 0's panel, as a player does, and wait for its sheet.
async function openSheet(page) {
  await page.locator('[data-testid="panel-sheet"]').first().click();
  await page.getByTestId("tracker-sheet").waitFor({ timeout: 5_000 });
  await page.waitForTimeout(400);
}

// Sizes from the layout box (offsetWidth/Height), so a seat's turn or the portrait turn does not swap them.
const measure = (page) =>
  page.evaluate(() => {
    const sheet = document.querySelector("[data-testid=tracker-sheet]");
    const frame = sheet.parentElement;
    const tabs = [...sheet.querySelectorAll("[role=tab]")];
    const mana = tabs.find((t) => /^Mana/.test(t.textContent));
    const table = tabs.find((t) => /^Table/.test(t.textContent));
    const cards = [...sheet.querySelectorAll("[data-testid=damage-card]")];
    const partner = cards.find((c) => c.querySelectorAll("button").length === 4);
    const halves = partner ? [...partner.querySelectorAll(".\\@container")] : [];
    return {
      veil: !!document.querySelector("[data-testid=sheet-veil]"),
      sheetH: sheet.offsetHeight,
      sheetW: sheet.offsetWidth,
      frameH: frame.offsetHeight,
      frameW: frame.offsetWidth,
      cards: cards.length,
      halves: halves.map((h) => {
        const stepper = h.querySelector("button").parentElement;
        return { half: h.clientWidth, stepper: stepper.offsetWidth, overflow: h.scrollWidth - h.clientWidth };
      }),
      buttons: cards.flatMap((c) => [...c.querySelectorAll("button")].map((b) => Math.min(b.offsetWidth, b.offsetHeight))),
      tableGap: table.offsetLeft - (mana.offsetLeft + mana.offsetWidth),
    };
  });

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const s of SCREENS) {
    const { context, page } = await openGame(browser, s, "no-preference");
    await openSheet(page);
    const m = await measure(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${s.name}-damage.png` });
    check(`${s.name}: the Table tab sits right after Mana`, m.tableGap >= 0 && m.tableGap < 24, `gap ${m.tableGap}px`);
    if (s.tablet) {
      const half = Math.max(380, m.frameH / 2);
      check(`${s.name}: a veil, and the sheet half the table deep across its width`, m.veil && Math.abs(m.sheetH - half) <= 1 && m.sheetW === m.frameW, `veil ${m.veil}, ${m.sheetW}x${m.sheetH} of ${m.frameW}x${m.frameH}`);
      check(`${s.name}: five damage art cards across`, m.cards === 5, `${m.cards} cards`);
      check(
        `${s.name}: both partner steppers fit inside their half`,
        m.halves.length === 2 && m.halves.every((h) => h.stepper <= h.half && h.overflow <= 0),
        m.halves.map((h) => `half ${h.half}px, stepper ${h.stepper}px, overflow ${h.overflow}`).join("; "),
      );
      check(`${s.name}: every damage button at least 44px`, m.buttons.length === 12 && Math.min(...m.buttons) >= 44, `${m.buttons.length} buttons, smallest ${Math.min(...m.buttons)}px`);
      // End game inside the half sheet: the outcome tiles on screen, inside the sheet.
      const sheet = page.getByTestId("tracker-sheet");
      await sheet.getByRole("tab", { name: /^Table/ }).click();
      await sheet.getByRole("button", { name: "End game" }).click();
      await page.waitForTimeout(300);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${s.name}-end.png` });
      const end = await page.evaluate(() => {
        const sheet = document.querySelector("[data-testid=tracker-sheet]").getBoundingClientRect();
        const back = [...document.querySelectorAll("[data-testid=tracker-sheet] button")].filter((b) => b.offsetParent && b.closest("#sheet-panel"));
        const inside = back.filter((b) => {
          const r = b.getBoundingClientRect();
          return r.left >= sheet.left - 1 && r.right <= sheet.right + 1 && r.top >= sheet.top - 1 && r.bottom <= sheet.bottom + 1;
        });
        return { buttons: back.length, inside: inside.length, heading: /How did it end/.test(document.querySelector("#sheet-panel")?.textContent ?? "") };
      });
      check(`${s.name}: End game opens inside the half sheet, every press on screen`, end.heading && end.buttons > 0 && end.inside === end.buttons, `heading ${end.heading}, ${end.inside}/${end.buttons} presses inside`);
    } else {
      check(`${s.name}: the full-height sheet, no veil, row damage cards`, !m.veil && m.sheetH === m.frameH && m.cards === 0, `veil ${m.veil}, ${m.sheetH} of ${m.frameH}, ${m.cards} art cards`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
if (failed) {
  console.log(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
