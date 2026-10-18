// The contact sheet: every route a feature touches, at both widths, in one image.
//
// NOT a probe. A probe is written by whoever wrote the feature and asserts what
// they believed; this asserts nothing ABOUT THE PIXELS. It loads each surface,
// photographs it, and lays the photographs out so a person can see in one glance
// that a route never got the feature, or that the phone is wrong while the desktop
// is right — the two failures a diff and a per-PR review structurally cannot show.
//
// It does report one thing mechanically, in its exit code: whether every cell was
// REACHED. A row whose steps time out produces no evidence either way, and a sheet
// with a hole in it that exits 0 would be the same quiet pass this artifact exists
// to prevent. Reaching a surface is not a judgement about how it looks.
//
// One script for the repository, not one per feature: the feature supplies its
// inventory as JSON, this walks it.
//
//   node scripts/contact-sheet.mjs docs/superpowers/inventories/<feature>.json
//
// A route that needs an id writes it as `${SOME_VAR}` and takes it from the
// environment, so no inventory carries one account's ids.
//
// Needs the dev server up and a signed-in session: PROBE_BASE selects the server.
// Writes PNGs plus `sheet.png` into the inventory's `out` directory.
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";
import { fakeCameraArgs, writeFakeCamera } from "./lib/fake-camera.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
// Optional, exactly as `audit-sweep.mjs` has it: a `+clerk_test` address takes the
// code path below and has no password to give, which is how the local dev instance
// is actually set up.
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const inventoryPath = process.argv[2];

if (!inventoryPath) throw new Error("Pass the inventory JSON path.");
const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
// Relative to the repository by default, so the command in a checked-in inventory
// runs the same way on anyone's machine. An absolute `out` still wins, for a run
// that wants to write somewhere specific.
// Optional: THEME=<key> (amonkhet, kamigawa, ixalan, phyrexia, eldraine, kaldheim) draws every row in that theme, through
// the `the99_theme` cookie the server reads, and writes into its own sub-directory so a theme pass never overwrites another.
const THEME = process.env.THEME;
const outDir = path.resolve(process.cwd(), inventory.out ?? `contact-sheets/${path.basename(inventoryPath, ".json")}`, THEME ?? "");
await mkdir(outDir, { recursive: true });

const WIDTHS = inventory.widths ?? [
  { label: "phone", width: 390, height: 844 },
  { label: "desktop", width: 1300, height: 900 },
];

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
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor?.emailAddressId,
          });
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

/**
 * A row's `steps` are plain Playwright verbs, so a surface that needs three clicks
 * to reach is still one row of the inventory rather than a new script.
 *
 * Give every `goto` a `wait` naming something the finished page has. `settle` is a
 * delay, not a readiness check: a slow route still renders its loading state for
 * the first second, and a sheet that photographs skeletons reports success while
 * showing nothing.
 */
/**
 * `${VAR}` from the environment, so an inventory can name an id, a deck or a card without
 * committing one account's data to the repository — where it would 404, or filter a list to
 * nothing, on anybody else's.
 *
 * ONE function for every step that takes a string, rather than one per step. It began on
 * `goto` alone; `fill` was added when a row typed a literal `${CARD_MARK_CARD}` into a search
 * box and photographed an empty collection while counting as reached. `clickRole.name` was
 * still literal one step later, and that row could never click the card it had searched for.
 * A per-step expander is a list that grows a hole every time a verb is added.
 */
function expand(value, where, { forRegex = false } = {}) {
  return String(value ?? "").replace(/\$\{(\w+)\}/g, (_, name) => {
    const found = process.env[name];
    if (!found) throw new Error(`${where} needs ${name} in the environment`);
    // `clickRole.name` is a REGEX in this runner, so a substituted value is pattern source
    // rather than text. Card names carry metacharacters — `+2 Mace` starts with `+`, which
    // is not a valid pattern at all and throws; `Question Elemental?` makes the preceding
    // character optional and matches the wrong button. The value is escaped and the
    // author's own pattern around it is left alone, so `^${CARD}$` still anchors.
    return forRegex ? found.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : found;
  });
}

// Chromium's own "Slow 4G" figures, as `measure:load`'s slow profile uses them.
const SLOW_4G = { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1e6) / 8 * 0.9, uploadThroughput: (750 * 1e3) / 8 * 0.9 };

const throttles = new WeakMap();

