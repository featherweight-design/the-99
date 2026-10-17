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
    targets: [["[data-tool-tile='suggested']"], ["div:has(> [data-testid='analysis-empty'])", "div:has(> section[aria-labelledby='tuning-heading'])"]],
  },
  { id: "mana-balance", name: "Mana Balance", tab: "analysis", targets: [["[data-tool-tile='mana']"], ["#mana-heading"]] },
  { id: "stand-ins", name: "Cheaper stand-ins", tab: "deck", shopping: true, targets: [["[data-testid='other-ways']:has([data-testid='standin-glyph'])"]] },
  { id: "friend-spares", name: "A friend has a spare", tab: "deck", shopping: true, targets: [["[data-testid='other-ways']:has([data-testid='spare-glyph'])"]] },
  { id: "matchups", name: "Matchups", tab: "games", targets: [["section[aria-labelledby='game-matchups-heading'] [role='radiogroup']"]] },
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
  await page.goto(`${BASE}/decks/${deck}?tab=${tool.tab}`, { waitUntil: "domcontentloaded" });
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

async function walk(browser, w, userId, decks, spentAtStart) {
  console.log(`\n── ${w.name}`);
  const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.phone, isMobile: w.phone });
  const page = await context.newPage();
  try {
    await signIn(page, EMAIL, PASSWORD);
    await clearAboutSheet(page, userId);

    for (const tool of TOOLS) {
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
          const own = await drawsWithoutLanding(page, deck, tool);
          check(!own, `${label}: the deck's own controls do not draw it either (else the landing missed it)`, `${own}`);
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
