// probe:deck-hero-wash — the phone deck header's ramp follows its label block.
//
// The ramp was keyed to a stated ceiling: 143px, or 224px for any deck with an intent line (four
// intent lines). A typical deck's block is 120-160px, so the ceiling held the scrim from 64px down
// and darkened the commander's face (Hugh, 2026-10-13). The block now draws its own ramp
// (`BlockScrim`), so this measures, on a real page at 390:
//
//   - the ramp HOLDS at the block's top, within a pixel: ink never stands on a rising ramp;
//   - the ramp STARTS 1.48 blocks from the foot, no higher: the art above it is untouched;
//   - the band paints no ramp of its own, so two ramps never stack;
//   - the rename editor, which grows the block, grows the ramp with it.
//
// At 1300 it checks the desktop header is unchanged: each band draws its own scrim, none a block's.
//
//   PROBE_BASE=http://localhost:3071 PROBE_DECK_IDS=<id>,<id> node scripts/probe-deck-hero-wash.mjs
//
// Writes only the probe account's About row, and restores it. Pass at least one deck with an intent line: that is the case the ceiling broke.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECKS = (process.env.PROBE_DECK_IDS ?? "").split(",").filter(Boolean);
const SHOTS = process.env.PROBE_SHOTS;
if (!DECKS.length) throw new Error("Set PROBE_DECK_IDS to one or more deck ids, one with an intent line.");

let failures = 0;
const fail = (m) => {
  failures++;
  console.log(`  FAIL ${m}`);
};
const ok = (m) => console.log(`  ok   ${m}`);

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
  return page.evaluate(() => window.Clerk.user.id);
}

/** The phone header's band, block and the block's ramp, as laid out. */
const READ_PHONE = (band) => {
  const box = band.getBoundingClientRect();
  const wash = band.querySelector("[data-art-wash-band]");
  const block = band.querySelector("[data-wash-label]");
  const scrim = block?.querySelector("[data-block-scrim]");
  const s = scrim?.getBoundingClientRect();
  const b = block?.getBoundingClientRect();
  const image = scrim ? getComputedStyle(scrim).backgroundImage : "";
  const stops = [...image.matchAll(/\/\s*([\d.]+)\)\s+([-\d.]+)%/g)].map((m) => [Number(m[1]), Number(m[2])]);
  return {
    band: box.height,
    labelAt: wash?.getAttribute("data-art-wash-label-at"),
    bandScrims: wash ? wash.querySelectorAll(".art-wash-scrim").length : -1,
    blockFromFoot: b ? box.bottom - b.top : null,
    rampStartFromFoot: s ? box.bottom - s.top : null,
    rampFoot: s ? box.bottom - s.bottom : null,
    holdFromFoot: s && stops.length === 4 ? box.bottom - (s.top + (stops[2][1] / 100) * s.height) : null,
    holdAlpha: stops.length === 4 ? stops[2][0] : null,
    bandWidth: box.width,
    scrimWidth: s?.width ?? null,
  };
};

function checkPhone(name, m) {
  if (m.labelAt !== "block") return fail(`${name}: the band says label-at ${m.labelAt}, not block`);
  if (m.bandScrims !== 0) return fail(`${name}: the band paints ${m.bandScrims} ramps of its own beside the block's`);
  if (m.holdFromFoot === null) return fail(`${name}: the block draws no ramp`);
  if (Math.abs(m.holdFromFoot - m.blockFromFoot) > 1)
    fail(`${name}: the ramp holds ${m.holdFromFoot.toFixed(1)}px off the foot, the block starts ${m.blockFromFoot.toFixed(1)}px`);
  else ok(`${name}: holds at the block's top (${m.blockFromFoot.toFixed(1)}px off the foot of ${m.band})`);
  if (m.holdAlpha < 0.72) fail(`${name}: holds at ${m.holdAlpha}, under the measured 0.73`);
  const want = 1.48 * m.blockFromFoot;
  if (Math.abs(m.rampStartFromFoot - want) > 1.5)
    fail(`${name}: the ramp starts ${m.rampStartFromFoot.toFixed(1)}px off the foot, expected ${want.toFixed(1)}`);
  else ok(`${name}: the ramp starts ${(m.band - m.rampStartFromFoot).toFixed(0)}px below the band's top; the art above it is clear`);
  if (Math.abs(m.rampFoot) > 0.5) fail(`${name}: the ramp stops ${m.rampFoot.toFixed(1)}px short of the foot`);
  if (Math.abs(m.scrimWidth - m.bandWidth) > 0.5) fail(`${name}: the ramp is ${m.scrimWidth}px wide on a ${m.bandWidth}px band`);
}

