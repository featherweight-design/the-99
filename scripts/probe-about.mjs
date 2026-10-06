// probe:about — the About rethink (R6) in a real browser: the one-time sheet, the
// what's-new index, the jump mark, and the contents search, at 390x844, 800x900 and
// 1300x820. Every control is PRESSED; nothing here counts markup and calls it a pass.
//
//   PROBE_BASE=http://localhost:3291 pnpm probe:about
//
// Needs a server with ABOUT_SHEET_ENABLED=true, pointed at `local-dev`. **Never
// production**: it puts the signed-in account one version behind, repeatedly.
//
//   pnpm probe:about --flip          (PROBE_FLIP_PORT, default 3297)
//
// THE FLIP WALK. An entry tied to a feature switch is announced by turning the switch on
// (Hugh, 2026-09-25), and a switch is read when the server starts, so the walk OWNS its server:
// it starts `next dev` with every switch off, then restarts it with Change commander on, then
// with Locked cards on as well, then Help me choose, then swap tools, then the Analysis tab, then with all five off. Next 16 allows one `next dev` per project,
// so stop any dev server running in this worktree first. What it proves, in order:
//   F1  every switch off: a reader at the current version sees nothing, and the browser is marked
//       (every returning reader sits there, and each launch entry's \`since\` equals it, so a
//       version floor applied to a switched entry would announce nothing: that is what F2 catches);
//   F2  Change commander on: the cookie from before the flip does NOT hide the sheet, and the
//       sheet names that one entry;
//   F3  opening /about records the entry by id, draws its figure, and the sheet stays away;
//   F4  Locked cards on LATER: the reader who met the first entry is shown only the second;
//   F4b Help me choose on third: named alone, though it sits first on the page;
//   F4c swap tools on fourth: ONE switch announces TWO entries, named together in page order;
//   F4d the Analysis tab on fifth: its two entries, named together in page order;
//   F5  the seven figures draw at 390 and 1300 without overflowing the page;
//   F6  all off again: none of the seven entries is on the page.
//   F7  HOW_IT_WORKS_ENABLED: alone it draws no sheet; beside Change commander its one line rides
//       that sheet, once, after the entry; the /about visit records how-it-works; and once
//       recorded the next sheet names the entry without the line.
// It shares the fixture account with every other probe: one that calls `clearAboutSheet` mid-walk
// marks every entry seen and fails F2–F4 on a working build. Re-run before believing that red.
// The database needs migration 0066 (`about_seen_ids`); local-dev may be behind, so point the
// worktree's own `.env` at a migrated scratch branch.
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
// IT WRITES ONE ROW: the account's `user_prefs` — `about_version_seen` and, since entries
// follow their features' switches, `about_seen_ids`. Both are HELD ON DISK before the first
// write and put back in a `finally`, and a run that finds a hold file left by a crashed run
// restores THAT first, so the account is never left behind. The same rule as `scripts/lib/profile-hold.mjs`, for the same reason.
//
// MUTATIONS RUN AGAINST IT (each fails the run; what failed after the arrow):
//   - the proxy reading `about_v` as "shown"                     → 4 fails, check 7 (E1) among them, at 390 and 1300
//   - `Shell` mounting the sheet only when the state is not `none` → "survives router.refresh()" at 390, 800 and 1300
//   - the sheet placed from 1000px rather than `md`              → check 1's placement (E8) at 800
//   - the proxy not stripping `x-about-sheet`                    → check 8 at 390 and 1300
//   - the search hiding the page's sections that hold no match   → check 6's ruling 4 at 390 and 1300
//   --flip:
//   - the proxy's cookie keyed on `<user>.<version>` alone       → F2 and F4: the cookie from before each flip hides the sheet
//   - the version floor applied to a switched entry too          → F2, F3 and F4: a reader at 9 is never announced either
//   - `figures()` lighting no SETS RANK                           → F5's Help me choose check at 390 and 1300
//   - the appendix alone drawing a sheet (the proxy's decision AND the reader's parse both
//     let it, since either one refusing is enough)                → F7a, a card for a current reader
import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { restoreAboutSeen } from "./lib/about-clear.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL"]);
if (!EMAIL.includes("+clerk_test")) throw new Error("Use a +clerk_test account (see the local-auth note).");
const FLIP = process.argv.includes("--flip");
const FLIP_PORT = Number(process.env.PROBE_FLIP_PORT ?? 3297);
const BASE = FLIP ? `http://localhost:${FLIP_PORT}` : (process.env.PROBE_BASE ?? "http://localhost:3000");
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
const readRow = async (userId) =>
  (await sql`select about_version_seen, about_seen_ids from user_prefs where user_id = ${userId}`)[0] ?? null;
