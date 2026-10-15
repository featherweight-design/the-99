// The card tilt follows the pointer (foil R2 PR 2, #1833; the lag fix), in card details AND the zoom, at 1300x900.
//
// What a browser proves and the component tests cannot: what the registered `--tilt-*` values DRAW frame by frame.
// jsdom runs no transition, so `card-tilt.test.tsx` can only say which attributes and inline targets are written. Here,
// a real mouse moves one step per animation frame, and every frame the page reads the computed (animated) `--tilt-y`
// beside the inline target the handler wrote:
//
// - Details: after the lift has settled the host carries `data-tilt-follow`, and the drawn value IS the target on
//   every frame of a sweep. Before the fix it trailed a restarted transition by about 67ms (8 frames at 120Hz).
// - The way in still eases (the first frame after entering is short of the target), and leaving still settles flat.
// - The zoom tilts on hover for a mouse, as details does. It used to tilt only on a press that moved, which no mouse
//   reader makes, so desktop drew neither the tilt nor the film's drift there.
// - Under reduced motion a hover tilts nothing.
//
// Run by hand with the dev server up (it writes nothing):
//   PROBE_CARD="<card the account owns>" node scripts/probe-tilt-follow.mjs
// PROBE_CARD can be any card the account owns. Name one whose drawn printing is foil to also see the zoom's film drift;
// on any other card that check says so and is skipped.
// Not part of `pnpm test`: it needs a browser and a signed-in session.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPageRole } from "./lib/surface.mjs";

// Card details is a dialog portalled OUTSIDE `<main>`, so its parts are reached by test id on the document, which no
// shell control carries. Only the Collection row that opens it is page content (`onPageRole`).
const dialog = (page, selector) => page.locator(selector);

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const CARD = process.env.PROBE_CARD;
if (!CARD) throw new Error("Set PROBE_CARD to a card the account owns.");

