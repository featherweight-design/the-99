// probe:r3-addendum — the browser close-out for three shipped R3 addendum changes, at 390x844 and 1300x900. Each is a
// fact about laid-out geometry or a live attribute, which jsdom does not produce.
//
// Cases:
//   1  SUPPORT LINK (PR #2124, item 4): on /credits the Refunds line's `support@the-99.dev` mailto link takes the theme's
//      `--fg` as its text colour and `--accent` as its underline colour. Both are compared as COMPUTED values against the
//      custom properties resolved through a probe element, never against a literal. (The slow-return band is not
//      reached: the Refunds line alone proves the shared `SupportLink`.)
//   2  HELP ME CHOOSE DOCK (PR #2126, item 10): for a reader whose free allowance is SPENT with payments on, at 390 the
//      dock (`choose-dock`) is 92px (was 138), holds no `Get more credits` link, and that link draws under the
//      `Anything else?` box's caption `Kept here for when a credit comes back.`, 44px tall, on the field's left edge; the
//      dock covers none of the Sets field when it is scrolled to just above it. At 1300 the credit line beside the
//      press carries the link and the phone-only copy is not displayed.
//   3  FIND A DECK LANDING (PR #2127, item 12): `/collection?avail=free&tool=find-a-deck` at 390 opens the first card
//      with a Fits door at the FULL sheet, the door is inside the viewport and carries `data-target-halo` for about
//      2.4s, and the next card opens at the teaser (once only). At 1300 the door is visible on open and haloed, and the
//      sheet's snap attribute does not change.
//
// Fixture discipline: one per-run Clerk DEVELOPMENT-instance user (`+clerk_test` address, code 424242) and one per-run
// database account, `probe-r3-<ts>`. It writes only rows keyed to that id (model_calls, collection_items, decks, whatever
// the app itself writes on the visits) and removes them in a `finally` through `purgeAccount`, the app's own account
// delete, then deletes the Clerk user. It never signs in as, reads or writes the headless/audit account. The database
// must report a branch that is neither production nor staging, and `PROBE_DB_BRANCH` must name it. The dev server this
// drives reads the same `.env` `DATABASE_URL` (`.env` overrides an exported value), so start it from this worktree:
//
//   PAYMENTS_ENABLED=true HELP_ME_CHOOSE_ENABLED=true SWAP_TOOLS_ENABLED=true next dev -p <port>
//   PROBE_BASE=http://localhost:<port> PROBE_DB_BRANCH=br-patient-hall-a6nbonvo pnpm probe:r3-addendum
//
// Screenshots go to PROBE_SHOTS (default: ./probe-r3-addendum-shots).
import { requireEnv } from "./lib/env.mjs";
import { mkdirSync } from "node:fs";
import { setupClerkTestingToken, clerkSetup } from "@clerk/testing/playwright";
import { chromium, type Browser, type Locator, type Page } from "playwright";
import { sql } from "drizzle-orm";
import { onPage as onPageUntyped } from "./lib/surface.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

const { PROBE_DB_BRANCH, CLERK_SECRET_KEY } = requireEnv(["PROBE_DB_BRANCH", "CLERK_SECRET_KEY", "DATABASE_URL"]);
// The branch guard names the database, not the Clerk instance: a live key would create and delete a production user.
if (!CLERK_SECRET_KEY.startsWith("sk_test_")) throw new Error("refusing: CLERK_SECRET_KEY is not a development instance's");
/** `surface.mjs` is untyped; this gives its locator its type. */
const onPage = (page: Page, selector: string): Locator => onPageUntyped(page, selector);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? "./probe-r3-addendum-shots";
const RUN = `probe-r3-${Date.now()}`;
const EMAIL = `${RUN}+clerk_test@example.com`;
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1300, height: 900 },
] as const;

let failures = 0;
function report(label: string, ok: boolean, detail: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
}

const clerk = (path: string, init: RequestInit = {}) =>
  fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
  });

