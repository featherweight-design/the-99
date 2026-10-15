// probe:about-banner — About's notice as a line on Home's banner, pressed in a real browser at 390x844 and 1300x900
// (plan `2026-10-15-about-on-the-banner.md`, PR A; handoff `design_handoff_the99_upcoming_precons`, `R2 - Home-About`,
// STATES A1–A3).
//
// What jsdom cannot see, and the unit tests therefore do not prove:
//   - A1 on the Dashboard: `N new in About: {titles}.`, Show me to /about, ✕ (44 at 390, 32 at 1300); and NO sheet.
//   - Cookie suppression: a browser holding a current `about_sheet` cookie draws no About line, read per request
//     outside Home's cached payload (`LIST_CACHE_ENABLED=true` on the server), and the proxy writes no such cookie.
//   - ✕ writes About's seen (read back from `user_prefs`), a reload draws no line, and `/about` then lists no new
//     entries (its what's-new index is gone).
//   - Back after ✕ (a client navigation away and Back restores the router's held payload) draws no line.
//   - Show me lands on /about, the visit writes seen, and Back to Home draws no line (the client acknowledgement).
//   - A2: About and an arrival under `New in the app`, About first, each line its own link, one ✕ writing both.
//   - A3 on the Dashboard (an account that imported before ever opening /about), with ✕.
//   - A3 and A1 on the first-run checklist, with no ✕.
//   - Every page but Home draws no line and no sheet.
//
// The sign-in account (`E2E_AUDIT_USER_EMAIL`, which holds cards or decks, so Home is its Dashboard) has its
// `user_prefs` row read before any page and put back exactly in `finally`, then re-read as a check. Its About state
// is driven by that row alone: every catalog id is put in `about_seen_ids`, so no SWITCHED entry is new whatever the
// server's switches say, and the version floor is lowered below the newest unswitched entry, so exactly those
// entries are new. The checklist states use a fresh Clerk test user on the DEVELOPMENT instance, deleted after with
// every row it wrote. The A2 arrival is a fixture `commander` set `pqbset` with a day-old non-baseline
// `catalog_first_seen` stamp, removed in `finally`. Local-dev only: production and staging are refused by branch id.
//
// The server: `next start` of a build with the worktree's `.env`, started with
//   PRECONS_ENABLED=true UPCOMING_PRECONS_ENABLED=true LIST_CACHE_ENABLED=true ABOUT_SHEET_ENABLED=true
//
//   PROBE_BASE=http://localhost:3312 pnpm probe:about-banner
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";
import { catalogIds } from "./lib/about-clear.mjs";
import { ABOUT_VERSION, aboutEntries } from "../src/lib/copy/about";
import { arrivalsCopy } from "../src/lib/copy/arrivals";
import { HOW_IT_WORKS_ID } from "../src/lib/copy/how-it-works-links";

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
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

const SET = "pqbset";
const SET_NAME = "Probe About Banner Commander";
const REGION = "section[aria-label='New in the app']";
const DAY = 86_400_000;
const day = (offset: number) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);

// Every id the catalog holds, and the unswitched entries a floor one below the newest of them leaves new.
const CATALOG = catalogIds();
// Seen with the How it works appendix too: a reader who has not seen it is "behind" to /about, whose visit then
// writes the floor in an effect that can land after the probe has lowered it.
const ALL_IDS = [...CATALOG, HOW_IT_WORKS_ID];
const UNSWITCHED = aboutEntries.filter((e) => !e.switch);
const W = Math.max(...UNSWITCHED.map((e) => e.since));
const BEHIND = W - 1;
const NEW_TITLES = UNSWITCHED.filter((e) => e.since > BEHIND).map((e) => e.title);
if (NEW_TITLES.length === 0) throw new Error("no unswitched entry is new one version below the newest: nothing to probe");
const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const capped = (titles: string[]) => {
  const shown = titles.length <= 4 ? titles.length : 3;
  return arrivalsCopy.aboutRest(titles, shown, titles.length - shown);
};
const A1_TEXT = norm(`${arrivalsCopy.aboutLead(NEW_TITLES.length)}${capped(NEW_TITLES)}`);
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

