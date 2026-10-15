// probe:arrivals-banner — the upcoming-precons banner on Home and its About entry, pressed in a real browser at
// 390x844 and 1300x900 (plan `2026-10-14-upcoming-precons.md`, PR 3; handoff STATES H1–H8).
//
// What jsdom cannot see, and the unit tests therefore do not prove:
//   - E5: ✕ writes the seen keys, and a RELOAD draws no banner, with `LIST_CACHE_ENABLED=true` on the server. The
//     banner rides in Home's cached payload, so this is the proof that `user_prefs`' stamp retires the entry.
//   - Focus lands on Home's h1 after ✕ (H8), from a click and from the keyboard.
//   - The two layouts: one arrival (sentence, link, ✕) and several (heading, lines, one link), each at both widths,
//     with ✕ at 44 at 390 and 32 at 1300, and the link's focus ring (2px accent, 2px offset).
//   - Each link lands on Precons with Most owned SAVED first (`the99:precons:order`), which is why it names
//     `sort=newest`, and its target is drawn: `#announced` with the Announced group open, `#precons-<year>` the
//     year's head.
//   - A Precons visit marks the arrivals seen (rule 6; the page's `after()` write), so the next Home load draws no
//     banner.
//   - A first-run account gets no banner and nothing is marked seen (H7).
//   - The About entry `upcoming-precons` draws with the switch on, and neither it nor the banner draws with it off.
//
// FIXTURES, on local-dev only (the branch is checked): two Commander sets (`pqaset`, announced 40 days out;
// `pqalist`, released 3 days ago), one precon listing `pqalist`, and a non-baseline `catalog_first_seen` stamp for
// each arrival, a day old. The sign-in account's seen keys for them are reset before each state. The switch-off
// state is an ACCOUNT override on `flag_overrides` (the server resolves it through a 30-second memo, so the probe
// waits it out). The first-run account is a fresh Clerk test user on the DEVELOPMENT instance, deleted after. Every
// fixture, the override and the temporary user's rows are removed in a `finally`.
//
// The server: `next start` of a build with the worktree's `.env`, started with
//   PRECONS_ENABLED=true UPCOMING_PRECONS_ENABLED=true LIST_CACHE_ENABLED=true ABOUT_SHEET_ENABLED=true
//
//   PROBE_BASE=http://localhost:3311 pnpm probe:arrivals-banner
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, CLERK_SECRET_KEY, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
if (!CLERK_SECRET_KEY.startsWith("sk_test_")) throw new Error("refusing: CLERK_SECRET_KEY is not a development instance's");
const sql = neon(DATABASE_URL);
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

const SET = "pqaset";
const LISTED = "pqalist";
const FILE = "probe-arrivals-banner.json";
const KEYS = [SET, LISTED, `lists:${LISTED}`];
const REGION = "section[aria-label='New in the app']";
const MEMO_MS = 31_000;
const DAY = 86_400_000;
const day = (offset) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);

const WIDTHS = [
  { name: "390", width: 390, height: 844, phone: true },
  { name: "1300", width: 1300, height: 900, phone: false },
];

let failures = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
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

