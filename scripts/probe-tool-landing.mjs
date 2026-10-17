// probe:tool-landing — Try it's landing on a deck (discovery R2·2, plan `2026-10-16-discovery-r2-r3.md`, E11), opened
// in a real browser at 390x844 and 1300x900.
//
// What jsdom cannot see, and the unit tests therefore do not prove: the page, from the server's own reading of
// `?tool=` against the reader's switches, opening the tool's tab and view, its target drawing in the real tree, and
// the landing on it:
//   - the landing's halo (`data-target-halo`, never a bubble's `data-moment-halo`) on THAT tool's target and nothing else: a Tuning hub tile for a credit tool
//     (never its run press), the panel's own head with the hub off, the first other-ways press holding the tool's glyph on a
//     Shopping row,
//     the Matchups split, the Top off door;
//   - the parameter stripped (through `mirrorUrl`), the rest of the address kept;
//   - the tool's moment spent when `MOMENTS_ENABLED` is on, and nothing written when it is off;
//   - nothing pressed: no dialog, no open hub tool, the target not expanded;
//   - no bubble at all on a landing that haloes, at the landing and inside its halo: the landing TAKES the visit, so its
//     halo is the visit's one guide (E11's "with no bubble"; d9 as Hugh's proxy, 2026-10-17). A landing that haloes
//     nothing leaves the visit untouched: it is taken only by a bubble that arrived on it, which is R1's.
//   - a stale `?tool=` (unknown, a tool with no deck landing) stripped with no halo; a deck id that does not exist
//     (as a deleted deck's) draws the not-found page. A deck that exists on ANOTHER account is not tried: the fixture
//     holds one account, and the route's ownership check is `getDeckDetail`'s, unchanged here.
//
// THE DECKS: the signed-in account's own (`E2E_AUDIT_USER_EMAIL`), up to `PROBE_DECKS` (default 12). A tool is tried
// on each in turn until one draws its target; a tool no deck draws is reported SKIP, never PASS, since the
// account holds no fixture for it. On every deck tried the invariant holds either way: a drawn target is haloed, an
// undrawn one is stripped with no halo.
//
// IT WRITES one thing: `user_prefs.moments_spent` for the account (a landing spends its tool's moment). Each tool
// is landed with its id taken out of the set first, so the spend is observed, and the row is put back exactly in a
// `finally`. It calls `assertScratchBranch` before that first write, so it runs on a scratch branch off local-dev.
//
// The server: `next start` of a build with the worktree's `.env`, started with the deck tools' switches on
// (`TUNING_ENABLED`, `PROPOSED_CUTS_ENABLED`, `MANA_BALANCE_ENABLED`, `SWAP_TOOLS_ENABLED`, `SOCIAL_FRIENDS_ENABLED`,
// `SOCIAL_GAMES_ENABLED`, `ANALYSIS_TAB_ENABLED`), then again with them off; run the probe with the SAME
// `MOMENTS_ENABLED` the server has, since that is how it knows whether a spend is owed.
//
// THE PAGES (R2·3): each tool with a page of its own, landed by its `?tool=` on that page: the halo on the tool's own
// control (Help me choose's first answer, the Precons and Wishlist searches, Collection Sync's drop zone, the Tiles ·
// Stats switch, Add a friend), the parameter stripped, the moment spent. Find a deck's landing is DEFERRED: the
// parameter goes at once and the next card details opened halo `Find a deck for it` once, so the probe presses a card
// open. A control the page does not draw even without `?tool=` (the eligibility preflight) is a SKIP, never a PASS.
// With `PROBE_SWITCHES=off` (the server started with the page tools' switches off too: `HELP_ME_CHOOSE_ENABLED`,
// `PRECONS_ENABLED`, `SOCIAL_WISHLIST_ENABLED`, `COLLECTION_SYNC_ENABLED`, `LINEUP_ENABLED`), every page landing
// must draw no halo and write nothing: the route is gone (its not-found page), or the parameter is stripped.
//
//   PROBE_BASE=http://localhost:3311 MOMENTS_ENABLED=true pnpm probe:tool-landing
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { PAGE } from "./lib/surface.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, CLERK_SECRET_KEY, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "" || u.pathname !== "/") {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback server with a port only (http://localhost:3311)`);
  }
}
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
if (!CLERK_SECRET_KEY.startsWith("sk_test_")) throw new Error("refusing: CLERK_SECRET_KEY is not a development instance's");
const MOMENTS_ON = process.env.MOMENTS_ENABLED === "true";
const SWITCHES_OFF = process.env.PROBE_SWITCHES === "off";
/** `decks` or `pages` runs only that half (each is a few minutes a width); unset runs both. */
const PHASE = process.env.PROBE_PHASE ?? "all";
if (!["all", "decks", "pages"].includes(PHASE)) throw new Error(`PROBE_PHASE must be decks or pages, not ${PHASE}`);
const DECK_LIMIT = Number(process.env.PROBE_DECKS ?? 12);
const sql = neon(DATABASE_URL);

