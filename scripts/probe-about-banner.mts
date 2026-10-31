// probe:about-banner — About's launches on Home's banner, pressed in a real browser at 390x844 and 1300x900 (About
// visual build, plan `2026-10-27-about-visual.md` PR 6b; handoff `design_handoff_the99_about_visual`, call 7, Ways-In
// "Banner"). The one-time sheet and the gate's redirect retired in that PR; the banner is the only announcement.
//
// What jsdom cannot see, and the unit tests therefore do not prove:
//   - One launch on the Dashboard: "New on Decks: Lock cards …", a 36px glyph plate in the mark's place
//     (the nav glyph of the page Show me opens), Show me, ✕ (44 / 32).
//   - Every page but Home draws no line, and nothing redirects to /about.
//   - ✕ writes the launch's ack and the floor (read back from `user_prefs`), a reload draws no line, and Back after ✕
//     draws none.
//   - Show me lands on /about/decks with the label marked New, the visit writes the label's key, and Back to Home
//     draws no line (the client acknowledgement).
//   - Two launches: the `New in the app` band, a 28px glyph plate and a Show me per line, one ✕ writing both acks.
//   - A2: a launch and an arrival under `New in the app`, About first, one ✕ writing both halves.
//   - The first-run line on the Dashboard (an account that imported before opening About), to the /about index, with
//     ✕ writing the baseline; and on the first-run checklist with no ✕.
//
// The sign-in account (`E2E_AUDIT_USER_EMAIL`, which holds cards or decks, so Home is its Dashboard) has its
// `user_prefs` row read before any page and put back exactly in `finally`, then re-read as a check. Its About state is
// driven by that row alone: "current" is the floor, every catalog id and every unit key the pages can draw; one launch
// is that less Lock cards' key and its legacy `locked-cards`; two launches is that less the lock rule's key too. Both
// always draw (Never cut is always on). The checklist states use a fresh Clerk test user on the
// DEVELOPMENT instance, deleted after with every row it wrote. The A2 arrival is a fixture `commander` set `pqbset`
// with a day-old non-baseline `catalog_first_seen` stamp, removed in `finally`. Local-dev only: production and staging
// are refused by branch id.
//
// The server: `next start` of a build with the worktree's `.env`, started with
//   LIST_CACHE_ENABLED=true
//
//   PROBE_BASE=http://localhost:3312 pnpm probe:about-banner
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Browser, type Locator, type Page } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";
import { assertNotSharedBranch } from "./lib/scratch-branch.mjs";
import { catalogIds, variantIds } from "./lib/about-clear.mjs";
import { ABOUT_VERSION } from "../src/lib/copy/about";
import { arrivalsCopy } from "../src/lib/copy/arrivals";
import { HOW_IT_WORKS_ID } from "../src/lib/copy/how-it-works-links";
import { aboutLine } from "../src/lib/about/notice";
import { afterVisit, visibleSections } from "../src/lib/about/pages-visible";
import { NEVER_SEEN } from "../src/lib/about/visible";
import { SWITCH_NAMES } from "../src/lib/switches/registry";

const { E2E_AUDIT_USER_EMAIL: EMAIL, CLERK_SECRET_KEY, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "" || u.pathname !== "/") {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback server with a port only (http://localhost:3312)`);
  }
}
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
if (!CLERK_SECRET_KEY.startsWith("sk_test_")) throw new Error("refusing: CLERK_SECRET_KEY is not a development instance's");
const sql = neon(DATABASE_URL);

const SET = "pqbset";
const SET_NAME = "Probe About Banner Commander";
const REGION = "section[aria-label='New in the app']";
const DAY = 86_400_000;
const day = (offset: number) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);

