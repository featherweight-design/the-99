// probe:modal-sweep — the phone entrance of a ModalChrome dialog, pressed in a real browser at 390x844 and 1300x820
// (Hugh, 2026-11-21: "make them all match": a sheet slides up on a phone and is instant on desktop). It opens
// About > Report a problem (drawn in `ModalChrome`, as are ~22 other dialogs, so one caller proves the class) and asserts, at open:
//   390:  the dialog runs a `filter-sheet-in` animation (read from the computed `animation-name` the frame it mounts);
//   1300: the dialog runs no animation.
// Its one write: About draws the Report row only with FEEDBACK_ENABLED on, and /friends needs the friend switches, so the run adds per-user `flag_overrides`
// rows (marked `updated_by = probe:modal-sweep`, only when the account has none of its own) and deletes it in `finally`.
// Production and staging are refused by `neon.branch_id`. DATABASE_URL must be the database the dev server reads.
//
//   PROBE_BASE=http://localhost:3291 node scripts/probe-modal-sweep.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertNotSharedBranch, assertScratchBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL"]);
const sql = neon(DATABASE_URL);
const MARK = "probe:modal-sweep";
const SWITCHES = ["FEEDBACK_ENABLED"];
if (!EMAIL.includes("+clerk_test")) throw new Error("Use a +clerk_test account (see the local-auth note).");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error("This probe runs against a local dev server only.");

const WIDTHS = [
  { label: 390, viewport: { width: 390, height: 844 } },
  { label: 1300, viewport: { width: 1300, height: 820 } },
];

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
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

/** Switch Report on for this account, unless it already has a row of its own. The server memoizes the switch
 *  overrides for 30s (`SNAPSHOT_TTL_MS`), and the sign-in just read them, so a new row waits that out. */
let switched = false;
async function switchOn(userId, page) {
  if (switched) return;
  switched = true;
  let added = false;
  for (const name of SWITCHES) {
    const [own] = await sql`select 1 from flag_overrides where "switch" = ${name} and scope = 'user' and user_id = ${userId}`;
    if (own) continue;
    await sql`insert into flag_overrides ("switch", scope, user_id, value, updated_by) values (${name}, 'user', ${userId}, 'on', ${MARK})`;
    added = true;
  }
  if (added) await page.waitForTimeout(31_000);
}

/** Press `open` until the dialog at `selector` mounts (a hydrating page can swallow a press), recording the animation
 *  name the frame it mounts. */