const WIDTHS = [
  { name: "390", width: 390, height: 844, phone: true },
  { name: "1300", width: 1300, height: 900, phone: false },
];

// Each deck tool, the name its moment's bubble carries (`momentsCopy`, named `${tool}, a tip`), and the elements its
// target may be, as GROUPS in order of precedence: the first group with an element drawn is where the target is, and
// within it the first such element in the document. A credit tool's group one is its hub tile; only with the hub
// off (no tile drawn) is it the panel's head (Suggested changes: its frame, or the empty state's while no reading is
// held). The other-ways press is Cheaper stand-ins' while it holds ⇄ and Friends' spares' while it holds the spare
// glyph, so each tool's selector names its own glyph.
const TOOLS = [
  // The strip's door, by its shipped accessible name (`topOffCopy.strip.openAria`).
  { id: "top-off", name: "Top off", tab: "deck", targets: [["button[aria-label^='Choose the cards for the last']"]] },
  { id: "proposed-cuts", name: "Proposed cuts", tab: "analysis", targets: [["[data-tool-tile='cuts']"], ["#cuts-heading"]] },
  {
    id: "suggested-changes",
    name: "Suggested changes",
    tab: "analysis",
    targets: [["[data-tool-tile='suggested']"], ["div:has(> [data-testid='analysis-empty'])", "section[aria-labelledby='tuning-heading']"]],
  },
  { id: "mana-balance", name: "Mana Balance", tab: "analysis", targets: [["[data-tool-tile='mana']"], ["#mana-heading"]] },
  { id: "stand-ins", name: "Cheaper stand-ins", tab: "deck", shopping: true, targets: [["[data-testid='other-ways']:has([data-testid='standin-glyph'])"]] },
  { id: "friend-spares", name: "A friend has a spare", tab: "deck", shopping: true, targets: [["[data-testid='other-ways']:has([data-testid='spare-glyph'])"]] },
  { id: "matchups", name: "Matchups", tab: "games", targets: [["section[aria-labelledby='game-matchups-heading'] [role='radiogroup']"]] },
];
// Each tool with a page of its own (R2·3): where Try it lands, and the tool's own control there, found in the page (an
// expression returning the element or null). `card`: Find a deck's deferred landing, whose control draws in the card
// details the probe opens after the landing.
const drawnFirst = (sel) => `[...document.querySelectorAll(${JSON.stringify(`${PAGE} ${sel}`)})].find((e) => e.getClientRects().length > 0) ?? null`;
const PAGE_TOOLS = [
  { id: "help-me-choose", name: "Help me choose", path: "/decks/new/choose", find: drawnFirst(`form div[class="rounded-[9px]"]`) },
  { id: "precons", name: "Precons", path: "/decks/precons", find: `(${drawnFirst("input[type='search']")})?.closest("div.min-w-0") ?? null` },
  { id: "wishlist", name: "Wishlist", path: "/collection/wishlist", find: `(${drawnFirst("input[type='search']")})?.closest("div.relative") ?? null` },
  { id: "collection-sync", name: "Collection Sync", path: "/collection/replace", find: drawnFirst("label:has(input[aria-label='Upload collection CSV'])") },
  { id: "lineup", name: "Stats for your decks", path: "/decks?view=stats", find: `(${drawnFirst("[role='tablist']:has([data-decks-view])")})?.closest("span.inline-flex") ?? null` },
  { id: "friends", name: null, path: "/friends", find: `[...document.querySelectorAll(${JSON.stringify(`${PAGE} button`)})].find((e) => e.textContent.trim() === "Add a friend" && e.getClientRects().length > 0) ?? null` },
  { id: "find-a-deck", name: "Find a deck", path: "/collection?avail=free", card: true, find: `[...document.querySelectorAll("[role='dialog'] [data-testid='fits-door']")].find((e) => e.getClientRects().length > 0) ?? null` },
];
/** How long after the landing the probe looks again for the landed tool's bubble: inside the 2.4s halo, past the
 *  moments' own arrival delay. */