async function run(page, steps) {
  for (const step of steps ?? []) {
    // `throttle: "slow"` puts the page on Slow 4G for the steps after it: a state that exists
    // only while a navigation is pending (the pip, the track, the escalation screen) is gone in
    // a frame on a local server, and a sheet taken there photographs the page it landed on.
    if (step.throttle !== undefined) {
      // `"off"` takes it away again, so a row can end its throttle and the rows after it load at full speed.
      if (step.throttle !== "slow" && step.throttle !== "off") {
        throw new Error(`throttle takes "slow" or "off", not ${JSON.stringify(step.throttle)}`);
      }
      // One session per page: conditions set on one session are not lifted by another.
      if (!throttles.has(page)) {
        const fresh = await page.context().newCDPSession(page);
        await fresh.send("Network.enable");
        throttles.set(page, fresh);
      }
      const cdp = throttles.get(page);
      await cdp.send(
        "Network.emulateNetworkConditions",
        step.throttle === "slow" ? SLOW_4G : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
      );
    }
    // `mock` answers every request matching a URL glob with a fixed reply, from this step on: a state that only a
    // server's answer reaches (the scanner's Not sure, its not-ready notice) is staged without the data behind it.
    // `status` defaults to 200, `json` to null. Before `goto` in the same step, so the first request is answered too.
    if (step.mock !== undefined) {
      const reply = { status: step.status ?? 200, contentType: "application/json", body: JSON.stringify(step.json ?? null) };
      await page.unroute(step.mock);
      await page.route(step.mock, (route) => route.fulfill(reply));
    }
    if (step.goto !== undefined) {
      const url = expand(step.goto, step.goto);
      await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
    }
    // EVERY verb reaches page content through `lib/surface.mjs`. The shell
    // renders around `<main>` and carries the same ARIA selectors a page's
    // controls do — its account menu is a `button[aria-haspopup="dialog"]`, the
    // same selector a filter-sheet trigger has, and it comes first in document
    // order. That substitution has already produced two false findings in
    // `probe-sets.mjs`, and here it would be worse: a contact sheet photographs
    // the wrong thing and nothing about the cell looks failed.
    //
    // A surface that exists at one width only says so with `widths` on its row.
    // There is no optional click: a step that finds nothing is a failed cell,
    // which is the whole point of pressing it.
    // PRESENCE, not truthiness. An empty selector is a step that would silently
    // not happen, and a step that does nothing photographs the route in the
    // previous state while the cell is counted as reached. Playwright rejects
    // `""` loudly, which is the outcome to want.
    // `store` writes the page's localStorage, key by key: a preference a surface reads as it mounts (the scanner's
    // remembered mode) is set before the press that mounts it, so no row races the previous row's leftover.
    if (step.store !== undefined) {
      await page.evaluate((items) => {
        for (const [k, v] of Object.entries(items)) window.localStorage.setItem(k, v);
      }, step.store);
    }
    if (step.click !== undefined) {
      await onPage(page, step.click).first().click({ timeout: 15_000 });
    }
    if (step.clickRole !== undefined) {
      await onPageRole(page, step.clickRole, new RegExp(expand(step.name, `clickRole ${step.clickRole}`, { forRegex: true })))
        .first()
        .click({ timeout: 15_000 });
    }
    // A field a surface only reaches its interesting state through typing — the
    // set panel narrows its list as you type, and an empty field shows every set.
    if (step.fill !== undefined) {
      // `${VAR}` expands here for the same reason it does in `goto`, and NOT expanding it
      // was worse than a missing feature: a row typing a literal `${CARD_MARK_CARD}` into a
      // search box filters the list to nothing and photographs an empty surface, which
      // counts as a reached cell and reads as coverage. Silent, and indistinguishable from
      // a feature that stopped drawing.
      await onPage(page, step.fill).first().fill(expand(step.text, `fill ${step.fill}`), { timeout: 15_000 });
    }
    // Scoped like the actions above it, and for the same reason: `wait:
    // "[role=dialog]"` is in every inventory, and the shell's account sheet is
    // also a `role="dialog"` sitting before `<main>` — so an unscoped wait can
    // resolve against it and hand the next step a page that never opened.
    if (step.wait !== undefined) {
      await onPage(page, step.wait).first().waitFor({ state: "visible", timeout: 15_000 });
    }
    // A moment's bubble (discovery R1): portalled to the end of the document, outside `<main>`, so it is the one wait
    // that is not page-scoped. It names the note it expects (`"Mana Balance, a tip"`), so another moment arriving in its
    // place fails the row rather than photographing the wrong tip.
    if (step.waitNote !== undefined) {
      if (typeof step.waitNote !== "string") throw new Error("waitNote takes the note's accessible name");
      await page.getByRole("note", { name: step.waitNote, exact: true }).first().waitFor({ state: "visible", timeout: 15_000 });
    }
    // A fresh visit for the row's moment, on its NEXT load only (the init script above reads the flag before the page's
    // own scripts run). The page it is on keeps its taken visit, so nothing arrives there in the meantime: a row clears
    // first and then loads its route once.
    if (step.clearVisit === true) {
      await page.evaluate(() => window.sessionStorage.setItem("contactSheet.freshVisit", "1"));
    }
    // A pointer resting on page content (a row's hover preview): the page's own scope, as every verb is. `at` rests it
    // at a point inside the element ({ x, y } in px from its top left), for a card that tilts toward the pointer.
    if (step.hover !== undefined) {
      await onPage(page, step.hover).first().hover({ timeout: 15_000, ...(step.at ? { position: step.at } : {}) });
    }
    // The desktop rail's name tag is drawn under a resting pointer, and the rail is shell rather
    // than page, so it is the one step reached outside `onPage`: named by the slot's own
    // `aria-label` inside the rail, never by a free selector, so it cannot wander into the page.
    if (step.hoverRail !== undefined) {
      await page.locator(`aside :is(a, button)[aria-label="${step.hoverRail}"]`).first().hover({ timeout: 15_000 });
    }
    // Card search lives in the shell, not the page: its sheet is reached through the header's icon by its own name,
    // and every step after that is scoped to the sheet by ITS name, so none of them can wander into the page.
    const searchSheet = page.getByRole("dialog", { name: "Search all cards" });
    if (step.openSearch) {
      await page.locator('header button[aria-label="Search all cards"]').first().click({ timeout: 15_000 });
      await searchSheet.waitFor({ state: "visible", timeout: 15_000 });
    }
    // The desktop's rail slot is a button in the shell's rail, reached by its own name inside the rail; the search it
    // opens is then the same dialog as above, and every later step goes through it.
    if (step.clickRail !== undefined) {
      await page.locator(`aside button[aria-label="${step.clickRail}"]`).first().click({ timeout: 15_000 });
      await searchSheet.waitFor({ state: "visible", timeout: 15_000 });
    }
    // The ? (discovery R2·8) is shell too: the rail's at 1300, the header's at 390, both marked `data-help-button`, and
    // only the one with layout is pressed. The panel or sheet it opens is waited for by its own marks, filled.
    if (step.openHelp) {
      await page.locator("[data-help-button]:visible").first().click({ timeout: 15_000 });
      // Its entries arrive after it opens (`/api/about/entries`): wait for the filled panel, as probe:help-panel does, so
      // an empty one is never counted as reached.
      await page.locator("[data-help-panel] :is([data-help-here], [data-help-empty])").first().waitFor({ state: "visible", timeout: 15_000 });
    }
    // The account menu is shell, not page: its trigger is marked `data-account-trigger` (the header's at 390, the rail's at
    // 1300; the card-search trigger is also an `aria-expanded` button, so the mark, not the ARIA, finds it). `openAccount`
    // presses it, waits for the trigger to report the menu open, and then for the credit chip the menu draws, so a menu
    // that opened without its chip fails the row. `"chip": false` waits for the open menu alone.
    if (step.openAccount) {
      // Under `next dev` the framework's own indicator sits over the rail's foot, where the avatar is, and takes the press.
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      await page.locator("[data-account-trigger]:visible").first().click({ timeout: 15_000 });
      await page.locator('[data-account-trigger][aria-expanded="true"]:visible').first().waitFor({ state: "visible", timeout: 15_000 });
      if (step.chip !== false) {
        await page.locator('[data-testid="credit-chip"]:visible').first().waitFor({ state: "visible", timeout: 15_000 });
      }
      // `"chipLine": true` also waits for the line under an expiring chip, which only that state draws.
      if (step.chipLine === true) {
        await page.locator('[data-testid="credit-chip-line"]:visible').first().waitFor({ state: "visible", timeout: 15_000 });
      }
      await page.waitForTimeout(400);
    }
    if (step.searchType !== undefined) {
      await searchSheet.getByRole("combobox").fill(step.searchType, { timeout: 15_000 });
    }
    if (step.searchWait !== undefined) {
      await searchSheet.getByText(step.searchWait, { exact: true }).first().waitFor({ state: "visible", timeout: 15_000 });
    }
    if (step.searchPick !== undefined) {
      await searchSheet.getByRole("option").nth(step.searchPick).click({ timeout: 15_000 });
    }
    // Dragging the list lowers the keyboard (S4b): the field gives up focus and the list scrolls.
    if (step.searchScroll !== undefined) {
      await searchSheet.getByRole("combobox").blur();
      await searchSheet.getByRole("listbox").evaluate((list, y) => { list.parentElement.scrollTop = y; }, step.searchScroll);
    }
    // `files` chooses files on a file input (it may be hidden), as a picker would: `paths` are resolved from the
    // working directory, each `${VAR}` expanded first.
    if (step.files !== undefined) {
      if (!Array.isArray(step.paths) || step.paths.length === 0) throw new Error("files takes a non-empty paths list");
      await onPage(page, step.files).first().setInputFiles(step.paths.map((p) => path.resolve(expand(p, `files ${step.files}`))));
    }
    if (step.back) await page.goBack();
    // The browser's own offline switch, for the surfaces that change with the connection.
    if (step.offline !== undefined) await page.context().setOffline(step.offline);
    if (step.pressKey !== undefined) await page.keyboard.press(step.pressKey);
    if (step.settle !== undefined) await page.waitForTimeout(step.settle);
    // A surface that only exists part-way down the page — the set head's collapsed bar, the
    // foot of a long column — is reached by scrolling to it, which is a step like any other
    // rather than a reason for a second script.
    //
    // LAST in the step, after its `wait` and its `settle`. A route that streams is still its
    // loading shell for the first moment, and a scroll applied then is clamped to a document
    // that has not arrived — the sheet would photograph the top of the page while its label
    // claimed the collapsed head or the foot of the column.
    // Scroll to a NAMED element rather than a pixel offset. An offset is an
    // address that stops being true the moment the page above it changes
    // length, and a row whose label names a figure it no longer photographs is
    // worse than no row at all: the sheet reads as coverage. This is how the
    // old /about inventory's five figure rows (retired in discovery R2·7) found
    // their marks after one of them silently scrolled past its own subject.
    //
    // Scoped like every other verb — a scroll target is page content, and a
    // shell that grew a match would otherwise win on document order.
    if (step.scrollTo !== undefined) {
      const target = onPage(page, step.scrollTo).first();
      await target.waitFor({ state: "attached", timeout: 15_000 });
      await target.evaluate((node) => node.scrollIntoView({ block: "center" }));
      // The shot is taken from the viewport, and `scrollIntoView` resolves
      // before the paint that follows it.
      await page.waitForTimeout(250);
    }
    if (typeof step.scroll === "number") {
      await page.evaluate((y) => window.scrollTo(0, y), step.scroll);
    }
    if (step.scroll === "bottom") {
      // The document AND any element that is actually scrolling. On this app's phone
      // layouts the document is the scroller — measured, no route reports a scrolling
      // descendant — but `/commanders/[slug]` marks its column `overflow-y-auto`, so a
      // future height constraint would move the scroll into it and a window-only verb would
      // photograph the top while claiming the foot.
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
        for (const node of document.querySelectorAll("body *")) {
          const style = getComputedStyle(node);
          const scrolls = style.overflowY === "auto" || style.overflowY === "scroll";
          if (scrolls && node.scrollHeight - node.clientHeight > 1) {
            node.scrollTop = node.scrollHeight;
          }
        }
      });
    }

  }
}

