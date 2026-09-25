// probe:about — the About rethink (R6) in a real browser: the one-time sheet, the
// what's-new index, the jump mark, and the contents search, at 390x844, 800x900 and
// 1300x820. Every control is PRESSED; nothing here counts markup and calls it a pass.
//
//   PROBE_BASE=http://localhost:3291 pnpm probe:about
//
// Needs a server with ABOUT_SHEET_ENABLED=true, pointed at `local-dev`. **Never
// production**: it puts the signed-in account one version behind, repeatedly.
//
// WHAT ONLY A BROWSER CAN ANSWER, and why each check exists:
//   1   the card draws on a document load, beside the rail from `md` (audit E8) and
//       above the tab bar on a phone, with the page reserving its height;
//   1b  it SURVIVES a re-render of the root layout. `router.refresh()` re-renders
//       `Shell` on a request that carries no `x-about-sheet`, so a card mounted only
//       when the header says so vanishes unread while its cookie already says "shown";
//   2   Later closes it and writes nothing, and a reload does not bring it back;
//   3   Show me lands on /about with the card gone, the index there, the visit then
//       recorded, and no index after a reload (ruling 3);
//   4   opening the account menu without pressing About writes nothing (E2);
//   5   an index row jumps: the hash moves, the title line takes `--elevated`, focus
//       lands on the heading, and Back returns;
//   6   the search filters the contents and never the page (ruling 4): the page's
//       height and every section are identical before and after;
//   7   a legacy `about_v` cookie does not hide the sheet (E1);
//   8   a forged `x-about-sheet` header from the client summons nothing.
//
// A RUN WITH NO SUBJECT FAILS. If no entry is new at `version - 1`, the index and the
// sheet's list have nothing to show, and every check about them would pass over an
// empty page, so the run stops and says so.
//
// IT WRITES ONE VALUE: the account's `user_prefs.about_version_seen`. What was there is
// HELD ON DISK before the first write and put back in a `finally`, and a run that finds
// a hold file left by a crashed run restores THAT first, so the account is never left
// behind. The same rule as `scripts/lib/profile-hold.mjs`, for the same reason.
//
// MUTATIONS RUN AGAINST IT (each fails the run; counts after the arrow):
//   - the proxy reading `about_v` as "shown"                              → 7 fails at 390 and 1300
//   - `Shell` mounting the sheet only when the state is not `none`         → 1b fails at all three widths
//   - the sheet placed from 1000px rather than `md`                        → 1 fails at 800
//   - the proxy not stripping `x-about-sheet`                              → 8 fails at 390 and 1300
//   - the search hiding the page's sections that hold no match             → 6 fails at 390 and 1300
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL"]);
if (!EMAIL.includes("+clerk_test")) throw new Error("Use a +clerk_test account (see the local-auth note).");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const sql = neon(DATABASE_URL);
const { version: VERSION } = JSON.parse(
  readFileSync(new URL("../src/lib/copy/about.version.json", import.meta.url), "utf8"),
);
const BEHIND = VERSION - 1;
const SHEET = /^(New in About|About The\s99)$/;

const WIDTHS = [
  { label: 390, viewport: { width: 390, height: 844 }, full: true },
  { label: 800, viewport: { width: 800, height: 900 }, full: false },
  { label: 1300, viewport: { width: 1300, height: 820 }, full: true },
];

// Counted here, never at the call sites: a check that forgot to count once printed FAIL
// and then "All checks passed" over the top.
let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  return page.evaluate(() => window.Clerk.user.id);
}

const readSeen = async (userId) =>
  (await sql`select about_version_seen from user_prefs where user_id = ${userId}`)[0]?.about_version_seen ?? null;
const setSeen = (userId, v) =>
  sql`insert into user_prefs (user_id, about_version_seen) values (${userId}, ${v})
      on conflict (user_id) do update set about_version_seen = ${v}`;

/** The account's own value, held on disk for the length of the run. */
function holdPath(userId) {
  return join(tmpdir(), `probe-about-hold-${userId}.json`);
}
async function hold(userId) {
  const file = holdPath(userId);
  if (existsSync(file)) {
    const { value } = JSON.parse(readFileSync(file, "utf8"));
    await restore(userId, value);
    console.log(`  (restored ${value} left by an earlier run before capturing)`);
  }
  const value = await readSeen(userId);
  writeFileSync(file, JSON.stringify({ value }));
  return value;
}
async function restore(userId, value) {
  if (value === null) await sql`delete from user_prefs where user_id = ${userId}`;
  else await setSeen(userId, value);
}