// "Current": the floor, every catalog id and variant, the appendix, and every unit key the pages can draw (with every
// switch on, a superset of what any server draws: a key of a unit not drawn is never read).
const ALL_ON = Object.fromEntries(SWITCH_NAMES.map((n) => [n, "true"])) as unknown as NodeJS.ProcessEnv;
const UNIT_KEYS = afterVisit(visibleSections(ALL_ON), "home", NEVER_SEEN).ids;
const CURRENT = [...new Set([...catalogIds(), ...variantIds(), HOW_IT_WORKS_ID, ...UNIT_KEYS])];
const LOCK = "decks/your-deck/lock";
const LOCK_RULE = "rule/lock";
// One launch: Lock cards' label, unseen by its own key and its legacy entry's. Two: the lock rule as well.
const ONE = CURRENT.filter((id) => id !== "locked-cards" && id !== LOCK);
const TWO = ONE.filter((id) => id !== LOCK_RULE);
const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
// The lines as the server words them. The lock label and rule always draw, so no switch is needed.
const NO_SWITCHES = {} as unknown as NodeJS.ProcessEnv;
const wordsOf = (ids: string[]) => {
  const line = aboutLine({ version: ABOUT_VERSION, ids }, visibleSections(NO_SWITCHES));
  if (line?.kind !== "launches") throw new Error("the fixture state announces nothing: is the lock label still drawn?");
  return line.launches.map((l) => ({ key: l.key, text: norm(`${l.lead} ${l.text}`), href: l.href }));
};
const ONE_LINE = wordsOf(ONE);
const TWO_LINES = wordsOf(TWO);
if (ONE_LINE.length !== 1 || TWO_LINES.length !== 2) throw new Error(`fixture states announce ${ONE_LINE.length} and ${TWO_LINES.length}`);
const A3_TEXT = norm(`${arrivalsCopy.aboutFirstRunLead}${arrivalsCopy.aboutFirstRunRest}`);

const WIDTHS = [
  { name: "390", width: 390, height: 844, phone: true },
  { name: "1300", width: 1300, height: 900, phone: false },
];
type Width = (typeof WIDTHS)[number];

let failures = 0;
const check = (ok: boolean, label: string, saw: unknown) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${typeof saw === "string" ? saw : JSON.stringify(saw)})`);
};

async function signIn(page: Page, email: string, password: string) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Clerk = (window as any).Clerk;
      try {
        const signIn = Clerk.client.signIn;
        let attempt = email.includes("+clerk_test")
          ? await signIn.create({ identifier: email })
          : await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const factor = attempt.supportedFirstFactors?.find((f: any) => f.strategy === "email_code");
          if (!factor?.emailAddressId) return `${email} offers no usable email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (error as any)?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [email, password ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return page.evaluate(() => (window as any).Clerk.user.id as string);
}

