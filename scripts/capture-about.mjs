// capture:about — About's screenshot set (discovery R2·4, plan `2026-10-16-discovery-r2-r3.md` decision 4 as amended
// 2026-10-17): one frame per screen (a deck's seven views each count as one), the 14 tool crops with each tool's halo
// box, and the tour's three pictures, in all six themes, at 390x844 and 2x, as WebP in
// `public/about/shots/<theme>/<id>.webp`. It writes `src/lib/about/shots.generated.ts`: per image its size, and per tool
// its control's box as fractions of its crop, and per screen frame each About entry's control's box as fractions of the
// frame (R2·6a), found through the locator map `scripts/lib/about-locators.mjs` and measured at the moment the frame
// is shot. An entry whose locator draws nothing visible on its frame is not captured, and the run exits 1.
//
// THE ACCOUNT: `E2E_AUDIT_USER_EMAIL`, built by `scripts/about-fixtures.mts` first (its three decks, Alex's
// spare). THE SERVER: `next start` of a build whose `.env` names the same scratch branch, started with EVERY
// reader-facing switch on (the registry's, less the plumbing ones and the payments line; a deck's Stats and Notes tabs, the
// all-decks cart and the Shopping buy tag each have their own), `HELP_PANEL_ENABLED`, `FIRST_RUN_TOUR_ENABLED` and `RULE_ZERO_ENABLED` (with `SOCIAL_FRIENDS_ENABLED`)
// ON, so the frames show the ?, the account menu's `Take the tour` row and the pod's `Rule 0 check` row that the
// launch-end entries point at (About batch brief, 2026-10-18), and `MOMENTS_ENABLED` and `ABOUT_SHEET_ENABLED` set to
// `off`, so no bubble or sheet is photographed. The fixture account has decks, so its Home is the dashboard and the
// tour never opens on its own. A frame missing what those switches draw is refused (`REQUIRED_ON_FRAME`), so a server
// started with the old switch set cannot ship a stale set (docs/probes.md, capture:about).
//
// A tool on a deck is found as the landing finds it: the deck opened with `?tool=<id>`, its target is the element the
// landing haloes (`data-target-halo`), measured, then photographed once the halo is down. A tool with a page of its own
// is found by its control on that page (`ROUTE_TOOLS`), which is the control its moment anchors.
//
// THE IDENTITY: every frame shows `Sam`, `sam@example.com` and an `S` chip, never the account's own name, address or
// initials (read from Clerk's user and derived as the account control derives them, `scripts/lib/about-identity.mjs`).
// The page's text, labels and initials chip are rewritten just before each photograph (`disguise`), and a frame that
// still carries any of them, or whose account control names another identity, fails rather than ships. Clerk's user is
// not touched.
//
// IT WRITES to the database only what `clearAboutSheet` writes (every About entry marked seen), and puts the row back,
// and for `tool-collection-sync` the pending upload a file's preview writes (never confirmed), deleted in a `finally`.
// It refuses any database that is not a scratch branch (`assertScratchBranch`) before its first write.
// The theme is the cookie the picker writes (`the99_theme`), never a preference row.
//
//   PROBE_BASE=http://localhost:3417 pnpm capture:about
//   CAPTURE_THEMES=amonkhet CAPTURE_IDS=home,tool-top-off pnpm capture:about     (a partial run merges into the set)
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import sharp from "sharp";
import { requireEnv } from "./lib/env.mjs";
import { PAGE } from "./lib/surface.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";
import { applyPairs, identityLeftovers, identityOf, identityPlan } from "./lib/about-identity.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { ownedFixturePattern, readDeckMarks } from "./lib/about-fixture-ids.mjs";
import { ABOUT_LOCATORS } from "./lib/about-locators.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, CLERK_SECRET_KEY, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "" || u.pathname !== "/") {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback server with a port only (http://localhost:3417)`);
  }
}
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
if (!CLERK_SECRET_KEY.startsWith("sk_test_")) throw new Error("refusing: CLERK_SECRET_KEY is not a development instance's");
const sql = neon(DATABASE_URL);
// The capture writes the account's About row (`clearAboutSheet`, `restoreAboutSeen`), and with `collection-sync` a
// pending upload's preview: a scratch branch only, checked by the database's own branch id before any write and before
// the browser is launched. Production, staging and local-dev are refused (`scripts/lib/scratch-branch.mjs`).
{
  const [{ b: branch }] = await sql`select current_setting('neon.branch_id', true) as b`;
  assertScratchBranch(branch, "capture:about");
}