async function clerk(method, path, body) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Clerk ${method} ${path}: ${res.status}`);
  return res.json();
}

/** Which arrivals exist: each a `catalog_first_seen` stamp a day old, never the baseline. */
async function stamp({ set, lists }) {
  await sql`delete from catalog_first_seen where (kind = 'set' and key = ${SET}) or (kind = 'precon' and key = ${FILE})`;
  const at = new Date(Date.now() - DAY);
  if (set) await sql`insert into catalog_first_seen (kind, key, first_seen_at, baseline) values ('set', ${SET}, ${at}, false)`;
  if (lists) await sql`insert into catalog_first_seen (kind, key, first_seen_at, baseline) values ('precon', ${FILE}, ${at}, false)`;
}

/** Forget the fixtures' seen keys for `userId`. Any UPDATE of `user_prefs` moves the stamp, retiring cached Home. */
async function unsee(userId) {
  await sql`insert into user_prefs (user_id) values (${userId}) on conflict (user_id) do nothing`;
  await sql`update user_prefs set upcoming_seen_codes = array(select k from unnest(upcoming_seen_codes) k where k <> all(${KEYS}))
            where user_id = ${userId}`;
}

const seenKeys = async (userId) =>
  (await sql`select upcoming_seen_codes from user_prefs where user_id = ${userId}`)[0]?.upcoming_seen_codes ?? [];

const box = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
});

async function home(page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await onPage(page, "h1").first().waitFor({ timeout: 30_000 });
  // Hydrated: the banner's ✕ carries React's props once its handler is attached.
  await page.waitForFunction(() => {
    const b = document.querySelector("main section[aria-label='New in the app'] button");
    return !b || Object.keys(b).some((k) => k.startsWith("__reactProps"));
  }, null, { timeout: 30_000 });
}

/** Follow the banner's link with Most owned saved, and say where it landed. */
async function follow(page, w, label, target) {
  await page.evaluate(() => localStorage.setItem("the99:precons:order", "owned"));
  const link = onPage(page, `${REGION} a`).first();
  const href = await link.getAttribute("href");
  await link.click();
  await page.waitForURL((u) => u.pathname === "/decks/precons", { timeout: 30_000 });
  await onPage(page, "h1").first().waitFor({ timeout: 30_000 });
  const url = new URL(page.url());
  check(url.search === "?sort=newest" && url.hash === `#${target}`, `${w.name} ${label}: lands on Precons with sort=newest#${target}`, `${url.pathname}${url.search}${url.hash}, href ${href}`);
  const found = await onPage(page, `#${target}`).first().waitFor({ state: "visible", timeout: 15_000 }).then(() => true, () => false);
  check(found, `${w.name} ${label}: #${target} drawn under a saved Most owned`, `visible ${found}`);
  if (target === "announced") {
    // Hydrated before reading the head's state: the group opens by itself on `#announced`.
    await page.waitForTimeout(1_000);
    const expanded = await onPage(page, "#announced-head button").first().getAttribute("aria-expanded").catch(() => null);
    const sets = await onPage(page, "[data-testid=announced-set]").count();
    check(expanded === "true" && sets > 0, `${w.name} ${label}: the Announced group arrives open`, `aria-expanded ${expanded}, ${sets} set blocks`);
  }
  await page.evaluate(() => localStorage.removeItem("the99:precons:order"));
}

/** Rule 6: the visit just made marks the arrivals seen, so the next Home load draws no banner. */
async function visitMarksSeen(page, w, userId, label, want) {
  let keys = [];
  for (let i = 0; i < 20 && !want.every((k) => keys.includes(k)); i += 1) {
    await page.waitForTimeout(250);
    keys = await seenKeys(userId);
  }
  check(want.every((k) => keys.includes(k)), `${w.name} ${label}: the Precons visit wrote the seen keys`, JSON.stringify(keys.filter((k) => KEYS.includes(k))));
  await home(page);
  const n = await onPage(page, REGION).count();
  check(n === 0, `${w.name} ${label}: the next Home load draws no banner (rule 6)`, `${n} regions`);
}

async function focusedIsH1(page) {
  return page.evaluate(() => document.activeElement?.tagName === "H1" && document.activeElement.id === "home-heading");
}

