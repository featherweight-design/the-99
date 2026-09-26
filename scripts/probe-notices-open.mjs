// probe:notices-open — the deck notices on arrival, in a real browser at 1300x900 and 390x844 (Hugh's
// staging walk, 2026-09-26).
//
// Two rulings, both facts no jsdom test can reach:
//   - THE HEADER'S TAG IS IN THE FIRST PAINT. It used to arrive from a client read after mount and
//     pop into a header that had already drawn. The check reads the document the server SENT, so a
//     tag added by any effect or fetch afterwards is absent from it whatever the page shows later.
//   - THE TILE'S `!` OPENS THE NOTICES. Pressing it on /decks lands on the deck with the Notices
//     sheet open, by client navigation, and a cold load of the URL it names does the same. Either
//     way the parameter is stripped once it has done its work, so a refresh lands on the deck alone.
//
// Its fixture is BUILT on local-dev: one planted Game Changer entry on a card the deck's reading
// analyzed, which is what makes the tile draw the `!` and the header draw the tag. Opening the sheet
// marks the notices read, so the read marks are captured before the run and put back after each
// width and in the `finally`, with the planted entry deleted. It refuses staging and production.
//
//   PROBE_BASE=http://localhost:3050 pnpm probe:notices-open
//
// Needs a server with ANALYSIS_TAB_ENABLED=true and NOTICES_ENABLED=true.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const sql = neon(DATABASE_URL);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];
/** The mark on the entry this probe plants (`detail.probe`), which the cleanup finds by. */
const PROBE_MARK = "notices-open";

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}: ${detail}`);
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
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  return page.evaluate(() => window.Clerk.user.id);
}

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

async function refuseSharedDatabase() {
  const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH || process.env.VERCEL_ENV === "production") {
    throw new Error(`probe:notices-open writes a log entry and read marks, and refuses branch ${branch ?? "(unknown)"}.`);
  }
}

/** A deck of the account's with a single-mark reading, and one planted entry on a card it analyzed. */
async function buildFixture(userId) {
  const [deck] = await sql`
    select d.id, d.name, d.notices_legal_seen, p.notices_read_seq, p.analyzed_oracle_ids
    from decks d join deck_profiles p on p.deck_id = d.id
    where d.user_id = ${userId} and cardinality(p.analyzed_oracle_ids) > 0
    order by d.id limit 1`;
  if (!deck) return null;
  const [{ seq }] = await sql`
    insert into deck_data_changes (kind, direction, oracle_ids, detail)
    values ('gameChanger', 'added', array[${deck.analyzed_oracle_ids[0]}]::uuid[], ${JSON.stringify({ probe: PROBE_MARK })}::jsonb)
    returning seq`;
  return { ...deck, seq: Number(seq) };
}

/** Puts the deck's read marks back as captured, so the next width's tile draws its `!` again. */
async function resetReadMarks(fixture) {
  await sql`update deck_profiles set notices_read_seq = ${fixture.notices_read_seq} where deck_id = ${fixture.id}::uuid`;
  await sql`update decks set notices_legal_seen = ${fixture.notices_legal_seen} where id = ${fixture.id}::uuid`;
}

async function sheetOpen(page) {
  // The sheet is portalled out of <main>, so it is found on the page rather than inside the surface.
  return page.locator('[data-testid="notices-body"]').first().waitFor({ state: "visible", timeout: 15_000 }).then(() => true, () => false);
}

async function walk(page, width, fixture) {
  const tag = `@${width.label}`;
  await page.setViewportSize(width.viewport);

  // 1 · The header's tag is in the document the server sent. `response.text()` is the whole
  //     streamed body, before any script has run.
  await resetReadMarks(fixture);
  const response = await page.goto(`${BASE}/decks/${fixture.id}`, { waitUntil: "domcontentloaded" });
  const html = (await response?.text()) ?? "";
  // Any kind: the fixture's deck may also carry a legality notice, which outranks the data one.
  const kind = /data-notice-tag="([a-zA-Z]+)"/.exec(html)?.[1] ?? null;
  report(`header tag in the server's HTML ${tag}`, kind !== null, kind ?? "absent: it arrives after the first paint");

  // 2 · The tile's `!`, by client navigation.
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  const tile = onPage(page, "article").filter({ has: page.locator(`a[href^="/decks/${fixture.id}"]`) }).first();
  const mark = tile.locator("[data-notice-link]");
  await mark.waitFor({ state: "visible", timeout: 30_000 });
  report(`tile mark links to the sheet ${tag}`, (await mark.getAttribute("href")) === `/decks/${fixture.id}?notices=1`, (await mark.getAttribute("href")) ?? "no href");
  await mark.click();
  await page.waitForURL((u) => u.pathname === `/decks/${fixture.id}`, { timeout: 30_000 });
  report(`the tile's ! lands with the sheet open ${tag}`, await sheetOpen(page), "notices-body");
  await page.waitForFunction(() => !new URL(location.href).searchParams.has("notices"), null, { timeout: 10_000 }).catch(() => {});
  report(`parameter stripped after a press ${tag}`, !new URL(page.url()).searchParams.has("notices"), page.url());
  // Close it, leave by the app's own navigation, and come Back: the history entry the tile pushed
  // must not reopen the sheet from the router's cached payload.
  await page.keyboard.press("Escape");
  await page.locator('[data-testid="notices-body"]').first().waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  await page.evaluate(() => { window.__probeStay = true; });
  // The shell's own Decks link, whichever width draws it (the rail on desktop, the tab bar on a phone).
  await page.getByRole("link", { name: "Decks", exact: true }).filter({ visible: true }).first().click();
  await page.waitForURL((u) => u.pathname === "/decks", { timeout: 30_000 });
  await page.goBack({ waitUntil: "domcontentloaded" });
  await page.waitForURL((u) => u.pathname === `/decks/${fixture.id}`, { timeout: 30_000 });
  const soft = await page.evaluate(() => window.__probeStay === true);
  const reopened = await page.locator('[data-testid="notices-body"]').first()
    .waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false);
  report(`Back does not reopen it ${tag}`, !reopened, `${reopened ? "reopened" : "stayed shut"} (${soft ? "client" : "document"} back)`);

  // 3 · A cold load of the URL the mark names.
  await resetReadMarks(fixture);
  await page.goto(`${BASE}/decks/${fixture.id}?notices=1`, { waitUntil: "domcontentloaded" });
  report(`a cold load lands with the sheet open ${tag}`, await sheetOpen(page), "notices-body");
  await page.waitForFunction(() => !new URL(location.href).searchParams.has("notices"), null, { timeout: 10_000 }).catch(() => {});
  report(`parameter stripped after a cold load ${tag}`, !new URL(page.url()).searchParams.has("notices"), page.url());
  // A refresh lands on the deck alone.
  await page.reload({ waitUntil: "domcontentloaded" });
  await onPage(page, "[data-notice-tag]").first().waitFor({ state: "attached", timeout: 30_000 }).catch(() => {});
  report(`a refresh does not reopen it ${tag}`, !(await page.locator('[data-testid="notices-body"]').isVisible()), "no sheet");
}

async function main() {
  await refuseSharedDatabase();
  await sql`delete from deck_data_changes where detail->>'probe' = ${PROBE_MARK}`;
  await clerkSetup();
  const browser = await chromium.launch();
  let fixture = null;
  let about = null;
  try {
    const page = await browser.newPage();
    const userId = await signIn(page);
    about = await captureAboutSeen(userId, sql);
    await clearAboutSheet(page, userId);
    fixture = await buildFixture(userId);
    if (!report("fixture", fixture !== null, fixture ? `${fixture.name}, entry ${fixture.seq}` : "no deck with an analyzed reading — NOT a pass")) return;
    for (const width of WIDTHS) await walk(page, width, fixture);
  } finally {
    if (fixture) await resetReadMarks(fixture).catch((e) => { failures += 1; console.error(e); });
    await sql`delete from deck_data_changes where detail->>'probe' = ${PROBE_MARK}`.catch((e) => { failures += 1; console.error(e); });
    if (about) await restoreAboutSeen(about, sql).catch((e) => { failures += 1; console.error(e); });
    await browser.close();
  }
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(() => {
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exitCode = failures === 0 ? 0 : 1;
  });