const ALL_THEMES = ["amonkhet", "kamigawa", "ixalan", "phyrexia", "eldraine", "kaldheim"];
const THEMES = process.env.CAPTURE_THEMES ? process.env.CAPTURE_THEMES.split(",") : ALL_THEMES;
for (const t of THEMES) if (!ALL_THEMES.includes(t)) throw new Error(`unknown theme ${t}`);
const ONLY = process.env.CAPTURE_IDS ? new Set(process.env.CAPTURE_IDS.split(",")) : null;

const VIEW = { width: 390, height: 844 };
const SCALE = 2;
/** A tool crop and a tour picture: 3:2 at the frame's width. */
const CROP_H = Math.round((VIEW.width * 2) / 3);
/** The budget the test holds (`shots.test.ts`): a too-big image is answered by lowering its quality, never the cap. */
const MAX_BYTES = 90 * 1024;
const START_QUALITY = 75;
const MIN_QUALITY = 30;

const OUT_DIR = new URL("../public/about/shots/", import.meta.url);
const MANIFEST = new URL("../src/lib/about/shots.generated.ts", import.meta.url);

// ── the account's decks, read by the names `about-fixtures.mts` writes ─────────────────────────────────────────────

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

async function fixture(userId) {
  // The fixture's decks carry their commanders' names, so they are found by what the fixture RECORDED on its own
  // friend's row (`deckMark`), each re-checked as this account's own deck.
  const marks = await sql`select about_seen_ids from user_prefs where user_id like ${ownedFixturePattern(userId)}`;
  const { byRole } = readDeckMarks(marks.flatMap((r) => r.about_seen_ids));
  const byRoleChecked = async (role) => {
    const id = byRole[role];
    const [row] = id ? await sql`select id::text from decks where user_id = ${userId} and id = ${id}` : [];
    if (!row) throw new Error(`no fixture deck recorded for ${role}: run scripts/about-fixtures.mts first`);
    return row.id;
  };
  const [versioned] = await sql`select d.id::text from decks d join deck_versions v on v.deck_id = d.id
    where d.user_id = ${userId} group by d.id order by count(*) desc, d.id limit 1`;
  if (!versioned) throw new Error("the account holds no deck with a version");
  // A card the account owns that no deck of theirs holds: free, so `/collection?avail=free` lists it and its card
  // details draw Find a deck's door.
  const [free] = await sql`select ci.oracle_id::text from collection_items ci join cards c on c.oracle_id = ci.oracle_id
    where ci.user_id = ${userId} and c.type_line not like '%Land%' and c.image_uri is not null
      and not exists (select 1 from deck_cards dc join decks d on d.id = dc.deck_id where d.user_id = ${userId} and dc.oracle_id = ci.oracle_id)
      and not exists (select 1 from decks d where d.user_id = ${userId} and ci.oracle_id in (d.commander_oracle_id, d.partner_oracle_id))
    group by ci.oracle_id, c.name order by c.name limit 1`;
  if (!free) throw new Error("the account owns no card free of every deck");
  // The account's own collection as an export, row for row: the upload page reads it as a file and draws its choice
  // (Sync among it) with nothing to warn about, since Replace changes nothing and no deck loses a card. Built here and
  // handed to the page from memory, never written to disk.
  const held = await sql`select c.name, ci.quantity, ci.set_code, ci.collector_number, ci.finish, ci.condition, ci.scryfall_id::text
    from collection_items ci join cards c on c.oracle_id = ci.oracle_id where ci.user_id = ${userId}
    order by c.name, ci.set_code, ci.collector_number, ci.finish`;
  if (held.length === 0) throw new Error("the account holds no collection to read as a file");
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    "Name,Quantity,Set code,Collector number,Foil,Condition,Scryfall ID",
    ...held.map((r) => [r.name, r.quantity, r.set_code, r.collector_number, r.finish === "nonfoil" ? "normal" : r.finish, r.condition, r.scryfall_id].map(cell).join(",")),
  ].join("\n");
  return {
    collectionCsv: csv,
    under: await byRoleChecked("under"),
    over: await byRoleChecked("over"),
    played: await byRoleChecked("played"),
    versioned: versioned.id,
    freeCard: free.oracle_id,
  };
}