/** The ring a keyboard focus draws on `locator`: 2px solid, 2px offset, in --accent. */
async function ring(page, locator) {
  await page.keyboard.press("Shift");
  await locator.focus();
  return locator.evaluate((el) => {
    const s = getComputedStyle(el);
    const probe = document.createElement("span");
    probe.style.color = "var(--accent)";
    document.body.append(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    return { width: s.outlineWidth, style: s.outlineStyle, offset: s.outlineOffset, color: s.outlineColor, accent };
  });
}

async function widthRun(browser, w, userId) {
  const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.phone, isMobile: w.phone });
  const page = await context.newPage();
  await signIn(page, EMAIL, PASSWORD);

  // H4: several arrivals, then follow the link, then ✕ by click.
  await stamp({ set: true, lists: true });
  await unsee(userId);
  await home(page);
  const region = onPage(page, REGION);
  check(await region.count() === 1, `${w.name} H4: the banner draws with two unseen arrivals`, `${await region.count()} regions`);
  const heading = await onPage(page, `${REGION} h2`).first().textContent().catch(() => null);
  check(heading === "2 new in Commander precons", `${w.name} H4: the count heading`, heading);
  const lines = await onPage(page, `${REGION} li`).allTextContents();
  check(lines.length === 2 && lines[0] === "Probe Listed Commander: 1 decklist listed." && lines[1] === "Probe Announced Commander is announced.",
    `${w.name} H4: one line each, soonest release first`, JSON.stringify(lines));
  const links = await onPage(page, `${REGION} a`).count();
  check(links === 1, `${w.name} H4: one link for all`, `${links} links`);
  const close = onPage(page, `${REGION} button[aria-label="Dismiss"]`).first();
  const xb = await box(close);
  const want = w.phone ? 44 : 32;
  check(Math.round(xb.width) === want && Math.round(xb.height) === want, `${w.name}: ✕ is ${want} × ${want}`, `${xb.width} × ${xb.height}`);
  const lb = await box(onPage(page, `${REGION} a`).first());
  const ub = await box(onPage(page, `${REGION} ul`).first());
  check(w.phone ? lb.top >= ub.bottom - 1 : lb.bottom <= ub.top + 1,
    `${w.name} H4: the link ${w.phone ? "last, on its own line" : "on the heading line"}`, `link ${lb.top}–${lb.bottom}, lines ${ub.top}–${ub.bottom}`);
  if (w.phone) check(Math.round(lb.height) >= 44, "390 H4: the link's line is 44px", `${lb.height}`);
  const sheet = await page.locator("[data-about-sheet]").count();
  console.log(`INFO  ${w.name} H5: the About sheet is ${sheet ? "up beside the banner" : "not due for this account"}`);
  const r = await ring(page, onPage(page, `${REGION} a`).first());
  check(r.width === "2px" && r.style === "solid" && r.offset === "2px" && r.color === r.accent,
    `${w.name} H8: the link's focus ring is 2px --accent at a 2px offset`, JSON.stringify(r));

  await follow(page, w, "several (a set among them)", "announced");
  await visitMarksSeen(page, w, userId, "several", KEYS);

  // ✕ by click, over the same two arrivals made unseen again.
  await unsee(userId);
  await home(page);
  check(await region.count() === 1, `${w.name}: the banner is back once its keys are unseen`, `${await region.count()} regions`);
  await onPage(page, `${REGION} button[aria-label="Dismiss"]`).first().click();
  await region.waitFor({ state: "detached", timeout: 2_000 }).catch(() => {});
  check(await region.count() === 0, `${w.name} H6: ✕ closes the banner`, `${await region.count()} regions`);
  check(await focusedIsH1(page), `${w.name} H8: focus moves to Home's h1 after ✕`, await page.evaluate(() => document.activeElement?.tagName));
  await page.waitForTimeout(1_500);
  const keys = await seenKeys(userId);
  check(KEYS.every((k) => keys.includes(k)), `${w.name}: ✕ wrote the seen keys`, JSON.stringify(keys.filter((k) => KEYS.includes(k))));
  await home(page);
  check(await region.count() === 0, `${w.name} E5: a reload after ✕ draws no banner (the stamp retired cached Home)`, `${await region.count()} regions`);

  // H3: one arrival, its decklists; follow its link to the year.
  await stamp({ set: false, lists: true });
  await unsee(userId);
  await home(page);
  const text3 = await onPage(page, `${REGION} p`).first().textContent().catch(() => null);
  check(text3 === "Probe Listed Commander: 1 decklist listed.", `${w.name} H3: one sentence for the decklists`, text3);
  const link3 = await onPage(page, `${REGION} a`).first().textContent().catch(() => null);
  check(link3 === "See them in Precons", `${w.name} H3: its link`, link3);
  await follow(page, w, "a lists line", `precons-${day(-3).slice(0, 4)}`);
  await visitMarksSeen(page, w, userId, "a lists line", [LISTED, `lists:${LISTED}`]);

  // H2: one arrival, a set announced; ✕ from the keyboard.
  await stamp({ set: true, lists: false });
  await unsee(userId);
  await home(page);
  const text2 = await onPage(page, `${REGION} p`).first().textContent().catch(() => null);
  check(text2 === "Probe Announced Commander is announced.", `${w.name} H2: one sentence for the set`, text2);
  const x2 = onPage(page, `${REGION} button[aria-label="Dismiss"]`).first();
  const xr = await ring(page, x2);
  check(xr.width === "2px" && xr.offset === "2px" && xr.color === xr.accent, `${w.name} H8: ✕'s focus ring`, JSON.stringify(xr));
  await page.keyboard.press("Enter");
  await region.waitFor({ state: "detached", timeout: 2_000 }).catch(() => {});
  check(await region.count() === 0 && await focusedIsH1(page), `${w.name} H8: Enter on ✕ closes it and focuses the h1`, `${await region.count()} regions`);
  await page.waitForTimeout(1_500);
  await home(page);
  check(await region.count() === 0, `${w.name} E5: and a reload draws none`, `${await region.count()} regions`);

  // The About entry, switch on.
  await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded" });
  // The entries stream in after the page's h1: wait for the precons entry, which draws either way, so an absence
  // below is a fact about the switch and not about how far the page had arrived.
  await onPage(page, "#precons").first().waitFor({ timeout: 30_000 });
  const entry = onPage(page, "#upcoming-precons");
  const title = await entry.count() ? (await entry.first().textContent())?.includes("Commander sets on the way") : false;
  check(title, `${w.name}: /about draws "Commander sets on the way" with the switch on`, `${await entry.count()} anchors`);
  await context.close();
}

