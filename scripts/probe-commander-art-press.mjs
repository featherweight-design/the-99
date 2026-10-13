// probe:commander-art-press — a press anywhere on the phone deck header's art opens the commander.
//
// Hugh, 2026-10-13: on the deck page, pressing anywhere on the commander image should open its
// card details. At 390 this presses the art at points across the band, above the label block and
// behind and beside its words (the block lets presses through), avoiding the corner door, and
// checks each opens the commander's card details; then that the rename pencil still opens the
// editor and not the card, and that the art takes no press while editing. At 1300 it checks the
// desktop header has no band press at all, unchanged.
//
//   PROBE_BASE=http://localhost:3073 PROBE_DECK_ID=<id> node scripts/probe-commander-art-press.mjs
//
// The deck must have commander art. Writes only the probe account's About row, and restores it.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

// It writes the probe account's About row, so it runs only against a local server and a database
// no other reader uses, judged by the branch the database reports rather than by its URL.
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname)) throw new Error(`PROBE_BASE must be a local server, not ${BASE}.`);
const [{ branch }] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
if (!branch || branch === PRODUCTION || branch === STAGING) throw new Error(`Refusing branch ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev or a scratch branch.`);
const DECK = process.env.PROBE_DECK_ID;
if (!DECK) throw new Error("Set PROBE_DECK_ID to a deck the probe account owns.");

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

const modalOpen = (page) => page.locator("#card-modal-title").isVisible().catch(() => false);

async function closeModal(page) {
  await page.keyboard.press("Escape");
  await page.locator("#card-modal-title").waitFor({ state: "detached", timeout: 30_000 });
}

/** A point on row `y` inside `block` where the art itself takes the press: the band's layer is
    what the browser finds there, not a chip, the pencil or the door. Null if the row has none. */
async function freeIn(page, y, block) {
  return page.evaluate(([y, x0, w]) => {
    for (let x = x0 + w - 4; x > x0 + 4; x -= 8) {
      if (document.elementFromPoint(x, y)?.hasAttribute("data-band-tap-target")) return [x, y];
    }
    return null;
  }, [y, block.x, block.width]);
}

/** Presses a point in the page and reports whether the card details opened on the commander. */
async function pressOpens(page, x, y, commanderName) {
  await page.mouse.click(x, y);
  const opened = await page
    .locator("#card-modal-title")
    .waitFor({ timeout: 5_000 })
    .then(() => true, () => false);
  if (!opened) return { opened: false };
  const title = (await page.locator("#card-modal-title").innerText()).trim();
  await closeModal(page);
  return { opened: true, title, isCommander: title === commanderName };
}