// ── the page ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** The page settled: network quiet, fonts in, no loader drawn, a beat for the last paint. */
async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page
    .waitForFunction(() => document.querySelectorAll("[aria-busy='true'], [data-loading='true']").length === 0, null, { timeout: 8_000 })
    .catch(() => {});
  await page.waitForTimeout(600);
}

async function open(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await settle(page);
}

/** Presses a tab (or a segment) in the page by its visible label's start, and waits for the page to settle. */
async function pressTab(page, label) {
  const tab = page.locator(`${PAGE} [role='tab']`).filter({ hasText: new RegExp(`^\\s*${label}`) }).first();
  await tab.click();
  await settle(page);
}

/** Scrolls the page so the deck's tab row sits just under the sticky header: a deck view's frame shows the view. */
async function scrollToTabs(page) {
  await page.evaluate((scope) => {
    const tab = document.querySelector(`${scope} [role='tab'][aria-selected='true']`);
    if (!tab) return;
    const row = tab.closest("[role='tablist']") ?? tab;
    const header = [...document.querySelectorAll("header")].find((h) => ["sticky", "fixed"].includes(getComputedStyle(h).position));
    const top = header ? header.getBoundingClientRect().bottom : 0;
    window.scrollTo({ top: window.scrollY + row.getBoundingClientRect().top - top - 8, behavior: "instant" });
  }, PAGE);
  await page.waitForTimeout(300);
}

const DECK_VIEW_STEPS = {
  "your-deck": async (page) => pressTab(page, "All"),
  shopping: async (page) => pressTab(page, "Shopping"),
  stats: async (page) => pressTab(page, "Stats"),
  notes: async (page) => pressTab(page, "Notes"),
  analysis: async (page) => pressTab(page, "Analysis"),
  games: async (page) => pressTab(page, "Games"),
  versions: async (page) => pressTab(page, "Versions"),
};

/** The screens' frames: where each is, and what is pressed to reach it. */
function screens(f) {
  const deck = (view, deckId = f.played) => ({
    path: `/decks/${deckId}`,
    steps: async (page) => {
      if (view !== "your-deck" && view !== "analysis" && view !== "games" && view !== "versions") await pressTab(page, "Your deck");
      await DECK_VIEW_STEPS[view](page);
      await scrollToTabs(page);
    },
  });
  return {
    home: { path: "/" },
    collection: { path: "/collection" },
    "card-details": { path: `/collection?card=${f.freeCard}`, dialog: true },
    sets: { path: "/collection/sets" },
    proxies: { path: "/collection/proxies" },
    history: { path: "/collection/history" },
    wishlist: { path: "/collection/wishlist" },
    upload: { path: "/collection/replace" },
    commanders: { path: "/commanders" },
    discover: { path: "/discover" },
    "new-deck": { path: "/decks/new" },
    decks: { path: "/decks" },
    "deck-your-deck": deck("your-deck"),
    "deck-shopping": deck("shopping"),
    "deck-stats": deck("stats"),
    "deck-notes": deck("notes"),
    "deck-analysis": deck("analysis"),
    "deck-games": deck("games"),
    "deck-versions": deck("versions", f.versioned),
    friends: { path: "/friends" },
    account: {
      path: "/",
      steps: async (page) => {
        await page.locator("button[aria-label^='Account:']:visible").first().click();
        await page.locator("[role='dialog'], [role='menu']").first().waitFor({ state: "visible", timeout: 10_000 });
        await settle(page);
      },
    },
  };
}