async function openCheck(page, check, name, selector, open, tries = 4) {
  for (let i = 0; ; i += 1) {
    await page.evaluate((sel) => {
      window.__seen = null;
      const mo = new MutationObserver(() => {
        const d = document.querySelector(sel);
        if (d && !window.__seen) { window.__seen = getComputedStyle(d).animationName; mo.disconnect(); }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }, selector);
    const opened = await open().then(() => true, (e) => {
      report(name, false, String(e?.message ?? e).split("\n").slice(0, 8).join(" | "));
      return false;
    });
    if (!opened) return;
    if (await page.locator(selector).first().waitFor({ timeout: 5_000 }).then(() => true, () => false)) break;
    if (i >= tries - 1) {
      const seen = await page.evaluate(() => [...document.querySelectorAll("[role=dialog]")].map((d) => `${d.getAttribute("aria-label")}:${d.className.slice(0, 40)}:kids=${d.children.length}`).join(" | "));
      throw new Error(`${name} never opened (dialogs: ${seen || "none"})`);
    }
  }
  check(name, { found: true, css: await page.evaluate(() => window.__seen) });
}

/** The seeded rows: a fully-claimed card (owned once, claimed by one deck, so card details offers "Change copy") and a card
 *  on a Shopping line (a deck holding a card the account does not own, so "Got it" appears). They WRITE (a deck and its
 *  cards for the probe's own account), so they run only with `--branch=<id>` naming the scratch branch this database is:
 *  the probe refuses when the connection is any other branch. Every row is the probe's own, found again by SEED_DECK. */
const SEED_DECK = "probe:modal-sweep seed";
const BRANCH_ARG = process.argv.find((a) => a.startsWith("--branch="))?.slice("--branch=".length) ?? null;
let seeded = null;
let seedFailed = false;
let walkUser = null;
async function seedRows(userId, branch) {
  assertScratchBranch(branch, "probe:modal-sweep seeded checks");
  if (BRANCH_ARG !== branch) throw new Error(`the seeded checks write rows: pass --branch=<the scratch branch id>; this connection is ${branch}, --branch is ${BRANCH_ARG ?? "absent"}`);
  const [claimed] = await sql`
    select ci.oracle_id, c.name from collection_items ci join cards c on c.oracle_id = ci.oracle_id
    where ci.user_id = ${userId}
      and not exists (select 1 from deck_cards dc join decks d on d.id = dc.deck_id where d.user_id = ${userId} and dc.oracle_id = ci.oracle_id)
    group by ci.oracle_id, c.name having sum(ci.quantity) = 1 order by c.name limit 1`;
  const [unowned] = await sql`
    select c.oracle_id, c.name from cards c
    where c.name ~ '^[A-Za-z ]+$' and exists (select 1 from printings p where p.oracle_id = c.oracle_id)
      and not exists (select 1 from collection_items ci where ci.user_id = ${userId} and ci.oracle_id = c.oracle_id)
    order by c.name limit 1`;
  if (!claimed || !unowned) throw new Error(`no card to seed with (claimed ${claimed?.name ?? "none"}, unowned ${unowned?.name ?? "none"})`);
  const [src] = await sql`select commander_oracle_id from decks where user_id = ${userId} and commander_oracle_id is not null limit 1`;
  const [deck] = await sql`insert into decks (user_id, name, commander_oracle_id, filled) values (${userId}, ${SEED_DECK}, ${src?.commander_oracle_id ?? null}, true) returning id`;
  await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}, ${claimed.oracle_id}, 1), (${deck.id}, ${unowned.oracle_id}, 1)`;
  // A claim is read off a deck's newest COMMITTED version, so commit one holding the claimed card: it reads owned once,
  // spoken for, in one deck. (Deleting the deck cascades its versions.)
  if (!src?.commander_oracle_id) throw new Error("no deck with a commander to borrow one from for the seed version");
  const [version] = await sql`insert into deck_versions (deck_id, number, commander_oracle_id) values (${deck.id}, 1, ${src.commander_oracle_id}) returning id`;
  await sql`insert into deck_version_cards (version_id, oracle_id, quantity) values (${version.id}, ${claimed.oracle_id}, 1), (${version.id}, ${unowned.oracle_id}, 1)`;
  seeded = { claimed: claimed.name, unowned: unowned.name, unownedId: unowned.oracle_id, deckId: deck.id };
}
// Adding the cart line's card writes a collection row and a history entry of its own (source `shopping:<deck id>`): the account owned
// none of that card before the seed (seedRows picks one it does not), so removing them restores the account.
async function unseed(userId) {
  const ids = (await sql`select id from decks where user_id = ${userId} and name = ${SEED_DECK}`).map((r) => r.id);
  if (seeded?.unownedId) {
    await sql`delete from collection_items where user_id = ${userId} and oracle_id = ${seeded.unownedId}`;
    for (const id of ids) {
      await sql`update collection_history set reverted_by = null, reverts_id = null where user_id = ${userId} and source = ${`shopping:${id}`}`;
      await sql`delete from collection_history where user_id = ${userId} and source = ${`shopping:${id}`}`;
    }
  }
  if (ids.length) {
    await sql`delete from deck_cards where deck_id = any(${ids})`;
    await sql`delete from decks where id = any(${ids})`;
  }
  const [{ n }] = await sql`select count(*)::int as n from decks where user_id = ${userId} and name = ${SEED_DECK}`;
  const [{ m }] = seeded?.unownedId ? await sql`select count(*)::int as m from collection_items where user_id = ${userId} and oracle_id = ${seeded.unownedId}` : [{ m: 0 }];
  report("the probe's seeded deck and its bought card are removed", n === 0 && m === 0, `${n} deck(s), ${m} collection row(s) left`);
  seeded = null;
}

/** The landing draws only with PUBLIC_LANDING_ENABLED on, and its "What credits cost" link only with PAYMENTS_ENABLED on and both
 *  Stripe Price ids set (start the dev server with STRIPE_PRICE_PACK_40 and STRIPE_PRICE_PLAN_MONTHLY set to any text: the sheet
 *  shows prices, it never calls Stripe). Adds an app-wide row for each switch that has none; the `finally` removes only this probe's. */
async function landingSwitchesOn(page) {
  let added = false;
  for (const name of ["PUBLIC_LANDING_ENABLED", "PAYMENTS_ENABLED"]) {
    const [own] = await sql`select 1 from flag_overrides where "switch" = ${name} and scope = 'app'`;
    if (own) continue;
    await sql`insert into flag_overrides ("switch", scope, value, updated_by) values (${name}, 'app', 'on', ${MARK})`;
    added = true;
  }
  if (added) await page.waitForTimeout(31_000);
}

/** The landing's "What credits cost" sheet (CostSheet), signed out: a phone slide, instant on desktop. */
async function landing(browser, width) {
  const context = await browser.newContext({ viewport: width.viewport });
  const page = await context.newPage();
  const phone = width.label === 390;
  try {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    const link = page.getByRole("button", { name: "What credits cost" }).first();
    await link.waitFor({ timeout: 30_000 });
    await openCheck(page, (name, info) => {
      const sheetIn = info.css === "filter-sheet-in";
      report(`${width.label}: ${name} ${phone ? "slides in" : "is instant"}`, info.found && (phone ? sheetIn : info.css === "none"), `animationName ${info.css}`);
    }, "landing > What credits cost", '[data-testid="cost-sheet"]', () => link.click());
  } finally {
    await context.close();
  }
}

/** Navigate, retrying: a page that spends a recovery token redirects to itself, which aborts the first navigation. */
async function gotoPath(page, path) {
  for (let i = 0; i < 3 && new URL(page.url()).pathname !== path; i += 1) {
    await page.waitForTimeout(1_500);
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 180_000 }).catch(() => {});
  }
}

async function walk(browser, width) {
  const context = await browser.newContext({ viewport: width.viewport });
  const page = await context.newPage();
  const L = (s) => `${width.label}: ${s}`;
  const phone = width.label === 390;
  const check = (name, info) => {
    const sheetIn = info.css === "filter-sheet-in";
    report(L(`${name} ${phone ? "slides in" : "is instant"}`), info.found && (phone ? sheetIn : info.css === "none"), `animationName ${info.css}`);
  };
  try {
    const userId = await signIn(page);
    await switchOn(userId, page);
    seeded = null;
    await seedRows(userId, branch).catch((e) => { seedFailed = true; report("the seeded rows", false, String(e?.message ?? e)); });
    walkUser = userId;
    await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    const press = page.locator("[data-about-report] button");
    await press.waitFor({ timeout: 30_000 });
    await openCheck(page, check, "About > Report a problem", '[data-testid="receipt-modal"]', () => page.locator("[data-about-report] button").click(), 12);
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/modal-sweep-report-${width.label}.png` });
    await page.keyboard.press("Escape");

    // A deck page: the commander sheet is ModalChrome inside the deck's own containers.
    const [deck] = await sql`select id from decks where user_id = ${userId} order by created_at limit 1`;
    if (!deck) {
      report(L("a deck to open"), false, "the signed-in account owns no deck on this database");
    } else {
      await page.goto(`${BASE}/decks/${deck.id}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
      await openCheck(page, check, "deck page > Change commander", '[data-testid="receipt-modal"]', () => page.getByRole("button", { name: "Change commander" }).first().click());
      // Closed for real before the next press: a sheet still open holds the scroll lock and Playwright stalls on the next click.
      for (let i = 0; i < 3 && (await page.locator('[data-testid="receipt-modal"]').count()) > 0; i += 1) {
        await page.keyboard.press("Escape");
        await page.locator('[data-testid="receipt-modal"]').first().waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
      }
      // Hand-rolled deck sheets (B1). Export draws its phone sheet inside a positioning wrapper, so the phone reads that child. It is found by its own `md:hidden` class, never by the fix's class, so on main the probe still finds the element and reads `none`.
      await openCheck(page, check, "deck page > Export", phone ? '[role=dialog] > [class~="md:hidden"]' : "[role=dialog]", async () => {
        // The page is still easing out of the previous sheet and Playwright can stall in scroll-into-view: wait for it to be gone, then press the button itself.
        await page.locator("[role=dialog]").first().waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
        const btn = page.getByRole("button", { name: /^Export/ }).first();
        await btn.click({ timeout: 10_000 }).catch(() => btn.evaluate((el) => el.click()));
      });
      await page.keyboard.press("Escape");
    }

    // /decks: the New folder dialog, a centred card on desktop and (Hugh, 2026-11-21) a bottom sheet on a phone.
    await gotoPath(page, "/decks");
    if (phone) {
      // Under 1000 the shelf line is one "Folders" button that opens the shelf sheet; its last row makes the folder.
      await openCheck(page, check, "decks > Folders sheet", "[role=dialog]", () => page.locator('button[aria-label^="Folder:"]').first().click());
      await openCheck(page, check, "decks > New folder", "[role=dialog]:has(input)", () => page.locator("[role=dialog]").getByRole("button", { name: /New folder/ }).first().click());
    } else {
      await openCheck(page, check, "decks > New folder", "[role=dialog]", () => page.getByRole("button", { name: /New folder/ }).first().click());
    }
    await page.keyboard.press("Escape");

    // A SocialModal (its own chrome, anim-sheet-in): the same entrance, and it opens on its heading.
    // /friends may spend a recovery token and redirect to itself, which aborts the first navigation.
    await gotoPath(page, "/friends");
    await page.getByRole("button", { name: /^Add a friend$/ }).first().waitFor({ timeout: 30_000 }).catch(async (e) => {
      console.log("   url", page.url(), "|", (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 500));
      throw e;
    });
    await openCheck(page, check, "friends > Add a friend (SocialModal)", "[role=dialog]", () => page.getByRole("button", { name: /^Add a friend$/ }).first().click());
    const onHeading = await page.evaluate(() => document.activeElement?.tagName === "H2");
    report(L("SocialModal opens with its heading focused"), onHeading, onHeading ? "" : "focus is elsewhere");
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/modal-sweep-social-${width.label}.png` });
    await page.keyboard.press("Escape");

    // The got-it confirm over a Shopping row. It opens only: nothing is bought or written.
    await gotoPath(page, "/decks/shopping");
    await openCheck(page, check, "shopping > Got it confirm", "[role=dialog]", () => page.locator('button[aria-label^="Bought "]').first().click());
    await page.keyboard.press("Escape");

    // The seeded rows: the fully-claimed card's copy chooser (it sits over the card modal, which carries `aria-owns`, so the
    // chooser is the dialog without it), then the cart line's got-it confirm and, once bought, the receipt's Undo warning.
    if (seeded) {
      await gotoPath(page, `/collection?view=rows&q=${encodeURIComponent(seeded.claimed)}`);
      const rowName = new RegExp(`^${seeded.claimed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},`);
      await openCheck(page, check, "card details > Change copy chooser (seeded claimed card)", "[role=dialog][aria-modal=true]:not([aria-owns])", async () => {
        const link = page.locator('[data-testid="change-copy-link"]').locator("visible=true").first();
        if (!(await link.isVisible().catch(() => false))) await page.getByRole("button", { name: rowName }).first().click({ timeout: 8_000 });
        // On a phone the details sit behind "All details".
        if (!(await link.isVisible().catch(() => false))) await page.getByRole("button", { name: /^All details/ }).first().click({ timeout: 3_000 }).catch(() => {});
        await link.click({ timeout: 8_000 });
      }, 6);
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");

      await gotoPath(page, "/decks/shopping");
      await openCheck(page, check, "shopping > Got it confirm (seeded cart line)", "[role=dialog][aria-modal=true]", () => page.locator(`button[aria-label^="Bought "][aria-label*="${seeded.unowned}"]`).first().click({ timeout: 8_000 }));
      await page.getByRole("button", { name: /^Add\b/ }).locator("visible=true").first().click({ timeout: 8_000 });
      await openCheck(page, check, "shopping > Got it receipt Undo warning (seeded cart line)", "[role=dialog][aria-modal=true]", async () => {
        // The Undo check asks the server what the revert would cost the decks before it draws the warning, so the first press can
        // outlast openCheck's own wait (and press again): press once and give the sheet its time.
        const undo = page.locator('button[aria-label^="Undo adding"]').first();
        if (await undo.count()) await undo.click({ timeout: 15_000 });
        const dialog = page.locator("[role=dialog][aria-modal=true]").first();
        await dialog.waitFor({ timeout: 25_000 });
        // The sheet may have mounted while the first press was still waiting; read its entry from the element itself.
        await page.evaluate((el) => { window.__seen ??= el ? getComputedStyle(el).animationName : null; }, await dialog.elementHandle());
      });
      await page.keyboard.press("Escape");
    }

    // PR C: the set page's phone filter sheet (FilterSheet, phone only: it is not drawn from 768, so only 390 is checked).
    // The friends page can still be settling a navigation of its own, which aborts this one: let it land, and retry once.
    await page.waitForTimeout(1500);
    for (let attempt = 0; ; attempt++) {
      try {
        await page.goto(`${BASE}/collection/sets/lea`, { waitUntil: "domcontentloaded", timeout: 180_000 });
        break;
      } catch (error) {
        if (attempt >= 2 || !/ERR_ABORTED/.test(String(error?.message))) throw error;
        await page.waitForTimeout(1500);
      }
    }
    if (phone) {
      await openCheck(page, check, "set page > Filters (FilterSheet)", "[role=dialog]", () => page.getByRole("button", { name: /^Filters/ }).first().click());
      await page.keyboard.press("Escape");
    }

    // PR B2: the collection's Add cards sheet (SHEET_PANEL_CLASS: full height on a phone, a side sheet from 768).
    await gotoPath(page, "/collection");
    await openCheck(page, check, "collection > Add cards (sheet)", "[role=dialog]", () => page.locator(phone ? '[data-testid="collection-add-phone"]' : '[data-testid="collection-add"]').first().click(), 12);
    await page.keyboard.press("Escape");
  } finally {
    await context.close();
    if (walkUser && (seeded || seedFailed)) await unseed(walkUser).catch((e) => report("the probe's seeded deck is removed", false, String(e?.message ?? e)));
  }
}

const [{ branch } = {}] = await sql`select current_setting('neon.branch_id', true) as branch`;
assertNotSharedBranch(branch, "probe:modal-sweep");
await clerkSetup();
const browser = await chromium.launch();
try {
  const warm = await browser.newPage();
  await landingSwitchesOn(warm);
  await warm.close();
  for (const width of WIDTHS) {
    try {
      await landing(browser, width);
      await walk(browser, width);
    } catch (error) {
      report(`${width.label}: the walk stopped`, false, String(error?.message ?? error).split("\n")[0]);
    }
  }
} finally {
  await browser.close();
  try {
    await sql`delete from flag_overrides where updated_by = ${MARK}`;
    const [{ n }] = await sql`select count(*)::int as n from flag_overrides where updated_by = ${MARK}`;
    report("the probe's switch row is removed", n === 0, `${n} left`);
  } catch (error) {
    report("the probe's switch row is removed", false, String(error?.message ?? error));
  }
}
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
