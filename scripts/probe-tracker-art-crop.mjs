// The life tracker's seat art crop (Hugh, 2026-11-22: faces cut off on an iPad). Each panel draws its commander's
// art_crop with `object-cover`; the fix pins the crop to the art's top (`object-top`, ArtWash's "center top"). The
// check is the computed position; whether faces read better is the contact sheet's job (SHOTS). It plays a saved four-seat game on the fixture's S4 table with four
// real commanders' art (Dogmeat, Borg Queen, Clavileño, Black Panther) on "One on each side", so every seat turn
// (0, 90, 180, -90) draws, at iPad landscape, iPad portrait (the board turned) and phone width. It checks every panel
// image computes `object-position: 50% 0%`, and with SHOTS=<dir> it writes the same board three ways for the contact
// sheet: as the app draws it, with the old centered crop, and with "center 25%".
// Writes only the device's saved game (localStorage). Needs the fixture seeded on a scratch branch (docs/probes.md) and
// the dev server started with INVITE_CODE_SECRET set, or the roster cannot seal and the play route answers not found.
//
//   PROBE_BASE=http://localhost:3471 node scripts/probe-tracker-art-crop.mjs
// Optional: SHOTS=<dir>.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");
const SHOTS = process.env.SHOTS;
const S4 = "7a0e0000-0000-4000-8000-000000000013";

const ART = {
  dogmeat: "https://cards.scryfall.io/art_crop/front/8/6/86b45e3e-8460-4678-87d1-d74479936c83.jpg?1783912422",
  borg: "https://cards.scryfall.io/art_crop/front/8/e/8ed939ba-bf8d-4a68-ae9f-f8ca4eb301ab.jpg?1792507909",
  clavileno: "https://cards.scryfall.io/art_crop/front/9/f/9f55b648-b1ec-407a-a0c7-7647755793d1.jpg?1783913936",
  panther: "https://cards.scryfall.io/art_crop/front/a/1/a1b11ef2-2285-40eb-b11c-223c159e3d1f.jpg?1783903308",
};
const player = (seat, name, art, commander, deck) => ({ seat, you: seat === 0, name, art, partnerArt: null, commander, partner: null, deck });
// Turn order from the bottom cell, clockwise: bottom (0), left (90), top (180), right (-90).
const PLAYERS = [
  player(0, "Hugh", ART.panther, "Black Panther, Wakandan King", "Wakanda Forever"),
  player(1, "Ana", ART.dogmeat, "Dogmeat, Ever Loyal", "Scrappy Survivors"),
  player(2, "Colin", ART.borg, "The Borg Queen", "We Are the Borg"),
  player(3, "Dee", ART.clavileno, "Clavileño, First of the Blessed", "Blood Rites"),
];

const SCREENS = [
  { name: "ipad-landscape", viewport: { width: 1180, height: 820 }, layout: "tablet-4-around", angle: 0 },
  { name: "ipad-portrait", viewport: { width: 820, height: 1180 }, layout: "tablet-4-around", angle: 90 },
  { name: "phone-390", viewport: { width: 390, height: 844 }, layout: "phone-4-around", angle: 0 },
];
const VARIANTS = [
  { name: "after", css: null },
  { name: "before", css: "[data-testid=panel-art] img{object-position:50% 50% !important}" },
  { name: "center-25", css: "[data-testid=panel-art] img{object-position:50% 25% !important}" },
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

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const s of SCREENS) {
    const context = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: 1 });
    await context.addInitScript(stubAngle, s.angle);
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/friends/table/${S4}/play`, { waitUntil: "networkidle", timeout: 180_000 });
    await page.evaluate(
      ({ table, layout, players }) => {
        const game = {
          config: { tableId: table, startingLife: 40, seats: players.map((p) => ({ seat: p.seat, commanders: 1 })), first: 0, layout, startedAt: Date.now(), snapshot: { players, roster: "probe" } },
          log: [],
        };
        localStorage.setItem(`the99.tracker.${table}`, JSON.stringify({ v: 1, game, expiresAt: Date.now() + 3_600_000 }));
      },
      { table: S4, layout: s.layout, players: PLAYERS },
    );
    await page.reload({ waitUntil: "networkidle" });
    const angle = await page.evaluate(() => screen.orientation.angle);
    if (angle !== s.angle) throw new Error(`${s.name}: the orientation stub did not take (angle ${angle}, wanted ${s.angle})`);
    try {
      await page.getByTestId("tracker-play").waitFor({ timeout: 20_000 });
    } catch (error) {
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${s.name}-no-game.png` });
      throw new Error(`${s.name}: the saved game did not resume at ${page.url()} (is the fixture's S4 seeded, with the audit account seated?)`, { cause: error });
    }
    await page.waitForFunction(() => [...document.querySelectorAll("[data-testid=panel-art] img")].length === 4 && [...document.querySelectorAll("[data-testid=panel-art] img")].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30_000 });
    await page.waitForTimeout(800);
    const positions = await page.$$eval("[data-testid=panel-art] img", (imgs) => imgs.map((i) => getComputedStyle(i).objectPosition));
    check(`${s.name}: every panel's art is pinned to its top`, positions.length === 4 && positions.every((p) => p === "50% 0%"), positions.join(", "));
    if (SHOTS) {
      // The fixture seats the account at every table, so the seat notices stack over the right seat; they are not the art.
      await page.addStyleTag({ content: "[data-seat-notice-stack]{display:none !important}" });
      for (const v of VARIANTS) {
        const handle = v.css ? await page.addStyleTag({ content: v.css }) : null;
        await page.waitForTimeout(150);
        await page.screenshot({ path: `${SHOTS}/${s.name}-${v.name}.png` });
        if (handle) await handle.evaluate((el) => el.remove());
      }
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
