// probe:upcoming-precons-ui — the Announced group on /decks/precons (upcoming precons, plan PR 2), pressed in a real
// browser at 390x844 and 1300x900:
//
//  - a visit with an unseen arrival opens the group by itself, tags the set `new`, draws its revealed commanders and,
//    for a set with none, the plate; and the visit WRITES the seen key (`user_prefs.upcoming_seen_codes`);
//  - so the next load is closed (C1), with the next release in the head's count;
//  - the head is a disclosure whose press this browser remembers (`the99:precons:announced`);
//  - in rows, each set is a row that opens its own cards, and a set with nothing revealed does not open (Q2, Q3, R2);
//  - with Most owned saved in this browser, the plain address hides the group, and the banner's link
//    (`?sort=newest#announced`) still lands on it, open (the explicit `sort=newest` beats the saved order);
//  - `?sort=owned` hides the group (T7).
//
//  - revealed commanders open card details (Hugh, 2026-10-15, reversing G2): in tiles they sit in the decklists'
//    grid inside the set's dashed block (ruling option 3): the same column count, the grid narrower by exactly the
//    block's inset; the whole tile is the press (art and caption both open it), Enter on a focused one opens it,
//    Escape hands focus back, the tile's focus ring is visible on all four sides (no clipping ancestor cuts it), and
//    at 1300 a hover over the art draws the shared hover preview; the none plate stays a small note;
//  - in rows, an opened row's strip keeps its small cards (76x106 at 390, 84x117 at 1300) and the row's lead thumb
//    its 34x48; at 390 the six-card strip scrolls sideways and is a named region whose CARDS are the keyboard stops
//    (Tab reaches one and scrolls it into view); at 1300 it wraps and is no region;
//  - the catalog's own many-commander set, when local-dev holds one upcoming (Star Trek Commander, ~15), folds to one
//    row behind the shared toggle when it holds more than twice the grid's columns (addendum A1): Show all opens every
//    tile in place with focus kept on the toggle, card details page all of them hidden or not, Show fewer folds back
//    with the toggle in the window; and at no point does the page scroll sideways at 390.
//
// FIXTURES, on local-dev only: two upcoming Commander sets (`zqa` with six revealed legendary creatures, printed from
// cards the catalog already holds; `zqb` with none), `zqa`'s non-baseline `catalog_first_seen` stamp (an arrival), and
// the reader's seen keys for those two codes cleared before each width. Everything the probe added is deleted in the
// `finally`, and the account's `user_prefs` row is put back exactly as it was before the run (deleted if the probe
// created it, else its `upcoming_seen_codes` restored): a visit acknowledges EVERY arrival, not only the fixtures'. It fails closed on its target: `PROBE_DB_BRANCH` must name the branch
// `DATABASE_URL` reports, and staging and production are refused by id.
//
// Needs a server on PROBE_BASE with PRECONS_ENABLED=true, on the same database:
//   PROBE_BASE=http://localhost:3655 PROBE_DB_BRANCH=br-… pnpm probe:upcoming-precons-ui
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon, neonConfig } from "@neondatabase/serverless";
import { chromium } from "playwright";
import ws from "ws";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

neonConfig.webSocketConstructor = ws;