/** The tour's pictures (R3 C5): the top of what opens there, as a 3:2 crop. */
function tourShots(f) {
  return {
    "tour-commanders": { path: "/commanders" },
    "tour-decks": { path: "/decks" },
    "tour-shopping": { path: `/decks/${f.played}`, steps: async (page) => { await pressTab(page, "Shopping"); await scrollToTabs(page); } },
  };
}

/** The deck tools: the deck each lands on (the landing opens the tab, finds the target and haloes it). */
function deckTools(f) {
  return {
    "top-off": f.under,
    "proposed-cuts": f.over,
    "suggested-changes": f.played,
    "mana-balance": f.played,
    "stand-ins": f.played,
    "friend-spares": f.played,
    matchups: f.played,
  };
}

/** The Sync card, pickable: drawn only once a file is read and its comparison is in. */
const SYNC_CHOICE = `${PAGE} [role='radio'][data-choice='sync']:not([aria-disabled='true'])`;
/** The name the Sync preview's file is uploaded under: its pending upload row is found by it and deleted afterwards. */
const UPLOAD_FILENAME = "about-capture-sync.csv";

/**
 * The tools with a page of their own: the page, and the control in it the tool's moment anchors (`useMomentAnchor`),
 * found in the page's own tree (or the card details dialog). Each `find` runs in the page and returns the element.
 */