async function clerk(method: string, path: string, body?: unknown) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Clerk ${method} ${path}: ${res.status}`);
  return res.json();
}

type Prior = { existed: false } | { existed: true; upcoming_seen_codes: string[]; about_version_seen: number; about_seen_ids: string[] };

async function readPrior(id: string): Promise<Prior> {
  const rows = await sql`select upcoming_seen_codes, about_version_seen, about_seen_ids from user_prefs where user_id = ${id}`;
  return rows.length === 0 ? { existed: false } : ({ existed: true, ...rows[0] } as Prior);
}

async function restorePrior(id: string, was: Prior) {
  if (!was.existed) await sql`delete from user_prefs where user_id = ${id}`;
  else {
    await sql`update user_prefs set upcoming_seen_codes = ${was.upcoming_seen_codes}, about_version_seen = ${was.about_version_seen},
              about_seen_ids = ${was.about_seen_ids} where user_id = ${id}`;
  }
  const now = await readPrior(id);
  check(JSON.stringify(now) === JSON.stringify(was), "the account's user_prefs row is restored as it was", `${JSON.stringify(was)} -> ${JSON.stringify(now)}`);
}

/** The account's About state. Any UPDATE of `user_prefs` moves the stamp, retiring cached Home. */
async function setAbout(userId: string, version: number, ids: readonly string[]) {
  await sql`insert into user_prefs (user_id, about_version_seen, about_seen_ids) values (${userId}, ${version}, ${ids as string[]})
    on conflict (user_id) do update set about_version_seen = ${version}, about_seen_ids = ${ids as string[]}`;
}

async function readAbout(userId: string) {
  const [row] = await sql`select about_version_seen, about_seen_ids, upcoming_seen_codes from user_prefs where user_id = ${userId}`;
  return row as { about_version_seen: number; about_seen_ids: string[]; upcoming_seen_codes: string[] } | undefined;
}

async function pollAbout(userId: string, ok: (r: Awaited<ReturnType<typeof readAbout>>) => boolean) {
  let row = await readAbout(userId);
  for (let i = 0; i < 20 && !ok(row); i += 1) {
    await new Promise((r) => setTimeout(r, 250));
    row = await readAbout(userId);
  }
  return row;
}

async function stampArrival(on: boolean, userId: string) {
  await sql`delete from catalog_first_seen where kind = 'set' and key = ${SET}`;
  await sql`update user_prefs set upcoming_seen_codes = array(select k from unnest(upcoming_seen_codes) k where k <> ${SET}) where user_id = ${userId}`;
  if (on) await sql`insert into catalog_first_seen (kind, key, first_seen_at, baseline) values ('set', ${SET}, ${new Date(Date.now() - DAY)}, false)`;
}

const box = (locator: Locator) =>
  locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height };
  });

async function home(page: Page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  // Home's own page, not its loading screen: the Dashboard's h1, or the checklist's lock line (attached at every width).
  await onPage(page, "#home-heading, [data-lock-page-line]").first().waitFor({ state: "attached", timeout: 30_000 });
  await hydrated(page);
}

async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector("main section[aria-label='New in the app'] a");
    return !el || Object.keys(el).some((k) => k.startsWith("__reactProps"));
  }, null, { timeout: 30_000 });
}

/** No line, read after the page settles. */
async function nothingDrawn(page: Page) {
  await page.waitForTimeout(500);
  return { regions: await onPage(page, REGION).count(), url: new URL(page.url()).pathname };
}

/** The glyph plates a line draws: each visible one's box. */
async function visibleGlyphs(scope: Locator) {
  return scope.locator("[data-about-glyph]").evaluateAll((els: Element[]) =>
    els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => {
      const r = e.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), hasSvg: e.querySelector("svg") !== null };
    }));
}

async function dashboard(browser: Browser, w: Width, userId: string) {
  const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.phone, isMobile: w.phone });
  const page = await context.newPage();
  await signIn(page, EMAIL, PASSWORD ?? "");
  const region = onPage(page, REGION);
  const width = w.phone ? "phone" : "desktop";
  const want = w.phone ? 44 : 32;

  // One launch.
  await stampArrival(false, userId);
  await setAbout(userId, ABOUT_VERSION, ONE);
  await home(page);
  check(await region.count() === 1, `${w.name} one launch: the banner draws`, `${await region.count()} regions`);
  const text = norm(await onPage(page, `${REGION} p`).first().textContent().catch(() => null));
  check(text === ONE_LINE[0]!.text, `${w.name} one launch: "New on {page}:" and the unit's words`, text);
  check(await onPage(page, `${REGION} h2`).count() === 0, `${w.name} one launch: one line, no heading`, `${await onPage(page, `${REGION} h2`).count()} h2`);
  const glyphs = await visibleGlyphs(region);
  check(glyphs.length === 1 && glyphs[0]!.w === 36 && glyphs[0]!.h === 36 && glyphs[0]!.hasSvg,
    `${w.name} one launch: a 36x36 glyph plate in the mark's place`, glyphs);
  const show = onPage(page, `${REGION} a`).first();
  check(norm(await show.textContent()) === "Show me" && (await show.getAttribute("href")) === ONE_LINE[0]!.href,
    `${w.name} one launch: Show me goes to the label lit`, `${await show.textContent()} -> ${await show.getAttribute("href")}`);
  const xb = await box(onPage(page, `${REGION} button[aria-label="Dismiss"]`).first());
  check(Math.round(xb.width) === want && Math.round(xb.height) === want, `${w.name} one launch: ✕ is ${want} × ${want}`, `${xb.width} × ${xb.height}`);

  // A non-Home page: nothing, and no redirect to /about, though the reader is behind.
  for (const path of ["/decks", "/collection"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await onPage(page, "h1").first().waitFor({ timeout: 30_000 });
    const d = await nothingDrawn(page);
    check(d.regions === 0 && d.url === path, `${w.name} ${path}: no About line, and no redirect`, d);
  }

  // ✕ writes the launch's ack and the floor; a reload draws nothing.
  await setAbout(userId, ABOUT_VERSION - 1, ONE);
  await home(page);
  await onPage(page, `${REGION} button[aria-label="Dismiss"]`).first().click();
  await region.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
  check(await region.count() === 0, `${w.name}: ✕ closes the line`, `${await region.count()} regions`);
  const focused = await page.evaluate(() => document.activeElement?.id);
  check(focused === "home-heading", `${w.name}: focus moves to Home's h1`, focused ?? "none");
  const after = await pollAbout(userId, (r) => (r?.about_seen_ids ?? []).includes(LOCK));
  check(after?.about_seen_ids.includes(LOCK) === true && after.about_version_seen === ABOUT_VERSION,
    `${w.name}: ✕ wrote the launch's ack and raised the floor`, { version: after?.about_version_seen, lock: after?.about_seen_ids.includes(LOCK) });
  await home(page);
  check(await region.count() === 0, `${w.name}: a reload after ✕ draws no line (the stamp retired cached Home)`, `${await region.count()} regions`);

  // Back after ✕: ✕, a client navigation away, Back to the router's held Home.
  await setAbout(userId, ABOUT_VERSION, ONE);
  await home(page);
  check(await region.count() === 1, `${w.name}: the line is back once the launch is unseen again`, `${await region.count()} regions`);
  await onPage(page, `${REGION} button[aria-label="Dismiss"]`).first().click();
  await region.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
  await pollAbout(userId, (r) => (r?.about_seen_ids ?? []).includes(LOCK));
  await page.locator('a[href="/decks"]:visible').first().click();
  await page.waitForURL((u) => u.pathname === "/decks", { timeout: 30_000 });
  await onPage(page, "h1").first().waitFor({ timeout: 30_000 });
  await page.goBack();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 30_000 });
  await onPage(page, "h1").first().waitFor({ timeout: 30_000 });
  const backX = await nothingDrawn(page);
  check(backX.regions === 0, `${w.name}: Back to Home after ✕ draws no line`, backX);

  // Show me lands on the label, lit and marked New; the visit writes its key; Back to Home draws no line.
  await setAbout(userId, ABOUT_VERSION, ONE);
  await home(page);
  await onPage(page, `${REGION} a`).first().click();
  await page.waitForURL((u) => u.pathname === "/about/decks", { timeout: 30_000 });
  const landed = onPage(page, `[data-about-width='${width}'] [data-about-label='${LOCK}'] [data-about-new]`);
  await landed.first().waitFor({ state: "attached", timeout: 30_000 }).catch(() => {});
  check(await landed.count() > 0, `${w.name}: Show me lands on /about/decks with Lock cards marked New`, page.url());
  const visited = await pollAbout(userId, (r) => (r?.about_seen_ids ?? []).includes(LOCK));
  check(visited?.about_seen_ids.includes(LOCK) === true && visited.about_version_seen === ABOUT_VERSION,
    `${w.name}: the page visit wrote the label's key and kept the floor`, { version: visited?.about_version_seen });
  await page.goBack();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 30_000 });
  await onPage(page, "h1").first().waitFor({ timeout: 30_000 });
  const backShow = await nothingDrawn(page);
  check(backShow.regions === 0, `${w.name}: Back to Home after the visit draws no line`, backShow);

  // Two launches: the band, a crop and a Show me per line, one ✕ writing both.
  await setAbout(userId, ABOUT_VERSION, TWO);
  await home(page);
  const h2 = norm(await onPage(page, `${REGION} h2`).first().textContent().catch(() => null));
  check(h2 === "New in the app", `${w.name} two launches: the heading`, h2);
  const lines = (await onPage(page, `${REGION} li`).allTextContents()).map(norm);
  check(JSON.stringify(lines) === JSON.stringify(TWO_LINES.map((l) => `${l.text} Show me`)), `${w.name} two launches: a line each, in page order`, lines);
  const perLine = await visibleGlyphs(region);
  check(perLine.length === 1 && perLine.every((c) => c.w === 28 && c.h === 28 && c.hasSvg),
    `${w.name} two launches: a 28x28 glyph plate for the label's line, the diamond for the rule's`, perLine);
  const hrefs2 = await onPage(page, `${REGION} a`).evaluateAll((els: Element[]) => els.map((a) => a.getAttribute("href")));
  check(JSON.stringify(hrefs2) === JSON.stringify(TWO_LINES.map((l) => l.href)), `${w.name} two launches: a Show me each`, hrefs2);
  await onPage(page, `${REGION} button[aria-label="Dismiss"]`).first().click();
  const twoX = await pollAbout(userId, (r) => [LOCK, LOCK_RULE].every((k) => (r?.about_seen_ids ?? []).includes(k)));
  check([LOCK, LOCK_RULE].every((k) => twoX?.about_seen_ids.includes(k)), `${w.name} two launches: one ✕ wrote both`, twoX?.about_seen_ids.filter((k) => k.includes("lock")));

  // A2: a launch and an arrival, one ✕ for both.
  await stampArrival(true, userId);
  await setAbout(userId, ABOUT_VERSION, ONE);
  await home(page);
  const a2 = norm(await onPage(page, `${REGION} h2`).first().textContent().catch(() => null));
  check(a2 === "New in the app", `${w.name} A2: the heading`, a2);
  const items = (await onPage(page, `${REGION} li`).allTextContents()).map(norm);
  check(items.length === 2 && items[0] === `${ONE_LINE[0]!.text} Show me` && items[1] === `${SET_NAME} is announced. See it in Precons`,
    `${w.name} A2: About's line first, then the arrival, each with its link`, items);
  const xs = await onPage(page, `${REGION} button[aria-label="Dismiss"]`).count();
  check(xs === 1, `${w.name} A2: one ✕`, `${xs}`);
  await onPage(page, `${REGION} button[aria-label="Dismiss"]`).first().click();
  const both = await pollAbout(userId, (r) => (r?.about_seen_ids ?? []).includes(LOCK) && (r?.upcoming_seen_codes ?? []).includes(SET));
  check(both?.about_seen_ids.includes(LOCK) === true && both.upcoming_seen_codes.includes(SET), `${w.name} A2: one ✕ wrote both halves`, both?.upcoming_seen_codes);
  await home(page);
  check(await region.count() === 0, `${w.name} A2: and a reload draws none`, `${await region.count()} regions`);
  await stampArrival(false, userId);

  // The first-run line on the Dashboard: an account with cards that never opened About. ✕ writes the baseline.
  await setAbout(userId, 0, []);
  await home(page);
  const a3 = norm(await onPage(page, `${REGION} p`).first().textContent().catch(() => null));
  check(a3 === A3_TEXT, `${w.name} first run on the Dashboard: the line`, a3);
  check((await onPage(page, `${REGION} a`).first().getAttribute("href")) === "/about", `${w.name} first run: Show me opens the index`, "");
  check(await onPage(page, `${REGION} button[aria-label="Dismiss"]`).count() === 1, `${w.name} first run on the Dashboard: with ✕`, "");
  await onPage(page, `${REGION} button[aria-label="Dismiss"]`).first().click();
  const first = await pollAbout(userId, (r) => r?.about_version_seen === ABOUT_VERSION);
  check(first?.about_version_seen === ABOUT_VERSION && first.about_seen_ids.includes(LOCK),
    `${w.name} first run: ✕ wrote the floor and every drawn unit's key`, { version: first?.about_version_seen, n: first?.about_seen_ids.length });
  await home(page);
  check(await region.count() === 0, `${w.name} first run: a reload draws none`, `${await region.count()} regions`);
  await context.close();
}

