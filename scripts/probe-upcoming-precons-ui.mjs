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
// FIXTURES, on local-dev only: two upcoming Commander sets (`zqa` with three revealed legendary creatures, printed from
// cards the catalog already holds; `zqb` with none), `zqa`'s non-baseline `catalog_first_seen` stamp (an arrival), and
// the reader's seen keys for those two codes cleared before each width. Everything the probe added is deleted in the
// `finally`, the reader's two keys included. It fails closed on its target: `PROBE_DB_BRANCH` must name the branch
// `DATABASE_URL` reports, and staging and production are refused by id.
//
// Needs a server on PROBE_BASE with PRECONS_ENABLED=true and UPCOMING_PRECONS_ENABLED=true, on the same database:
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
    select c.oracle_id, (select p.image_uri_small from printings p where p.oracle_id = c.oracle_id and p.image_uri_small is not null limit 1) as art
    from cards c
    where c.type_line like 'Legendary Creature%'
      and exists (select 1 from printings p where p.oracle_id = c.oracle_id and p.image_uri_small is not null)
    order by c.oracle_id limit 3`;
  if (picks.length < 3) throw new Error("the catalog holds fewer than three legendary creatures with art");
  for (const [i, p] of picks.entries()) {
    await sql`insert into printings (scryfall_id, oracle_id, set_code, collector_number, image_uri_small, finishes)
      values (gen_random_uuid(), ${p.oracle_id}, 'zqa', ${String(10 + i)}, ${p.art}, '{nonfoil}')`;
  }
  // zqa ARRIVED yesterday (not the baseline); zqb has no stamp, so it is never news.
  await sql`insert into catalog_first_seen (kind, key, first_seen_at, baseline)
    values ('set', 'zqa', ${new Date(Date.now() - 86_400_000)}, false)`;
}

async function cleanUp(userId) {
  await sql`delete from catalog_first_seen where kind = 'set' and key = any(${SETS})`;
  await sql`delete from printings where set_code = any(${SETS})`;
  await sql`delete from sets where code = any(${SETS})`;
  if (userId) await clearSeen(userId);
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
  console.log(`\n${vp.label}`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  try {
    const userId = await signIn(page);
    userIdHolder.id = userId;
    await clearSeen(userId);
    await page.evaluate(() => { localStorage.removeItem("the99:precons:announced"); localStorage.removeItem("the99:precons:order"); });

    // 1. News opens it, tags it, and the visit writes the key.
    await load(page, "/decks/precons");
    report("an unseen arrival opens the group by itself (C2)", await expanded(page));
    const a = setBlock(page, NAME_A);
    report("the arrived set is tagged new", (await a.getByText("new", { exact: true }).count()) === 1);
    report("its three revealed commanders are drawn, each named in text", (await a.locator("[data-testid=revealed-card]").count()) === 3);
    report("a set with none revealed draws the plate (T2)", (await setBlock(page, NAME_B).locator("[data-testid=none-plate]").count()) === 1);
    report("the set's name is an h3", (await a.locator("h3").first().textContent())?.trim() === NAME_A);
    report("the countdown reads in 30 days", (await a.textContent())?.includes("in 30 days") === true);
    await shoot(page, vp, "tiles-open");
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
    report("rows: line 2 names the first commander and how many more", /and 2 more/.test((await row.textContent()) ?? ""));
    await press.click();
    await page.waitForTimeout(300);
    report("rows: a press opens the row's cards (Q3)",
      (await press.getAttribute("aria-expanded")) === "true" && (await row.locator("[data-testid=revealed-card]:visible").count()) === 3);
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
    report("and the head is in the viewport", box !== null && box.y >= 0 && box.y < vp.height, box ? `y=${Math.round(box.y)}` : "no box");

    // 6. T7.
    await load(page, "/decks/precons?sort=owned");
    report("?sort=owned hides the group (T7)", (await onPage(page, "#announced").count()) === 0);
  } finally {
    await context.close();
  }
}

async function main() {
  await guardTarget();
  await clerkSetup();
  const holder = { id: null };
  const browser = await chromium.launch();
  await cleanUp(null);
  try {
    await plant();
    for (const vp of VIEWPORTS) await walk(browser, vp, holder);
  } finally {
    await browser.close();
    await cleanUp(holder.id);
  }
  console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