const REFUSED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess"]);
const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL, PROBE_DB_BRANCH: BRANCH } = requireEnv([
  "E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL", "PROBE_DB_BRANCH",
]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
/** Optional: a directory to photograph the group into (open in tiles, closed, and rows with a set opened). */
const SHOTS = process.env.PROBE_SHOTS ?? null;
const shoot = async (page, vp, name) => {
  if (SHOTS) await onPage(page, "#announced").first().screenshot({ path: `${SHOTS}/${vp.width}-${name}.png` });
};
const sql = neon(DATABASE_URL);

const SETS = ["zqa", "zqb"];
const NAME_A = "Probe Upcoming A";
const NAME_B = "Probe Upcoming B";
const VIEWPORTS = [
  { label: "390x844", width: 390, height: 844 },
  { label: "1300x900", width: 1300, height: 900 },
];

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

async function guardTarget() {
  if (REFUSED.has(BRANCH)) throw new Error(`probe:upcoming-precons-ui: ${BRANCH} is staging or production`);
  const [{ b }] = await sql`select current_setting('neon.branch_id', true) as b`;
  if (b !== BRANCH) throw new Error(`probe:upcoming-precons-ui: the database reports ${b}, not ${BRANCH}`);
}

async function plant() {
  await sql`insert into sets (code, name, set_type, released_at, card_count, digital) values
    ('zqa', ${NAME_A}, 'commander', ${day(30)}, 41, false),
    ('zqb', ${NAME_B}, 'commander', ${day(177)}, 1, false)`;
  // Three legendary creatures the catalog already holds, printed in zqa with their own small art.
  const picks = await sql`
    select c.oracle_id, c.name,
      (select p.image_uri_small from printings p where p.oracle_id = c.oracle_id and p.image_uri_small is not null limit 1) as art,
      (select p.image_uri from printings p where p.oracle_id = c.oracle_id and p.image_uri is not null limit 1) as big
    from cards c
    where c.type_line like 'Legendary Creature%'
      and exists (select 1 from printings p where p.oracle_id = c.oracle_id and p.image_uri_small is not null)
    order by c.oracle_id limit 6`;
  if (picks.length < 6) throw new Error("the catalog holds fewer than six legendary creatures with art");
  for (const [i, p] of picks.entries()) {
    await sql`insert into printings (scryfall_id, oracle_id, set_code, collector_number, image_uri_small, image_uri, finishes)
      values (gen_random_uuid(), ${p.oracle_id}, 'zqa', ${String(10 + i)}, ${p.art}, ${p.big}, '{nonfoil}')`;
  }
  // zqa ARRIVED yesterday (not the baseline); zqb has no stamp, so it is never news.
  await sql`insert into catalog_first_seen (kind, key, first_seen_at, baseline)
    values ('set', 'zqa', ${new Date(Date.now() - 86_400_000)}, false)`;
  return picks;
}

/** The upcoming Commander set in local-dev's own catalog with the most revealed commanders (Star Trek Commander). */
async function manySet() {
  const rows = await sql`
    select s.code, s.name, count(distinct c.oracle_id)::int as n
    from sets s join printings p on p.set_code = s.code join cards c on c.oracle_id = p.oracle_id
    where s.set_type = 'commander' and not s.digital and s.released_at > now() and s.code <> all(${SETS})
      and split_part(c.type_line, ' // ', 1) ~ 'Legendary' and split_part(c.type_line, ' // ', 1) ~ 'Creature'
    group by s.code, s.name order by n desc limit 1`;
  return rows[0]?.n >= 10 ? rows[0] : null;
}

/** A card's front face, which card details titles a double-faced card by. */
const front = (name) => name.split(" // ")[0];

/**
 * Whether a focus ring is really SEEN: the element's outline is a 2px solid ring, and no ancestor that clips (overflow
 * other than visible) cuts into the ring's extent (outline width plus offset) on any side. Computed style alone passes
 * a ring its tile clips away. Returns `[ok, detail]` for `report`.
 */
async function ringVisible(locator) {
  return locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    if (cs.outlineStyle !== "solid" || cs.outlineWidth !== "2px") return [false, `outline ${cs.outlineStyle} ${cs.outlineWidth}`];
    const ext = parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset);
    const r = el.getBoundingClientRect();
    const ring = { l: r.left - ext, t: r.top - ext, r: r.right + ext, b: r.bottom + ext };
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX === "visible" && s.overflowY === "visible") continue;
      const ar = a.getBoundingClientRect();
      const box = { l: ar.left + parseFloat(s.borderLeftWidth), t: ar.top + parseFloat(s.borderTopWidth),
        r: ar.right - parseFloat(s.borderRightWidth), b: ar.bottom - parseFloat(s.borderBottomWidth) };
      const cut = [ring.l < box.l - 0.5 && "left", ring.t < box.t - 0.5 && "top", ring.r > box.r + 0.5 && "right", ring.b > box.b + 0.5 && "bottom"].filter(Boolean);
      if (cut.length > 0) return [false, `cut ${cut.join(",")} by <${a.tagName.toLowerCase()} ${a.className.slice(0, 40)}>`];
    }
    return [true, `${cs.outlineWidth} at ${cs.outlineOffset}`];
  });
}

