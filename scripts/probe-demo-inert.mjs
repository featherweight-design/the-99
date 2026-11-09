// probe:demo-inert: Try it's promise, "nothing you press is saved", checked in a real browser (public landing, 5l). Signed OUT, no
// account and no database access of its own: it loads the landing, starts the demo and, at each of the eight steps, presses every
// control inside the dummy app once (buttons, links, tabs, checkboxes), then Next. It records every network request the page
// makes and fails on:
//   - any non-GET request to this origin (a server action is a POST; a write is never a GET);
//   - any request to this origin whose path is outside the page, its static assets and its images (`/_next/`, `/__nextjs_font/`,
//     `/img/`, `/icons/`, `/fonts/`, `/mana/`, the favicon and manifest are allowed, as is a public commander page; every other
//     path is not, `/api/` included, as are `/decks`, `/collection`, `/commanders` and `/sign-in`);
//   - a main-frame navigation away from `/` other than to a public commander page, `/commander/<slug>`, which is a read and is
//     logged (a press must stay on the page otherwise: a link that leaves is a write to nothing, but it is
//     not Try it any more);
//   - a change to the cookies or to localStorage / sessionStorage between the start and the end.
// The launch form at the END is the one live control (it saves an email by design) and is never pressed. Pressing everything is
// the point: a control that wrote, or navigated, is a bug.
//
//   PROBE_BASE=http://localhost:3291 pnpm probe:demo-inert        (the server must serve the landing: PUBLIC_LANDING_ENABLED on, signed out)
import { chromium } from "playwright";

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const WIDTHS = [
  { label: 390, viewport: { width: 390, height: 844 } },
  { label: 1300, viewport: { width: 1300, height: 820 } },
];
/** Paths a read-only page may fetch from this origin besides the document: its own build output and images. */
const ALLOWED_PATH = /^\/(?:commander\/[^/]+$|_next\/|__nextjs_font\/|favicon|manifest|icons?\/|img\/|fonts?\/|mana\/)/;
/** Cookies and storage keys that belong to the host app's sign-in provider and the edge, not to the demo: they move on any page load. */
const HOST_STATE = /^(?:__clerk|__client_uat|__session|__cf_bm|_cfuvid|__refresh|clerk)/i;
const STEPS = 8;

let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error(`FAIL ${message}`);
};

