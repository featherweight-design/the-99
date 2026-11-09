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
//   - more than three controls in one step whose click never landed (each is printed; a few covered or detached ones are tolerated).
// A card press opens the card details (read-only, from the card details chunks `card-details/<chunk>.generated.ts`, of which the page fetches only the step on screen's, on idle after entering the step): each width opens one at step 1 (the first collection
// tile) and one at step 4 (the first commander name, which pages the deck's cards), asserts a dialog opened, presses every control
// inside it once (the flip, the zoom, Prev and Next, the sheet's grip and All details, the neighbor plates and peeks), then closes it
// with its ✕ and again with Escape and checks focus went back to the control that opened it, and that none of it sent a non-GET
// request to ANY origin, asked this origin for a path outside the page, or touched the cookies or storage. A committed card details file
// holding no data skips that phase (logged); one with data fails if the dialog does not open.
// Every card-open control (5l-g): at each step that draws them (1, 3, 4, 5, 6, 7 and 8; at 7 and 8 on every tab, with Mana Balance's
// sections opened) the probe presses EVERY one once (`CARD_OPENERS`: collection tiles, "View details for ..." buttons, Suggested
// changes' "Open ..." names, Look deeper's cut names, Top off's names, Which deck's combo partner), asserts a dialog opens (the first
// press of a step waits up to 4 s: the step's chunk is fetched on idle after entering it, or by that press), closes it with Escape, and
// fails listing the names of the controls that opened nothing. No allowlist: a step the demo draws cards on whose selectors find none
// fails too, so a renamed control cannot make the phase pass empty.
// The launch form at the END is the one live control (it saves an email by design) and is never pressed. Pressing everything is
// the point: a control that wrote, or navigated, is a bug.
//
//   PROBE_BASE=http://localhost:3291 pnpm probe:demo-inert        (the server must serve the landing: PUBLIC_LANDING_ENABLED on, signed out)
import { readFileSync } from "node:fs";
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
/** Whether the committed card details chunks hold data (5l-c/d): each `card-details/<chunk>.generated.ts` is `null` until `pnpm demo:export` writes it, and the played chunk's key decides whether the modal phase is owed. The step data file no longer carries them. */
const CARD_DETAILS_FILE = readFileSync(new URL("../src/lib/demo/card-details/played.generated.ts", import.meta.url), "utf8");
const HAS_CARD_DETAILS = /^export const cardDetailsJson: unknown = \{/m.test(CARD_DETAILS_FILE) && /^ "cardDetails":\s*\{/m.test(CARD_DETAILS_FILE);
/** The most presses one opened card takes: a card with siblings pages on, and each page is a new card with the same controls. */
const MODAL_PRESS_CAP = 40;
/**
 * The card-open controls each step draws, by 1-based step (5l-g): a selector per kind of opener, matched inside the demo's app. A step
 * the demo draws cards on lists at least one (`MUST_FIND`); the phase fails when the step's selectors find none, so a renamed control
 * cannot make it pass empty. `cutNames` is the Look deeper row's name button, whose accessible name is the card's own name: the one
 * button of its row whose aria-label equals its text.
 */
const VIEW_DETAILS = "button[aria-label^='View details for']";
const CARD_OPENERS = {
  1: { selectors: ["[data-collection-tile]"] },
  3: { selectors: [VIEW_DETAILS] },
  4: { selectors: [VIEW_DETAILS] },
  5: { selectors: [VIEW_DETAILS] },
  // At 390 Suggested changes folds Additions and Cuts into two tabs (at 1300 both columns are drawn), so its tabs are worked too.
  6: { selectors: ["[data-testid='demo-suggested'] article button[aria-label^='Open ']", VIEW_DETAILS], tabs: true },
  7: { selectors: [VIEW_DETAILS, "[data-testid='top-off-name']"], cutNames: true, tabs: true },
  8: { selectors: [VIEW_DETAILS, "[data-testid='demo-which'] button[class*='dotted_var(--accent)']"], tabs: true },
};
/** The steps that must draw at least one card-open control (step 5, the analysis, may draw none). */
const MUST_FIND = new Set([1, 3, 4, 6, 7, 8]);
/** How long a press waits for its dialog: the first of a step may fetch the step's chunk; once one has opened, a press that opens nothing is a dead control. */
const FIRST_PRESS_WAIT = 4000;
const LATER_PRESS_WAIT = 1200;
/** Names listed in a failure before the rest are counted. */
const LIST_NAMES = 12;
/** Everything inside the card dialog that can be pressed. */
const MODAL_CONTROLS = "button, a[href], [role='button'], input, select, summary, [tabindex='0']";
/** A step whose controls mostly could not be pressed proved nothing: more than this many failed clicks in one step fails the probe. */
const MAX_UNPRESSED = 3;

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
  const foreignWrites = []; // a non-GET to any other origin while a card dialog was being worked: nothing the demo draws may send one
  let current = "load"; // the control being pressed now: every request is blamed on it
  const origin = new URL(BASE).origin;
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.origin !== origin) {
      if (req.method() !== "GET" && current.startsWith("modal")) foreignWrites.push(`${req.method()} ${url.origin}${url.pathname} (${current})`);
      return;
    }
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
  /**
   * Open the card `opener` names and work the dialog it brings: press every control once, close with the ✕ and with Escape (focus
   * must go back to `opener`), and fail on any write, foreign write, outside request or storage and cookie change meanwhile.
   * `paging`: the card opens from a list (a deck's), so the arrow keys page it and the title must change.
   */
  const modalPhase = async (where, opener, { paging }) => {
    if (!HAS_CARD_DETAILS) {
      console.log(`${label}px ${where}: no card details in the committed file: modal phase skipped`);
      return;
    }
    const writesBefore = writes.length;
    const outsideBefore = outside.length;
    const foreignBefore = foreignWrites.length;
    const storageStart = await readStorage();
    const cookiesStart = await readCookies();
    const dialog = page.getByRole("dialog");
    const backdrop = page.locator("[role='presentation']:has([role='dialog'])");
    const open = async () => {
      current = `modal ${where}: open`;
      await opener.click({ timeout: 3000 });
      await dialog.waitFor({ state: "visible", timeout: 4000 });
    };
    try {
      await open();
    } catch {
      fail(`${label}px ${where}: the committed file carries card details but pressing the card opened no dialog`);
      return;
    }
    const openerHandle = await opener.elementHandle();
    const title = () => page.locator("#card-modal-title").first().textContent().catch(() => null);
    const keyOf = (c) => `${c.testid}|${c.label.split(/[:,]/)[0].split(/\s+/).slice(0, 2).join(" ")}|${c.label.includes(":")}`;
    const seen = new Set();
    const unpressed = [];
    let pressed = 0;
    let closedEarly = 0;
    for (let n = 0; n < MODAL_PRESS_CAP; n++) {
      // Re-read every time: a press can page (a new card, a new dialog), flip, zoom or fold the sheet, and the list moves with it.
      const controls = backdrop.first().locator(MODAL_CONTROLS);
      const found = await controls.evaluateAll((els) =>
        els.map((el, i) => ({
          i,
          shown: el.getClientRects().length > 0 && !el.closest("[inert]") && el.getAttribute("aria-hidden") !== "true",
          label: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 60),
          testid: el.getAttribute("data-testid") ?? "",
          href: el.getAttribute("href") ?? "",
        })),
      ).catch(() => []);
      const next = found.find((c) => c.shown && !seen.has(keyOf(c)) && c.label !== "Close card details");
      if (!next) break;
      seen.add(keyOf(next));
      current = `modal ${where}: control "${next.label}"${next.href ? ` href=${next.href}` : ""}`;
      const landed = await controls.nth(next.i).click({ timeout: 2000 }).then(() => true, () => false);
      if (landed) pressed++;
      else unpressed.push(next.label);
      await page.waitForTimeout(220);
      if ((await dialog.count()) === 0) {
        // Nothing but the ✕ and Escape closes the card: a control that did is a defect, and the rest of the phase needs it open.
        closedEarly++;
        fail(`${label}px ${where}: pressing "${next.label}" closed the card dialog`);
        try { await open(); } catch { return; }
      }
      if (navigated) {
        fail(`${label}px ${where}: pressing "${next.label}" left the page (now ${page.url()})`);
        return;
      }
    }
    console.log(`${label}px ${where}: card dialog open, pressed ${pressed} of ${seen.size} controls (${unpressed.length} did not land${unpressed.length ? `: ${unpressed.join("; ")}` : ""})`);
    // At desktop width the dialog draws the card and the sheet side by side: a single-faced card carries only the zoom and its way
    // back (the sheet teaser, "All details" and the mobile ✕ are phone-only), so two presses is the whole dialog there.
    const floor = label >= 768 ? 2 : 3;
    if (pressed < floor) fail(`${label}px ${where}: only ${pressed} controls in the card dialog could be pressed; the phase proved nothing`);
    if (paging) {
      // The arrow keys page a card opened from a list, and the title moves with them.
      current = `modal ${where}: arrow keys`;
      await page.keyboard.press("Escape").catch(() => {}); // a zoom layer a press left open goes first
      if ((await dialog.count()) === 0) await open();
      const before = await title();
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(300);
      const after = await title();
      if (after === before) fail(`${label}px ${where}: ArrowRight did not page the card (title still ${JSON.stringify(before)})`);
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(300);
    }
    // Close with the ✕, then again with Escape; focus returns to the control that opened it.
    for (const how of ["close button", "Escape"]) {
      current = `modal ${where}: close with the ${how}`;
      if ((await dialog.count()) === 0) await open();
      // An open zoom layer takes the first Escape: close it before the dialog's own.
      if (await page.getByTestId("card-zoom").count()) await page.keyboard.press("Escape");
      if (how === "Escape") await page.keyboard.press("Escape");
      else await dialog.getByLabel("Close card details").locator("visible=true").first().click({ timeout: 2000 }).catch(() => page.keyboard.press("Escape"));
      const gone = await dialog.waitFor({ state: "detached", timeout: 3000 }).then(() => true, () => false);
      if (!gone) {
        fail(`${label}px ${where}: the ${how} did not close the card dialog`);
        await page.keyboard.press("Escape").catch(() => {});
        continue;
      }
      await page.waitForTimeout(150);
      const focusBack = await page.evaluate((el) => el !== null && document.activeElement === el, openerHandle);
      if (!focusBack) fail(`${label}px ${where}: after the ${how} closed the card, focus did not return to the control that opened it`);
    }
    current = "idle";
    if (writes.length > writesBefore) fail(`${label}px ${where}: non-GET request(s) to this origin while the card dialog was worked: ${writes.slice(writesBefore).join(", ")}`);
    if (foreignWrites.length > foreignBefore) fail(`${label}px ${where}: non-GET request(s) to another origin while the card dialog was worked: ${foreignWrites.slice(foreignBefore).join(", ")}`);
    if (outside.length > outsideBefore) fail(`${label}px ${where}: request(s) outside the page and its assets while the card dialog was worked: ${outside.slice(outsideBefore).join(", ")}`);
    if ((await readStorage()) !== storageStart) fail(`${label}px ${where}: working the card dialog wrote to localStorage or sessionStorage`);
    if ((await readCookies()) !== cookiesStart) fail(`${label}px ${where}: working the card dialog changed the cookies`);
    void closedEarly;
  };

  /**
   * Press every card-open control the step draws once (5l-g; `CARD_OPENERS`). Marks the matching, visible controls with
   * `data-probe-card-open` in document order (re-marked before each press: a re-render can drop the mark), presses the n-th, waits
   * for a dialog and closes it with Escape. A control that opened nothing is listed by name. At 7 and 8 each tab is worked in turn
   * (Mana Balance's closed sections opened first), and the first tab is left selected.
   */
  const tag = (where) => `${label}px ${where}`;
  const everyCardControl = async (step, app) => {
    const spec = CARD_OPENERS[step];
    if (!spec || !HAS_CARD_DETAILS) return;
    const where = `step ${step} (every card control)`;
    const writesBefore = writes.length;
    const outsideBefore = outside.length;
    const foreignBefore = foreignWrites.length;
    const storageStart = await readStorage();
    const cookiesStart = await readCookies();
    const dialog = page.getByRole("dialog");
    const mark = () =>
      app.evaluate((root, { selectors, cutNames }) => {
        for (const old of root.querySelectorAll("[data-probe-card-open]")) old.removeAttribute("data-probe-card-open");
        const hits = new Set();
        for (const sel of selectors) for (const el of root.querySelectorAll(sel)) hits.add(el);
        if (cutNames) {
          for (const el of root.querySelectorAll("article button[aria-label]")) {
            if (el.getAttribute("aria-label") === (el.textContent ?? "").trim()) hits.add(el);
          }
        }
        const shown = [...hits].filter((el) => el.getClientRects().length > 0 && !el.closest("[inert]") && el.getAttribute("aria-hidden") !== "true");
        shown.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        shown.forEach((el, i) => el.setAttribute("data-probe-card-open", String(i)));
        return shown.length;
      }, spec);
    const tabs = app.locator("[role='tab']");
    const tabCount = spec.tabs ? await tabs.count() : 0;
    let total = 0;
    const dead = [];
    const unpressed = [];
    for (const t of tabCount > 0 ? [...Array(tabCount).keys()] : [null]) {
      const scope = t === null ? where : `${where}, tab ${t + 1}`;
      if (t !== null) {
        current = `modal ${scope}: tab`;
        await tabs.nth(t).click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(200);
        // Mana Balance's sections are folded: open each so its cards are drawn.
        for (let n = 0; n < 12; n++) {
          const closed = app.locator("[data-testid='demo-get-to-99'] [aria-expanded='false']:not([role='tab'])");
          if ((await closed.count()) === 0) break;
          await closed.first().click({ timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(100);
        }
      }
      const count = await mark();
      total += count;
      let opened = false;
      for (let i = 0; i < count; i++) {
        if ((await mark()) <= i) break;
        const control = app.locator(`[data-probe-card-open='${i}']`);
        const name = ((await control.getAttribute("aria-label").catch(() => null)) ?? (await control.textContent().catch(() => "")) ?? "").trim().slice(0, 60) || `#${i}`;
        current = `modal ${scope}: card control "${name}"`;
        try {
          await control.click({ timeout: 3000 });
        } catch {
          unpressed.push(name);
          continue;
        }
        const landed = await dialog.waitFor({ state: "visible", timeout: opened ? LATER_PRESS_WAIT : FIRST_PRESS_WAIT }).then(() => true, () => false);
        if (!landed) {
          dead.push(`${t === null ? "" : `tab ${t + 1}: `}${name}`);
          continue;
        }
        opened = true;
        // Escape: a zoom layer takes the first, the dialog the next.
        for (let k = 0; k < 3 && (await dialog.count()) > 0; k++) {
          await page.keyboard.press("Escape");
          await page.waitForTimeout(120);
        }
        if ((await dialog.count()) > 0) {
          fail(`${tag(scope)}: Escape did not close the card dialog opened by "${name}"`);
          return;
        }
        if (navigated) {
          fail(`${tag(scope)}: pressing "${name}" left the page (now ${page.url()})`);
          navigated = false;
          publicPage = false;
          await page.goto(BASE, { waitUntil: "load" });
          await page.getByTestId("demo-start").waitFor();
          current = "load";
          await enter(step);
          return;
        }
      }
    }
    // Leave the first tab selected, as the sweep after this found the step.
    if (tabCount > 0) await tabs.first().click({ timeout: 3000 }).catch(() => {});
    current = "idle";
    console.log(`${tag(where)}: pressed ${total - unpressed.length} of ${total} card controls, ${dead.length} opened nothing, ${unpressed.length} did not land`);
    if (total === 0 && MUST_FIND.has(step)) fail(`${tag(where)}: no card-open control found; the step draws cards, so CARD_OPENERS[${step}] no longer matches`);
    if (dead.length > 0) fail(`${tag(where)}: ${dead.length} of ${total} card controls opened no dialog: ${dead.slice(0, LIST_NAMES).join("; ")}${dead.length > LIST_NAMES ? `; and ${dead.length - LIST_NAMES} more` : ""}`);
    if (unpressed.length > MAX_UNPRESSED) fail(`${tag(where)}: ${unpressed.length} card controls could not be pressed (more than ${MAX_UNPRESSED}); first: ${unpressed.slice(0, 5).join("; ")}`);
    if (writes.length > writesBefore) fail(`${tag(where)}: non-GET request(s) to this origin while the card controls were pressed: ${writes.slice(writesBefore).join(", ")}`);
    if (foreignWrites.length > foreignBefore) fail(`${tag(where)}: non-GET request(s) to another origin while the card controls were pressed: ${foreignWrites.slice(foreignBefore).join(", ")}`);
    if (outside.length > outsideBefore) fail(`${tag(where)}: request(s) outside the page and its assets while the card controls were pressed: ${outside.slice(outsideBefore).join(", ")}`);
    if ((await readStorage()) !== storageStart) fail(`${tag(where)}: pressing the card controls wrote to localStorage or sessionStorage`);
    if ((await readCookies()) !== cookiesStart) fail(`${tag(where)}: pressing the card controls changed the cookies`);
  };
  await enter(1);
  for (let step = 1; step <= STEPS; step++) {
    await page.getByTestId("demo-step").waitFor();
    const app = page.getByTestId("demo-app");
    // The card details, worked once on the collection's first tile and once on the deck's first commander (which pages the deck).
    if (step === 1) await modalPhase("step 1 (first collection tile)", app.locator("[data-collection-tile]").first(), { paging: false });
    if (step === 4) await modalPhase("step 4 (first deck card)", app.locator("button[aria-label^='View details for']").first(), { paging: true });
    // Every card-open control the step draws, once each: a dialog must open (5l-g).
    await everyCardControl(step, app);
    // Every control in the app, once. The list is read first and each is pressed if it is still there and visible.
    const controls = app.locator("button, a[href], [role='tab'], [role='button'], input[type='checkbox'], summary");
    const count = await controls.count();
    let pressed = 0;
    const unpressed = []; // controls whose click did not land (covered by another element, detached, not actionable): printed, and a step with more than MAX_UNPRESSED of them fails
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
    if (unpressed.length > MAX_UNPRESSED) fail(`${label}px step ${step}: ${unpressed.length} controls could not be pressed (more than ${MAX_UNPRESSED}); first: ${unpressed.slice(0, 5).join("; ")}`);
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
console.log(`probe:demo-inert: nothing pressed was saved, sent or followed, at 390 and 1300${HAS_CARD_DETAILS ? ", card dialogs included" : " (no card details in the committed file: modal phase skipped)"}.`);
