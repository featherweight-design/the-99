// The life tracker's pending loss figure (−N) is drawn over the seat's commander art, so its ink has to read on the
// pixels actually behind it, not only on the theme's flat grounds. This presses the real control (the minus half) on
// every seat of the fixture's four-seat S4 table at 390 and 1180x820, then:
//   1. reads the figure's computed ink and its rect;
//   2. hides the figure and screenshots that rect, so the pixels are the art, wash and panel behind the glyph;
//   3. computes the WCAG contrast of the ink against every pixel there (worst, 5th percentile, median, share under 4.5);
//   4. repeats with the old `--danger` ink forced, for the before figure on the same pixels.
// It asserts the shipped ink is `--critical-fg` (it fails on main, where the figure is `--danger`) and prints the
// measured contrast either way. With SHOTS=<dir> it writes the board with the figures showing, per width.
// The art crop's S4 table, so the same setup applies: the fixture seeded on a scratch branch (docs/probes.md) and the dev
// server started with INVITE_CODE_SECRET set. Writes only the device's saved game (localStorage).
//
//   PROBE_BASE=http://localhost:3102 SHOTS=/tmp/loss node scripts/probe-tracker-loss-ink.mjs
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
const PLAYERS = [
  player(0, "Hugh", ART.panther, "Black Panther, Wakandan King", "Wakanda Forever"),
  player(1, "Ana", ART.dogmeat, "Dogmeat, Ever Loyal", "Scrappy Survivors"),
  player(2, "Colin", ART.borg, "The Borg Queen", "We Are the Borg"),
  player(3, "Dee", ART.clavileno, "Clavileño, First of the Blessed", "Blood Rites"),
];
const SCREENS = [
  { name: "ipad-landscape", viewport: { width: 1180, height: 820 }, layout: "tablet-4-around", angle: 0 },
  { name: "phone-390", viewport: { width: 390, height: 844 }, layout: "phone-4-around", angle: 0 },
];
const TAPS = 3;

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

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

const stubAngle = (deg) => {
  Object.defineProperty(ScreenOrientation.prototype, "angle", { configurable: true, get: () => deg });
};

// In the page: decode a PNG clip and score its pixels against one ink, WCAG 2 relative luminance.
const scorePixels = ({ png, ink }) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, img.width, img.height);
      const lin = (v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const inkL = lum(...ink);
      const ratios = [];
      for (let i = 0; i < data.length; i += 4) {
        const l = lum(data[i], data[i + 1], data[i + 2]);
        ratios.push((Math.max(l, inkL) + 0.05) / (Math.min(l, inkL) + 0.05));
      }
      ratios.sort((a, b) => a - b);
      const at = (p) => ratios[Math.min(ratios.length - 1, Math.floor(p * ratios.length))];
      resolve({ n: ratios.length, min: ratios[0], p5: at(0.05), median: at(0.5), under: ratios.filter((r) => r < 4.5).length / ratios.length });
    };
    img.src = `data:image/png;base64,${png}`;
  });

const rgb = (css) => css.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);

await clerkSetup();
const browser = await chromium.launch();
const table = [];
try {
  for (const s of SCREENS) {
    const context = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: 1 });
    await context.addInitScript(stubAngle, s.angle);
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/friends/table/${S4}/play`, { waitUntil: "networkidle", timeout: 180_000 });
    await page.evaluate(
      ({ table: id, layout, players }) => {
        const game = {
          config: { tableId: id, startingLife: 40, seats: players.map((p) => ({ seat: p.seat, commanders: 1 })), first: 0, layout, startedAt: Date.now(), snapshot: { players, roster: "probe" } },
          log: [],
        };
        localStorage.setItem(`the99.tracker.${id}`, JSON.stringify({ v: 1, game, expiresAt: Date.now() + 3_600_000 }));
      },
      { table: S4, layout: s.layout, players: PLAYERS },
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("tracker-play").waitFor({ timeout: 20_000 });
    await page.evaluate(() => document.querySelector("[data-testid=first-roll] > button")?.click());
    await page.getByTestId("first-roll").waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
    await page.waitForFunction(() => [...document.querySelectorAll("[data-testid=panel-art] img")].length === 4 && [...document.querySelectorAll("[data-testid=panel-art] img")].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30_000 });
    await page.addStyleTag({ content: "[data-seat-notice-stack]{display:none !important}" });
    await page.waitForTimeout(600);

    const halves = page.getByTestId("half-minus");
    const count = await halves.count();
    check(`${s.name}: four seats draw a minus half`, count === 4, String(count));
    for (let seat = 0; seat < count; seat++) {
      for (let k = 0; k < TAPS; k++) await halves.nth(seat).click({ force: true, delay: 20 });
      await page.waitForTimeout(220);
      const pending = page.getByTestId("life-pending").nth(0);
      // The seat's own figure: the one whose panel holds this half.
      const info = await halves.nth(seat).evaluate((el) => {
        const panel = el.closest("[data-testid=panel-front]") ?? el.closest("[data-testid=tracker-panel]") ?? el.parentElement.parentElement;
        const n = panel.querySelector("[data-testid=life-pending]");
        if (!n) return null;
        const r = n.getBoundingClientRect();
        const cs = getComputedStyle(n);
        return { text: n.textContent, color: cs.color, rect: { x: r.x, y: r.y, width: r.width, height: r.height } };
      });
      if (!info) {
        check(`${s.name} seat ${seat}: the loss figure draws`, false, "no life-pending in the seat's panel");
        continue;
      }
      void pending;
      const clip = { x: Math.max(0, info.rect.x), y: Math.max(0, info.rect.y), width: Math.max(1, info.rect.width), height: Math.max(1, info.rect.height) };
      const hide = await page.addStyleTag({ content: "[data-testid=life-pending],[data-testid=life-pending-fade]{visibility:hidden !important}" });
      const behind = (await page.screenshot({ clip })).toString("base64");
      await hide.evaluate((el) => el.remove());
      const ink = await page.evaluate(() => {
        const probe = document.createElement("span");
        document.body.append(probe);
        const read = (name) => {
          probe.style.color = `var(${name})`;
          const value = getComputedStyle(probe).color;
          return value;
        };
        const out = { critical: read("--critical-fg"), danger: read("--danger") };
        probe.remove();
        return out;
      });
      const now = await page.evaluate(scorePixels, { png: behind, ink: rgb(info.color) });
      const old = await page.evaluate(scorePixels, { png: behind, ink: rgb(ink.danger) });
      const fmt = (m) => `min ${m.min.toFixed(2)} p5 ${m.p5.toFixed(2)} median ${m.median.toFixed(2)} under4.5 ${(m.under * 100).toFixed(0)}%`;
      console.log(`      ${s.name} seat ${seat} ${PLAYERS[seat].commander.split(",")[0]} ${info.text}  ink ${info.color}\n        before --danger   ${fmt(old)}\n        after  shipped    ${fmt(now)}`);
      table.push({ screen: s.name, seat, commander: PLAYERS[seat].commander.split(",")[0], before: old, after: now });
      check(`${s.name} seat ${seat}: the loss figure is --critical-fg`, info.color === ink.critical, `${info.color} vs ${ink.critical}`);
    }
    if (SHOTS) {
      // Every figure showing at once for the contact sheet: tap every seat, then shoot before the ink fades.
      for (let seat = 0; seat < count; seat++) for (let k = 0; k < TAPS; k++) await halves.nth(seat).click({ force: true, delay: 20 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${SHOTS}/${s.name}-loss.png` });
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log("\nJSON " + JSON.stringify(table));
if (failed) {
  console.log(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