/**
 * Sets the version AND clears the seen ids. "Behind" has to mean behind on both: with an
 * entry's switch on in this server, a stale id would mark that entry seen and the sheet the
 * probe is waiting for would never draw.
 */
const setSeen = (userId, v, ids = []) =>
  sql`insert into user_prefs (user_id, about_version_seen, about_seen_ids) values (${userId}, ${v}, ${ids})
      on conflict (user_id) do update set about_version_seen = ${v}, about_seen_ids = ${ids}`;

/** The account's own value, held on disk for the length of the run. */
function holdPath(userId) {
  return join(tmpdir(), `probe-about-hold-${userId}.json`);
}
async function hold(userId) {
  const file = holdPath(userId);
  if (existsSync(file)) {
    const { value } = JSON.parse(readFileSync(file, "utf8"));
    await restore(userId, value);
    console.log(`  (restored ${JSON.stringify(value)} left by an earlier run before capturing)`);
  }
  const value = await readRow(userId);
  writeFileSync(file, JSON.stringify({ value }));
  return value;
}
async function restore(userId, value) {
  // A hold file written before the ids column held the bare version and says nothing about the
  // ids, so the ids the row carries now stay: clearing them would erase whatever was recorded since.
  if (typeof value === "number") {
    const ids = (await readRow(userId))?.about_seen_ids ?? [];
    return restoreAboutSeen({ userId, existed: true, version: value, ids }, sql);
  }
  // The shared restore, so every probe puts the row back the same way: both columns, or no row.
  return restoreAboutSeen(
    value === null
      ? { userId, existed: false, version: null, ids: null }
      : { userId, existed: true, version: value.about_version_seen, ids: value.about_seen_ids ?? [] },
    sql,
  );
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
  // Fails closed: with no refresh to call, the visibility read below would only
  // re-read the card already on screen and pass over a sheet that unmounts.
  const refreshed = await page.evaluate(() => {
    if (typeof window.next?.router?.refresh !== "function") return false;
    window.next.router.refresh();
    return true;
  });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  report(
    L("survives router.refresh()"),
    refreshed && (await card.isVisible()),
    refreshed ? "" : "no router.refresh on the page",
  );
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
  const index = onPage(page, "nav[aria-labelledby='whats-new-heading']");
  // The URL moves before the page has streamed in, so a fixed pause read an
  // absent index now and then. Wait for the index itself; a build that never
  // draws it still fails, 15 seconds later.
  await index.waitFor({ timeout: 15_000 }).catch(() => {});
  const cardGone = !(await card.isVisible());
  const indexThere = await index.isVisible();
  report(L("Show me lands on /about, card gone, index there"), cardGone && indexThere, `card gone ${cardGone}, index ${indexThere}`);
  await page.waitForTimeout(1500);
  report(L("the open recorded the visit (ruling 3)"), (await readSeen(userId)) === VERSION, `seen ${await readSeen(userId)}`);
  await page.reload({ waitUntil: "networkidle" });
  report(L("no index after a reload"), (await index.count()) === 0);

  // 4. The account menu, opened and not pressed, writes nothing.
  await behind(context, userId);
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  if (await card.isVisible()) await card.getByRole("button", { name: "Later" }).click();
  // A dispatched click, not a pointer click or Enter: in dev, Next's own indicator sits over
  // the rail's avatar and takes the pointer, and Enter on the desktop popover's trigger also
  // activates its first item, which IS About The 99. That is a real visit, so it wrote, and
  // the first version of this check failed a correct build for it.
  const account = page.getByRole("button", { name: /^Account: / }).filter({ visible: true }).first();
  await account.dispatchEvent("click");
  await page.waitForTimeout(2000);
  const stayed = new URL(page.url()).pathname === "/decks";
  report(
    L("an open account menu writes nothing (E2)"),
    stayed && (await readSeen(userId)) === BEHIND,
    `on ${new URL(page.url()).pathname}, seen ${await readSeen(userId)}`,
  );
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
  // The appendix's line is decided by the proxy from HOW_IT_WORKS_ENABLED alone (plan 2026-09-28,
  // PR C). A client naming it, alone or beside an entry, summons no card and no line.
  for (const forged of ["how-it-works", "roles,how-it-works"]) {
    await context.clearCookies({ name: "about_sheet" });
    await page.setExtraHTTPHeaders({ "x-about-sheet": forged });
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const drawn = await card.isVisible().catch(() => false);
    const line = await page.locator("[data-appendix-line]").count();
    report(L(`a forged x-about-sheet "${forged}" summons no card and no line`), !drawn && line === 0, `card ${drawn}, line ${line}`);
  }
  await page.setExtraHTTPHeaders({});
  await context.close();
}


