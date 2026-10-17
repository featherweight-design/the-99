// capture:about — About's screenshot set (discovery R2·4, plan `2026-10-16-discovery-r2-r3.md` decision 4 as amended
// 2026-10-17): one frame per screen (a deck's seven views each count as one), the 14 tool crops with each tool's halo
// box, and the tour's three pictures, in all six themes, at 390x844 and 2x, as WebP in
// `public/about/shots/<theme>/<id>.webp`. It writes `src/lib/about/shots.generated.ts`: per image its size, and per tool
// its control's box as fractions of its crop. Per-entry halo boxes are R2·6a's, not this script's.
//
// THE ACCOUNT: `E2E_AUDIT_USER_EMAIL`, built by `scripts/about-fixtures.mts` first (its `About · …` decks, Alex's
// spare). THE SERVER: `next start` of a build whose `.env` names the same scratch branch, started with the tools'
// switches on and `MOMENTS_ENABLED`, `FIRST_RUN_TOUR_ENABLED`, `ABOUT_SHEET_ENABLED` and `HELP_PANEL_ENABLED` set to
// `off`, so no bubble, tour or sheet is photographed (docs/probes.md, capture:about).
//
// A tool on a deck is found as the landing finds it: the deck opened with `?tool=<id>`, its target is the element the
// landing haloes (`data-target-halo`), measured, then photographed once the halo is down. A tool with a page of its own
// is found by its control on that page (`ROUTE_TOOLS`), which is the control its moment anchors.
//
// THE IDENTITY: every frame shows `Sam` and `sam@example.com`, never the account's own address. The page's text, labels and
// initials chip are rewritten just before each photograph (`disguise`), and a frame that still carries the address
// fails rather than ships. Clerk's user is not touched.
//
// IT WRITES to the database only what `clearAboutSheet` writes (every About entry marked seen), and puts the row back.
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
  const byName = async (name) => {
    const [row] = await sql`select id::text from decks where user_id = ${userId} and name = ${name} order by created_at desc limit 1`;
    if (!row) throw new Error(`no deck named ${name}: run scripts/about-fixtures.mts first`);
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
  return {
    under: await byName("About · Under 99"),
    over: await byName("About · Over 99"),
    played: await byName("About · Played"),
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
    // G14: the upload page with its drop zone, where the Sync choice appears once a file is read.
    "collection-sync": {
      path: "/collection/replace",
      find: `(() => { const b = ${byText(PAGE, "button", "Browse files")}; let n = b; while (n && !/dashed/.test(n.className ?? "")) n = n.parentElement; return n ?? b; })()`,
    },
    lineup: { path: "/decks", find: `(() => { const t = ${byText(PAGE, "[role='tab']", "Tiles")}; return t?.closest("span.inline-flex") ?? t?.closest("[role='tablist']") ?? null; })()` },
    friends: { path: "/friends", find: byText(PAGE, "button", "Add a friend") },
  };
}

// ── the identity on the page ───────────────────────────────────────────────────────────────────────────────────────

/**
 * The name and email every shot shows in place of the account's: the shots ship publicly, and the fixture account's
 * own identity is a test address. Clerk's user is left alone (other probes sign in as it); the page's copy of it is
 * rewritten just before each photograph, and the reader's social name is the fixture's (`about-fixtures.mts`, Sam).
 */
const STAND_IN = { name: "Sam", email: "sam@example.com" };
/** Strings no shot may carry once the page is rewritten: the account's address, its local part and the old social name. */
const FORBIDDEN = [EMAIL, EMAIL.split("@")[0], "clerk_test", "Hugh"];

async function disguise(page) {
  const left = await page.evaluate(
    ([email, standIn, forbidden]) => {
      const local = email.split("@")[0];
      const initial = (local.match(/[\p{L}\p{N}]/u)?.[0] ?? "").toUpperCase();
      // The account's name is the element a menu or dialog is labelled by (`AccountMenu`'s nameId).
      const labels = new Set(
        [...document.querySelectorAll("[aria-labelledby]")].flatMap((e) => e.getAttribute("aria-labelledby").split(/\s+/)),
      );
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.nodeValue.includes(email)) continue;
        const host = n.parentElement;
        const isName = host?.id && labels.has(host.id) && n.nodeValue.trim() === email;
        n.nodeValue = isName ? standIn.name : n.nodeValue.split(email).join(standIn.email);
      }
      for (const el of document.querySelectorAll("[aria-label], [title]")) {
        for (const a of ["aria-label", "title"]) {
          const v = el.getAttribute(a);
          if (v?.includes(email)) el.setAttribute(a, v.split(email).join(standIn.name));
        }
      }
      // The initials chip: in the account trigger, and in the account's own panel (the one labelled by its name).
      const panels = [...document.querySelectorAll("[aria-labelledby]")].filter((p) =>
        p.getAttribute("aria-labelledby").split(/\s+/).some((id) => document.getElementById(id)?.textContent.trim() === standIn.name),
      );
      const chips = [
        ...document.querySelectorAll("button[aria-label^='Account:'] span[aria-hidden]"),
        ...panels.flatMap((p) => [...p.querySelectorAll("span[aria-hidden]")]),
      ];
      for (const chip of chips) if (initial && chip.textContent.trim() === initial) chip.textContent = standIn.name[0];
      const text = document.body.innerText;
      const attrs = [...document.querySelectorAll("[aria-label], [title], [alt]")]
        .map((e) => `${e.getAttribute("aria-label") ?? ""} ${e.getAttribute("title") ?? ""} ${e.getAttribute("alt") ?? ""}`)
        .join(" ");
      return forbidden.filter((f) => text.includes(f) || attrs.includes(f));
    },
    [EMAIL, STAND_IN, FORBIDDEN],
  );
  if (left.length) throw new Error(`the page still shows the account's identity (${left.length} string${left.length > 1 ? "s" : ""})`);
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
      "// its control's box as fractions of the crop (left, top, width, height).\n" +
      `export const SHOTS = ${JSON.stringify(sorted, null, 2)} as const;\n`,
  );
}

// ── the run ────────────────────────────────────────────────────────────────────────────────────────────────────────

const set = readManifest();
const missed = [];
const lowered = [];

async function save(theme, id, png, box, halo) {
  const { data, width, height, quality } = await encode(png, box);
  const dir = new URL(`${theme}/`, OUT_DIR);
  mkdirSync(dir, { recursive: true });
  const file = new URL(`${id}.webp`, dir);
  writeFileSync(file, data);
  set[theme] ??= {};
  set[theme][id] = { width, height, bytes: statSync(file).size, quality, ...(halo ? { halo } : {}) };
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

async function shoot(page, theme, f) {
  for (const [id, s] of Object.entries(screens(f))) {
    if (!want(id)) continue;
    await attempt(page, theme, id, async () => {
      await open(page, s.path);
      if (s.steps) await s.steps(page);
      if (s.dialog) await page.locator("[role='dialog']").first().waitFor({ state: "visible", timeout: 10_000 });
      await settle(page);
      await save(theme, id, await shot(page), null, null);
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
try {
  const signInPage = await browser.newPage();
  const userId = await signIn(signInPage, EMAIL, PASSWORD);
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
