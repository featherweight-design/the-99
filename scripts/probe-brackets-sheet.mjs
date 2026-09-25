import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { holdProfile } from "./lib/profile-hold.mjs";
import { onPage, onPageRole, PAGE } from "./lib/surface.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  // Read to clear the About gate, and to hold and restore the walked deck's analysis.
  "DATABASE_URL",
]);
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];

let failures = 0;
/** Every deck whose stored reading this run cleared, and how to put it back. */
const held = new Map();
const heldSql = neon(DATABASE_URL);
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
  return ok;
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
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
          });
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

  // CLEAR THE ABOUT GATE BEFORE ANY ROUTE IS ASKED FOR. Since #658 `proxy.ts` redirects a reader
  // below the current `ABOUT_VERSION` to `/about?next=…` — so a probe that navigates straight to
  // `/decks` scrapes the About page instead, and its specimen deck links then read as this
  // account's decks. The first run of this file did exactly that: it reported "no Analysis tab"
  // about `/decks/about-resume-edited`, a routing problem wearing a flag problem's clothes.
  //
  // Seeded rather than clicked through: the flag lives in `user_prefs` and this account may have
  // no row at all, so visiting the page does not write one. Left set afterwards on purpose —
  // "this account has seen the About page" is true once this ran.
  //
  // `greatest(...)`, which is what `lib/about/read.ts` itself writes. A bare assignment LOWERS
  // the stored value when this checkout is pinned behind the database's, putting the About page
  // back in front of a real reader on their next navigation.
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  await neon(DATABASE_URL)`
    insert into user_prefs (user_id, about_version_seen)
    values (${await page.evaluate(() => window.Clerk.user.id)}, ${version})
    on conflict (user_id) do update
      set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  await clearAboutSheet(page, await page.evaluate(() => window.Clerk.user.id));
}

/** Every deck on the account, asked of the page. */
async function deckHrefs(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  return page.evaluate((scope) => {
    const root = document.querySelector(scope);
    return [...new Set([...(root?.querySelectorAll("a[href^='/decks/']") ?? [])]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && h.split("/").length === 3 && !["new", "import"].includes(h.split("/")[2])))];
  }, PAGE);
}

/** Open the deck's Analysis tab by a PRESS — the tab is client state and has no address. */
async function openAnalysis(page, href) {
  // THE PRESS IS REQUIRED. The deck's stored reading is cleared first (held on disk, restored in
  // `run()`'s `finally`), so the only way to a reading is the press. A probe that fell back on a
  // stored reading stayed green through a renamed button and measured nothing.
  const deckId = href.split("/")[2];
  if (!held.has(deckId)) held.set(deckId, await holdProfile(heldSql, deckId));
  await heldSql`delete from deck_profiles where deck_id = ${deckId}::uuid`;
  await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
  const up = await page.waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 20_000 })
    .then(() => true).catch(() => false);
  if (!up) return false;
  await page.waitForTimeout(500);
  const tab = onPageRole(page, "tab", /analysis/i);
  if ((await tab.count()) === 0) return false;
  await tab.first().click();
  // `Analyze` before a reading (PR B's label), `Re-analyze` on the banner over a stale one (C2).
  const invite = onPageRole(page, "button", /^Analyze$/);
  if (!report(`the Analyze press is on ${href}`, (await invite.count()) > 0, "none: the press was renamed or removed")) return false;
  await invite.first().click();
  return page.waitForSelector(`${PAGE} [data-testid="findings-block"]`, { timeout: 30_000 })
    .then(() => true).catch(() => false);
}

/**
 * The all-brackets reference sheet (Analysis tab addendum, R3; audited Green in #924), walked at
 * 1300x900 and 390x844 by PRESSING its link, because every ruling here is geometry or focus:
 *   - `see all brackets →` sits under the rungs box at its right edge, 28px tall at 1300 and a
 *     44px target at 390, and at 1300 its hover draws the pressed state (a tint and a solid rule);
 *   - it opens a 700px sheet at 1300 whose table has a 168px rule column and five bracket columns,
 *     and at 390 the TRANSPOSED table (brackets as rows, 116px) instead;
 *   - the sheet marks no reader's bracket, and closing it returns focus to the link.
 * It writes only the About row and the walked deck's analysis, which it puts back. `local-dev`.
 */
async function walk(page, label) {
  const phone = label === 390;
  const link = onPage(page, '[data-testid="see-all-brackets"]');
  if (!report(`${label}px · the link is drawn`, (await link.count()) === 1, `${await link.count()} drawn`)) return;
  const g = await link.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const box = el.closest("section").querySelector(":scope > div");
    const b = box.getBoundingClientRect();
    return { height: Math.round(r.height), belowBox: Math.round(r.top - b.bottom), rightGap: Math.round(b.right - r.right) };
  });
  report(`${label}px · under the rungs box, at its right edge, ${phone ? "a 44px target" : "28px tall"}`,
    g.height === (phone ? 44 : 28) && g.belowBox >= -8 && g.belowBox <= 12 && Math.abs(g.rightGap) <= 8, JSON.stringify(g));

  if (!phone) {
    const rest = await link.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, rule: getComputedStyle(el.firstElementChild).borderBottomStyle }));
    await link.hover();
    await page.waitForTimeout(150);
    const hot = await link.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, rule: getComputedStyle(el.firstElementChild).borderBottomStyle }));
    report("1300px · hover draws the pressed state: a tint and a solid rule",
      rest.rule === "dotted" && hot.rule === "solid" && hot.bg !== rest.bg && hot.bg !== "rgba(0, 0, 0, 0)", JSON.stringify({ rest, hot }));
  }

  await link.click();
  const modal = page.locator('[data-testid="receipt-modal"]');
  await modal.waitFor({ state: "visible", timeout: 5_000 });
  const m = await modal.evaluate((el) => {
    const shown = (e) => e && e.getBoundingClientRect().width > 0;
    const wide = el.querySelector('[data-testid="brackets-sheet-table-wide"]');
    const narrow = el.querySelector('[data-testid="brackets-sheet-table-narrow"]');
    const table = shown(wide) ? wide : narrow;
    const cols = [...table.querySelector('[role="row"]').children].map((c) => Math.round(c.getBoundingClientRect().width));
    return {
      width: Math.round(el.getBoundingClientRect().width),
      wide: shown(wide), narrow: shown(narrow), cols,
      rows: table.querySelectorAll('[role="row"]').length,
      notes: el.querySelectorAll('[data-testid="brackets-sheet-note"]').length,
      title: el.querySelector("h2")?.textContent,
    };
  });
  if (phone) {
    report("390px · the table transposes: brackets as rows, a 116px bracket column, four rule columns",
      m.narrow && !m.wide && m.rows === 6 && m.cols.length === 5 && m.cols[0] === 116, JSON.stringify(m));
  } else {
    report("1300px · a 700px sheet: a 168px rule column and five bracket columns",
      m.width === 700 && m.wide && !m.narrow && m.rows === 5 && m.cols.length === 6 && m.cols[0] === 168, JSON.stringify(m));
  }
  report(`${label}px · six notes under the table, titled All brackets`, m.notes === 6 && m.title === "All brackets", JSON.stringify(m));
  const marked = await modal.evaluate((el) => el.innerText.includes("where your cards are") || el.innerText.includes("your cards"));
  report(`${label}px · the sheet marks no bracket as the reader's`, !marked, marked ? "a role label is drawn" : "none");

  await page.keyboard.press("Escape");
  await modal.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
  const back = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
  report(`${label}px · closing returns focus to the link`, back === "see-all-brackets", `focus on ${back}`);
}

async function run() {
  const browser = await chromium.launch();
  await clerkSetup();
  try {
    const first = await browser.newContext({ viewport: WIDTHS[0].viewport });
    const scout = await first.newPage();
    await signIn(scout);
    let href = null;
    for (const candidate of (await deckHrefs(scout)).slice(0, 12)) {
      if (await openAnalysis(scout, candidate)) { href = candidate; break; }
    }
    await first.close();
    if (!report("a deck whose Analysis tab draws a climb", href !== null, href ?? "none of the first 12")) return;
    console.log(`       (walking ${href})`);
    for (const { label, viewport } of WIDTHS) {
      const ctx = await browser.newContext({ viewport });
      const p = await ctx.newPage();
      await signIn(p);
      if (report(`${label}px · the Analysis tab drew`, await openAnalysis(p, href), "pressed")) await walk(p, label);
      await ctx.close();
    }
  } finally {
    for (const [deckId, restore] of held) {
      await restore().catch((e) => report(`put back ${deckId}'s analysis`, false, e.message));
    }
    await browser.close();
  }
}

await run();
// Outside `run()`, so no early return can skip it, and never `process.exit` inside a `finally`.
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