/** The switch off for this account: neither the banner nor the entry. */
async function switchedOff(browser, w) {
  const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.phone, isMobile: w.phone });
  const page = await context.newPage();
  await signIn(page, EMAIL, PASSWORD);
  await home(page);
  check(await onPage(page, REGION).count() === 0, `${w.name} H1: no banner with the switch off`, `${await onPage(page, REGION).count()} regions`);
  await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded" });
  // The entries stream in after the page's h1: wait for the precons entry, which draws either way, so an absence
  // below is a fact about the switch and not about how far the page had arrived.
  await onPage(page, "#precons").first().waitFor({ timeout: 30_000 });
  check(await onPage(page, "#upcoming-precons").count() === 0, `${w.name}: /about draws no entry with the switch off`, `${await onPage(page, "#upcoming-precons").count()} anchors`);
  await context.close();
}

async function firstRun(browser, w, email) {
  const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.phone, isMobile: w.phone });
  const page = await context.newPage();
  const id = await signIn(page, email, "");
  await home(page);
  check(await onPage(page, REGION).count() === 0, `${w.name} H7: a first-run account gets no banner`, `${await onPage(page, REGION).count()} regions`);
  const keys = await seenKeys(id);
  check(keys.length === 0, `${w.name} H7: and nothing is marked seen`, JSON.stringify(keys));
  await context.close();
  return id;
}

async function cleanFixtures() {
  await sql`delete from flag_overrides where note = 'probe:arrivals-banner'`;
  await sql`delete from catalog_first_seen where (kind = 'set' and key = ${SET}) or (kind = 'precon' and key = ${FILE})`;
  await sql`delete from precons where file_name = ${FILE}`;
  await sql`delete from sets where code in (${SET}, ${LISTED})`;
}

await clerkSetup();
const [{ id: branch }] = await sql`select current_setting('neon.branch_id', true) as id`;
if (!branch || branch === PRODUCTION || branch === STAGING) {
  throw new Error(`refusing to write fixtures to ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev`);
}
const browser = await chromium.launch();
let userId = null;
let tempUser = null;
try {
  const ctx = await browser.newContext();
  userId = await signIn(await ctx.newPage(), EMAIL, PASSWORD);
  await ctx.close();
  const [{ n }] = await sql`select (select count(*) from collection_items where user_id = ${userId}) + (select count(*) from decks where user_id = ${userId}) as n`;
  if (Number(n) === 0) throw new Error("the sign-in account is on its first run: the banner never draws for it");

  await cleanFixtures();
  await sql`insert into sets (code, name, set_type, released_at, card_count, digital) values
    (${SET}, 'Probe Announced Commander', 'commander', ${day(40)}, 0, false),
    (${LISTED}, 'Probe Listed Commander', 'commander', ${day(-3)}, 0, false)`;
  await sql`insert into precons (file_name, name, set_code, release_date) values (${FILE}, 'Probe Listed Deck', ${LISTED.toUpperCase()}, ${day(-3)})`;

  for (const w of WIDTHS) await widthRun(browser, w, userId);

  // The switch off, by an account override; the resolver's 30-second memo is waited out.
  await stamp({ set: true, lists: true });
  await unsee(userId);
  await sql`insert into flag_overrides (switch, scope, user_id, value, note, updated_by)
            values ('UPCOMING_PRECONS_ENABLED', 'user', ${userId}, 'off', 'probe:arrivals-banner', 'probe:arrivals-banner')`;
  await new Promise((r) => setTimeout(r, MEMO_MS));
  for (const w of WIDTHS) await switchedOff(browser, w);

  // First run: a fresh Clerk test user, so no existing account is emptied for it.
  const email = `arrivals-firstrun-${Date.now()}+clerk_test@the99.app`;
  tempUser = (await clerk("POST", "/users", { email_address: [email], skip_password_requirement: true })).id;
  for (const w of WIDTHS) await firstRun(browser, w, email);
} finally {
  await cleanFixtures();
  if (userId) await unsee(userId);
  if (tempUser) try {
    // Whatever the first-run visits wrote for the temporary account, then the account itself.
    const tables = await sql`select table_name from information_schema.columns where table_schema = 'public' and column_name = 'user_id'`;
    const left = [];
    for (const { table_name: t } of tables) {
      const [{ n }] = await sql.query(`select count(*)::int as n from "${t}" where user_id = $1`, [tempUser]);
      if (n > 0) {
        await sql.query(`delete from "${t}" where user_id = $1`, [tempUser]);
        left.push(`${t} ${n}`);
      }
    }
    console.log(`INFO  removed the first-run account's rows: ${left.join(", ") || "none"}`);
  } finally {
    await clerk("DELETE", `/users/${tempUser}`);
  }
  await browser.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