async function checklist(browser: Browser, w: Width, email: string) {
  const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.phone, isMobile: w.phone });
  const page = await context.newPage();
  const id = await signIn(page, email, "");
  await sql`delete from user_prefs where user_id = ${id}`;
  await home(page);
  const region = onPage(page, REGION);
  const step = await onPage(page, "h1").first().textContent();
  const a3 = norm(await onPage(page, `${REGION} p`).first().textContent().catch(() => null));
  check(a3 === A3_TEXT, `${w.name} first run on the checklist: the line`, `${a3} (h1 ${step})`);
  check(await onPage(page, `${REGION} button`).count() === 0, `${w.name} first run on the checklist: no ✕`, `${await onPage(page, `${REGION} button`).count()} buttons`);
  await setAbout(id, ABOUT_VERSION, ONE);
  await home(page);
  const one = norm(await onPage(page, `${REGION} p`).first().textContent().catch(() => null));
  check(one === ONE_LINE[0]!.text && await onPage(page, `${REGION} button`).count() === 0, `${w.name} one launch on the checklist: no ✕`, one);
  await setAbout(id, ABOUT_VERSION, CURRENT);
  await home(page);
  check(await region.count() === 0, `${w.name}: the checklist draws no line for a current reader`, `${await region.count()} regions`);
  await context.close();
  return id;
}