// ── The flip walk (--flip) ──────────────────────────────────────────────────────────────────

const SWITCHES = ["NEVER_CUT_ENABLED", "CHANGE_COMMANDER_ENABLED", "HELP_ME_CHOOSE_ENABLED", "SWAP_TOOLS_ENABLED", "ANALYSIS_TAB_ENABLED"];
/** The four switches the walk turns on before the Analysis tab's, which it turns on last (F4d). */
const FIRST_FOUR = SWITCHES.filter((k) => k !== "ANALYSIS_TAB_ENABLED");

/** `next dev` in this worktree with exactly the named switches on; resolves once it serves. */
async function startServer(on) {
  const env = { ...process.env, ABOUT_SHEET_ENABLED: "true" };
  for (const k of SWITCHES) env[k] = on.includes(k) ? "true" : "false";
  // Not an entry's switch, so not in SWITCHES: it keys no cookie and names no entry (F7).
  env.HOW_IT_WORKS_ENABLED = on.includes("HOW_IT_WORKS_ENABLED") ? "true" : "false";
  const child = spawn("node_modules/.bin/next", ["dev", "-p", String(FLIP_PORT)], {
    env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`next dev exited ${child.exitCode}:\n${log.slice(-1500)}`);
    const up = await fetch(`${BASE}/api/health`).then(() => true, () => false);
    if (up) return child;
    await new Promise((r) => setTimeout(r, 500));
  }
  await stopServer(child);
  throw new Error(`next dev did not serve within 120s:\n${log.slice(-1500)}`);
}

/** Stops the whole process group, and waits for it, so the next start finds the port free. */
async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((r) => child.once("exit", r));
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    return;
  }
  await Promise.race([exited, new Promise((r) => setTimeout(r, 10_000))]);
  if (child.exitCode === null) {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {}
  }
}

const sheetCookie = async (context) =>
  (await context.cookies()).find((c) => c.name === "about_sheet")?.value ?? null;

/** The titles the card lists, or null when no card is up. */
async function sheetTitles(page, card) {
  await card.waitFor({ timeout: 30_000 }).catch(() => {});
  if (!(await card.isVisible())) return null;
  return (await card.locator("li").allInnerTexts()).map((t) => t.trim());
}

/** Waits for the visit /about records, which lands after the page has streamed in. */
async function visitAbout(page, userId, id) {
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
  // By id alone: an entry is an `li`, the appendix a `section`, and `li#how-it-works` never matched.
  await page.locator(`#${id}`).waitFor({ timeout: 30_000 }).catch(() => {});
  for (let i = 0; i < 20; i++) {
    if ((await readRow(userId))?.about_seen_ids?.includes(id)) return;
    await page.waitForTimeout(250);
  }
}