const SECOND_LOOK_MS = 1500;
/** R1's visit record (`VISIT_KEY`, `src/lib/moments/visit.ts`), cleared before each landing so each starts a fresh visit. */
const VISIT_KEY = "the99.moments.visit";

let failures = 0;
let skips = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
};
const skip = (label, why) => {
  skips += 1;
  console.log(`SKIP  ${label}  (${why})`);
};

async function signIn(page, email, password) {
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
          if (!factor?.emailAddressId) return `${email} offers no usable email_code first factor.`;
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
    [email, password ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  return page.evaluate(() => window.Clerk.user.id);
}

async function readSpent(userId) {
  const rows = await sql`select moments_spent as spent from user_prefs where user_id = ${userId}`;
  return rows.length === 0 ? null : rows[0].spent;
}

/** Takes `id` out of the spent set, so its landing's spend is observed. A row that never existed stays absent. */
async function unspend(userId, id) {
  await sql`update user_prefs set moments_spent = array_remove(moments_spent, ${id}) where user_id = ${userId}`;
}

/** Whether `id` is in the spent set, read until it matches `want` or 4s pass. */
async function spentSoon(userId, id, want) {
  let has = false;
  for (let i = 0; i < 20; i += 1) {
    has = ((await readSpent(userId)) ?? []).includes(id);
    if (has === want) return has;
    await new Promise((r) => setTimeout(r, 200));
  }
  return has;
}

async function restoreSpent(userId, spent) {
  if (spent === null) await sql`update user_prefs set moments_spent = '{}' where user_id = ${userId}`;
  else await sql`update user_prefs set moments_spent = ${spent} where user_id = ${userId}`;
  const now = await readSpent(userId);
  check(JSON.stringify(now ?? []) === JSON.stringify(spent ?? []), "restore · moments_spent is as it was", JSON.stringify(now));
}

/**
 * Reads the page as the landing left it: the haloed elements, the tool's target (the first group of `targets` with
 * an element drawn, and its first such element in the document), the bubbles showing by name, whether the landed
 * tool's bubble is among them or its target wears a bubble's halo, and whether anything was pressed.
 */
function read(page, targets, noteName) {
  return page.evaluate(([targets, scope, noteName, visitKey]) => {
    // The page's own content (`surface.mjs`'s PAGE): the shell's controls around it are never a tool's target.
    const main = document.querySelector(scope);
    const drawn = (el) => el.getClientRects().length > 0 && el.closest("[hidden]") === null;
    let expected = null;
    for (const group of targets) {
      expected = group.flatMap((s) => [...main.querySelectorAll(s)]).filter(drawn)
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))[0] ?? null;
      if (expected !== null) break;
    }
    const haloed = [...document.querySelectorAll("[data-target-halo]")];
    const modal = [...document.querySelectorAll("[aria-modal='true'], [role='dialog']")].filter(drawn).length;
    const bubbles = [...document.querySelectorAll("[role='note'][data-moment-bubble]")].map((b) => b.getAttribute("aria-label") ?? "");
    let visitTaken = false;
    try {
      visitTaken = JSON.parse(localStorage.getItem(visitKey) ?? "null")?.taken === true;
    } catch {}
    return {
      visitTaken,
      search: location.search,
      haloed: haloed.length,
      onTarget: expected !== null && haloed.length === 1 && haloed[0] === expected,
      drawn: expected !== null,
      bubbles,
      ownBubble: (noteName !== null && bubbles.includes(noteName)) || expected?.hasAttribute("data-moment-halo") === true,
      pressed: modal > 0 || main.querySelector("#tuning-tool-panel") !== null || expected?.getAttribute("aria-expanded") === "true",
    };
  }, [targets, PAGE, noteName, VISIT_KEY]);
}

