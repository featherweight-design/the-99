// probe:store-show-me — the store choice announcement's Show me opens Settings at the store section (not About), at
// 390x844 and 1300x900, and pressing it answers the line.
//
// With STORE_PREFERENCE_ENABLED on for the sign-in account (a per-user `flag_overrides` row marked `probe:store-show-me`,
// removed in `finally`) and every other About unit seen, the one launch is the store sentence on Shopping's total. The
// probe presses Show me and asserts: it lands on /settings with `#settings-store`, the store section is in the viewport
// (not clipped, top inside the window), and Back to Home draws no line while `user_prefs.about_seen_ids` holds the
// sentence's key. On main the link goes to /about/shopping and the line comes back. The account's `user_prefs` row is
// read first and put back exactly. Local-dev or a scratch branch only (production and staging refused by branch id).
//
//   PROBE_BASE=http://localhost:3312 E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app pnpm probe:store-show-me
import { mkdir } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Browser, type Page } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";
import { assertNotSharedBranch } from "./lib/scratch-branch.mjs";
import { legacyIds } from "./lib/about-clear.mjs";
import { ABOUT_VERSION } from "../src/lib/copy/about";
import { afterVisit, sentenceKey, visibleSections } from "../src/lib/about/pages-visible";
import { NEVER_SEEN } from "../src/lib/about/visible";
import { SWITCH_NAMES } from "../src/lib/flags/registry";

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

const MARK = "probe:store-show-me";
const REGION = "section[aria-label='New in the app']";
const STORE_KEY = sentenceKey("shopping/deck-shopping/total", "STORE_PREFERENCE_ENABLED");
const ALL_ON = Object.fromEntries(SWITCH_NAMES.map((n) => [n, "true"])) as unknown as NodeJS.ProcessEnv;
const CURRENT = [...new Set([...legacyIds(), ...afterVisit(visibleSections(ALL_ON), "home", NEVER_SEEN).ids])];
// Everything seen but the store sentence: it is the one launch.
const SEEN = CURRENT.filter((id) => id !== STORE_KEY && id !== "shopping@STORE_PREFERENCE_ENABLED");

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


type Prior = { existed: false } | { existed: true; about_version_seen: number; about_seen_ids: string[] };

async function readPrior(id: string): Promise<Prior> {
  const rows = await sql`select about_version_seen, about_seen_ids from user_prefs where user_id = ${id}`;
  return rows.length === 0 ? { existed: false } : ({ existed: true, ...rows[0] } as Prior);
}

async function restorePrior(id: string, was: Prior) {
  if (!was.existed) await sql`delete from user_prefs where user_id = ${id}`;
  else await sql`update user_prefs set about_version_seen = ${was.about_version_seen}, about_seen_ids = ${was.about_seen_ids} where user_id = ${id}`;
  const now = await readPrior(id);
  check(JSON.stringify(now) === JSON.stringify(was), "the account's user_prefs row is restored as it was", `${JSON.stringify(was)} -> ${JSON.stringify(now)}`);
}

async function setAbout(userId: string, ids: readonly string[]) {
  await sql`insert into user_prefs (user_id, about_version_seen, about_seen_ids) values (${userId}, ${ABOUT_VERSION}, ${ids as string[]})
    on conflict (user_id) do update set about_version_seen = ${ABOUT_VERSION}, about_seen_ids = ${ids as string[]}`;
}

async function seenIds(userId: string): Promise<string[]> {
  const [row] = await sql`select about_seen_ids from user_prefs where user_id = ${userId}`;
  return (row?.about_seen_ids ?? []) as string[];
}

// Photographs for the PR's contact sheet: the line on Home, then where Show me lands.
const SHOTS = process.env.PROBE_SHOTS ?? "contact-sheets/store-show-me";
await mkdir(SHOTS, { recursive: true });

async function home(page: Page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await onPage(page, "#home-heading, [data-lock-page-line]").first().waitFor({ state: "attached", timeout: 30_000 });
  await page.waitForFunction(() => {
    const el = document.querySelector("main section[aria-label='New in the app'] a");
    return !el || Object.keys(el).some((k) => k.startsWith("__reactProps"));
  }, null, { timeout: 30_000 });
}

async function walk(browser: Browser, w: Width, userId: string) {
  const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.phone, isMobile: w.phone });
  const page = await context.newPage();
  await signIn(page, EMAIL, PASSWORD ?? "");
  await setAbout(userId, SEEN);
  await home(page);
  const region = onPage(page, REGION);
  check(await region.count() === 1, `${w.name}: the store launch draws on Home`, `${await region.count()} regions`);
  const show = onPage(page, `${REGION} a`).first();
  await page.screenshot({ path: `${SHOTS}/${w.name}-1-home.png` });
  const href = await show.getAttribute("href");
  check(href === "/settings#settings-store", `${w.name}: Show me points at Settings' store section`, String(href));
  await show.click();
  await page.waitForURL((u) => u.pathname === "/settings", { timeout: 30_000 }).catch(() => {});
  const url = new URL(page.url());
  check(url.pathname === "/settings" && url.hash === "#settings-store", `${w.name}: it lands on /settings#settings-store`, page.url());
  const section = onPage(page, "[data-store-section]").first();
  await section.waitFor({ state: "attached", timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(800);
  const rect = await section.evaluate((el: Element) => {
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight };
  }).catch(() => null);
  await page.screenshot({ path: `${SHOTS}/${w.name}-2-settings.png` });
  check(rect !== null && rect.top >= 0 && rect.top < rect.vh && rect.bottom > 0, `${w.name}: the store section is in view`, rect);
  const ids = await (async () => {
    for (let i = 0; i < 20; i += 1) {
      const got = await seenIds(userId);
      if (got.includes(STORE_KEY)) return got;
      await new Promise((r) => setTimeout(r, 250));
    }
    return seenIds(userId);
  })();
  check(ids.includes(STORE_KEY), `${w.name}: pressing Show me wrote the sentence's key`, ids.includes(STORE_KEY));
  await home(page);
  check(await region.count() === 0, `${w.name}: Home draws no line after the visit`, `${await region.count()} regions`);
  await context.close();
}

await clerkSetup();
const [{ id: branch }] = await sql`select current_setting('neon.branch_id', true) as id`;
assertNotSharedBranch(branch, "probe:store-show-me");
const browser = await chromium.launch();
let userId: string | null = null;
let prior: Prior | null = null;
try {
  const [account] = await clerk("GET", `/users?email_address=${encodeURIComponent(EMAIL)}`);
  if (!account?.id) throw new Error(`no Clerk account for ${EMAIL}`);
  userId = account.id as string;
  prior = await readPrior(userId);
  const [own] = await sql`select 1 from flag_overrides where "switch" = 'STORE_PREFERENCE_ENABLED' and scope = 'user' and user_id = ${userId}`;
  if (own) throw new Error("the account already holds its own STORE_PREFERENCE_ENABLED row: refusing to overwrite it");
  await sql`insert into flag_overrides ("switch", scope, user_id, value, updated_by) values ('STORE_PREFERENCE_ENABLED', 'user', ${userId}, 'on', ${MARK})`;
  for (const w of WIDTHS) await walk(browser, w, userId);
} finally {
  await sql`delete from flag_overrides where updated_by = ${MARK}`;
  const [{ n }] = await sql`select count(*)::int as n from flag_overrides where updated_by = ${MARK}`;
  check(n === 0, "the probe's flag row is removed", n);
  if (userId && prior) await restorePrior(userId, prior);
  await browser.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