function routeTools(f) {
  const byText = (scope, tag, text) =>
    `(() => [...document.querySelectorAll(${JSON.stringify(scope)} + " " + ${JSON.stringify(tag)})].find((e) => e.textContent.trim().startsWith(${JSON.stringify(text)})) ?? null)()`;
  /** The first element `selector` matches that is drawn: a control's phone and desktop copies both mount. */
  const drawn = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.getClientRects().length > 0) ?? null`;
  const allDetails = async (page) => {
    await page.locator("[role='dialog'] button[aria-label='Show all details']").first().click();
    await settle(page);
  };
  return {
    "help-me-choose": { path: "/decks/new", find: byText(PAGE, "a", "Help me choose") },
    precons: { path: "/decks/new", find: drawn(`${PAGE} [data-testid='precon-door'] a`) },
    // Both live under the card details' All details, which is pressed open first.
    "find-a-deck": { path: `/collection?avail=free&card=${f.freeCard}`, steps: allDetails, find: drawn("[role='dialog'] [data-testid='fits-door']") },
    wishlist: { path: `/collection?card=${f.freeCard}`, steps: allDetails, find: drawn("[role='dialog'] [data-testid='card-wishlist'] button") },
    // G14: the Sync choice, which the upload page draws once a file is read, and which the tool's moment anchors
    // (`UploadChoice`'s sync card). The account's own collection is handed to the file control and read; the choice is
    // never pressed and nothing is confirmed.
    "collection-sync": {
      path: "/collection/replace",
      steps: async (page) => {
        await page.locator(`${PAGE} input[type='file'][aria-label='Upload collection CSV']`).first().setInputFiles({
          name: UPLOAD_FILENAME,
          mimeType: "text/csv",
          buffer: Buffer.from(f.collectionCsv, "utf8"),
        });
        await page.waitForSelector(SYNC_CHOICE, { timeout: 60_000 });
        await settle(page);
      },
      find: drawn(SYNC_CHOICE),
    },
    lineup: { path: "/decks", find: `(() => { const t = ${byText(PAGE, "[role='tab']", "Tiles")}; return t?.closest("span.inline-flex") ?? t?.closest("[role='tablist']") ?? null; })()` },
    friends: { path: "/friends", find: byText(PAGE, "button", "Add a friend") },
  };
}

// ── the identity on the page ───────────────────────────────────────────────────────────────────────────────────────

/**
 * The identity every shot shows in place of the account's (`STAND_IN`: Sam, sam@example.com, S): the shots ship
 * publicly. Clerk's user is left alone (other probes sign in as it); the page's copy of it is rewritten just before each
 * photograph, and the reader's social name is the fixture's (`about-fixtures.mts`, Sam). The REAL identity is read once
 * from the signed-in Clerk user and derived as the account control derives it (`identityOf`, held equal to
 * `accountIdentity` by its test), so a full name, its label and its initials chip are replaced as well as the email.
 */
/** Strings no shot may carry beyond the identity itself: the test address's marker and the old social name. */
const EXTRA_FORBIDDEN = ["clerk_test", "Hugh"];
let PLAN = null;

async function disguise(page) {
  if (!PLAN) throw new Error("the account's identity was never read");
  const seen = await page.evaluate((plan) => {
    const swap = (value, pairs) => pairs.reduce((v, [from, to]) => (from ? v.split(from).join(to) : v), value);
    // What the account control says before the rewrite: the identity it was derived from must be the one read.
    const triggers = [...document.querySelectorAll("button[aria-label^='Account:']")].map((b) => b.getAttribute("aria-label"));
    // The account's name is the element a menu or dialog is labelled by (`AccountMenu`'s nameId).
    const labels = new Set(
      [...document.querySelectorAll("[aria-labelledby]")].flatMap((e) => e.getAttribute("aria-labelledby").split(/\s+/)),
    );
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const host = n.parentElement;
      const isName = plan.nameNode && host?.id && labels.has(host.id) && n.nodeValue.trim() === plan.nameNode[0];
      const next = isName ? plan.nameNode[1] : swap(n.nodeValue, plan.text);
      if (next !== n.nodeValue) n.nodeValue = next;
    }
    for (const el of document.querySelectorAll("[aria-label], [title]")) {
      for (const a of ["aria-label", "title"]) {
        const v = el.getAttribute(a);
        if (v) {
          const next = swap(v, plan.label);
          if (next !== v) el.setAttribute(a, next);
        }
      }
    }
    // The initials chip: in the account trigger, and in the account's own panel (the one labelled by its name).
    const standInName = plan.nameNode ? plan.nameNode[1] : null;
    const panels = [...document.querySelectorAll("[aria-labelledby]")].filter((p) =>
      p.getAttribute("aria-labelledby").split(/\s+/).some((id) => document.getElementById(id)?.textContent.trim() === standInName),
    );
    const chips = [
      ...document.querySelectorAll("button[aria-label^='Account:'] span[aria-hidden]"),
      ...panels.flatMap((p) => [...p.querySelectorAll("span[aria-hidden]")]),
    ];
    if (plan.chip) for (const chip of chips) if (chip.textContent.trim() === plan.chip[0]) chip.textContent = plan.chip[1];
    return {
      triggers,
      text: document.body.innerText,
      attrs: [...document.querySelectorAll("[aria-label], [title], [alt]")]
        .map((e) => `${e.getAttribute("aria-label") ?? ""} ${e.getAttribute("title") ?? ""} ${e.getAttribute("alt") ?? ""}`)
        .join(" "),
      chips: chips.map((c) => c.textContent),
    };
  }, PLAN);
  // A trigger an earlier frame of this page already rewrote reads as the stand-in's.
  const rewritten = applyPairs(PLAN.trigger, PLAN.label);
  if (seen.triggers.some((t) => t !== PLAN.trigger && t !== rewritten)) {
    throw new Error("the account control shows an identity other than the one read from Clerk: refusing the frame");
  }
  const left = identityLeftovers(PLAN, seen);
  if (left.length) throw new Error(`the page still shows the account's identity (${left.join(", ")})`);
}

/** The frame, with the identity rewritten first. */
async function shot(page) {
  await disguise(page);
  return page.screenshot();
}