let fails = 0;
const check = (name, ok, got) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` (got ${JSON.stringify(got)})`}`);
  if (!ok) fails += 1;
};

// Lifted from `scripts/probe-card-detail-price.mjs`, which documents why `window.Clerk` is the way in.
async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test")
          ? await signIn.create({ identifier: email })
          : await signIn.create({ identifier: email, password });
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
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

async function openCard(page) {
  await page.goto(`${BASE}/collection?view=rows&q=${encodeURIComponent(CARD)}`, { waitUntil: "domcontentloaded" });
  // A row's accessible name opens with the card's name and a comma.
  const pattern = new RegExp(`^${CARD.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},`);
  const row = onPageRole(page, "button", pattern).first();
  // Pressed up to three times: a first click on a cold dev server can land before hydration.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await row.click();
    if (await page.waitForSelector('[role="dialog"]', { timeout: 10_000 }).then(() => true).catch(() => false)) break;
    if (attempt === 2) throw new Error(`the modal never opened for ${CARD}`);
  }
  await dialog(page, '[data-testid="modal-art-desktop-tilt"]').waitFor({ state: "visible", timeout: 30_000 });
}

/** Starts a per-frame log on the host: the drawn values beside the inline targets and the follow mark. */
const startLog = (page, testid) => page.evaluate((id) => {
  const host = [...document.querySelectorAll(`[data-testid="${id}"]`)].find((n) => n.getBoundingClientRect().width > 0);
  window.__tilt = [];
  window.__tiltStop = false;
  const tick = () => {
    const c = getComputedStyle(host);
    window.__tilt.push({
      x: +c.getPropertyValue("--tilt-x"), y: +c.getPropertyValue("--tilt-y"), lift: +c.getPropertyValue("--tilt-lift"),
      tx: host.style.getPropertyValue("--tilt-x"), ty: host.style.getPropertyValue("--tilt-y"),
      follow: host.hasAttribute("data-tilt-follow"), tilting: host.hasAttribute("data-tilting"),
    });
    if (!window.__tiltStop) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}, testid);
const readLog = (page) => page.evaluate(() => { window.__tiltStop = true; return window.__tilt; });
const frame = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
const boxOf = async (page, testid) => dialog(page, `[data-testid="${testid}"]`).boundingBox();

async function sweep(page, testid) {
  const box = await boxOf(page, testid);
  const at = (fx, fy) => [box.x + fx * box.width, box.y + fy * box.height];
  await page.mouse.move(5, 5);
  await page.waitForTimeout(800);
  await startLog(page, testid);
  await page.mouse.move(...at(0.9, 0.1));
  for (let i = 0; i < 3; i++) await frame(page);
  const entry = (await page.evaluate(() => window.__tilt.slice())).find((r) => r.tilting);
  await page.waitForTimeout(450);
  // Past the settle: a mark-setting move, then one move a frame down the right edge.
  await page.mouse.move(...at(0.9, 0.12));
  await frame(page);
  const mark = await page.evaluate(() => window.__tilt.length);
  for (let i = 1; i <= 30; i++) { await page.mouse.move(...at(0.9, 0.12 + 0.76 * (i / 30))); await frame(page); }
  const rows = (await readLog(page)).slice(mark);
  return { entry, rows };
}

await clerkSetup();
const browser = await chromium.launch();
const signedIn = await browser.newContext({ viewport: { width: 1300, height: 900 } });
const page = await signedIn.newPage();
await signIn(page);
await openCard(page);

console.log("── details, 1300 ──");
{
  const { entry, rows } = await sweep(page, "modal-art-desktop-tilt");
  check("the way in still eases: the first tilting frame draws short of the target", entry && Math.abs(entry.x - +entry.tx) > 0.02, entry);
  const moving = rows.filter((r) => r.ty !== "");
  check("the host is marked to follow once the lift has settled", moving.length > 0 && moving.every((r) => r.follow), moving.find((r) => !r.follow));
  const worst = Math.max(...moving.map((r) => Math.abs(r.y - +r.ty)));
  check("every frame of the sweep draws where the pointer is (within .002)", moving.length >= 20 && worst <= 0.002, { frames: moving.length, worst });
  await page.mouse.move(5, 5);
  await page.waitForTimeout(150);
  const leaving = await dialog(page, '[data-testid="modal-art-desktop-tilt"]').evaluate((h) => ({ follow: h.hasAttribute("data-tilt-follow"), y: +getComputedStyle(h).getPropertyValue("--tilt-y") }));
  check("leaving takes the mark off and settles over time, not at once", !leaving.follow && leaving.y > 0.52, leaving);
  await page.waitForTimeout(900);
  const flat = await dialog(page, '[data-testid="modal-art-desktop-tilt"]').evaluate((h) => +getComputedStyle(h).getPropertyValue("--tilt-y"));
  check("and lands flat", Math.abs(flat - 0.5) < 0.005, flat);
}

console.log("── zoom, 1300 ──");
{
  await page.getByRole("button", { name: /^Look at / }).first().click();
  await dialog(page, '[data-testid="card-zoom-tilt"]').waitFor({ state: "visible", timeout: 5_000 });
  await page.waitForTimeout(500);
  const { rows } = await sweep(page, "card-zoom-tilt");
  check("a mouse hover tilts the zoom", rows.length > 0 && rows.every((r) => r.tilting) && rows.at(-1).lift > 0.95, rows.at(-1));
  // Over frames that carried a target: an empty set would read as a perfect follow.
  const written = rows.filter((r) => r.ty !== "");
  const worst = Math.max(...written.map((r) => Math.abs(r.y - +r.ty)));
  check("and it follows the pointer too", written.length >= 20 && worst <= 0.002, { frames: written.length, worst });
  const film = await dialog(page, '[data-testid="card-zoom-tilt"] [data-foil-size="large"]').first()
    .evaluate((f) => getComputedStyle(f, "::before").transform).catch(() => null);
  console.log(`     (the zoom's film transform: ${film ?? "no film on this printing"})`);
  if (film) check("a foil film drifts with the tilt", film !== "none" && film !== "matrix(1, 0, 0, 1, 0, 0)", film);
}
await signedIn.close();

console.log("── reduced motion ──");
{
  const reduced = await browser.newContext({ viewport: { width: 1300, height: 900 }, reducedMotion: "reduce" });
  const p = await reduced.newPage();
  await signIn(p);
  await openCard(p);
  const box = await boxOf(p, "modal-art-desktop-tilt");
  await p.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
  await p.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.5);
  const state = await dialog(p, '[data-testid="modal-art-desktop-tilt"]').evaluate((h) => ({ tilting: h.hasAttribute("data-tilting"), transform: getComputedStyle(h).transform }));
  check("a hover tilts nothing", !state.tilting && state.transform === "none", state);
  await reduced.close();
}
await browser.close();
console.log(fails ? `\n${fails} failed` : "\nall passed");
process.exitCode = fails ? 1 : 0;
