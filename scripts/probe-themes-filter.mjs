// `Themes ▾` on Discover, pressed in a real browser at 390x844 and 1300x900 (#159, build T2).
//
// The unit suites prove the filter over hand-built rows. What only a browser answers:
//
// - THE PRESS. The wide form is a popover under a trigger in the rack; the phone form is a section
//   in the filter sheet (six pills, then `All N themes` opening the whole list as a second layer).
//   The probe reaches both by pressing, never by URL.
// - THE ROWS LEFT, checked against `commander_support` rather than against the index the page
//   shipped: every row on screen must be a commander EDHREC lists the picked theme for at or above
//   the floor, and under All, every picked theme.
// - THE LEAD: the row's play-style sentence names the picked theme.
// - THE CHIP and its removal, and the badge.
//
// It picks its themes by ASKING THE PANEL: the enabled options with the most rows, so the fixture
// follows the catalog rather than a name that rots. Read only, apart from the account's About row,
// captured first and put back in a `finally`. Point it at `local-dev`, never production.
//   PROBE_BASE=http://localhost:3000 pnpm probe:themes-filter
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";
import { onPage, openSheet } from "./lib/surface.mjs";
import { requireEnv } from "./lib/env.mjs";

const {
  E2E_AUDIT_USER_EMAIL: EMAIL,
  E2E_AUDIT_USER_PASSWORD: PASSWORD,
  DATABASE_URL,
} = requireEnv(["E2E_AUDIT_USER_EMAIL", "E2E_AUDIT_USER_PASSWORD", "CLERK_SECRET_KEY", "DATABASE_URL"]);

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const VIEWPORTS = [
  { label: "390", width: 390, height: 844, wide: false },
  { label: "1300", width: 1300, height: 900, wide: true },
];
const LANE = "/commanders/discover";

const sql = neon(DATABASE_URL);
let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

async function signIn(page) {
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
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}


const FLOOR = 10;
const LAYER = "Filter by theme";

/** Names of the commanders EDHREC lists every one of `slugs` for, at or above the floor. */
async function namesWithThemes(slugs) {
  const rows = await sql`
    select c.name, p2.flavor_name
    from commander_support cs
    join cards c on c.oracle_id = cs.commander_oracle_id
    left join printings p2 on p2.oracle_id = c.oracle_id and p2.flavor_name is not null
    where cs.synergy_state = 'ok'
      and (
        select count(distinct t.tag->>'slug')
        from jsonb_array_elements(cs.tags) as t(tag)
        where t.tag->>'slug' = any(${slugs}) and (t.tag->>'count')::numeric >= ${FLOOR}
      ) = ${slugs.length}`;
  const names = new Set();
  for (const r of rows) {
    names.add(r.name);
    if (r.flavor_name) names.add(r.flavor_name);
  }
  return names;
}

async function rowNames(page) {
  return onPage(page, "li [data-wash-label] > span:first-child").allInnerTexts();
}

async function shownCount(page) {
  const text = await onPage(page, "text=/\\d[\\d,]* (of [\\d,]+ commanders match|commanders)/").first().innerText();
  return Number(text.match(/[\d,]+/)[0].replace(/,/g, ""));
}

const countOf = (text) => Number((text.match(/([\d,]+)\s*$/)?.[1] ?? "0").replace(/,/g, ""));

/** The enabled candidates ordered by their trailing count, busiest first. */
async function busiest(candidates) {
  const out = [];
  for (const c of await candidates.all()) {
    if ((await c.getAttribute("aria-disabled")) === "true") continue;
    const text = (await c.innerText()).trim();
    out.push({ el: c, text, count: countOf(text) });
  }
  return out.sort((a, b) => b.count - a.count);
}

const themesInUrl = (page) =>
  (new URL(page.url()).searchParams.get("t") ?? "").split(",").filter(Boolean);

/** Opens the Themes control and ticks the `n` busiest themes. Returns the promised counts. */
async function pickThemes(page, vp, n) {
  if (vp.wide) {
    await onPage(page, '[data-testid="themes"] button').first().click();
    const listbox = onPage(page, '[role="listbox"]').first();
    await listbox.waitFor({ state: "visible", timeout: 5_000 });
    const best = await busiest(listbox.locator('[role="option"]'));
    const picks = best.slice(0, n);
    for (const p of picks) await p.el.click();
    return { picks, close: async () => page.keyboard.press("Escape") };
  }
  const sheet = await openSheet(page);
  if (!sheet) return null;
  const group = sheet.getByRole("group", { name: "Themes" });
  const pills = group.locator("button[aria-pressed]");
  const pillCount = await pills.count();
  check(`@${vp.label}: the sheet draws at most six theme pills`, pillCount > 0 && pillCount <= 6, `${pillCount} pills`);
  const rowAll = group.locator('[data-testid="themes-row"]');
  check(`@${vp.label}: the whole-list row reads "All N themes"`, /^All [\d,]+ themes/.test((await rowAll.innerText()).trim()), (await rowAll.innerText()).trim());
  const best = await busiest(pills);
  const picks = best.slice(0, n);
  for (const p of picks) await p.el.click();
  return {
    picks,
    sheet,
    close: async () => sheet.getByRole("button", { name: /^Show / }).click(),
  };
}