async function signIn(page: Page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      const signIn = w.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f: { strategy: string }) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await w.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (error as any)?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const round = (n: number) => Math.round(n * 10) / 10;
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` });

/** A property resolved the way the page resolves it: through a probe element, so `var(--fg)` becomes an rgb string. */
const resolved = (page: Page, prop: "color" | "text-decoration-color", token: string) =>
  page.evaluate(([p, t]) => {
    const el = document.createElement("span");
    el.style.setProperty(p, `var(${t})`);
    document.body.appendChild(el);
    const v = getComputedStyle(el).getPropertyValue(p);
    el.remove();
    return v;
  }, [prop, token] as const);

async function case1(page: Page, width: number) {
  await page.goto(`${BASE}/credits`, { waitUntil: "networkidle" });
  const link = onPage(page, 'a[href="mailto:support@the-99.dev"]').first();
  await link.waitFor({ timeout: 30_000 }).catch(async (e) => {
    await shot(page, `1-credits-missing-${width}`);
    throw new Error(`no support link on ${page.url()}: ${(await page.locator("main").innerText().catch(() => "")).slice(0, 200)} (${e instanceof Error ? e.message.split("\n")[0] : e})`);
  });
  await link.scrollIntoViewIfNeeded();
  const got = await link.evaluate((a) => {
    const s = getComputedStyle(a);
    return { color: s.color, decoration: s.textDecorationColor, line: s.textDecorationLine };
  });
  const fg = await resolved(page, "color", "--fg");
  const accent = await resolved(page, "text-decoration-color", "--accent");
  report(`1 · ${width} support link text takes --fg`, got.color === fg, `computed ${got.color}, --fg ${fg}`);
  report(`1 · ${width} support link underline takes --accent`, got.line.includes("underline") && got.decoration === accent, `computed ${got.decoration} (${got.line}), --accent ${accent}`);
  await shot(page, `1-credits-support-${width}`);
}

async function case2(page: Page, width: number) {
  await page.goto(`${BASE}/decks/new/choose`, { waitUntil: "networkidle" });
  const box = onPage(page, "textarea").first();
  await box.waitFor({ timeout: 60_000 });
  await box.fill("something with dinosaurs and big combat tricks");
  // The line draws after hydration.
  await page.waitForTimeout(800);
  const caption = onPage(page, "p").filter({ hasText: "Kept here for when a credit comes back." }).first();
  await caption.waitFor({ timeout: 10_000 });

  if (width < 768) {
    const dock = page.getByTestId("choose-dock");
    const dockBox = (await dock.boundingBox())!;
    report(`2 · ${width} dock height (design 92, was 138)`, Math.abs(dockBox.height - 92) <= 1, `${round(dockBox.height)}px`);
    const inDock = await dock.getByRole("link", { name: /Get more credits/ }).count();
    report(`2 · ${width} the dock holds no Get more credits link`, inDock === 0, `${inDock} links in the dock`);

    const link = onPage(page, "a").filter({ hasText: "Get more credits" }).locator("visible=true").first();
    await link.waitFor({ timeout: 10_000 });
    const geo = await link.evaluate((a) => {
      const cap = [...document.querySelectorAll("main p")].find((p) => p.textContent?.includes("Kept here for when a credit comes back."))!;
      // The box this caption belongs to: the nearest ancestor of the caption that also holds the textarea.
      let wrap: Element | null = cap;
      while (wrap && !wrap.querySelector("textarea")) wrap = wrap.parentElement;
      const field = wrap!.querySelector("textarea")!.getBoundingClientRect();
      const l = a.getBoundingClientRect();
      const c = cap.getBoundingClientRect();
      return { linkTop: l.top, linkLeft: l.left, linkH: l.height, capBottom: c.bottom, fieldLeft: field.left, below: l.top - c.bottom };
    });
    report(`2 · ${width} Get more credits sits directly under the caption`, geo.below >= -1 && geo.below <= 12, `link top ${round(geo.linkTop)}px, caption bottom ${round(geo.capBottom)}px, gap ${round(geo.below)}px`);
    report(`2 · ${width} the link is 44px tall`, Math.abs(geo.linkH - 44) <= 0.5, `${round(geo.linkH)}px`);
    report(`2 · ${width} the link's left edge is the field's`, Math.abs(geo.linkLeft - geo.fieldLeft) <= 1, `link ${round(geo.linkLeft)}px, field ${round(geo.fieldLeft)}px`);
    await link.scrollIntoViewIfNeeded();
    await shot(page, `2-choose-link-${width}`);

    // Scroll so the Sets field is just above the dock, then measure the overlap.
    const overlap = await page.evaluate(() => {
      const field = document.querySelector('[data-testid="sets-field"]') as HTMLElement | null;
      if (!field) return null;
      const dock = document.querySelector('[data-testid="choose-dock"]')!;
      const delta = field.getBoundingClientRect().bottom - (dock.getBoundingClientRect().top - 8);
      window.scrollBy(0, delta);
      const f = field.getBoundingClientRect();
      const d = dock.getBoundingClientRect();
      return { fieldBottom: f.bottom, fieldTop: f.top, dockTop: d.top };
    });
    if (overlap === null) report(`2 · ${width} the dock clears the Sets field`, false, "no Sets field found");
    else {
      await page.waitForTimeout(300);
      report(`2 · ${width} the dock does not overlap the Sets field`, overlap.fieldBottom <= overlap.dockTop + 0.5, `Sets field ${round(overlap.fieldTop)}–${round(overlap.fieldBottom)}px, dock top ${round(overlap.dockTop)}px`);
      await shot(page, `2-choose-sets-above-dock-${width}`);
    }
  } else {
    const all = onPage(page, "a").filter({ hasText: "Get more credits" });
    const n = await all.count();
    const states = await all.evaluateAll((as) =>
      as.map((a) => ({ shown: getComputedStyle(a).display !== "none" && a.getClientRects().length > 0, cls: a.className.includes("md:hidden") })),
    );
    const visible = states.filter((s) => s.shown);
    const phoneOnly = states.filter((s) => s.cls);
    report(`2 · ${width} the credit line beside the press holds the link`, visible.length === 1 && !visible[0].cls, `${n} links, ${visible.length} displayed`);
    report(`2 · ${width} the phone-only link is not displayed`, phoneOnly.length === 1 && !phoneOnly[0].shown, `${phoneOnly.length} phone-only, displayed ${phoneOnly.filter((s) => s.shown).length}`);
    const beside = await all.locator("visible=true").first().evaluate((a) => {
      const press = [...document.querySelectorAll("main button[type='submit']")].find((b) => b.getClientRects().length > 0 && getComputedStyle(b).display !== "none");
      const l = a.getBoundingClientRect();
      const p = press?.getBoundingClientRect();
      return p ? { linkTop: l.top, linkBottom: l.bottom, pressTop: p.top, pressBottom: p.bottom } : null;
    });
    report(`2 · ${width} the link is on the press's row`, beside !== null && beside.linkTop < beside.pressBottom && beside.linkBottom > beside.pressTop, beside ? `link ${round(beside.linkTop)}–${round(beside.linkBottom)}px, press ${round(beside.pressTop)}–${round(beside.pressBottom)}px` : "no press found");
    await shot(page, `2-choose-link-${width}`);
  }
}