await clerkSetup();
const browser = await chromium.launch();
let aboutCapture = null;
// The intent case is the one the old ceiling broke, so a run that never meets it proves nothing.
let intentDecks = 0;
try {
  const auth = await browser.newContext();
  const userId = await signIn(await auth.newPage());
  const state = await auth.storageState();
  await auth.close();
  // The sheet is cleared by marking every entry seen, a write to the probe account's own row;
  // it is put back as it was found.
  aboutCapture = await captureAboutSeen(userId);

  for (const id of DECKS) {
    console.log(`deck ${id}`);
    const phone = await browser.newContext({ storageState: state, viewport: { width: 390, height: 844 } });
    const page = await phone.newPage();
    await page.goto(`${BASE}/decks/${id}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await clearAboutSheet(page, userId);
    const band = onPage(page, "[data-testid=spine-band]").first();
    await band.waitFor({ timeout: 60_000 });
    const hasIntent = (await onPage(page, "[data-wash-label] [data-deck-intent]").count()) > 0;
    if (hasIntent) intentDecks++;
    const m = await band.evaluate(READ_PHONE);
    checkPhone(hasIntent ? "phone, with an intent line" : "phone", m);
    if (SHOTS) await band.screenshot({ path: `${SHOTS}/${id}-phone.png` });

    // The rename editor is the tallest block this header draws; the ramp has to follow it up.
    const pencil = onPage(page, "[data-wash-label] h1 ~ span button").first();
    if (await pencil.count()) {
      await pencil.click();
      await onPage(page, "[data-wash-label] input").first().waitFor();
      const editing = await band.evaluate(READ_PHONE);
      if (editing.blockFromFoot <= m.blockFromFoot) fail("editing: the block did not grow, so this measured nothing");
      else checkPhone("phone, renaming", editing);
    } else fail("no rename control on the phone header, so the editing block went unmeasured");
    await phone.close();

    const desk = await browser.newContext({ storageState: state, viewport: { width: 1300, height: 900 } });
    const dpage = await desk.newPage();
    await dpage.goto(`${BASE}/decks/${id}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await clearAboutSheet(dpage, userId);
    const spine = onPage(dpage, "[data-deck-spine-desktop]").first();
    await spine.waitFor({ timeout: 60_000 });
    const d = await spine.evaluate((el) => ({
      bands: [...el.querySelectorAll("[data-art-wash-band]")].map((w) => ({
        labelAt: w.getAttribute("data-art-wash-label-at"),
        scrims: w.querySelectorAll(".art-wash-scrim").length,
      })),
      blockScrims: el.querySelectorAll("[data-block-scrim]").length,
    }));
    // The desktop header is untouched: its bands still draw their own scrims, none hands the ramp
    // to a block, and no block draws one.
    if (!d.bands.length) fail("desktop: the header draws no wash band, so nothing was checked");
    else if (d.blockScrims) fail(`desktop: ${d.blockScrims} block ramps on the desktop header`);
    else if (d.bands.some((b) => b.labelAt === "block" || b.scrims === 0))
      fail(`desktop: a band lost its own scrim or hands it to a block: ${JSON.stringify(d.bands)}`);
    else ok(`desktop: unchanged, ${d.bands.length} bands each drawing their own scrim, no block ramp`);
    await desk.close();
  }
} finally {
  // The database write is undone first, so a browser that fails to close cannot strand it.
  try {
    if (aboutCapture) await restoreAboutSeen(aboutCapture);
  } finally {
    await browser.close();
  }
}
if (!intentDecks) fail("no deck passed has an intent line, so the case the old ceiling broke went unmeasured");
console.log(failures ? `\n${failures} failure(s)` : "\nall checks passed");
process.exit(failures ? 1 : 0);