/** Whether the page scrolls sideways. */
const overflowsX = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 0.5);

async function cleanUp() {
  await sql`delete from catalog_first_seen where kind = 'set' and key = any(${SETS})`;
  await sql`delete from printings where set_code = any(${SETS})`;
  await sql`delete from sets where code = any(${SETS})`;
}

/** The account's `user_prefs` row before the probe touched it: whether it existed, and its seen codes. */
async function readPrior(userId) {
  const rows = await sql`select upcoming_seen_codes as k from user_prefs where user_id = ${userId}`;
  return rows.length === 0 ? { existed: false, codes: null } : { existed: true, codes: rows[0].k };
}

/** Puts that row back: deleted if the probe created it, else exactly its prior codes. */
async function restorePrior(userId, prior) {
  if (!prior.existed) await sql`delete from user_prefs where user_id = ${userId}`;
  else await sql`update user_prefs set upcoming_seen_codes = ${prior.codes} where user_id = ${userId}`;
  const now = await readPrior(userId);
  const same = now.existed === prior.existed && JSON.stringify(now.codes) === JSON.stringify(prior.codes);
  report("the account's user_prefs row is restored as it was", same, `${JSON.stringify(prior)} -> ${JSON.stringify(now)}`);
}

/** The reader's seen keys for the fixtures, cleared. An upsert, so the row's stamp moves and a cached page retires. */
async function clearSeen(userId) {
  await sql`insert into user_prefs (user_id, upcoming_seen_codes) values (${userId}, '{}')
    on conflict (user_id) do update set upcoming_seen_codes = array(
      select k from unnest(user_prefs.upcoming_seen_codes) k where k <> all(${[...SETS, ...SETS.map((s) => `lists:${s}`)]}))`;
}

async function seenKeys(userId) {
  const rows = await sql`select upcoming_seen_codes as k from user_prefs where user_id = ${userId}`;
  return rows[0]?.k ?? [];
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test") ? await signIn.create({ identifier: email }) : await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  return page.evaluate(() => window.Clerk.user?.id ?? null);
}

const head = (page) => onPage(page, "#announced h2 button");
const expanded = async (page) => (await head(page).getAttribute("aria-expanded", { timeout: 15_000 })) === "true";
const setBlock = (page, name) => onPage(page, "[data-testid=announced-set]").filter({ hasText: name });
const setRow = (page, name) => onPage(page, "[data-testid=announced-row]").filter({ hasText: name });

async function load(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await onPage(page, "h1").first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(800);
}

async function poll(fn, ms = 10_000) {
  const until = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v || Date.now() > until) return v;
    await new Promise((r) => setTimeout(r, 400));
  }
}