/** Sample the door's halo attribute every 50ms until `ms` has passed: how long it was on, and when it first showed. */
async function haloWindow(page: Page, ms: number) {
  return page.evaluate(async (budget) => {
    const t0 = performance.now();
    let first: number | null = null;
    let last: number | null = null;
    while (performance.now() - t0 < budget) {
      // The DRAWN door: the carousel keeps neighbour cards mounted beside the open one, each with its own.
      const door = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Find a deck for it") && b.getClientRects().length > 0 && getComputedStyle(b).visibility !== "hidden" && b.getBoundingClientRect().width > 0 && b.closest("[inert]") === null);
      const on = door?.hasAttribute("data-target-halo") === true;
      const t = performance.now() - t0;
      if (on) { first ??= t; last = t; }
      await new Promise((r) => setTimeout(r, 50));
    }
    return { first, last, held: first !== null && last !== null ? last - first : null };
  }, ms);
}

const DOOR = (page: Page) => page.getByTestId("card-sheet").locator("button").filter({ hasText: "Find a deck for it" }).locator("visible=true");

async function case3(page: Page, width: number, cards: string[]) {
  await page.goto(`${BASE}/collection?avail=free&tool=find-a-deck`, { waitUntil: "networkidle" });
  // A tile is the card's own button: its name is its accessible name.
  const tile = (name: string) => onPage(page, "button, a, [role='button']").filter({ hasText: name }).first();
  await tile(cards[0]).waitFor({ timeout: 60_000 });
  await tile(cards[0]).click();
  const sheet = page.getByTestId("card-sheet");
  await sheet.waitFor({ timeout: 15_000 });
  const snap = () => sheet.getAttribute("data-sheet");
  const snapOpen = await snap();
  // Sample the halo from the instant the card opened.
  const halo = await haloWindow(page, 4500);
  await shot(page, `3-landing-full-${width}`).catch(() => {});
  const door = DOOR(page).first();
  if (width < 768) {
    report(`3 · ${width} the first card opens at the full sheet`, snapOpen === "full", `data-sheet="${snapOpen}"`);
  }
  const vp = page.viewportSize()!;
  const rect = await door.boundingBox();
  const inView = rect !== null && rect.y >= 0 && rect.y + rect.height <= vp.height && rect.x >= 0 && rect.x + rect.width <= vp.width;
  report(`3 · ${width} the Find a deck door is in the viewport`, inView, rect ? `door ${round(rect.x)},${round(rect.y)} ${round(rect.width)}x${round(rect.height)} in ${vp.width}x${vp.height}` : "door not found");
  report(`3 · ${width} the door carries data-target-halo for about 2.4s`, halo.held !== null && halo.first !== null && halo.first < 1500 && halo.held >= 1800 && halo.held <= 2900, `first seen at ${halo.first === null ? "never" : round(halo.first)}ms, held ${halo.held === null ? "never" : round(halo.held)}ms (sampled 50ms)`);
  if (width >= 768) {
    const snapAfter = await snap();
    report(`3 · ${width} the sheet's snap does not change`, snapAfter === snapOpen, `data-sheet "${snapOpen}" on open, "${snapAfter}" after the halo`);
  }
  // Close, then open the second card: the ask was spent.
  // At the phone, Escape steps a full sheet down to the teaser first, then closes: press until it is gone.
  for (let i = 0; i < 4 && (await sheet.count()) > 0; i += 1) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }
  await sheet.waitFor({ state: "detached", timeout: 10_000 });
  await tile(cards[1]).click();
  await page.getByTestId("card-sheet").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(600);
  const second = await page.getByTestId("card-sheet").getAttribute("data-sheet");
  if (width < 768) report(`3 · ${width} the second card opens at the teaser`, second === "teaser", `data-sheet="${second}"`);
  else report(`3 · ${width} the second card opens with no halo and an unchanged snap`, second === snapOpen, `data-sheet="${second}"`);
  const haloed = await page.locator("[data-target-halo]").count();
  report(`3 · ${width} the second card's door carries no halo (the landing is spent)`, haloed === 0, `${haloed} haloed elements`);
  await shot(page, `3-second-card-${width}`);
}