// ── encoding ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Encodes `png` (cropped to `box` in device pixels when given) under the budget, from quality 75 down. */
async function encode(png, box) {
  for (let quality = START_QUALITY; quality >= MIN_QUALITY; quality -= 5) {
    let img = sharp(png);
    if (box) img = img.extract(box);
    const { data, info } = await img.webp({ quality, effort: 6 }).toBuffer({ resolveWithObject: true });
    if (data.length <= MAX_BYTES) return { data, width: info.width, height: info.height, quality };
  }
  throw new Error(`no quality down to ${MIN_QUALITY} brings the image under ${MAX_BYTES} bytes`);
}

/** A 3:2 crop at the frame's width, centred on `rect`'s middle (CSS px, in the viewport) and kept inside the frame. */
function cropAround(rect) {
  const mid = rect.y + rect.height / 2;
  const top = Math.round(Math.min(Math.max(0, mid - CROP_H / 2), VIEW.height - CROP_H));
  return { top, box: { left: 0, top: top * SCALE, width: VIEW.width * SCALE, height: CROP_H * SCALE } };
}

const round4 = (n) => Math.round(n * 10_000) / 10_000;

function readManifest() {
  try {
    const src = readFileSync(MANIFEST, "utf8");
    return JSON.parse(src.slice(src.indexOf("= ") + 2, src.lastIndexOf(" as const")));
  } catch {
    return {};
  }
}

function writeManifest(set) {
  const sorted = Object.fromEntries(
    ALL_THEMES.filter((t) => set[t]).map((t) => [t, Object.fromEntries(Object.keys(set[t]).sort().map((id) => [id, set[t][id]]))]),
  );
  writeFileSync(
    MANIFEST,
    "// Generated by `pnpm capture:about` (scripts/capture-about.mjs). Do not edit: re-run the capture.\n" +
      "// Per theme, per image: its pixel size, its bytes and the WebP quality it was written at; a tool crop's `halo` is\n" +
      "// its control's box as fractions of the crop, and a screen frame's `entries` each About entry's control's box as\n" +
      "// fractions of the frame (left, top, width, height).\n" +
      `export const SHOTS = ${JSON.stringify(sorted, null, 2)} as const;\n`,
  );
}

// ── the run ────────────────────────────────────────────────────────────────────────────────────────────────────────

const set = readManifest();
const missed = [];
const lowered = [];

async function save(theme, id, png, box, halo, entries = null) {
  const { data, width, height, quality } = await encode(png, box);
  const dir = new URL(`${theme}/`, OUT_DIR);
  mkdirSync(dir, { recursive: true });
  const file = new URL(`${id}.webp`, dir);
  writeFileSync(file, data);
  set[theme] ??= {};
  set[theme][id] = { width, height, bytes: statSync(file).size, quality, ...(halo ? { halo } : {}), ...(entries ? { entries } : {}) };
  if (quality < START_QUALITY) lowered.push(`${theme}/${id}@${quality}`);
  console.log(`  ${id}  ${width}x${height}  ${(data.length / 1024).toFixed(1)}KB  q${quality}${halo ? `  halo ${halo.join(",")}` : ""}`);
}

const want = (id) => ONLY === null || ONLY.has(id);

/**
 * One image, tried twice: a page that timed out (a cold route's first compile, a busy server) is left on a blank page
 * and tried again before it is reported as not captured.
 */
async function attempt(page, theme, id, run) {
  for (let i = 1; ; i += 1) {
    try {
      await run();
      return;
    } catch (error) {
      if (i < 2) {
        await page.goto("about:blank").catch(() => {});
        continue;
      }
      missed.push(`${theme}/${id}: ${String(error).split("\n")[0]}`);
      return;
    }
  }
}

/**
 * What the server's switch set must draw on a frame before it is photographed: the ? on every screen
 * (`HELP_PANEL_ENABLED`), the account menu's `Take the tour` row (`FIRST_RUN_TOUR_ENABLED`) and the pod's `Rule 0 check`
 * row on /friends (`RULE_ZERO_ENABLED`). The launch-end About entries point at these, so a set captured without them
 * is refused rather than shipped.
 */