/** Puts this browser and account back to "behind, and never shown the sheet". */
async function behind(context, userId) {
  await setSeen(userId, BEHIND);
  await context.clearCookies({ name: "about_sheet" });
}

async function walk(browser, width, userIdRef) {
  const context = await browser.newContext({ viewport: width.viewport });
  const page = await context.newPage();
  const userId = await signIn(page);
  userIdRef.id ??= userId;
  if (userIdRef.original === undefined) userIdRef.original = await hold(userId);
  const L = (s) => `${width.label}: ${s}`;
  const card = page.getByRole("region", { name: SHEET });

  // 1. It draws.
  await behind(context, userId);
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  await card.waitFor({ timeout: 15_000 }).catch(() => {});
  if (!report(L("the sheet draws on a document load"), await card.isVisible())) {
    await context.close();
    return;
  }
  await page.waitForTimeout(300);
  const geo = await page.evaluate(() => {
    const card = document.querySelector("[role=region][aria-label='New in About']").getBoundingClientRect();
    const rail = [...document.querySelectorAll("nav, aside")]
      .map((n) => n.getBoundingClientRect())
      .find((b) => b.left === 0 && b.width > 40 && b.width < 80 && b.height > 300);
    const bar = [...document.querySelectorAll("nav")]
      .map((n) => n.getBoundingClientRect())
      .find((b) => b.width > 300 && b.bottom >= innerHeight - 1 && b.height < 120);
    return {
      card: { left: card.left, width: card.width, bottom: card.bottom },
      railRight: rail?.right ?? null,
      barTop: bar?.top ?? null,
      vh: innerHeight,
      reserve: getComputedStyle(document.documentElement).getPropertyValue("--about-sheet-h").trim(),
    };
  });
  if (width.label >= 768) {
    report(
      L("beside the rail, 340px, 20px off the foot (E8)"),
      geo.railRight !== null &&
        geo.card.left >= geo.railRight + 19 &&
        Math.round(geo.card.width) === 340 &&
        Math.round(geo.vh - geo.card.bottom) === 20,
      JSON.stringify(geo.card) + ` rail ${geo.railRight}`,
    );
  } else {
    report(
      L("above the tab bar, with its height reserved (N5)"),
      geo.barTop !== null && geo.card.bottom <= geo.barTop - 9 && /px$/.test(geo.reserve),
      `bottom ${geo.card.bottom}, bar ${geo.barTop}, reserve ${geo.reserve}`,
    );
  }

  // 1b. A re-render of the root layout keeps it.
  await page.evaluate(() => window.next?.router?.refresh());
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  report(L("survives router.refresh()"), await card.isVisible());
  if (!width.full) {
    await context.close();
    return;
  }

  // 2. Later.
  await card.getByRole("button", { name: "Later" }).click();
  report(L("Later closes it"), !(await card.isVisible()));
  report(L("Later writes nothing"), (await readSeen(userId)) === BEHIND, `seen ${await readSeen(userId)}`);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  report(L("a reload does not bring it back"), !(await card.isVisible()));

  // 3. Show me.
  await behind(context, userId);
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  await card.waitFor({ timeout: 15_000 });
  await card.getByRole("button", { name: "Show me" }).click();
  await page.waitForURL(/\/about$/);
  await page.waitForTimeout(600);
  const index = onPage(page, "nav[aria-labelledby='whats-new-heading']");
  report(L("Show me lands on /about, card gone, index there"), !(await card.isVisible()) && (await index.isVisible()));
  await page.waitForTimeout(1500);
  report(L("the open recorded the visit (ruling 3)"), (await readSeen(userId)) === VERSION, `seen ${await readSeen(userId)}`);
  await page.reload({ waitUntil: "networkidle" });
  report(L("no index after a reload"), (await index.count()) === 0);

  // 4. The account menu, opened and not pressed, writes nothing.
  await behind(context, userId);
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  if (await card.isVisible()) await card.getByRole("button", { name: "Later" }).click();
  // By keyboard: in dev, Next's own indicator sits over the rail's avatar and takes the
  // pointer. Focus and Enter is the same press a keyboard reader makes.
  const account = page.getByRole("button", { name: /^Account: / }).filter({ visible: true }).first();
  await account.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2000);
  report(L("an open account menu writes nothing (E2)"), (await readSeen(userId)) === BEHIND, `seen ${await readSeen(userId)}`);
  await page.keyboard.press("Escape");

  // 5. An index row jumps.
  await behind(context, userId);
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
  const rows = index.getByRole("link");
  const n = await rows.count();
  if (!report(L("the index lists what is new"), n > 0, `${n} rows`)) {
    await context.close();
    return;
  }
  const id = (await rows.first().getAttribute("href")).slice(1);
  await rows.first().click();
  await page.waitForTimeout(700);
  const jump = await page.evaluate((id) => {
    const li = document.getElementById(id);
    const line = li.querySelector("[data-entry-title]");
    const probe = document.createElement("div");
    probe.style.background = "var(--elevated)";
    document.body.append(probe);
    const want = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return {
      washed: line.hasAttribute("data-jumped") && getComputedStyle(line).backgroundColor === want,
      top: li.getBoundingClientRect().top,
      focused: document.activeElement === li.querySelector("h3"),
    };
  }, id);
  report(L("the jump washes the title line and focuses it"), jump.washed && jump.focused, JSON.stringify(jump));
  report(L("the entry lands 20px down"), Math.abs(jump.top - 20) <= 2, `${jump.top}`);
  await page.goBack();
  await page.waitForTimeout(500);
  report(L("Back returns"), page.url().endsWith("/about"), page.url());

  // 6. The search filters the contents and never the page.
  const contents = page.getByRole("navigation", { name: "Contents" }).filter({ visible: true });
  const field = contents.getByRole("searchbox", { name: "Find an entry by title" });
  // The page's SECTIONS, never the document's total height: on a phone the contents list
  // sits in the page's flow, so filtering it rightly moves everything below it. What the
  // ruling forbids is hiding, collapsing or reordering a chapter or an entry.
  const shape = () =>
    page.evaluate(() => ({
      sections: [...document.querySelectorAll("section[id^='chapter-']")].map((s) => {
        const cs = getComputedStyle(s);
        return `${s.id}:${cs.display}:${cs.visibility}:${cs.opacity}:${s.getBoundingClientRect().height}`;
      }),
      entries: [...document.querySelectorAll("section[id^='chapter-'] > ul > li[id]")].map((li) => li.id).join(","),
    }));
  const before = await shape();
  await field.fill("combo");
  const matches = await contents.locator("a[data-entry-row]").count();
  const after = await shape();
  report(L("the search filters the contents"), matches > 0, `${matches} rows`);
  report(L("and leaves the page exactly as it was (ruling 4)"), JSON.stringify(before) === JSON.stringify(after));
  await field.press("Enter");
  await page.waitForTimeout(600);
  report(L("Enter jumps, and the query stays"), /#/.test(page.url()) && (await field.inputValue()) === "combo", page.url());
  await field.fill("mulligan");
  report(L("an empty search says so"), (await contents.getByText("Nothing titled “mulligan”.").count()) === 1);
  await field.press("Escape");
  report(L("Escape clears"), (await field.inputValue()) === "");

  // 7. A legacy about_v cookie does not hide the sheet (E1).
  await behind(context, userId);
  const origin = new URL(BASE);
  await context.addCookies([
    { name: "about_v", value: `${userId}.${VERSION}`, domain: origin.hostname, path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  report(L("about_v does not hide the sheet (E1)"), await card.isVisible().catch(() => false));

  // 8. A forged header summons nothing.
  await setSeen(userId, VERSION);
  await context.clearCookies({ name: "about_sheet" });
  await page.setExtraHTTPHeaders({ "x-about-sheet": "0" });
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  report(L("a forged x-about-sheet summons nothing"), !(await card.isVisible().catch(() => false)));
  await page.setExtraHTTPHeaders({});
  await context.close();
}

await clerkSetup();
const browser = await chromium.launch();
const who = { id: null, original: undefined };
try {
  if (BEHIND < 1) throw new Error(`ABOUT_VERSION is ${VERSION}; there is no version to be behind.`);
  for (const width of WIDTHS) {
    console.log(`\n${width.label}x${width.viewport.height}`);
    await walk(browser, width, who);
  }
} finally {
  if (who.id && who.original !== undefined) {
    try {
      await restore(who.id, who.original);
      rmSync(holdPath(who.id), { force: true });
    } catch (error) {
      console.error(`Restore failed; the hold file ${holdPath(who.id)} keeps the value for the next run.`, error);
      failures += 1;
    }
  }
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