await clerkSetup();
const browser = await chromium.launch();
let aboutCapture = null;
try {
  const auth = await browser.newContext();
  const userId = await signIn(await auth.newPage());
  const state = await auth.storageState();
  await auth.close();
  aboutCapture = await captureAboutSeen(userId);

  const phone = await browser.newContext({ storageState: state, viewport: { width: 390, height: 844 } });
  const page = await phone.newPage();
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await clearAboutSheet(page, userId);
  const band = onPage(page, "[data-testid=spine-band]").first();
  await band.waitFor({ timeout: 60_000 });
  // The commander's name, read off the door's own press, so every later press is judged against it.
  await onPage(page, "[data-testid=spine-band] button[aria-label='View card details']").first().click();
  await page.locator("#card-modal-title").waitFor({ timeout: 30_000 });
  const commanderName = (await page.locator("#card-modal-title").innerText()).trim();
  await closeModal(page);
  ok(`phone: the door opens ${commanderName}`);

  const box = await band.boundingBox();
  const block = await onPage(page, "[data-testid=spine-band] [data-wash-label]").first().boundingBox();
  const title = await onPage(page, "[data-testid=spine-band] h1").first().boundingBox();
  // The corner door is its own control (the swap sheet and the card), so no point lands on it.
  const door = await onPage(page, "[data-testid=spine-band] [data-testid=change-commander-door]").first().boundingBox().catch(() => null);
  // Nor on the rename pencil, whose 44px target reaches past the title's last word.
  const pencil = await onPage(page, "[data-wash-label] h1 ~ span button").first().boundingBox();
  const onPencil = ([x, y]) => x >= pencil.x - 4 && x <= pencil.x + pencil.width + 4 && y >= pencil.y - 4 && y <= pencil.y + pencil.height + 4;
  const onDoor = ([x, y]) => door && x >= door.x - 4 && x <= door.x + door.width + 4 && y >= door.y - 4 && y <= door.y + door.height + 4;
  const points = [
    // Across the art above the block: both sides and the middle, near the top and just above it.
    ...[0.08, 0.5, 0.92].flatMap((fx) => [box.y + 16, block.y - 8].map((y) => [box.x + fx * box.width, y])),
    // Behind the words and beside them: the title itself, the art right of a short title, and the
    // block's foot, all inside the block's own box.
    [title.x + 4, title.y + title.height / 2],
    ...(await Promise.all(
      [["beside the title", title.y + title.height / 2], ["in the block's foot", block.y + block.height - 4]].map(
        async ([where, y]) => {
          const pt = await freeIn(page, y, block);
          // A row with no point the art answers is the block swallowing presses: that is the failure.
          if (!pt) fail(`phone: no point ${where} reaches the art; the block takes every press there`);
          return pt;
        },
      ),
    )),
  ].filter((pt) => pt && !onDoor(pt) && !onPencil(pt));
  const before = failures;
  for (const [x, y] of points) {
    const hit = await page.evaluate(([px, py]) => {
      const el = document.elementFromPoint(px, py);
      return el ? `${el.tagName.toLowerCase()}${el.getAttribute("aria-label") ? `[${el.getAttribute("aria-label")}]` : ""}.${String(el.className).slice(0, 40)}` : "nothing";
    }, [x, y]);
    const r = await pressOpens(page, x, y, commanderName);
    if (!r.opened) fail(`phone: a press at (${Math.round(x - box.x)}, ${Math.round(y - box.y)}) on the band opened nothing (it hit ${hit})`);
    else if (!r.isCommander) fail(`phone: a press on the art opened ${r.title}, not ${commanderName}`);
  }
  if (failures === before) ok(`phone: ${points.length} presses across the art, behind and beside the words, each open ${commanderName}`);

  // The pencil still opens the rename editor, and the art's press is gone while editing.
  await onPage(page, "[data-wash-label] h1 ~ span button").first().click();
  const editing = await onPage(page, "[data-wash-label] input").first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
  if (!editing) fail("phone: the pencil no longer opens the rename editor");
  else if (await modalOpen(page)) fail("phone: the pencil opened the card details");
  else ok("phone: the pencil still opens the rename editor");
  const whileEditing = await onPage(page, "[data-testid=spine-band] [data-band-tap-target]").count();
  if (whileEditing) fail("phone: the art still takes a press while the rename editor is open");
  else ok("phone: no art press while renaming");
  await phone.close();

  const desk = await browser.newContext({ storageState: state, viewport: { width: 1300, height: 900 } });
  const dpage = await desk.newPage();
  await dpage.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await clearAboutSheet(dpage, userId);
  const spine = onPage(dpage, "[data-deck-spine-desktop]").first();
  await spine.waitFor({ timeout: 60_000 });
  const deskTargets = await spine.locator("[data-band-tap-target]").count();
  if (deskTargets) fail(`desktop: the header carries ${deskTargets} art presses; it should carry none, as before`);
  else ok("desktop: unchanged, no art press on the header");
  await desk.close();
} finally {
  try {
    if (aboutCapture) await restoreAboutSeen(aboutCapture);
  } finally {
    await browser.close();
  }
}
console.log(failures ? `\n${failures} failure(s)` : "\nall checks passed");
process.exit(failures ? 1 : 0);