async function walk(browser, vp, userIdHolder) {
  const holder = userIdHolder;
  console.log(`\n${vp.label}`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 300)));
  page.on("console", (m) => { if (m.type() === "error") pageErrors.push(m.text().slice(0, 300)); });
  try {
    const userId = await signIn(page);
    userIdHolder.id = userId;
    if (userIdHolder.prior === undefined) userIdHolder.prior = await readPrior(userId);
    await clearSeen(userId);
    await page.evaluate(() => { localStorage.removeItem("the99:precons:announced"); localStorage.removeItem("the99:precons:order"); });

    // 1. News opens it, tags it, and the visit writes the key.
    await load(page, "/decks/precons");
    report("an unseen arrival opens the group by itself (C2)", await expanded(page));
    const a = setBlock(page, NAME_A);
    report("the arrived set is tagged new", (await a.getByText("new", { exact: true }).count()) === 1);
    report("its six revealed commanders are drawn as tiles", (await a.locator("[data-testid=revealed-tile]").count()) === 6);
    // Six fold at two columns (390), behind the shared toggle (addendum A1): press it open so the measurements below
    // read the whole grid, as they did before the fold existed.
    const foldToggle = a.getByRole("button", { name: /^Show all 6/ });
    if ((await foldToggle.count()) > 0) await foldToggle.click();
    const pressNames = await a.locator("[data-testid=revealed-press]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    report("each tile is a button named by its card, its colors and what it is",
      pressNames.length === 6 && pressNames.every((n, i) => n === null ? false : n.startsWith(`View details for ${holder.picks[i].name}, `) && n.endsWith(". Revealed commander.")),
      JSON.stringify(pressNames.slice(0, 2)));
    // The decklists' grid inside the set's dashed block (ruling option 3): the same column count as the newest year's
    // decklist grid, and the grid narrower than that one by exactly the block's inset (its border and padding).
    const grids = await page.evaluate((name) => {
      const cols = (ul) => new Set([...ul.children].map((li) => Math.round(li.getBoundingClientRect().x))).size;
      const set = [...document.querySelectorAll("main [data-testid=announced-set]")].find((el) => el.textContent.includes(name));
      const rUl = set.querySelector("[data-testid=revealed-tiles]");
      const pUl = document.querySelector("main section[aria-labelledby^=precons-] > ul");
      const cs = getComputedStyle(set);
      const inset = ["borderLeftWidth", "borderRightWidth", "paddingLeft", "paddingRight"].reduce((t, k) => t + parseFloat(cs[k]), 0);
      const w = (el) => el.getBoundingClientRect().width;
      return { rCols: cols(rUl), pCols: Math.min(cols(pUl), pUl.children.length), rGrid: w(rUl), pGrid: w(pUl), inset,
        rTile: w(rUl.firstElementChild), pTile: w(pUl.firstElementChild) };
    }, NAME_A);
    report("the commander tiles take the decklists' column count", grids.pCols >= Math.min(6, grids.rCols) && grids.rCols === grids.pCols,
      `${grids.rCols} vs ${grids.pCols}`);
    report("their grid is the decklists' less the dashed block's inset", Math.abs(grids.rGrid - (grids.pGrid - grids.inset)) < 0.5,
      `${grids.rGrid.toFixed(2)} vs ${grids.pGrid.toFixed(2)} - ${grids.inset}`);
    report("so a commander tile is a decklist tile less the inset over the columns",
      Math.abs(grids.rTile - (grids.pTile - grids.inset / grids.pCols)) < 0.5,
      `${grids.rTile.toFixed(2)} vs ${grids.pTile.toFixed(2)} - ${grids.inset}/${grids.pCols}`);
    const artBox = await a.locator("[data-testid=revealed-art]").first().boundingBox();
    report("its art box is 63:88", artBox && Math.abs(artBox.width / artBox.height - 63 / 88) < 0.01, artBox ? `${artBox.width.toFixed(1)}x${artBox.height.toFixed(1)}` : "");
    report("no sideways page scroll in tiles", !(await overflowsX(page)));

    // Press, Enter, focus back, hover. The press is the whole tile: a press on the ART opens it.
    const first = a.locator("[data-testid=revealed-press]").first();
    const firstArt = a.locator("[data-testid=revealed-art]").first();
    await firstArt.scrollIntoViewIfNeeded();
    const ab = await firstArt.boundingBox();
    await page.mouse.click(ab.x + ab.width / 2, ab.y + ab.height / 3);
    const dialog = page.getByRole("dialog", { name: front(holder.picks[0].name) });
    report("a press opens card details on that card", await dialog.waitFor({ state: "visible", timeout: 15_000 }).then(() => true, () => false));
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
    report("Escape closes it and hands focus back to the commander",
      await poll(() => first.evaluate((el) => document.activeElement === el), 3_000));
    const second = a.locator("[data-testid=revealed-press]").nth(1);
    await first.focus();
    await page.keyboard.press("Tab");
    report("Tab reaches the next commander", await second.evaluate((el) => document.activeElement === el));
    report("its tile draws the focus ring, visible on all four sides", ...(await ringVisible(second.locator("xpath=ancestor::li[1]"))));
    await page.keyboard.press("Enter");
    const dialog2 = page.getByRole("dialog", { name: front(holder.picks[1].name) });
    report("Enter opens card details on that card", await dialog2.waitFor({ state: "visible", timeout: 15_000 }).then(() => true, () => false));
    await page.keyboard.press("Escape");
    await dialog2.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
    report("Escape hands focus back to the commander Enter opened", await poll(() => second.evaluate((el) => document.activeElement === el), 3_000),
      await page.evaluate(() => document.activeElement?.tagName));
    if (vp.width >= 768) {
      await page.mouse.move(0, 0);
      // Over the ART, not the name: the whole tile previews.
      await a.locator("[data-testid=revealed-art]").nth(1).scrollIntoViewIfNeeded();
      const sb = await a.locator("[data-testid=revealed-art]").nth(1).boundingBox();
      await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
      await page.mouse.move(sb.x + sb.width / 2 + 10, sb.y + sb.height / 2 + 10);
      const preview = page.getByTestId("hover-preview");
      const shown = await preview.waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false);
      const bg = shown ? await preview.evaluate((el) => el.style.background) : "";
      report("1300: a hover draws the hover preview of that card's normal art", shown && bg.includes(holder.picks[1].big), bg.slice(0, 90));
      await page.mouse.move(0, 0);
      if (SHOTS) {
        await second.hover();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${SHOTS}/${vp.width}-hover.png` });
        await page.mouse.move(0, 0);
      }
    }
    // The caption is the press too.
    const thirdName = a.locator("[data-testid=revealed-press]").nth(2);
    await thirdName.click();
    const dialog3 = page.getByRole("dialog", { name: front(holder.picks[2].name) });
    report("a press on the caption's name opens card details on that card", await dialog3.waitFor({ state: "visible", timeout: 15_000 }).then(() => true, () => false));
    await page.keyboard.press("Escape");
    await dialog3.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
    const plate = await setBlock(page, NAME_B).locator("[data-testid=none-plate]").boundingBox();
    report("the none plate stays a small note, inside the dashed block", plate && Math.round(plate.width) === (vp.width < 768 ? 76 : 84),
      plate ? `${plate.width.toFixed(1)}x${plate.height.toFixed(1)}` : "no box");
    report("a set with none revealed draws the plate (T2)", (await setBlock(page, NAME_B).locator("[data-testid=none-plate]").count()) === 1);
    report("the set's name is an h3", (await a.locator("h3").first().textContent())?.trim() === NAME_A);
    report("the countdown reads in 30 days", (await a.textContent())?.includes("in 30 days") === true);
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.activeElement?.blur());
    await page.waitForTimeout(300);
    report("a long name ends in an ellipsis, as a decklist tile's does",
      await a.locator("[data-testid=revealed-press]").evaluateAll((els) => els.some((e) => e.scrollWidth > e.clientWidth) ? els.every((e) => getComputedStyle(e).textOverflow === "ellipsis") : true));
    await shoot(page, vp, "tiles-open");

    // The catalog's own many-commander set, if local-dev holds one upcoming.
    if (holder.many) {
      const m = setBlock(page, holder.many.name);
      const nm = holder.many.n;
      const tiles = m.locator("[data-testid=revealed-tile]");
      const grid = m.locator("[data-testid=revealed-tiles]");
      const visible = () => tiles.evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== "none").length);
      const columns = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(/\s+/).length);
      const folds = nm > 2 * columns;
      report(`${holder.many.name}: every revealed commander is in the page, hidden or not`, (await tiles.count()) === nm, `${await tiles.count()} of ${nm}`);
      // Addendum A1: more than twice the columns folds to one row, behind the shared toggle.
      const toggle = m.getByRole("button", { name: /^Show (all|fewer)/ });
      report(`${holder.many.name}: ${nm} tiles at ${columns} columns ${folds ? "fold to one row" : "stay whole"}`,
        (await visible()) === (folds ? columns : nm), `${await visible()} visible`);
      if (folds) {
        report(`${holder.many.name}: Show all ${nm}, collapsed, controlling the grid`,
          (await toggle.textContent())?.includes(`Show all ${nm}`) === true && (await toggle.getAttribute("aria-expanded")) === "false"
            && (await toggle.getAttribute("aria-controls")) === (await grid.getAttribute("id")));
        // The SERVER's paint: the real page with the app's own scripts blocked, so React never hydrates and only the HTML
        // and the stylesheet decide what is drawn. (Not `javaScriptEnabled: false`: Next streams a page's suspended
        // content into a hidden container and moves it into place with an inline script, so with every script off the
        // page is never laid out and nothing measures.) It already shows one row, so hydration measuring the columns
        // moves nothing.
        const bare = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, storageState: await page.context().storageState() });
        try {
          const bp = await bare.newPage();
          await bp.route("**/_next/static/**/*.js", (route) => route.abort());
          await bp.goto(`${BASE}/decks/precons#announced`, { waitUntil: "load" });
          await bp.waitForSelector("[data-testid=announced-set]", { state: "attached", timeout: 15_000 });
          await bp.waitForTimeout(500);
          const seen = await bp.evaluate((name) => {
            const block = [...document.querySelectorAll("[data-testid=announced-set]")].find((b) => b.textContent.includes(name));
            const ul = block?.querySelector("[data-testid=revealed-tiles]");
            if (!ul) return null;
            return {
              hydrated: Object.keys(ul).some((k) => k.startsWith("__react")),
              shown: [...ul.children].filter((li) => getComputedStyle(li).display !== "none").length,
              toggle: block.textContent.includes("Show all"),
              containerWidth: Math.round(ul.parentElement.getBoundingClientRect().width),
            };
          }, holder.many.name);
          report(`${holder.many.name}: the server's paint already shows one row (${columns})`, seen !== null && !seen.hydrated && seen.shown === columns && !seen.toggle, JSON.stringify(seen));
        } finally {
          await bare.close();
        }
        const hiddenReachable = await tiles.evaluateAll((els) => els.filter((e) => getComputedStyle(e).display === "none").some((e) => e.querySelector("button")?.offsetParent !== null));
        report(`${holder.many.name}: hidden tiles are out of the tab order`, !hiddenReachable);
        await toggle.click();
        const open = await visible();
        const boxes = await tiles.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { y: r.y, right: r.right }; }));
        const rows = new Set(boxes.map((b) => Math.round(b.y))).size;
        report(`${holder.many.name}: Show all opens every tile in place`, open === nm && rows > 1 && boxes.every((b) => b.right <= vp.width + 0.5), `${open} visible, ${rows} rows`);
        report(`${holder.many.name}: focus stays on the toggle after Show all`, await toggle.evaluate((el) => el === document.activeElement));
        report(`${holder.many.name}: no sideways page scroll`, !(await overflowsX(page)));
        if (SHOTS) await m.screenshot({ path: `${SHOTS}/${vp.width}-tiles-many.png` });
        // Card details page every commander of the set, hidden or not: open the first tile, press Next to the end.
        await tiles.first().locator("[data-testid=revealed-press]").click();
        const dialog = page.getByRole("dialog");
        await dialog.waitFor({ timeout: 15_000 });
        // Each press waits for its own landing (`i + 1 of n`): a read in flight swallows a press made before it arrives.
        let landed = true;
        for (let i = 1; i < nm && landed; i++) {
          await page.getByRole("button", { name: "Next card" }).first().click();
          landed = await page.getByText(`${i + 1} of ${nm}`).first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
        }
        report(`${holder.many.name}: card details page through all ${nm}`, landed);
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "detached", timeout: 15_000 }).catch(() => {});
        // Show fewer folds back, keeps the toggle in the window, and focus stays on it.
        await toggle.scrollIntoViewIfNeeded();
        await toggle.click();
        const back = await visible();
        const rect = await toggle.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
        report(`${holder.many.name}: Show fewer folds back to one row`, back === columns, `${back} visible`);
        report(`${holder.many.name}: the toggle is in the window after Show fewer`, rect.top >= 0 && rect.bottom <= vp.height, `top ${rect.top.toFixed(0)}, bottom ${rect.bottom.toFixed(0)}`);
        report(`${holder.many.name}: focus stays on the toggle after Show fewer`, await toggle.evaluate((el) => el === document.activeElement));
      } else {
        report(`${holder.many.name}: no toggle for a set that stays whole`, (await toggle.count()) === 0);
      }
    }
    const keys = await poll(async () => ((await seenKeys(userId)).includes("zqa") ? await seenKeys(userId) : null));
    report("the visit wrote the seen key", Array.isArray(keys) && keys.includes("zqa"), JSON.stringify(keys));
    report("and no key for a set that was never news", Array.isArray(keys) && !keys.includes("zqb"));

    // 2. Seen now: the next load is closed, its count naming the next release.
    await load(page, "/decks/precons");
    report("the next load is closed (C1)", !(await expanded(page)));
    const count = (await head(page).textContent()) ?? "";
    report("the closed head names the next release", /· next [A-Z][a-z]{2} \d{1,2}/.test(count), count.trim());
    report("closed, the sets are inert", (await onPage(page, "#announced-sets").getAttribute("inert")) !== null);
    await shoot(page, vp, "closed");

    // 3. A press opens it and is remembered.
    await head(page).click();
    report("a press opens it", await expanded(page));
    report("the press is stored", (await page.evaluate(() => localStorage.getItem("the99:precons:announced"))) === "open");
    await load(page, "/decks/precons");
    report("the stored press holds on the next load", await expanded(page));
    await head(page).click();
    report("a second press closes it and stores closed",
      !(await expanded(page)) && (await page.evaluate(() => localStorage.getItem("the99:precons:announced"))) === "closed");

    // 4. Rows.
    await load(page, "/decks/precons?view=rows#announced");
    report("rows: the banner's hash opens the group", await expanded(page));
    const row = setRow(page, NAME_A);
    const press = row.locator("h3 button");
    report("rows: a set row is a closed disclosure", (await press.getAttribute("aria-expanded")) === "false");
    report("rows: line 2 names the first commander and how many more", /and 5 more/.test((await row.textContent()) ?? ""));
    await press.click();
    await page.waitForTimeout(300);
    report("rows: a press opens the row's cards (Q3)",
      (await press.getAttribute("aria-expanded")) === "true" && (await row.locator("[data-testid=revealed-card]:visible").count()) === 6);
    // The rest of rows on an address with no fragment: card details' close is a history `back()`, and on an address
    // carrying `#announced` a pop leaves focus on <body> (measured: a bare `pushState` and `back()` drop a focused
    // card's focus there, and keep it on the same page with no fragment), so focus cannot come back to the commander
    // on that address. That is the history pop's, not this group's: the same holds for any card trigger.
    await load(page, "/decks/precons?view=rows");
    if (!(await expanded(page))) await head(page).click();
    await press.click();
    await page.waitForTimeout(300);
    const lead = await row.locator("h3 button img, h3 button [data-testid=row-plate]").first().boundingBox();
    report("rows: the row's lead thumb is 34x48, as before", lead && Math.round(lead.width) === 34 && Math.round(lead.height) === 48,
      lead ? `${lead.width.toFixed(1)}x${lead.height.toFixed(1)}` : "no box");
    const want = vp.width < 768 ? [76, 106] : [84, 117];
    const card = await row.locator("[data-testid=revealed-press]").first().boundingBox();
    report(`rows: the strip's cards keep their ${want.join("x")}`, card && Math.round(card.width) === want[0] && Math.round(card.height) === want[1],
      card ? `${card.width.toFixed(1)}x${card.height.toFixed(1)}` : "no box");
    const strip = row.locator("[data-testid=revealed-strip]");
    if (vp.width < 768) {
      report("390: the strip scrolls sideways and is a named region, not a stop of its own",
        (await strip.getAttribute("role")) === "region" && (await strip.getAttribute("tabindex")) === null
          && (await strip.getAttribute("aria-label")) === "6 revealed commanders"
          && (await strip.evaluate((el) => el.scrollWidth > el.clientWidth)));
      await press.focus();
      for (let i = 0; i < 6; i += 1) await page.keyboard.press("Tab");
      const last = row.locator("[data-testid=revealed-press]").last();
      report("390: Tab walks the cards to the last, scrolling the strip", (await last.evaluate((el) => document.activeElement === el))
        && (await strip.evaluate((el) => el.scrollLeft)) > 0);
      report("390: no sideways page scroll in rows", !(await overflowsX(page)));
    } else {
      report("1300: the wrapped strip is no region and no stop", (await strip.getAttribute("tabindex")) === null && (await strip.getAttribute("role")) === null);
    }
    const rowCard = row.locator("[data-testid=revealed-press]").nth(2);
    // From the keyboard, so the ring is the focus-visible one a keyboard reader sees.
    await row.locator("[data-testid=revealed-press]").nth(1).focus();
    await page.keyboard.press("Tab");
    report("rows: a strip card focused from the keyboard draws a ring visible on all four sides", ...(await ringVisible(rowCard)));
    await page.keyboard.press("Enter");
    const rowDialog = page.getByRole("dialog", { name: front(holder.picks[2].name) });
    report("rows: Enter on a strip card opens card details on that card", await rowDialog.waitFor({ state: "visible", timeout: 15_000 }).then(() => true, () => false));
    await page.keyboard.press("Escape");
    await rowDialog.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
    report("rows: and focus comes back to it", await poll(() => rowCard.evaluate((el) => document.activeElement === el), 3_000),
      await page.evaluate(() => document.activeElement?.tagName));
    if (vp.width >= 768) {
      await page.mouse.move(0, 0);
      await rowCard.hover();
      const preview = page.getByTestId("hover-preview");
      report("1300 rows: a hover draws the hover preview", await preview.waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false));
      await page.mouse.move(0, 0);
    }
    await rowCard.click();
    report("rows: a press opens card details on that card", await rowDialog.waitFor({ state: "visible", timeout: 15_000 }).then(() => true, () => false));
    await page.keyboard.press("Escape");
    await rowDialog.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
    await shoot(page, vp, "rows-open");
    const none = setRow(page, NAME_B);
    report("rows: a set with nothing revealed does not open (R2)",
      (await none.locator("button").count()) === 0 && (await none.textContent())?.includes("No commanders revealed yet") === true);

    // 5. Most owned saved in this browser: the plain address hides the group, the banner's link does not.
    await page.evaluate(() => { localStorage.setItem("the99:precons:order", "owned"); localStorage.removeItem("the99:precons:view"); });
    await load(page, "/decks/precons");
    report("a saved Most owned hides the group", (await onPage(page, "#announced").count()) === 0);
    await load(page, "/decks/precons?sort=newest#announced");
    report("?sort=newest#announced beats the saved order: the group is drawn", (await onPage(page, "#announced").count()) === 1);
    report("and arrives open", await expanded(page));
    const box = await head(page).boundingBox();
    // The anchor scroll can leave the head a sub-pixel above the top (y=-0.4): that is in view.
    report("and the head is in the viewport", box !== null && box.y > -2 && box.y < vp.height, box ? `y=${box.y.toFixed(1)}` : "no box");

    // 6. T7.
    await load(page, "/decks/precons?sort=owned");
    report("?sort=owned hides the group (T7)", (await onPage(page, "#announced").count()) === 0);
  } finally {
    report("no page error or console error on the way", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
    await context.close();
  }
}

async function main() {
  await guardTarget();
  await clerkSetup();
  const holder = { id: null, prior: undefined };
  const browser = await chromium.launch();
  await cleanUp();
  try {
    holder.picks = await plant();
    holder.many = await manySet();
    console.log(holder.many ? `many-commander set: ${holder.many.name} (${holder.many.n})` : "no many-commander set upcoming in this catalog");
    for (const vp of VIEWPORTS) await walk(browser, vp, holder);
  } finally {
    await browser.close();
    await cleanUp();
    if (holder.id && holder.prior !== undefined) await restorePrior(holder.id, holder.prior);
  }
  console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