/** The figure's pieces, and whether it stays inside the page, at the current viewport. */
async function figureFacts(page) {
  return page.evaluate(() => {
    const within = (id) => {
      const li = document.getElementById(id);
      if (!li) return null;
      const box = li.getBoundingClientRect();
      // The title line spills into the gutter on purpose (the jump mark's wash, R6 §P1), so it
      // is left out; everything else, the figure included, stays inside the entry.
      const inside = [...li.querySelectorAll("*")]
        .filter((n) => !n.closest("[data-entry-title]"))
        .every((n) => n.getBoundingClientRect().right <= box.right + 1);
      return { li, inside };
    };
    const locked = within("locked-cards");
    const change = within("change-commander");
    const choose = within("help-me-choose");
    const fits = within("fits-your-decks");
    const standIns = within("stand-ins");
    const analysis = within("deck-analysis");
    const marks = within("card-marks");
    return {
      locked: locked && {
        inside: locked.inside,
        line: locked.li.querySelectorAll("[data-testid=lock-mode-line]").length,
        done: [...locked.li.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Done").length,
        // Each row is drawn twice (at rest, then in the mode), and a row carries no test id of its
        // own, so the name is counted in the TEXT a reader sees: innerText skips the width that
        // is not drawn.
        petals: locked.li.innerText.split("Lotus Petal").length - 1,
        // In the mode every row's ✕ is the toggle: three, and none in the set at rest.
        toggles: [...locked.li.querySelectorAll("[data-testid=row-lock-toggle]")].filter(
          (n) => n.getBoundingClientRect().width > 0,
        ).length,
      },
      change: change && {
        inside: change.inside,
        door: change.li.querySelectorAll("[data-testid=change-commander-door]").length,
        rows: change.li.querySelectorAll("[data-testid=change-commander-row]").length,
      },
      choose: choose && (() => {
        // The FIGURE's text, never the entry's: key line 1 names SETS RANK in words too.
        const fig = choose.li.querySelector("[data-specimen='help-me-choose']")?.innerText ?? "";
        return {
          inside: choose.inside,
          // Read in the TEXT a reader sees, for the reason `petals` is: the rows carry no test id.
          order: ["Pantlaza", "Gishath"].map((name) => fig.indexOf(name)),
          // One lit figure per row: each row has two figures, so SETS RANK draws on both.
          setsRank: fig.split("SETS RANK").length - 1,
          // The lit figures themselves, as `figures()` rounds them: 41% and 34%.
          pcts: ["74%", "41%", "81%", "34%"].map((p) => fig.includes(p)),
        };
      })(),
      fits: fits && {
        inside: fits.inside,
        plate: fits.li.querySelectorAll("[data-testid=fits-plate]").length,
        rows: fits.li.querySelectorAll("[data-testid=fits-row]").length,
        holds: fits.li.querySelectorAll("[data-testid=fits-holds-row]").length,
        // One reason of each kind, in the shipped order: the combo first, then the theme.
        reasons: [...fits.li.querySelectorAll("[data-testid=fits-reason]")].map((n) => n.textContent.split(" ")[0]),
      },
      standIns: standIns && {
        inside: standIns.inside,
        limit: standIns.li.querySelectorAll("[data-testid=stand-in-limit]").length,
        // The marked row's ⇄, found by the label it carries only when the row is over the limit.
        door: standIns.li.querySelectorAll("button[aria-label^='Cheaper stand-ins for Plateau']").length,
        // The land group: five of its six rows, then its toggle. Counted INSIDE the land group,
        // because the figure also draws a spell group beside it (key 3, #1052), whose rows are
        // `spellRows`.
        rows: standIns.li.querySelectorAll("[data-stand-in-group] [data-testid=stand-in-row]").length,
        spellRows:
          standIns.li.querySelectorAll("[data-testid=stand-in-row]").length -
          standIns.li.querySelectorAll("[data-stand-in-group] [data-testid=stand-in-row]").length,
        showAll: [...standIns.li.querySelectorAll("button")].filter((b) => /^Show all 6 lands/.test(b.textContent.trim())).length,
      },
      analysis: analysis && { inside: analysis.inside },
      marks: marks && { inside: marks.inside },
      pageOverflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

async function flipWalk(browser, who) {
  let server = await startServer([]);
  try {
    const context = await browser.newContext({ viewport: { width: 1300, height: 820 } });
    const page = await context.newPage();
    const userId = await signIn(page);
    who.id ??= userId;
    if (who.original === undefined) who.original = await hold(userId);
    const card = page.getByRole("region", { name: SHEET });

    // F1. Every switch off, and the reader current by version.
    await setSeen(userId, VERSION);
    await context.clearCookies({ name: "about_sheet" });
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    report(`F1 switches off: a reader at version ${VERSION} sees no sheet`, !(await card.isVisible()));
    const before = await sheetCookie(context);
    report("F1 the browser is marked", before === `${userId}.${VERSION}`, String(before));

    // F2. Change commander on. The browser keeps the cookie it was given above.
    await stopServer(server);
    server = await startServer(["CHANGE_COMMANDER_ENABLED"]);
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    const first = await sheetTitles(page, card);
    report(`F2 flipped on: a reader at version ${VERSION} is announced it, through the cookie from before`, first !== null);
    report(
      "F2 the sheet names Change commander alone",
      JSON.stringify(first) === JSON.stringify(["Change commander"]),
      JSON.stringify(first),
    );

    // F3. Opening /about records it by id, and it is not announced again.
    await visitAbout(page, userId, "change-commander");
    const ids = (await readRow(userId))?.about_seen_ids ?? [];
    report(
      "F3 the visit records change-commander by id, and nothing it did not draw",
      ids.includes("change-commander") && !ids.includes("locked-cards"),
      JSON.stringify(ids),
    );
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    report("F3 after the visit the sheet stays away", !(await card.isVisible()));

    // F4. Locked cards on LATER. A version number would call this reader current.
    await stopServer(server);
    server = await startServer(["CHANGE_COMMANDER_ENABLED", "NEVER_CUT_ENABLED"]);
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    const second = await sheetTitles(page, card);
    report(
      "F4 a later flip names the locked-cards entry alone",
      JSON.stringify(second) === JSON.stringify(["Locking a card against suggested cuts"]),
      JSON.stringify(second),
    );
    await visitAbout(page, userId, "locked-cards");

    // F4b. Help me choose on THIRD. It sits first on the page, in chapter 02, and must still be
    // named alone: the two it follows were met by id.
    await stopServer(server);
    server = await startServer(["CHANGE_COMMANDER_ENABLED", "NEVER_CUT_ENABLED", "HELP_ME_CHOOSE_ENABLED"]);
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    const third = await sheetTitles(page, card);
    report(
      "F4b a third flip names Help me choose alone",
      JSON.stringify(third) === JSON.stringify(["Finding a commander with Help me choose"]),
      JSON.stringify(third),
    );
    await visitAbout(page, userId, "help-me-choose");

    // F4c. Swap tools on FOURTH: one switch, two entries, named together and in page order.
    await stopServer(server);
    server = await startServer(FIRST_FOUR);
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    const fourth = await sheetTitles(page, card);
    report(
      "F4c one switch names both of its entries, in page order",
      JSON.stringify(fourth) === JSON.stringify(["Which of your decks a card fits", "Cheaper cards that do the same job"]),
      JSON.stringify(fourth),
    );
    await visitAbout(page, userId, "stand-ins");

    // F4d. The Analysis tab on FIFTH: one switch, two entries in chapter 03, named together in
    // page order, and nothing the four earlier flips announced.
    await stopServer(server);
    server = await startServer(SWITCHES);
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    const fifth = await sheetTitles(page, card);
    report(
      "F4d the Analysis tab names both of its entries, in page order",
      JSON.stringify(fifth) === JSON.stringify(["Which bracket this deck plays at", "Bracket facts that travel with a card"]),
      JSON.stringify(fifth),
    );
    await visitAbout(page, userId, "card-marks");

    // F5. The seven figures, drawn by the page's own components, at both widths.
    for (const viewport of [{ width: 1300, height: 820 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`${BASE}/about#locked-cards`, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      const f = await figureFacts(page);
      const w = viewport.width;
      report(
        `F5 ${w}: Locked cards draws its rows twice, three toggles in the mode, the line and Done`,
        f.locked?.petals === 2 && f.locked.toggles === 3 && f.locked.line === 1 && f.locked.done === 1,
        JSON.stringify(f.locked),
      );
      report(
        // Three since #1052: yours, the one already in the 99 (key 4's part), and one to buy.
        `F5 ${w}: Change commander draws the door and three candidates`,
        f.change?.door === 1 && f.change.rows === 3,
        JSON.stringify(f.change),
      );
      report(
        `F5 ${w}: Help me choose draws Pantlaza above Gishath, each with its figure lit SETS RANK`,
        f.choose !== null &&
          f.choose.order[0] >= 0 &&
          f.choose.order[0] < f.choose.order[1] &&
          f.choose.setsRank === 2 &&
          f.choose.pcts.every(Boolean),
        JSON.stringify(f.choose),
      );
      report(
        `F5 ${w}: Find a deck draws its plate, a combo row then a theme row, and one deck that holds it`,
        f.fits?.plate === 1 && f.fits.rows === 2 && f.fits.holds === 1 && JSON.stringify(f.fits.reasons) === JSON.stringify(["Completes", "Joins"]),
        JSON.stringify(f.fits),
      );
      report(
        `F5 ${w}: Cheaper stand-ins draws the limit line, the marked row's door, five land rows, two spell rows and Show all`,
        f.standIns?.limit === 1 && f.standIns.door === 1 && f.standIns.rows === 5 && f.standIns.spellRows === 2 && f.standIns.showAll === 1,
        JSON.stringify(f.standIns),
      );
      report(
        `F5 ${w}: no figure overflows its entry or the page`,
        f.locked?.inside && f.change?.inside && f.choose?.inside && f.fits?.inside && f.standIns?.inside && f.analysis?.inside && f.marks?.inside && f.pageOverflow <= 0,
        `overflow ${f.pageOverflow}`,
      );
    }
    await page.setViewportSize({ width: 1300, height: 820 });

    // F6. All off: none of the seven entries is on the page.
    await stopServer(server);
    server = await startServer([]);
    await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const gone = await page.evaluate(
      () =>
        ["locked-cards", "change-commander", "help-me-choose", "fits-your-decks", "stand-ins", "deck-analysis", "card-marks"].every(
          (id) => !document.getElementById(id),
        ),
    );
    report("F6 switches off again: none of the seven entries is on the page", gone);

    // F7. HOW_IT_WORKS_ENABLED (plan 2026-09-28, PR C). Its one line rides a sheet already
    // drawing and never draws one of its own. It keys no cookie, so each load clears it.
    const line = page.locator("[data-appendix-line]");
    await stopServer(server);
    server = await startServer(["HOW_IT_WORKS_ENABLED"]);
    await setSeen(userId, VERSION);
    await context.clearCookies({ name: "about_sheet" });
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    report("F7a the appendix alone draws no sheet for a current reader", !(await card.isVisible()));

    await stopServer(server);
    server = await startServer(["HOW_IT_WORKS_ENABLED", "CHANGE_COMMANDER_ENABLED"]);
    await setSeen(userId, VERSION);
    await context.clearCookies({ name: "about_sheet" });
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    const rides = await sheetTitles(page, card);
    report(
      "F7b the line rides the sheet a flip draws, once, after its entry",
      rides?.[0] === "Change commander" && rides.length === 2 && (await line.count()) === 1,
      JSON.stringify(rides),
    );

    await visitAbout(page, userId, "how-it-works");
    const seenIds = (await readRow(userId))?.about_seen_ids ?? [];
    report("F7c the /about visit records how-it-works", seenIds.includes("how-it-works"), JSON.stringify(seenIds));
    await setSeen(userId, VERSION, ["how-it-works"]);
    await context.clearCookies({ name: "about_sheet" });
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    const after = await sheetTitles(page, card);
    report(
      "F7d once seen, the next sheet names its entry without the line",
      JSON.stringify(after) === JSON.stringify(["Change commander"]) && (await line.count()) === 0,
      JSON.stringify(after),
    );
    await context.close();
  } finally {
    await stopServer(server);
  }
}

await clerkSetup();
const browser = await chromium.launch();
const who = { id: null, original: undefined };
try {
  if (BEHIND < 1) throw new Error(`ABOUT_VERSION is ${VERSION}; there is no version to be behind.`);
  if (FLIP) {
    try {
      await flipWalk(browser, who);
    } catch (error) {
      report("the flip walk stopped", false, String(error?.message ?? error).split("\n")[0]);
    }
  }
  for (const width of FLIP ? [] : WIDTHS) {
    console.log(`\n${width.label}x${width.viewport.height}`);
    // A step that throws (a control a broken build never drew) is a failure at THIS width,
    // reported and counted, and the other widths still run. Found by the mount mutation,
    // which left no card for Later to press and ended the run at 390.
    try {
      await walk(browser, width, who);
    } catch (error) {
      report(`${width.label}: the walk stopped`, false, String(error?.message ?? error).split("\n")[0]);
    }
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