const REQUIRED_ON_FRAME = {
  "*": ["[data-help-button]:visible", "the ? (start the server with HELP_PANEL_ENABLED on)"],
  account: ["[role='dialog'] a[href='/?tour=1'], [role='menu'] a[href='/?tour=1']", "the Take the tour row (FIRST_RUN_TOUR_ENABLED on)"],
  friends: ["[data-testid='pod-rule-zero']", "the pod's Rule 0 check row (RULE_ZERO_ENABLED on)"],
};

async function requireOnFrame(page, id) {
  for (const key of ["*", id]) {
    const need = REQUIRED_ON_FRAME[key];
    if (!need) continue;
    if ((await page.locator(need[0]).count()) === 0) throw new Error(`the frame does not draw ${need[1]}`);
  }
}

async function shoot(page, theme, f) {
  for (const [id, s] of Object.entries(screens(f))) {
    if (!want(id)) continue;
    await attempt(page, theme, id, async () => {
      await open(page, s.path);
      if (s.steps) await s.steps(page);
      if (s.dialog) await page.locator("[role='dialog']").first().waitFor({ state: "visible", timeout: 10_000 });
      await settle(page);
      await requireOnFrame(page, id);
      const png = await shot(page);
      const { boxes, unplaced } = await measureEntries(page, id, s.dialog || id === "account");
      for (const entry of unplaced) missed.push(`${theme}/${id}#${entry}: its locator draws nothing on the frame`);
      await save(theme, id, png, null, null, boxes);
    });
  }
  for (const [id, s] of Object.entries(tourShots(f))) {
    if (!want(id)) continue;
    await attempt(page, theme, id, async () => {
      await open(page, s.path);
      if (s.steps) await s.steps(page);
      // From the top of the page's own content down: what opens there, not the shell's chrome above it.
      const top = await page.evaluate((scope) => Math.max(0, document.querySelector(scope)?.getBoundingClientRect().top ?? 0), PAGE);
      const { box } = cropAround({ y: top + CROP_H / 2, height: 0 });
      await save(theme, id, await shot(page), box, null);
    });
  }
  for (const [tool, deckId] of Object.entries(deckTools(f))) {
    const id = `tool-${tool}`;
    if (!want(id)) continue;
    await attempt(page, theme, id, async () => {
      await page.goto(`${BASE}/decks/${deckId}?tool=${tool}`, { waitUntil: "domcontentloaded" });
      const found = await page.waitForSelector("[data-target-halo]", { timeout: 15_000 }).catch(() => null);
      if (!found) throw new Error("the landing haloed nothing: the deck draws no target for it");
      // The halo is the card's to draw: photographed once the landing's 2.4s halo is down.
      await page.waitForFunction(() => document.querySelector("[data-target-halo]") === null, null, { timeout: 8_000 });
      await settle(page);
      await shootTool(page, theme, id, found);
    });
  }
  for (const [tool, s] of Object.entries(routeTools(f))) {
    const id = `tool-${tool}`;
    if (!want(id)) continue;
    await attempt(page, theme, id, async () => {
      await open(page, s.path);
      if (s.steps) await s.steps(page);
      const handle = await page.waitForFunction(s.find, null, { timeout: 10_000 }).catch(() => null);
      const el = handle?.asElement();
      if (!el) throw new Error("its control is not drawn on the page");
      await el.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
      await settle(page);
      await shootTool(page, theme, id, el);
    });
  }
}

/**
 * Each About entry's control on the frame just shot (R2·6a, readiness gap 9), as fractions of the 390x844 frame, clipped
 * to it. Measured after `shot` so the boxes describe the photographed page. A frame that is a dialog (a card's details,
 * the account menu) names its dialog in each locator; any other is searched inside the page's own `main`, never the shell.
 */