// ---- fixture ----------------------------------------------------------------------------------------------------

type Db = typeof import("../src/db").db;
let db: Db;
let userId: string | null = null;
let clerkId: string | null = null;

async function rows<T>(text: ReturnType<typeof sql>): Promise<T[]> {
  return (await db.execute(text)).rows as T[];
}

/**
 * Every row of this run's own account, found by the schema rather than a list: each public table with a `user_id`
 * column, deleted `where user_id = <run id>` and retried until a pass deletes nothing (a foreign key may need a
 * sibling gone first). `purgeAccount` is the app's own delete but reads tables a migration-behind local-dev lacks
 * (`rule_zero_tables`), and rolls back whole, so it cannot be the cleanup here. Only the run's id is ever named.
 */
async function deleteOwnRows(uid: string) {
  const tables = (await rows<{ table_name: string }>(sql`
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'user_id' order by table_name`)).map((r) => r.table_name);
  for (let pass = 0; pass < 6; pass += 1) {
    let deleted = 0;
    for (const t of tables) {
      try {
        const r = await db.execute(sql`delete from ${sql.identifier(t)} where user_id = ${uid}`);
        deleted += r.rowCount ?? 0;
      } catch { /* a foreign key waits for a later pass */ }
    }
    if (deleted === 0) return;
  }
}