/** Opens `path` on a fresh visit, waits for the landing to strip `?tool=`, and reads what it did in the same task. */
async function land(page, path, targets, noteName) {
  await page.evaluate((k) => localStorage.removeItem(k), VISIT_KEY).catch(() => {});
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !new URL(location.href).searchParams.has("tool"), null, { timeout: 15_000 }).catch(() => {});
  return read(page, targets, noteName);
}

/**
 * Whether the tool's target draws on this deck through the deck's OWN controls, with no `?tool=`: its tab by `?tab=`,
 * and Shopping by its filter press. An undrawn landing on a deck where this is true is a missed landing, never a SKIP.
 */
async function drawsWithoutLanding(page, deck, tool) {
  await page.goto(`${BASE}/decks/${deck}?tab=${tool.tab}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (tool.shopping) {
    const shopping = page.locator(PAGE).getByRole("tab", { name: /^Shopping/ }).first();
    await shopping.click({ timeout: 10_000 }).catch(() => {});
  }
  await new Promise((done) => setTimeout(done, 2500));
  return page.evaluate(
    (groups) => groups.flat().some((sel) => [...document.querySelectorAll(sel)].some((el) => el.getClientRects().length > 0)),
    tool.targets,
  );
}

/** Reads a tool page as its landing left it: the haloed elements, the tool's control, bubbles, the address. */
function readPage(page, find, noteName) {
  return page.evaluate(([find, noteName, visitKey]) => {
    const expected = (0, eval)(find);
    const haloed = [...document.querySelectorAll("[data-target-halo]")];
    const bubbles = [...document.querySelectorAll("[role='note'][data-moment-bubble]")].map((b) => b.getAttribute("aria-label") ?? "");
    let visitTaken = false;
    try {
      visitTaken = JSON.parse(localStorage.getItem(visitKey) ?? "null")?.taken === true;
    } catch {}
    return {
      search: location.search,
      notFound: /There’s no page here\./.test(document.body.innerText),
      drawn: expected !== null,
      haloed: haloed.length,
      onTarget: expected !== null && haloed.length === 1 && haloed[0] === expected,
      bubbles,
      ownBubble: noteName !== null && bubbles.includes(noteName),
      expanded: expected?.getAttribute("aria-expanded") === "true",
      visitTaken,
    };
  }, [find, noteName, VISIT_KEY]);
}

/** Opens the first card on the page (Collection's grid tile, or its row) and waits for its details; false when none opens. */
async function openCard(page) {
  // The grid's tile (from md) or the phone's row: both mount, CSS shows one, and both are `aria-busy` card presses.
  const trigger = page.locator(`${PAGE} button.art-lift-host:visible, ${PAGE} button[aria-busy]:visible`).first();
  await trigger.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  if ((await trigger.count()) === 0) return false;
  await trigger.click();
  if (!(await page.waitForSelector("[role='dialog']", { timeout: 15_000 }).then(() => true, () => false))) return false;
  // The details arrive after the press. On the phone the door sits under the sheet's All details, which the reader
  // opens, as capture:about does; the landing waits for the door however long that takes (deferred). The read follows
  // at once, inside the 2.4s halo.
  const door = "[role='dialog'] [data-testid='fits-door']";
  const more = "[role='dialog'] button[aria-label='Show all details']";
  const shown = (sel) => `[...document.querySelectorAll(${JSON.stringify(sel)})].some((e) => e.getClientRects().length > 0)`;
  await page.waitForFunction(`${shown(door)} || ${shown(more)}`, null, { timeout: 15_000 }).catch(() => {});
  if (!(await page.evaluate(shown(door)))) {
    const press = page.locator(`${more}:visible`).first();
    if ((await press.count()) > 0) await press.click().catch(() => {});
    await page.waitForFunction(shown(door), null, { timeout: 5_000 }).catch(() => {});
  }
  await new Promise((done) => setTimeout(done, 400));
  return true;
}

/** Whether the tool's control draws on its page with no `?tool=` at all: the preflight a SKIP must pass. */
async function pageDrawsWithoutLanding(page, tool) {
  await page.goto(`${BASE}${tool.path}`, { waitUntil: "domcontentloaded" });
  await new Promise((done) => setTimeout(done, 2500));
  if (tool.card && !(await openCard(page))) return false;
  return (await readPage(page, tool.find, null)).drawn;
}

async function walkPages(page, w, userId) {
  for (const tool of PAGE_TOOLS) {
    await unspend(userId, tool.id);
    const label = `${w.name} page ${tool.id}`;
    const noteName = tool.name === null ? null : `${tool.name}, a tip`;
    const url = new URL(`${BASE}${tool.path}`);
    url.searchParams.set("tool", tool.id);
    url.searchParams.set("probe", "1");
    await page.evaluate((k) => localStorage.removeItem(k), VISIT_KEY).catch(() => {});
    await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !new URL(location.href).searchParams.has("tool") || /There’s no page here\./.test(document.body.innerText), null, { timeout: 15_000 }).catch(() => {});
    let r = await readPage(page, tool.find, noteName);
    const stripped = !new URLSearchParams(r.search).has("tool") && new URLSearchParams(r.search).get("probe") === "1";
    if (r.notFound) {
      // The route is gone for this reader: only right with its switch off.
      check(SWITCHES_OFF, `${label}: the route is gone (its switch off)`, `notFound, switches ${SWITCHES_OFF ? "off" : "on"}`);
      check(r.haloed === 0, `${label}: no halo on a gone route`, `${r.haloed} haloed`);
      check(!(await spentSoon(userId, tool.id, false)), `${label}: nothing written on a gone route`, "moments_spent");
      continue;
    }
    check(stripped, `${label}: the parameter is stripped, the rest kept`, r.search);
    if (tool.card) {
      // Deferred: nothing haloes before a card is opened; the next card's door does.
      check(r.haloed === 0, `${label}: nothing haloes before a card is opened`, `${r.haloed} haloed`);
      if (!(await openCard(page))) {
        skip(label, "the account's free cards draw no row to open");
        continue;
      }
      r = await readPage(page, tool.find, noteName);
    }
    const spent = await spentSoon(userId, tool.id, r.drawn && MOMENTS_ON && noteName !== null && !SWITCHES_OFF);
    if (SWITCHES_OFF) {
      check(r.haloed === 0, `${label}: switch off, no halo`, `${r.haloed} haloed`);
      check(!spent, `${label}: switch off, nothing written`, `${spent}`);
      continue;
    }
    if (!r.drawn) {
      check(r.haloed === 0, `${label}: an undrawn control draws no halo`, `${r.haloed} haloed`);
      check(!spent, `${label}: an undrawn control spends nothing`, `${spent}`);
      const own = await pageDrawsWithoutLanding(page, tool);
      if (own) check(false, `${label}: the page draws the control without the landing, so the landing missed it`, "drawn without ?tool=");
      else skip(label, "the account's page draws no such control, with or without ?tool=");
      continue;
    }
    check(r.onTarget, `${label}: the halo is on the tool's own control, and only there`, `${r.haloed} haloed`);
    check(!r.expanded, `${label}: nothing is pressed`, `expanded ${r.expanded}`);
    if (noteName !== null) check(spent === MOMENTS_ON, `${label}: the moment is ${MOMENTS_ON ? "spent" : "not written (moments off)"}`, `${spent}`);
    else check(!spent, `${label}: a tool with no moment writes nothing`, `${spent}`);
    const later = await new Promise((done) => setTimeout(done, SECOND_LOOK_MS)).then(() => readPage(page, tool.find, noteName));
    check(r.bubbles.length === 0 && later.bubbles.length === 0, `${label}: no bubble at all on a haloed landing`, `bubbles ${JSON.stringify([...new Set([...r.bubbles, ...later.bubbles])])}`);
    check(later.visitTaken, `${label}: the haloed landing takes the visit`, `taken ${later.visitTaken}`);
  }
  // Stale ids on a page: unknown, another page's tool, a deck tool. Stripped with no halo, nothing written.
  const spentBefore = JSON.stringify(await readSpent(userId));
  for (const [path, id] of [["/collection/replace", "nope"], ["/collection/replace", "friends"], ["/decks", "top-off"], ["/collection?avail=free", "wishlist"]]) {
    const url = new URL(`${BASE}${path}`);
    url.searchParams.set("tool", id);
    url.searchParams.set("probe", "1");
    await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !new URL(location.href).searchParams.has("tool"), null, { timeout: 15_000 }).catch(() => {});
    await new Promise((done) => setTimeout(done, 1000));
    const r = await readPage(page, "null", null);
    const ok = !new URLSearchParams(r.search).has("tool") && r.haloed === 0;
    check(ok, `${w.name} page ${path} stale ?tool=${id}: stripped, no halo`, `${r.search}, ${r.haloed} haloed`);
  }
  check(JSON.stringify(await readSpent(userId)) === spentBefore, `${w.name} page stale ids write nothing`, "moments_spent unchanged");
}