async function walk(browser, storage, vp) {
  const context = await browser.newContext({ storageState: storage, viewport: { width: vp.width, height: vp.height } });
  context.setDefaultTimeout(120_000);
  const page = await context.newPage();
  const where = `@${vp.label}`;
  try {
    await page.goto(`${BASE}${LANE}`, { waitUntil: "networkidle" });
    const before = await shownCount(page);

    // ONE THEME.
    const one = await pickThemes(page, vp, 1);
    if (!one || one.picks.length === 0) {
      check(`${where}: the control offers a theme`, false, "no Themes control or no enabled theme");
      return;
    }
    await page.waitForFunction(() => new URLSearchParams(location.search).has("t"), null, { timeout: 5_000 });
    const slugs = themesInUrl(page);
    check(`${where}: the pick writes ?t=`, slugs.length === 1, `t=${slugs.join(",")}`);
    await one.close();
    await page.waitForLoadState("networkidle");
    const shown = await shownCount(page);
    check(`${where}: the list holds the count the option promised`, shown === one.picks[0].count, `${shown} shown, option said ${one.picks[0].count}`);
    const allowed = await namesWithThemes(slugs);
    const names = await rowNames(page);
    const stray = names.filter((x) => !allowed.has(x.trim()));
    check(`${where}: every row has the theme`, names.length > 0 && stray.length === 0,
      names.length === 0 ? "no rows drawn" : stray.length === 0 ? `${names.length} rows checked` : `no such theme: ${stray.slice(0, 3).join(", ")}`);
    const lead = await onPage(page, '[data-testid="row-gap"]').first().innerText();
    check(`${where}: the row's sentence leads with the pick`, /^This commander’s play styles include /.test(lead), lead.slice(0, 90));
    const chip = onPage(page, 'button[aria-label^="Remove filter:"]:visible').first();
    const chipAria = await chip.getAttribute("aria-label");
    const pickedLabel = one.picks[0].text.replace(/\s*[\d,]+\s*$/, "").trim();
    check(`${where}: a chip stands for the pick`, chipAria === `Remove filter: ${pickedLabel}`, `${chipAria} (expected Remove filter: ${pickedLabel})`);
    await chip.click();
    await page.waitForFunction(() => !new URLSearchParams(location.search).has("t"), null, { timeout: 5_000 });
    await page.waitForLoadState("networkidle");
    const after = await shownCount(page);
    check(`${where}: removing the chip gives the rows back`, after === before && after > shown, `${shown} then ${after} (was ${before})`);

    // TWO THEMES, ANY THEN ALL.
    const two = await pickThemes(page, vp, 2);
    await page.waitForFunction(() => (new URLSearchParams(location.search).get("t") ?? "").includes(","), null, { timeout: 5_000 });
    const pair = themesInUrl(page);
    if (vp.wide) await onPage(page, '[role="radio"]:has-text("All")').first().click();
    else await two.sheet.getByRole("radio", { name: "All of these" }).click();
    await page.waitForFunction(() => new URLSearchParams(location.search).get("tm") === "all", null, { timeout: 5_000 });
    await two.close();
    await page.waitForLoadState("networkidle");
    const both = await namesWithThemes(pair);
    const rows = await rowNames(page);
    const missing = rows.filter((x) => !both.has(x.trim()));
    check(`${where}: under All every row has both themes`, missing.length === 0, rows.length === 0 ? "no rows (an empty state)" : missing.length === 0 ? `${rows.length} rows checked` : `missing one: ${missing.slice(0, 3).join(", ")}`);
    check(`${where}: All adds a second chip`, await onPage(page, 'button[aria-label="Remove filter: All themes"]:visible').first().isVisible(), "Match any theme");

    // PHONE: THE WHOLE LIST.
    if (!vp.wide) {
      const sheet = await openSheet(page);
      await sheet.locator('[data-testid="themes-row"]').click();
      const layer = page.getByRole("dialog", { name: LAYER });
      await layer.waitFor({ state: "visible", timeout: 5_000 });
      const inert = await sheet.evaluate((el) => el.hasAttribute("inert"));
      check(`${where}: the sheet goes inert under the theme list`, inert, `inert=${inert}`);
      await layer.getByRole("button", { name: "Back to filters" }).click();
      await layer.waitFor({ state: "detached", timeout: 5_000 });
      check(`${where}: Back to filters leaves the sheet up`, await sheet.isVisible(), "sheet visible");
    }
  } finally {
    await context.close();
  }
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const userId = await signIn(page);
  const about = await captureAboutSeen(userId);
  try {
    await clearAboutSheet(page, userId);
    const storage = await context.storageState();
    for (const vp of VIEWPORTS) await walk(browser, storage, vp);
  } finally {
    await restoreAboutSeen(about);
    await browser.close();
  }
}

async function main() {
  try {
    await run();
  } catch (error) {
    console.error(error);
    failures += 1;
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