async function countOwnRows(uid: string) {
  const tables = (await rows<{ table_name: string }>(sql`
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'user_id' order by table_name`)).map((r) => r.table_name);
  let n = 0;
  for (const t of tables) n += Number((await rows<{ n: string }>(sql`select count(*)::text as n from ${sql.identifier(t)} where user_id = ${uid}`))[0].n);
  return n;
}

async function seed(uid: string) {
  // Spent: the free window's rows, one more than any default limit, all `player`, all `spent`, no paid lot.
  await db.execute(sql`
    insert into model_calls (user_id, feature, origin, status)
    select ${uid}, 'intake', 'player', 'spent' from generate_series(1, 60)`);
  // Three Commander-legal cards the reader owns, and a deck whose commander is a fourth, so no owned card is in a deck
  // and each carries the Fits door.
  const owned = await rows<{ oracle_id: string; name: string; set_code: string; collector_number: string; scryfall_id: string }>(sql`
    select distinct on (c.oracle_id) c.oracle_id, c.name, p.set_code, p.collector_number, p.scryfall_id
    from cards c join printings p on p.oracle_id = c.oracle_id
    where c.commander_legal and c.type_line not like '%Land%' and c.type_line not like '%Legendary%'
      and p.image_uri is not null and length(c.name) < 24 and c.name !~ '[^A-Za-z '']'
    order by c.oracle_id, p.set_code limit 3`);
  if (owned.length < 3) throw new Error("the catalog holds fewer than three suitable cards");
  const [cmd] = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where commander_legal and type_line like 'Legendary Creature%' and oracle_text not ilike '%partner%'
    order by oracle_id limit 1`);
  await db.execute(sql`insert into decks (user_id, name, commander_oracle_id) values (${uid}, ${`${RUN} deck`}, ${cmd.oracle_id})`);
  for (const o of owned) {
    await db.execute(sql`
      insert into collection_items (user_id, oracle_id, quantity, set_code, scryfall_id, collector_number, finish)
      values (${uid}, ${o.oracle_id}, 1, ${o.set_code}, ${o.scryfall_id}, ${o.collector_number}, 'nonfoil')`);
  }
  return owned.map((o) => o.name);
}

async function run() {
  db = (await import("../src/db")).db;
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (!branch || branch !== PROBE_DB_BRANCH || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`refusing to run against ${branch}: name the non-production, non-staging branch the database reports as PROBE_DB_BRANCH.`);
  }
  console.log(`branch ${branch}, base ${BASE}, run ${RUN}`);
  mkdirSync(SHOTS, { recursive: true });

  // The per-run Clerk dev-instance user. Its id is the app's user id.
  const created = await clerk("/users", { method: "POST", body: JSON.stringify({ email_address: [EMAIL], first_name: "Probe", skip_password_requirement: true }) });
  if (!created.ok) throw new Error(`Clerk user create failed: ${created.status}`);
  clerkId = ((await created.json()) as { id: string }).id;
  userId = clerkId;
  const names = await seed(userId);
  console.log(`fixture user ${userId}; owned cards: ${names.join(", ")}`);

  await clerkSetup();
  const browser: Browser = await chromium.launch();
  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await signIn(page);
      // Only this run's own account: its About row is raised so no first-visit sheet draws over a measurement.
      await clearAboutSheet(page, userId!);
      await case1(page, vp.width);
      await case2(page, vp.width);
      await case3(page, vp.width, names);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

run()
  .catch((err) => { failures += 1; console.error(err); })
  .finally(async () => {
    try {
      if (userId) {
        await deleteOwnRows(userId);
        const left = await countOwnRows(userId);
        console.log(`cleanup: deleted ${userId}, ${left} rows left`);
        if (left !== 0) failures += 1;
      }
    } catch (err) { failures += 1; console.error("cleanup failed for the database account", err); }
    try {
      if (clerkId) {
        const r = await clerk(`/users/${clerkId}`, { method: "DELETE" });
        console.log(`cleanup: Clerk user ${clerkId} delete -> ${r.status}`);
        if (!r.ok) failures += 1;
      }
    } catch (err) { failures += 1; console.error("cleanup failed for the Clerk user", err); }
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failure(s).`);
    process.exit(failures === 0 ? 0 : 1);
  });