async function walk(browser, w, userId, decks, spentAtStart) {
  console.log(`\n── ${w.name}`);
  const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.phone, isMobile: w.phone });
  const page = await context.newPage();
  try {
    await signIn(page, EMAIL, PASSWORD);
    await clearAboutSheet(page, userId);

    if (PHASE !== "pages") for (const tool of TOOLS) {
      let landed = false;
      for (const deck of decks) {
        await unspend(userId, tool.id);
        const noteName = `${tool.name}, a tip`;
        const r = await land(page, `/decks/${deck}?tool=${tool.id}&probe=1`, tool.targets, noteName);
        const label = `${w.name} ${tool.id} on ${deck.slice(0, 8)}`;
        check(r.search === "?probe=1", `${label}: the parameter is stripped, the rest kept`, r.search);
        check(!r.pressed, `${label}: nothing is pressed`, `${r.pressed}`);
        // The spend is a Server Action the landing does not await: give it a moment to commit before reading.
        const spent = await spentSoon(userId, tool.id, r.drawn && MOMENTS_ON);
        if (!r.drawn) {
          // Not drawn on this deck: stripped with no halo, and nothing spent. The landing landed nothing, so this is
          // an ordinary visit: any moment may arrive on it, the tool's own included (at a shortcut), and that is R1's.
          // The landing leaves the visit untouched: taken only if a bubble arrived to take it.
          check(r.haloed === 0, `${label}: an undrawn target draws no halo`, `${r.haloed} haloed`);
          check(!spent, `${label}: an undrawn target spends nothing`, `${spent}`);
          check(!r.visitTaken || r.bubbles.length > 0, `${label}: an unhaloed landing leaves the visit untouched`, `taken ${r.visitTaken}, bubbles ${JSON.stringify(r.bubbles)}`);
          // Independent of the landing: the deck's own controls do not draw it either, so this deck is truly not a
          // fixture for the tool. Were they to draw it, the landing missed a target it should have reached.
          // With the switches off there is no tool to miss: a panel's generic empty state can still match its
          // selectors, so the cross-check is for the on run only.
          if (!SWITCHES_OFF) {
            const own = await drawsWithoutLanding(page, deck, tool);
            check(!own, `${label}: the deck's own controls do not draw it either (else the landing missed it)`, `${own}`);
          }
          continue;
        }
        check(r.onTarget, `${label}: the halo is on the tool's target, and only there`, `${r.haloed} haloed`);
        check(spent === MOMENTS_ON, `${label}: the moment is ${MOMENTS_ON ? "spent" : "not written (moments off)"}`, `${spent}`);
        // E11's "with no bubble", and d9: a haloed landing takes the visit, so no bubble at all shows on it, then or
        // while the halo is up, and the visit reads taken.
        const later = await new Promise((done) => setTimeout(done, SECOND_LOOK_MS)).then(() => read(page, tool.targets, noteName));
        check(
          !r.ownBubble && !later.ownBubble && r.bubbles.length === 0 && later.bubbles.length === 0,
          `${label}: no bubble at all on a haloed landing`,
          `bubbles ${JSON.stringify([...new Set([...r.bubbles, ...later.bubbles])])}`,
        );
        check(later.visitTaken, `${label}: the haloed landing takes the visit`, `taken ${later.visitTaken}`);
        landed = true;
        break;
      }
      if (!landed) skip(`${w.name} ${tool.id}`, `none of the ${decks.length} decks draws its target`);
    }

    if (PHASE !== "decks") await walkPages(page, w, userId);
    if (PHASE === "pages") return;

    // Stale ids: unknown, a tool that does not land on a deck, and a deck id that does not exist.
    const spentBefore = JSON.stringify(await readSpent(userId));
    for (const id of ["nope", "wishlist", "tour:banner"]) {
      const r = await land(page, `/decks/${decks[0]}?tool=${encodeURIComponent(id)}&probe=1`, [], null);
      check(r.search === "?probe=1" && r.haloed === 0, `${w.name} stale ?tool=${id}: stripped, no halo`, `${r.search}, ${r.haloed} haloed`);
    }
    // The deck route streams behind its `loading.tsx`, so `notFound()` arrives after a 200 has been sent: the proof is
    // the not-found page drawn (`shellCopy.notFound.heading`) with no deck and no halo, not the status.
    await page.goto(`${BASE}/decks/00000000-0000-4000-8000-000000000000?tool=top-off`, { waitUntil: "domcontentloaded" });
    const foreign = await page
      .waitForFunction((scope) => /There’s no page here\./.test(document.querySelector(scope)?.innerText ?? ""), PAGE, { timeout: 15_000 })
      .then(() => page.evaluate(() => ({ deck: document.querySelector("#tuning-heading, [data-testid='other-ways'], #game-matchups-heading") !== null, haloed: document.querySelectorAll("[data-target-halo]").length })))
      .catch(() => null);
    check(foreign !== null && !foreign.deck && foreign.haloed === 0, `${w.name} a deck that does not exist: the not-found page, no deck, no halo`, JSON.stringify(foreign));
    check(JSON.stringify(await readSpent(userId)) === spentBefore, `${w.name} stale ids write nothing`, "moments_spent unchanged");
  } finally {
    await context.close();
    await restoreSpent(userId, spentAtStart);
  }
}

const [{ id: branch }] = await sql`select current_setting('neon.branch_id', true) as id`;
assertScratchBranch(branch, "probe:tool-landing");
console.log(`branch ${branch} · MOMENTS_ENABLED ${MOMENTS_ON ? "on" : "off"}`);

await clerkSetup();
const browser = await chromium.launch();
let userId = null;
let spentAtStart = null;
let about = null;
let captured = false;
try {
  const page = await browser.newPage();
  userId = await signIn(page, EMAIL, PASSWORD);
  await page.close();
  about = await captureAboutSeen(userId);
  spentAtStart = await readSpent(userId);
  captured = true;
  const decks = (await sql`select id::text from decks where user_id = ${userId} order by id limit ${DECK_LIMIT}`).map((r) => r.id);
  if (decks.length === 0) throw new Error("the account holds no deck");
  console.log(`decks: ${decks.length}`);
  for (const w of WIDTHS) await walk(browser, w, userId, decks, spentAtStart);
} finally {
  try {
    if (userId && captured) await restoreSpent(userId, spentAtStart);
    if (about) await restoreAboutSeen(about);
  } finally {
    await browser.close();
  }
}
console.log(failures === 0 ? `\nALL PASS${skips ? ` (${skips} skipped)` : ""}` : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