async function measureEntries(page, frameId, inDialog) {
  // A dialog frame's locators name the dialog themselves (`about-locators.mjs`); any other is scoped to the page.
  const scope = inDialog ? page : page.locator(PAGE);
  const boxes = {};
  const unplaced = [];
  for (const [entry, l] of Object.entries(ABOUT_LOCATORS)) {
    if (l.screen !== frameId) continue;
    const el = scope.locator(l.locator).first();
    const r = (await el.count()) > 0 ? await el.boundingBox().catch(() => null) : null;
    const x0 = r ? Math.max(0, r.x) : 0, y0 = r ? Math.max(0, r.y) : 0;
    const x1 = r ? Math.min(VIEW.width, r.x + r.width) : 0, y1 = r ? Math.min(VIEW.height, r.y + r.height) : 0;
    if (x1 <= x0 || y1 <= y0) {
      unplaced.push(entry);
      continue;
    }
    boxes[entry] = [round4(x0 / VIEW.width), round4(y0 / VIEW.height), round4((x1 - x0) / VIEW.width), round4((y1 - y0) / VIEW.height)];
  }
  return { boxes: Object.keys(boxes).length ? boxes : null, unplaced };
}

async function shootTool(page, theme, id, el) {
  const r = await el.evaluate((e) => {
    const b = e.getBoundingClientRect();
    return { x: b.left, y: b.top, width: b.width, height: b.height };
  });
  if (r.width === 0 || r.height === 0) throw new Error("its control has no box");
  const { top, box } = cropAround(r);
  const clamp = (n) => Math.min(1, Math.max(0, n));
  const x0 = clamp(r.x / VIEW.width), x1 = clamp((r.x + r.width) / VIEW.width);
  const y0 = clamp((r.y - top) / CROP_H), y1 = clamp((r.y + r.height - top) / CROP_H);
  await save(theme, id, await shot(page), box, [round4(x0), round4(y0), round4(x1 - x0), round4(y1 - y0)]);
}

await clerkSetup();
const browser = await chromium.launch();
let about = null;
let USER_ID = null;
try {
  const signInPage = await browser.newPage();
  const userId = await signIn(signInPage, EMAIL, PASSWORD);
  USER_ID = userId;
  // The account's own identity, read once from Clerk's user (never printed), as the account control derives it.
  const source = await signInPage.evaluate(() => {
    const u = window.Clerk.user;
    return { firstName: u.firstName, lastName: u.lastName, fullName: u.fullName, email: u.primaryEmailAddress?.emailAddress ?? null };
  });
  PLAN = identityPlan(identityOf(source), [EMAIL, EMAIL.split("@")[0], ...EXTRA_FORBIDDEN]);
  const storage = await signInPage.context().storageState();
  await signInPage.close();
  about = await captureAboutSeen(userId, sql);
  const f = await fixture(userId);
  for (const theme of THEMES) {
    console.log(`\n── ${theme}`);
    const context = await browser.newContext({
      viewport: VIEW,
      deviceScaleFactor: SCALE,
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
      storageState: storage,
    });
    const { hostname } = new URL(BASE);
    await context.addCookies([{ name: "the99_theme", value: theme, domain: hostname, path: "/" }]);
    const page = await context.newPage();
    await setupClerkTestingToken({ page });
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await clearAboutSheet(page, userId);
    try {
      await shoot(page, theme, f);
    } finally {
      await context.close();
    }
    writeManifest(set);
  }
} finally {
  try {
    if (about) await restoreAboutSeen(about, sql);
    // The Sync preview's pending upload: never confirmed, so nothing else holds it.
    if (USER_ID) {
      await sql`delete from csv_uploads where user_id = ${USER_ID} and filename = ${UPLOAD_FILENAME} and confirmed_at is null`;
    }
  } finally {
    await browser.close();
  }
}

const all = Object.values(set).flatMap((t) => Object.values(t));
const total = all.reduce((n, e) => n + e.bytes, 0);
const max = all.reduce((n, e) => Math.max(n, e.bytes), 0);
console.log(`\n${all.length} images · ${(total / 1024 / 1024).toFixed(2)}MB in all · largest ${(max / 1024).toFixed(1)}KB`);
if (lowered.length) console.log(`quality lowered: ${lowered.join(", ")}`);
if (missed.length) {
  console.log(`\nNOT CAPTURED (${missed.length}):\n  ${missed.join("\n  ")}`);
  process.exit(1);
}