await clerkSetup();
const [{ id: branch }] = await sql`select current_setting('neon.branch_id', true) as id`;
assertNotSharedBranch(branch, "probe:about-banner");
const browser = await chromium.launch();
let userId: string | null = null;
let prior: Prior | null = null;
let tempUser: string | null = null;
try {
  const [account] = await clerk("GET", `/users?email_address=${encodeURIComponent(EMAIL)}`);
  if (!account?.id) throw new Error(`no Clerk account for ${EMAIL}`);
  userId = account.id as string;
  prior = await readPrior(userId);
  const [{ n }] = await sql`select (select count(*) from collection_items where user_id = ${userId}) + (select count(*) from decks where user_id = ${userId}) as n`;
  if (Number(n) === 0) throw new Error("the sign-in account is on its first run: its Home is the checklist, not the Dashboard");

  await sql`delete from catalog_first_seen where kind = 'set' and key = ${SET}`;
  await sql`delete from sets where code = ${SET}`;
  await sql`insert into sets (code, name, set_type, released_at, card_count, digital) values (${SET}, ${SET_NAME}, 'commander', ${day(40)}, 0, false)`;

  for (const w of WIDTHS) await dashboard(browser, w, userId);

  const email = `about-banner-${Date.now()}+clerk_test@the99.app`;
  tempUser = (await clerk("POST", "/users", { email_address: [email], skip_password_requirement: true })).id as string;
  for (const w of WIDTHS) await checklist(browser, w, email);
} finally {
  await sql`delete from catalog_first_seen where kind = 'set' and key = ${SET}`;
  await sql`delete from sets where code = ${SET}`;
  if (userId && prior) await restorePrior(userId, prior);
  if (tempUser) try {
    const tables = await sql`select table_name from information_schema.columns where table_schema = 'public' and column_name = 'user_id'`;
    const left: string[] = [];
    for (const { table_name: t } of tables as { table_name: string }[]) {
      const [{ n }] = (await sql.query(`select count(*)::int as n from "${t}" where user_id = $1`, [tempUser])) as { n: number }[];
      if (n > 0) {
        await sql.query(`delete from "${t}" where user_id = $1`, [tempUser]);
        left.push(`${t} ${n}`);
      }
    }
    console.log(`INFO  removed the checklist account's rows: ${left.join(", ") || "none"}`);
  } finally {
    await clerk("DELETE", `/users/${tempUser}`);
  }
  await browser.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
