// The life tracker's coin toss (tablet addendum, 2026-11-22, board Coin): the coin gets an edge and is tossed end over
// end, toward you and back down, then rattles flat and a ring lands under it; the result still shows at 1150 ms. It plays
// a saved four-seat game on the fixture's S4 table, presses the strip's dice button and its "Flip a coin" item, and
// samples the toss mid-air and at rest on a tablet (1180x820, 820x1180) and a phone (390x844):
//   - mid-toss (~380 ms) the coin turns about its width (a rotateX: its x axis stays in the screen plane) and the arc has lifted
//     it toward you (scale over 1.3) and up off its rest;
//   - the coin has seven rim discs and a shadow, and is 120px on a tablet and 72px on a phone;
//   - the result card shows by about 1150 ms, with the coin back at rest on its face;
//   - under reduced motion nothing animates and the result shows at once.
// On main the coin spins flat about its height (rotateY), has no rim, arc or shadow and is 72px everywhere.
// Writes only the device's saved game (localStorage). Needs the fixture seeded on a scratch branch (docs/probes.md) and
// the dev server started with INVITE_CODE_SECRET set, or the roster cannot seal and the play route answers not found.
//
//   PROBE_BASE=http://localhost:3471 node scripts/probe-tracker-coin.mjs
// Optional: SHOTS=<dir>.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");
const SHOTS = process.env.SHOTS;
const S4 = "7a0e0000-0000-4000-8000-000000000013";

const player = (seat, name) => ({ seat, you: seat === 0, name, art: null, partnerArt: null, commander: "", partner: null, deck: null });
const PLAYERS = [player(0, "Hugh"), player(1, "Ana"), player(2, "Colin"), player(3, "Dee")];

const SCREENS = [
  { name: "tablet-landscape", viewport: { width: 1180, height: 820 }, layout: "tablet-4-around", angle: 0, size: 120 },
  { name: "tablet-portrait", viewport: { width: 820, height: 1180 }, layout: "tablet-4-around", angle: 90, size: 120 },
  { name: "desktop-1300", viewport: { width: 1300, height: 900 }, layout: "tablet-4-around", angle: 0, size: 120 },
  { name: "phone-390", viewport: { width: 390, height: 844 }, layout: "phone-4-around", angle: 0, size: 72 },
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
        config: { tableId: table, startingLife: 40, seats: players.map((p) => ({ seat: p.seat, commanders: 1 })), first: 0, layout, startedAt: Date.now(), snapshot: { players, roster: "probe" } },
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
  // The fixture seats the account at every table, so its seat notices stack over the phone's strip; they are not the coin.
  await page.addStyleTag({ content: "[data-seat-notice-stack]{display:none !important}" });
  return { context, page };
}

// Press the strip's dice button and its coin item, as a player does.
async function flip(page) {
  await page.getByTestId("strip-dice").click();
  await page.getByRole("menuitem", { name: "Flip a coin" }).click();
  await page.getByTestId("dice-coin").waitFor({ timeout: 5_000 });
}

// The coin's state: its own transform (the turn), its parent's (the arc) and the box it draws in.
const sample = (page) =>
  page.evaluate(() => {
    const coin = document.querySelector("[data-testid=dice-coin]");
    const m = new DOMMatrix(getComputedStyle(coin).transform);
    const arc = coin.parentElement;
    const a = new DOMMatrix(getComputedStyle(arc).transform);
    const box = coin.closest("[style*=width]") ?? arc.parentElement;
    return {
      // The image of the coin's x axis stays in the screen plane (m13 0) only when it turns about its width (rotateX);
      // m33 is the turn's cosine either way, untouched by the tilt.
      m13: m.m13,
      m33: m.m33,
      arcScale: Math.hypot(a.a, a.b),
      arcY: a.f,
      size: box.getBoundingClientRect().width,
      rims: coin.querySelectorAll(".coin-rim").length,
      shadow: !!box.querySelector(".coin-shadow"),
      value: !!document.querySelector("[data-testid=dice-roll] [data-testid=dice-again]") && document.querySelector("[data-testid=dice-roll]").hasAttribute("data-landed"),
      running: document.getAnimations().filter((x) => x.playState === "running").length,
    };
  });

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const s of SCREENS) {
    const { context, page } = await openGame(browser, s, "no-preference");
    await flip(page);
    await page.waitForTimeout(380);
    const mid = await sample(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${s.name}-mid.png` });
    check(`${s.name}: mid-toss the coin turns end over end about its width`, Math.abs(mid.m33) < 0.97 && Math.abs(mid.m13) < 0.02, `m33 ${mid.m33.toFixed(2)}, m13 ${mid.m13.toFixed(2)}`);
    check(`${s.name}: mid-toss the arc lifts it toward you and up`, mid.arcScale > 1.3 && mid.arcY < -5, `scale ${mid.arcScale.toFixed(2)}, y ${mid.arcY.toFixed(1)}`);
    check(`${s.name}: the coin has an edge and a shadow, ${s.size}px`, mid.rims === 7 && mid.shadow && Math.round(mid.size) === s.size, `rims ${mid.rims}, shadow ${mid.shadow}, ${mid.size}px`);
    await page.waitForTimeout(1150 - 380 + 250);
    const rest = await sample(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${s.name}-rest.png` });
    check(`${s.name}: the result shows by 1150 ms, the coin flat on its face`, rest.value && Math.abs(rest.m33) > 0.98 && Math.abs(rest.arcScale - 1) < 0.02, `landed ${rest.value}, m33 ${rest.m33.toFixed(2)}, scale ${rest.arcScale.toFixed(2)}`);
    // Again, from the coin itself: a new toss from the start.
    await page.getByTestId("dice-coin").click();
    await page.waitForTimeout(380);
    const again = await sample(page);
    check(`${s.name}: a tap on the coin tosses it again`, again.arcScale > 1.3 && !again.value, `scale ${again.arcScale.toFixed(2)}, landed ${again.value}`);
    await context.close();
  }
  // Reduced motion: no toss, the coin at rest on its face and the result at once.
  const s = SCREENS[0];
  const { context, page } = await openGame(browser, s, "reduce");
  await flip(page);
  await page.waitForTimeout(150);
  const still = await sample(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${s.name}-reduced.png` });
  check("reduced motion: no toss, the coin flat and the result at once", still.value && Math.abs(still.m33) > 0.98 && Math.abs(still.arcScale - 1) < 0.02, `landed ${still.value}, m33 ${still.m33.toFixed(2)}, scale ${still.arcScale.toFixed(2)}`);
  await context.close();
} finally {
  await browser.close();
}
if (failed) {
  console.log(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