const browser = await chromium.launch();
for (const { label, viewport } of WIDTHS) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const writes = [];
  const outside = [];
  let current = "load"; // the control being pressed now: every request is blamed on it
  const origin = new URL(BASE).origin;
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.origin !== origin) return;
    if (req.method() !== "GET") {
      // The dev server's own error-overlay call (`/__nextjs_original-stack-frames`) is not the page's request.
      if (!url.pathname.startsWith("/__nextjs_")) writes.push(`${req.method()} ${url.pathname} (${current})`);
    } else if (current !== "load" && url.pathname !== "/" && !ALLOWED_PATH.test(url.pathname)) outside.push(`GET ${url.pathname}${url.search ? "?..." : ""} (${current})`);
  });
  const runtimeErrors = [];
  page.on("pageerror", (e) => runtimeErrors.push(`${current}: ${String(e).slice(0, 200)}`));
  let storageBlamed = false;
  const leftBy = new Set(); // controls already failed as "left the page": their follow-on requests are not reported twice
  let navigated = false;
  let publicPage = false; // the press opened a public read-only commander page: a read, not a write, but the demo is left behind
  page.on("framenavigated", (frame) => {
    if (frame !== page.mainFrame()) return;
    const path = new URL(frame.url()).pathname;
    if (path !== "/") navigated = true;
    if (/^\/commander\/[^/]+$/.test(path)) publicPage = true;
  });

  await page.goto(BASE, { waitUntil: "load" });
  await page.getByTestId("demo-start").waitFor();
  await page.waitForLoadState("networkidle").catch(() => {});
  current = "idle";
  const demo = page.getByTestId("demo");
  if ((await demo.count()) === 0) throw new Error(`probe:demo-inert: no [data-testid=demo] at ${BASE}; the server must serve the landing with the demo section.`);
  const hostState = HOST_STATE.source;
  const readStorage = () => page.evaluate((src) => JSON.stringify([localStorage, sessionStorage].map((s) => Object.entries(s).filter(([k]) => !new RegExp(src, "i").test(k)))), hostState);
  const readCookies = async () => JSON.stringify((await context.cookies(BASE)).filter((c) => !HOST_STATE.test(c.name)).map((c) => [c.name, c.value]).sort());
  const storageBefore = await readStorage();
  const cookiesBefore = await readCookies();

  // Start the demo and walk to `step` (1-based); used at the start and to get back after a press left the page.
  const enter = async (step) => {
    await page.getByTestId("demo-start").click();
    for (let s = 1; s < step; s++) {
      await page.getByTestId("demo-step").waitFor();
      await page.getByTestId("demo-next").click();
    }
  };
  await enter(1);
  for (let step = 1; step <= STEPS; step++) {
    await page.getByTestId("demo-step").waitFor();
    const app = page.getByTestId("demo-app");
    // Every control in the app, once. The list is read first and each is pressed if it is still there and visible.
    const controls = app.locator("button, a[href], [role='tab'], [role='button'], input[type='checkbox'], summary");
    const count = await controls.count();
    let pressed = 0;
    const unpressed = []; // controls whose click did not land (covered by another element, detached, not actionable): printed, not failed
    for (let i = 0; i < count; i++) {
      const el = controls.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;
      const what = await el.evaluate((n) => `<${n.tagName.toLowerCase()}${n.getAttribute("href") ? ` href=${n.getAttribute("href")}` : ""}> "${(n.textContent ?? "").trim().slice(0, 40)}"`).catch(() => "?");
      current = `step ${step} control #${i} ${what}`;
      const landed = await el.click({ timeout: 2000, trial: false }).then(() => true, () => false);
      if (landed) pressed++;
      else unpressed.push(`#${i} ${what}`);
      // A link's navigation lands after the click returns (client fetch, then a hard fallback): give it time to show.
      if (/^<a /.test(what)) {
        for (let waited = 0; !navigated && waited < 2000; waited += 100) await page.waitForTimeout(100);
      } else await page.waitForTimeout(120);
      if (!storageBlamed && (await readStorage().catch(() => storageBefore)) !== storageBefore) {
        storageBlamed = true;
        fail(`${label}px step ${step}: pressing control #${i} ${what} wrote to localStorage or sessionStorage`);
      }
      // Close whatever a press opened (a card dialog, a menu) so the next control is reachable.
      await page.keyboard.press("Escape").catch(() => {});
      if (navigated) {
        leftBy.add(current);
        if (publicPage) console.log(`${label}px step ${step}: control #${i} ${what} opened a public page (${new URL(page.url()).pathname}), a read`);
        else fail(`${label}px step ${step}: pressing control #${i} ${what} left the page (now ${page.url()})`);
        publicPage = false;
        // The demo's state died with the page: reload, walk back to this step, and carry on after this control.
        await page.goto(BASE, { waitUntil: "load" });
        await page.getByTestId("demo-start").waitFor();
        navigated = false;
        current = "load"; // the rebuild's own requests (sign-in handshake leftovers, the page reload) are not a press
        await enter(step);
        // The rebuilt step lists its controls in the same order, so the loop carries on at the next index.
      }
    }
    console.log(`${label}px step ${step}/${STEPS}: pressed ${pressed} of ${count} controls, ${unpressed.length} click(s) failed`);
    for (const u of unpressed) console.log(`  not pressed: ${u}`);
    if (step < STEPS) await page.getByTestId("demo-next").click();
  }
  await page.waitForLoadState("networkidle");

  if (writes.length > 0) fail(`${label}px: non-GET requests: ${[...new Set(writes)].join(", ")}`);
  if (outside.length > 0) {
    // One line per pressed control, with the first path it asked for (a leaving link also drags in the sign-in handshake's own requests).
    const byControl = new Map();
    for (const o of outside) {
      const [, path, who] = /^GET (\S+) \((.*)\)$/.exec(o) ?? [];
      if (!byControl.has(who)) byControl.set(who, path);
    }
    for (const [who, path] of byControl) if (!leftBy.has(who)) fail(`${label}px: request outside the page and its assets, GET ${path}, by ${who}`);
  }
  const storageAfter = await readStorage();
  if (storageAfter !== storageBefore) fail(`${label}px: localStorage or sessionStorage changed: ${storageBefore} -> ${storageAfter}`);
  const cookiesAfter = await readCookies();
  for (const e of runtimeErrors) fail(`${label}px: thrown error, ${e}`);
  if (cookiesAfter !== cookiesBefore) {
    const [b, a] = [new Map(JSON.parse(cookiesBefore)), new Map(JSON.parse(cookiesAfter))];
    const list = (names) => names.join(", ") || "none";
    fail(`${label}px: cookies changed (added: ${list([...a.keys()].filter((n) => !b.has(n)))}; removed: ${list([...b.keys()].filter((n) => !a.has(n)))}; value changed: ${list([...a.keys()].filter((n) => b.has(n) && b.get(n) !== a.get(n)))})`);
  }
  await context.close();
}
await browser.close();
if (failures > 0) {
  console.error(`probe:demo-inert: ${failures} failure(s)`);
  process.exit(1);
}
console.log("probe:demo-inert: nothing pressed was saved, sent or followed, at 390 and 1300.");
