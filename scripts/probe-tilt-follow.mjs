// The card tilt follows the pointer, and a foil card's band plays once on open (foil R2 PR 2, #1833; #1856; Hugh's
// decisions of 2026-10-15), in card details AND the zoom, at 1300x900, and on the phone's details at 390x844.
//
// What a browser proves and the component tests cannot: what the registered `--tilt-*` values DRAW frame by frame.
// jsdom runs no transition, so `card-tilt.test.tsx` can only say which attributes and inline targets are written. Here,
// a real mouse moves one step per animation frame, and every frame the page reads the computed (animated) `--tilt-*`
// beside the inline target the handler wrote:
//
// - Details: the FIRST frame after the pointer's first move already draws at its target (no ease on the way in), and
//   every frame of a sweep after it does too. Before #1856 the card trailed a restarted transition by about 67ms;
//   after it, a 300ms ease on the way in still held the first frames back.
// - Leaving still settles flat over time, not at once.
// - The zoom tilts on hover for a mouse, as details does, and its foil wash moves with it.
// - A foil card plays one band when details opens, on desktop and on the phone; a card that is not foil draws no film
//   and so no band.
// - Under reduced motion a hover tilts nothing.
//
// Run by hand with the dev server up (it writes nothing):
//   PROBE_FOIL_CARD="<a foil card the account owns>" PROBE_CARD="<a nonfoil one>" node scripts/probe-tilt-follow.mjs
// PROBE_SHOTS=<dir> also saves the foil card's details at both widths.
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
const FOIL = process.env.PROBE_FOIL_CARD;
const PLAIN = process.env.PROBE_CARD;
if (!FOIL || !PLAIN) throw new Error("Set PROBE_FOIL_CARD and PROBE_CARD to a foil and a nonfoil card the account owns.");
const SHOTS = process.env.PROBE_SHOTS;

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

async function openCard(page, CARD, host = "modal-art-desktop-tilt") {
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
  await dialog(page, `[data-testid="${host}"]`).waitFor({ state: "visible", timeout: 30_000 });
}

/** Starts a per-frame log on the host: the drawn values beside the inline targets, and whether it is tilting. */
const startLog = (page, testid) => page.evaluate((id) => {
  const host = [...document.querySelectorAll(`[data-testid="${id}"]`)].find((n) => n.getBoundingClientRect().width > 0);
  window.__tilt = [];
  window.__tiltStop = false;
  const tick = () => {
    const c = getComputedStyle(host);
    window.__tilt.push({
      x: +c.getPropertyValue("--tilt-x"), y: +c.getPropertyValue("--tilt-y"), lift: +c.getPropertyValue("--tilt-lift"),
      tx: host.style.getPropertyValue("--tilt-x"), ty: host.style.getPropertyValue("--tilt-y"),
      tilting: host.hasAttribute("data-tilting"),
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
  // The first frame the host is tilting: what it draws there is the whole question of "no ease on the way in".
  const entry = (await page.evaluate(() => window.__tilt.slice())).find((r) => r.tilting);
  const mark = await page.evaluate(() => window.__tilt.length);
  for (let i = 1; i <= 30; i++) { await page.mouse.move(...at(0.9, 0.1 + 0.8 * (i / 30))); await frame(page); }
  const rows = (await readLog(page)).slice(mark);
  return { entry, rows };
}

await clerkSetup();
const browser = await chromium.launch();
const signedIn = await browser.newContext({ viewport: { width: 1300, height: 900 } });
const page = await signedIn.newPage();
await signIn(page);

/** The band on a details film: the animation the film span itself runs (its background travels). It plays once the
    film's art has arrived (`in`, or `done` when cached), so that is waited for, when there is a film at all. */
const bandOf = async (page, host) => {
  await page.waitForFunction((id) => {
    const film = [...document.querySelectorAll(`[data-testid="${id}"] [data-foil]`)].find((n) => n.getBoundingClientRect().width > 0);
    return !film || film.dataset.arrival === "in" || film.dataset.arrival === "done";
  }, host, { timeout: 10_000 }).catch(() => {});
  return readBand(page, host);
};
const readBand = (page, host) => page.evaluate((id) => {
  const film = [...document.querySelectorAll(`[data-testid="${id}"] [data-foil]`)].find((n) => n.getBoundingClientRect().width > 0);
  if (!film) return null;
  const c = getComputedStyle(film);
  return { finish: film.dataset.foil, name: c.animationName, delay: c.animationDelay, duration: c.animationDuration, count: c.animationIterationCount };
}, host);

await openCard(page, PLAIN);
console.log("── a nonfoil card's details, 1300 ──");
{
  const band = await bandOf(page, "modal-art-desktop-tilt");
  check("draws no film, so plays no band", band === null, band);
}
await openCard(page, FOIL);
console.log("── a foil card's details, 1300 ──");
{
  const band = await bandOf(page, "modal-art-desktop-tilt");
  check("plays one band on open, on desktop too, after the card's entry", band?.name === "foil-band" && band.count === "1" && band.delay === "0.32s" && band.duration === "0.96s", band);
  if (SHOTS) { await page.waitForTimeout(1500); await page.screenshot({ path: `${SHOTS}/details-1300.png` }); }
  const { entry, rows } = await sweep(page, "modal-art-desktop-tilt");
  check("the first tilting frame already draws at the target (no ease on the way in)", entry && Math.abs(entry.x - +entry.tx) <= 0.002 && Math.abs(entry.y - +entry.ty) <= 0.002, entry);
  const moving = rows.filter((r) => r.ty !== "");
  const worst = Math.max(...moving.map((r) => Math.abs(r.y - +r.ty)));
  check("every frame of the sweep draws where the pointer is (within .002)", moving.length >= 20 && worst <= 0.002, { frames: moving.length, worst });
  await page.mouse.move(5, 5);
  await page.waitForTimeout(150);
  const leaving = await dialog(page, '[data-testid="modal-art-desktop-tilt"]').evaluate((h) => ({ tilting: h.hasAttribute("data-tilting"), y: +getComputedStyle(h).getPropertyValue("--tilt-y") }));
  check("leaving settles over time, not at once", !leaving.tilting && leaving.y > 0.52, leaving);
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
  console.log(`     (the zoom's film transform: ${film})`);
  check("the foil wash moves with the tilt", film !== null && film !== "none" && film !== "matrix(1, 0, 0, 1, 0, 0)", film);
}
if (SHOTS) {
  // The tile film, beside a nonfoil tile, for the PR's before and after.
  await page.goto(`${BASE}/collection?view=grid&q=${encodeURIComponent(FOIL.split(" ")[0])}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/tiles-1300.png` });
}
await signedIn.close();

console.log("── a foil card's details, 390 ──");
{
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await phone.newPage();
  await signIn(p);
  await openCard(p, FOIL, "modal-art-mobile-tilt");
  const band = await bandOf(p, "modal-art-mobile-tilt");
  check("plays one band on open", band?.name === "foil-band" && band.count === "1" && band.delay === "0.32s", band);
  if (SHOTS) { await p.waitForTimeout(1500); await p.screenshot({ path: `${SHOTS}/details-390.png` }); }
  if (SHOTS) {
    await p.goto(`${BASE}/collection?view=grid&q=${encodeURIComponent(FOIL.split(" ")[0])}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${SHOTS}/tiles-390.png` });
  }
  await phone.close();
}

console.log("── reduced motion ──");
{
  const reduced = await browser.newContext({ viewport: { width: 1300, height: 900 }, reducedMotion: "reduce" });
  const p = await reduced.newPage();
  await signIn(p);
  await openCard(p, FOIL);
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