async function sheetCookies(context: BrowserContext) {
  return (await context.cookies()).filter((c) => c.name === "about_sheet");
}

/** No line and no sheet, read after the page settles. */
async function nothingDrawn(page: Page) {
  await page.waitForTimeout(500);
  return { regions: await onPage(page, REGION).count(), sheets: await page.locator("[data-about-sheet]").count() };
}

/** The switched entries this server draws, read off /about's own anchors, in page order: the sheet cookie names them. */
async function switchedOnServer(page: Page) {
  await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded" });
  await onPage(page, "#precons").first().waitFor({ timeout: 30_000 });
  const present = new Set(await page.evaluate((ids) => ids.filter((id) => document.getElementById(id)), CATALOG));
  // Nothing is new here, so the visit writes nothing; give a late effect its time all the same.
  await page.waitForTimeout(1_500);
  return aboutEntries.filter((e) => e.switch && present.has(e.id)).map((e) => e.id);
}

async function dashboard(browser: Browser, w: Width, userId: string) {
  const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.phone, isMobile: w.phone });
  const page = await context.newPage();
  await signIn(page, EMAIL, PASSWORD ?? "");
  await context.clearCookies({ name: "about_sheet" });
  await setAbout(userId, ABOUT_VERSION, ALL_IDS);
  const switched = await switchedOnServer(page);
  const region = onPage(page, REGION);

  // A1: About alone.
  await stampArrival(false, userId);
  await setAbout(userId, BEHIND, ALL_IDS);
  await home(page);
  check(await region.count() === 1, `${w.name} A1: the banner draws for a reader behind`, `${await region.count()} regions`);
  const text = norm(await onPage(page, `${REGION} p`).first().textContent().catch(() => null));
  check(text === A1_TEXT, `${w.name} A1: the sentence names what is new`, text);
  check(await onPage(page, `${REGION} h2`).count() === 0, `${w.name} A1: one line, no heading`, `${await onPage(page, `${REGION} h2`).count()} h2`);
  const show = onPage(page, `${REGION} a`).first();
  check(norm(await show.textContent()) === "Show me" && (await show.getAttribute("href")) === "/about", `${w.name} A1: Show me goes to /about`, `${await show.textContent()} -> ${await show.getAttribute("href")}`);
  const xb = await box(onPage(page, `${REGION} button[aria-label="Dismiss"]`).first());
  const want = w.phone ? 44 : 32;
  check(Math.round(xb.width) === want && Math.round(xb.height) === want, `${w.name} A1: ✕ is ${want} × ${want}`, `${xb.width} × ${xb.height}`);
  check(await page.locator("[data-about-sheet]").count() === 0, `${w.name}: no About sheet draws on Home`, `${await page.locator("[data-about-sheet]").count()} sheets`);
  check((await sheetCookies(context)).length === 0, `${w.name}: the proxy writes no about_sheet cookie`, JSON.stringify((await sheetCookies(context)).map((c) => c.value)));

  // A non-Home page: nothing, and no sheet, though the reader is behind.
  for (const path of ["/decks", "/collection"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await onPage(page, "h1").first().waitFor({ timeout: 30_000 });
    const d = await nothingDrawn(page);
    check(d.regions === 0 && d.sheets === 0, `${w.name} ${path}: no About line and no sheet`, d);
  }

  // Cookie suppression: a browser that already showed the sheet for these entries is not told again on Home.
  const value = [`${userId}.${ABOUT_VERSION}`, ...switched].join("+");
  await context.addCookies([{ name: "about_sheet", value, url: BASE, httpOnly: true, sameSite: "Lax" }]);
  await home(page);
  const suppressed = await nothingDrawn(page);
  check(suppressed.regions === 0, `${w.name}: a current about_sheet cookie suppresses the About line`, suppressed);
  const kept = await sheetCookies(context);
  check(kept.length === 1 && kept[0]!.value === value, `${w.name}: and the cookie is read, never rewritten`, kept.map((c) => c.value));
  // A stale cookie (an older version) does not suppress it.
  await context.addCookies([{ name: "about_sheet", value: `${userId}.${ABOUT_VERSION - 1}`, url: BASE, httpOnly: true, sameSite: "Lax" }]);
  await home(page);
  check(await region.count() === 1, `${w.name}: a stale cookie does not suppress it`,
    `${await region.count()} regions; cookies ${JSON.stringify((await sheetCookies(context)).map((c) => [c.domain, c.path, c.value]))}`);
  await context.clearCookies({ name: "about_sheet" });

  // ✕ writes seen, a reload draws nothing, and /about lists nothing new.
  await home(page);
  await onPage(page, `${REGION} button[aria-label="Dismiss"]`).first().click();
  await region.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
  check(await region.count() === 0, `${w.name} A1: ✕ closes the line`, `${await region.count()} regions`);
  const focused = await page.evaluate(() => document.activeElement?.id);
  check(focused === "home-heading", `${w.name} A1: focus moves to Home's h1`, focused ?? "none");
  const after = await pollAbout(userId, (r) => r?.about_version_seen === ABOUT_VERSION);
  check(after?.about_version_seen === ABOUT_VERSION, `${w.name} A1: ✕ wrote About's seen floor`, `${after?.about_version_seen}`);
  await home(page);
  check(await region.count() === 0, `${w.name} A1: a reload after ✕ draws no line (the stamp retired cached Home)`, `${await region.count()} regions`);
  await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded" });
  await onPage(page, "#precons").first().waitFor({ timeout: 30_000 });
  const index = await onPage(page, "nav[aria-labelledby='whats-new-heading']").count();
  check(index === 0, `${w.name}: /about then lists nothing new`, `${index} what's-new index`);

  // Back after ✕: ✕, a client navigation away, Back to the router's held Home.
  await setAbout(userId, BEHIND, ALL_IDS);
  await home(page);
  check(await region.count() === 1, `${w.name}: the line is back once About is behind again`, `${await region.count()} regions`);
  await onPage(page, `${REGION} button[aria-label="Dismiss"]`).first().click();
  await region.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
  await pollAbout(userId, (r) => r?.about_version_seen === ABOUT_VERSION);
  await page.locator('a[href="/decks"]:visible').first().click();
  await page.waitForURL((u) => u.pathname === "/decks", { timeout: 30_000 });
  await onPage(page, "h1").first().waitFor({ timeout: 30_000 });
  await page.goBack();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 30_000 });
  await onPage(page, "h1").first().waitFor({ timeout: 30_000 });
  const backX = await nothingDrawn(page);
  check(backX.regions === 0, `${w.name}: Back to Home after ✕ draws no line`, backX);

  // Show me lands on /about; the visit writes seen; Back to Home draws no line.
  await setAbout(userId, BEHIND, ALL_IDS);
  await home(page);
  await onPage(page, `${REGION} a`).first().click();
  await page.waitForURL((u) => u.pathname === "/about", { timeout: 30_000 });
  check(new URL(page.url()).pathname === "/about", `${w.name}: Show me lands on /about`, page.url());
  const visited = await pollAbout(userId, (r) => r?.about_version_seen === ABOUT_VERSION);
  check(visited?.about_version_seen === ABOUT_VERSION, `${w.name}: the /about visit wrote seen`, `${visited?.about_version_seen}`);
  check(await page.locator("[data-about-sheet]").count() === 0, `${w.name}: no sheet on /about`, `${await page.locator("[data-about-sheet]").count()}`);
  await page.goBack();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 30_000 });
  await onPage(page, "h1").first().waitFor({ timeout: 30_000 });
  const backShow = await nothingDrawn(page);
  check(backShow.regions === 0, `${w.name}: Back to Home after the /about visit draws no line`, backShow);

  // A2: About and an arrival, one ✕ for both.
  await stampArrival(true, userId);
  await setAbout(userId, BEHIND, ALL_IDS);
  await home(page);
  const h2 = norm(await onPage(page, `${REGION} h2`).first().textContent().catch(() => null));
  check(h2 === "New in the app", `${w.name} A2: the heading`, h2);
  const items = (await onPage(page, `${REGION} li`).allTextContents()).map(norm);
  check(items.length === 2 && items[0] === `${A1_TEXT} Show me` && items[1] === `${SET_NAME} is announced. See it in Precons`,
    `${w.name} A2: About's line first, then the arrival, each with its link`, items);
  const hrefs = await onPage(page, `${REGION} a`).evaluateAll((els: Element[]) => els.map((a) => a.getAttribute("href")));
  check(hrefs.length === 2 && hrefs[0] === "/about" && hrefs[1] === "/decks/precons?sort=newest#announced", `${w.name} A2: two links`, hrefs);
  const xs = await onPage(page, `${REGION} button[aria-label="Dismiss"]`).count();
  check(xs === 1, `${w.name} A2: one ✕`, `${xs}`);
  const x2 = await box(onPage(page, `${REGION} button[aria-label="Dismiss"]`).first());
  check(Math.round(x2.width) === want, `${w.name} A2: ✕ is ${want}`, `${x2.width}`);
  await onPage(page, `${REGION} button[aria-label="Dismiss"]`).first().click();
  const both = await pollAbout(userId, (r) => r?.about_version_seen === ABOUT_VERSION && (r?.upcoming_seen_codes ?? []).includes(SET));
  check(both?.about_version_seen === ABOUT_VERSION && both.upcoming_seen_codes.includes(SET), `${w.name} A2: one ✕ wrote both halves`, both);
  await home(page);
  check(await region.count() === 0, `${w.name} A2: and a reload draws none`, `${await region.count()} regions`);
  await stampArrival(false, userId);

  // A3 on the Dashboard: an account with cards that never opened /about. ✕ writes what a visit writes.
  await setAbout(userId, 0, []);
  await home(page);
  const a3 = norm(await onPage(page, `${REGION} p`).first().textContent().catch(() => null));
  check(a3 === A3_TEXT, `${w.name} A3 on the Dashboard: the first-run line`, a3);
  check(await onPage(page, `${REGION} button[aria-label="Dismiss"]`).count() === 1, `${w.name} A3 on the Dashboard: with ✕`, "");
  await onPage(page, `${REGION} button[aria-label="Dismiss"]`).first().click();
  const first = await pollAbout(userId, (r) => r?.about_version_seen === ABOUT_VERSION);
  check(first?.about_version_seen === ABOUT_VERSION && switched.every((id) => first.about_seen_ids.includes(id)),
    `${w.name} A3: ✕ wrote the floor and the switched entries the server draws`, first);
  await home(page);
  check(await region.count() === 0, `${w.name} A3: a reload draws none`, `${await region.count()} regions`);
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
  check(a3 === A3_TEXT, `${w.name} A3 on the checklist: the first-run line`, `${a3} (h1 ${step})`);
  check(await onPage(page, `${REGION} button`).count() === 0, `${w.name} A3 on the checklist: no ✕`, `${await onPage(page, `${REGION} button`).count()} buttons`);
  check(await page.locator("[data-about-sheet]").count() === 0, `${w.name} A3 on the checklist: no sheet`, "");
  await setAbout(id, BEHIND, ALL_IDS);
  await home(page);
  const a1 = norm(await onPage(page, `${REGION} p`).first().textContent().catch(() => null));
  check(a1 === A1_TEXT && await onPage(page, `${REGION} button`).count() === 0, `${w.name} A1 on the checklist: About behind, no ✕`, a1);
  await setAbout(id, ABOUT_VERSION, ALL_IDS);
  await home(page);
  check(await region.count() === 0, `${w.name}: the checklist draws no line for a current reader`, `${await region.count()} regions`);
  await context.close();
  return id;
}

await clerkSetup();
const [{ id: branch }] = await sql`select current_setting('neon.branch_id', true) as id`;
if (!branch || branch === PRODUCTION || branch === STAGING) {
  throw new Error(`refusing to write fixtures to ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev`);
}
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
