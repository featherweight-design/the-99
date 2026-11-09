// probe:demo-inert: Try it's promise, "nothing you press is saved", checked in a real browser (public landing, 5l). Signed OUT, no
// account and no database access of its own: it loads the landing, starts the demo and, at each of the eight steps, presses every
// control inside the dummy app once (buttons, links, tabs, checkboxes), then Next. It records every network request the page
// makes and fails on:
//   - any non-GET request to this origin (a server action is a POST; a write is never a GET);
//   - any request to this origin whose path is outside the page, its static assets and its images (`/_next/`, `/api/img`-style
//     image routes are allowed; `/api/` and `/decks`, `/collection`, `/commanders`, `/sign-in` are not);
//   - a main-frame navigation away from `/` (a press must stay on the page: a link that leaves is a write to nothing, but it is
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
const ALLOWED_PATH = /^\/(?:_next\/|favicon|manifest|icons?\/|img\/|fonts?\/)/;
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
  const origin = new URL(BASE).origin;
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.origin !== origin) return;
    if (req.method() !== "GET") writes.push(`${req.method()} ${url.pathname}`);
    else if (url.pathname !== "/" && !ALLOWED_PATH.test(url.pathname) && !req.isNavigationRequest()) outside.push(`GET ${url.pathname}`);
  });
  let navigated = false;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame() && new URL(frame.url()).pathname !== "/") navigated = true;
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  const demo = page.getByTestId("demo");
  if ((await demo.count()) === 0) throw new Error(`probe:demo-inert: no [data-testid=demo] at ${BASE}; the server must serve the landing with the demo section.`);
  const storageBefore = await page.evaluate(() => JSON.stringify([localStorage, sessionStorage].map((s) => Object.entries(s))));
  const cookiesBefore = JSON.stringify((await context.cookies()).map((c) => [c.name, c.value]).sort());

  await page.getByTestId("demo-start").click();
  for (let step = 1; step <= STEPS; step++) {
    await page.getByTestId("demo-step").waitFor();
    const app = page.getByTestId("demo-app");
    // Every control in the app, once. The list is read first and each is pressed if it is still there and visible.
    const controls = app.locator("button, a[href], [role='tab'], [role='button'], input[type='checkbox'], summary");
    const count = await controls.count();
    let pressed = 0;
    for (let i = 0; i < count; i++) {
      const el = controls.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;
      await el.click({ timeout: 2000, trial: false }).catch(() => {});
      pressed++;
      // Close whatever a press opened (a card dialog, a menu) so the next control is reachable.
      await page.keyboard.press("Escape").catch(() => {});
      if (navigated) {
        fail(`${label}px step ${step}: a press left the page (now ${page.url()})`);
        await page.goto(BASE, { waitUntil: "networkidle" });
        navigated = false;
        break;
      }
    }
    console.log(`${label}px step ${step}/${STEPS}: pressed ${pressed} of ${count} controls`);
    if (step < STEPS) await page.getByTestId("demo-next").click();
  }
  await page.waitForLoadState("networkidle");

  if (writes.length > 0) fail(`${label}px: non-GET requests: ${[...new Set(writes)].join(", ")}`);
  if (outside.length > 0) fail(`${label}px: requests outside the page and its assets: ${[...new Set(outside)].join(", ")}`);
  const storageAfter = await page.evaluate(() => JSON.stringify([localStorage, sessionStorage].map((s) => Object.entries(s))));
  if (storageAfter !== storageBefore) fail(`${label}px: localStorage or sessionStorage changed`);
  const cookiesAfter = JSON.stringify((await context.cookies()).map((c) => [c.name, c.value]).sort());
  if (cookiesAfter !== cookiesBefore) fail(`${label}px: cookies changed`);
  await context.close();
}
await browser.close();
if (failures > 0) {
  console.error(`probe:demo-inert: ${failures} failure(s)`);
  process.exit(1);
}
console.log("probe:demo-inert: nothing pressed was saved, sent or followed, at 390 and 1300.");