// A typo in `widths` — or an empty array — would skip its row at every width,
// and a row that produced no shot cannot fail the reachability check either. A
// malformed inventory would then exit 0 having photographed nothing, which is
// the quiet pass this whole script exists to prevent.
const WIDTH_LABELS = WIDTHS.map((w) => w.label);
for (const row of inventory.rows) {
  if (row.widths === undefined) continue;
  const bad = !Array.isArray(row.widths)
    || row.widths.length === 0
    || row.widths.some((w) => !WIDTH_LABELS.includes(w));
  if (bad) {
    console.error(
      `row "${row.id}": \`widths\` must be a non-empty subset of ${WIDTH_LABELS.join(", ")}`,
    );
    process.exit(1);
  }
}

const shots = [];
const browser = await chromium.launch();
/** The per-width camera browsers still open: closed in the `finally`, so a width that fails part-way leaves none behind. */
const cameraBrowsers = new Set();
/** The account's About columns as the run found them, when an inventory clears the gate. */
let aboutPrior = null;
try {
  await clerkSetup();
  for (const size of WIDTHS) {
    // `"camera": { w, h, card?, share, cx, cy, angle }` on a width gives that width its own browser with a fake
    // camera playing the scene (`lib/fake-camera.mjs`), for a surface that reads the camera.
    const widthBrowser = size.camera
      ? await chromium.launch({ args: fakeCameraArgs(await writeFakeCamera(size.camera, path.join(outDir, "camera"), size.label)) })
      : browser;
    if (widthBrowser !== browser) cameraBrowsers.add(widthBrowser);
    const context = await widthBrowser.newContext({
      permissions: size.camera ? ["camera"] : [],
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 1,
      // A width may name an input: `"touch": true` makes Chromium report `(hover: none)`, where the
      // desktop rail draws its labelled touch form (desktop nav labels), at a desktop viewport.
      hasTouch: size.touch === true,
    });
    if (THEME) await context.addCookies([{ name: "the99_theme", value: THEME, url: BASE }]);
    const page = await context.newPage();
    // An inventory of moments: every load starts with this visit's moment TAKEN, unless the step before it was
    // `clearVisit`, so nothing arrives on the loads that sign in and clear the About gate (the account button carries a
    // moment on every route, Home included) and a row's moment is the first its own route can show.
    if (inventory.rows.some((r) => r.steps?.some((st) => st.clearVisit === true))) {
      await page.addInitScript(() => {
        const key = "the99.moments.visit";
        if (window.sessionStorage.getItem("contactSheet.freshVisit") === "1") {
          window.sessionStorage.removeItem("contactSheet.freshVisit");
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, JSON.stringify({ last: Date.now(), taken: true }));
        }
      });
    }
    // `"signedOut": true` on the inventory photographs a public surface with no session: no sign-in, and nothing that needs one.
    if (!inventory.signedOut) await signIn(page);
    // Signed in, `signIn` has loaded a page; signed out, nothing has, and the theme read-back below needs a document.
    else await page.goto(`${BASE}/offline`, { waitUntil: "domcontentloaded" });
    // The server draws Low Sun for a key it does not know and a survivor for a retired one (`themeFor`), so a typo
    // would photograph another theme under the asked-for folder name. Read back what the page actually drew.
    if (THEME) {
      const drawn = await page.evaluate(() => document.documentElement.dataset.theme ?? null);
      if (drawn !== THEME) throw new Error(`THEME=${THEME}, but the page drew data-theme="${drawn}".`);
    }
    // `"clearAbout": true` marks the About gate seen before the first row, through the one helper every
    // probe uses, so the first load photographs the surface rather than `/about` (swap tools close-out:
    // the first row of every width failed on the redirect). Opt-in, because the /about inventory
    // photographs the gate itself. Both About columns are captured first and put back in the `finally`
    // (the ids `clearAboutSheet` adds included), once, from the first width's capture.
    if (inventory.clearAbout && inventory.signedOut) throw new Error("clearAbout needs a signed-in account; the inventory is signedOut.");
    if (inventory.clearAbout) {
      const userId = await page.evaluate(() => window.Clerk?.user?.id ?? null);
      if (!userId) throw new Error("clearAbout: signed in, but Clerk reports no user.");
      aboutPrior ??= await captureAboutSeen(userId);
      await clearAboutSheet(page, userId);
    }
    for (const row of inventory.rows) {
      // A surface that only EXISTS at one width says so, and the other width is
      // not a failed cell. `/collection`'s filter sheet is the case: below 1000px
      // the route draws a sheet, above it a row of popovers, and clicking
      // `Filter cards` at 1300 times out because there is no such control — which
      // is the routes behaving, not a gap. Without this the run reports a failure
      // and exits 1 on a feature that is entirely correct, and a red cell nobody
      // can act on is worse than no cell.
      if (Array.isArray(row.widths) && !row.widths.includes(size.label)) {
        console.log(`· ${row.id} · ${size.label} — not drawn at this width`);
        continue;
      }
      const file = path.join(outDir, `${row.id}-${size.label}.png`);
      let note = "";
      try {
        await run(page, row.steps);
        // `"fullPage": true` (on the inventory or one row) photographs the whole page rather than the viewport: a public
        // page (F3) is read top to bottom, and its last section is where a state's difference shows.
        await page.screenshot({ path: file, fullPage: row.fullPage ?? inventory.fullPage ?? false });
      } catch (error) {
        note = String(error).split("\n")[0].slice(0, 120);
        await page.screenshot({ path: file }).catch(() => {});
      }
      // A row that went offline must not leave the next row photographing an offline app.
      await context.setOffline(false);
      shots.push({ id: row.id, label: row.label, size: size.label, file, note });
      console.log(`${note ? "✗" : "✓"} ${row.id} · ${size.label}${note ? ` — ${note}` : ""}`);
    }
    await context.close();
    if (widthBrowser !== browser) {
      cameraBrowsers.delete(widthBrowser);
      await widthBrowser.close();
    }
  }

  // The sheet itself: a page of the photographs, screenshotted. No image library,
  // nothing to install, and the montage is a real file that can be attached.
  const sheetPage = await (await browser.newContext({
    viewport: { width: 1800, height: 1200 },
  })).newPage();
  // Inlined as data URIs rather than linked with `file://`: the sheet is built on
  // `about:blank`, which is a different origin, and every image came out blank.
  const cards = await Promise.all(shots.map(async (s) => {
    const data = await readFile(s.file).then((b) => b.toString("base64")).catch(() => null);
    const img = data
      ? `<img src="data:image/png;base64,${data}" />`
      : `<div class="missing">no screenshot</div>`;
    return `
    <figure>
      ${img}
      <figcaption>${s.label} · ${s.size}${s.note ? ` <b>— ${s.note}</b>` : ""}</figcaption>
    </figure>`;
  })).then((x) => x.join(""));
  await sheetPage.setContent(`
    <style>
      body { background: #14110E; color: #EDE6D8; font: 13px/1.4 ui-sans-serif, system-ui; margin: 0; padding: 20px; }
      h1 { font-size: 16px; margin: 0 0 14px; }
      .grid { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-start; }
      figure { margin: 0; width: 420px; }
      img { width: 100%; border: 1px solid #3A3229; display: block; }
      figcaption { padding-top: 6px; color: #A89B84; }
      .missing { height: 200px; display: grid; place-items: center; border: 1px dashed #6E6654; color: #6E6654; }
      b { color: #E8927C; }
    </style>
    <h1>${inventory.feature} — every route, both widths</h1>
    <div class="grid">${cards}</div>
  `);
  await sheetPage.waitForTimeout(600);
  const sheet = path.join(outDir, "sheet.png");
  await sheetPage.screenshot({ path: sheet, fullPage: true });
  console.log(`\nsheet: ${sheet}`);
  // THE BACKSTOP. A run that photographed nothing is a silent success whatever
  // caused it — no rows, an empty `widths`, every row skipped by its own
  // `widths`, or something nobody has thought of yet. Naming those causes one by
  // one is a list that needs maintaining and is never finished; this catches the
  // class, and the `widths` loop above still names the one cause it can.
  if (shots.length === 0) {
    console.log(
      "\nNOTHING WAS PHOTOGRAPHED. A sheet with no cells in it is not coverage —"
        + " check the inventory's rows and their `widths`.",
    );
    process.exitCode = 1;
  }
  const failed = shots.filter((s) => s.note);
  if (failed.length) {
    console.log(
      `\n${failed.length} of ${shots.length} cells did not reach their surface.`
        + " The sheet is still written; those cells have no evidence in them.",
    );
    process.exitCode = 1;
  }
} finally {
  await Promise.all([...cameraBrowsers].map((b) => b.close().catch(() => {})));
  // A restore that fails leaves the account's About state changed, so the run fails with it rather
  // than reading as a clean sheet over a dirty account. The browser still closes.
  if (aboutPrior) {
    try {
      await restoreAboutSeen(aboutPrior);
    } catch (error) {
      console.error("COULD NOT RESTORE the About row; the account's About state is changed:", error);
      process.exitCode = 1;
    }
  }
  await browser.close();
}
