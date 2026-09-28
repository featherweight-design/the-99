// Does filing a deck flash the route's loading screen?
//
// The report: "the filters show, a loader screen shows briefly, and then you're
// back to viewing the decks". `/decks` has a `loading.tsx` — `LoadingScreen`,
// `role="status"`, heading "Shuffling up" — so the question is whether a move
// makes the router fall back to it, and how many server round trips one move
// actually costs.
//
// It watches two things a screenshot cannot: every appearance of that status
// element, and every RSC request the page issues while the move happens. A
// single revalidation is one request; the double render this looks for is two.
//
// It files a deck into a folder it creates, then unfiles it and removes the
// folder, in a `finally`. Point it at `local-dev`, NEVER production.
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { randomUUID } from "node:crypto";

neonConfig.webSocketConstructor = ws;

const {
  E2E_AUDIT_USER_EMAIL: EMAIL,
  E2E_AUDIT_USER_PASSWORD: PASSWORD,
  DATABASE_URL,
} = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
// Not required: a `+clerk_test` account signs in with a code and has no password,
// and that is the account this repository's browser probes use.
if (!EMAIL.includes("+clerk_test") && !PASSWORD) {
  throw new Error("E2E_AUDIT_USER_PASSWORD is required for an account without +clerk_test");
}
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
// A UUID, not a timestamp. Two runs can share a millisecond, and then one
// create is refused and the loser reads the winner's row as its own — which its
// cleanup would delete.
const FOLDER = `probe-flash-${randomUUID()}`;

const pool = new Pool({ connectionString: DATABASE_URL });
// The rows THIS run made, so cleanup names them instead of matching a prefix:
// a name prefix would reach another run's folder, and unfile decks it owns.
const madeFolderIds = [];
// The signed-in account, read off Clerk rather than assumed: folder names are
// unique PER USER, so a name alone can name another account's folder.
let userId = null;
// The deck this run borrows, and the shelf it was on BEFORE. Cleanup restores
// that exact value rather than unfiling: the fixture account's decks may already
// be filed, and a probe that loses a real folder assignment costs more than it
// measures.
const borrowedDecks = [];
// Every folder the account held BEFORE this run. Nothing in it is ever touched.
const idsBefore = new Set();
const RENAMED = `${FOLDER}-renamed`;
const PHONE_FOLDER = `${FOLDER}-phone`;

let failures = 0;
const check = (label, actual, expected) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${actual}, expected ${expected}`);
};

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    await run(browser);
    await runPhone(browser);
  } finally {
    // Teardown belongs here rather than at the end of the happy path: any
    // selector wait that throws would otherwise orphan Chromium.
    await browser.close();
  }
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
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor?.emailAddressId,
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
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

async function run(browser) {
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();

  // Clerk's dev instance: only `window.Clerk` plus a `+clerk_test` code signs in.
  await signIn(page);

  // TWO VISITS, deliberately. The FIRST create after a cold `pnpm dev` reloads
  // the document while Next compiles the route, and that is the bundler rather
  // than the app — so the route is compiled and its chunks are in cache before
  // any counter starts. Without this the probe fails a build with no defect in
  // it, which is worse than not checking at all.
  await page.goto(`${BASE}/decks`, { waitUntil: "load" });
  await page.waitForSelector("main [data-shelf-line]", { timeout: 30_000 });
  await page.goto(`${BASE}/decks`, { waitUntil: "load" });
  await page.waitForSelector("main [data-shelf-line]", { timeout: 30_000 });
  // Clerk loads its user a beat after the document; reading it at once read null
  // on about one run in two.
  await page.waitForFunction(() => window.Clerk?.user?.id, null, { timeout: 30_000 }).catch(() => {});
  userId = await page.evaluate(() => window.Clerk?.user?.id ?? null);
  if (!userId) throw new Error("could not read the signed-in Clerk user id");
  // Every folder this account already has. Anything outside this set after the
  // create is this run's, and nothing inside it is ever touched by cleanup.
  const before = await pool.query("select id from deck_folders where user_id = $1", [userId]);
  before.rows.forEach((r) => idsBefore.add(r.id));

  // Every appearance of the route's loading screen, and every RSC round trip.
  await page.evaluate(() => {
    window.__flashes = 0;
    const seen = () =>
      [...document.querySelectorAll("[role=status]")].some((n) =>
        n.textContent?.includes("Shuffling up"),
      );
    // ON THE TRANSITION, not on every mutation while it is up. One loading
    // screen that sits through a few DOM writes is one flash, and counting each
    // write reports refreshes that never happened.
    let was = seen();
    new MutationObserver(() => {
      const now = seen();
      if (now && !was) window.__flashes += 1;
      was = now;
    }).observe(document.body, { childList: true, subtree: true });
  });

  let rsc = 0;
  page.on("request", (r) => {
    const u = r.url();
    // THE PAGE, not everything under it. A revalidation re-prefetches every
    // deck tile's own `/decks/<id>` link, 18 of them on a staging-shaped account
    // of 20 decks, and counting those failed every write on a real account while
    // measuring nothing about the round trip this probe is for. And not a
    // PREFETCH: an action posted from `?folder=` re-prefetches the bare `/decks`
    // link (`next-router-prefetch: 1`, metadata only), which nobody waits on.
    if (
      new URL(u).pathname === "/decks"
      && (u.includes("_rsc") || r.method() === "POST")
      && !r.headers()["next-router-prefetch"]
    ) rsc += 1;
  });

  // A DOCUMENT LOAD is the thing to tell apart from a soft refresh: it throws
  // away the page's JS context, which is why the flash counter came back
  // undefined rather than as a number.
  let loads = 0;
  const loadUrls = [];
  page.on("load", () => { loads += 1; loadUrls.push(page.url()); });
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) loadUrls.push(`nav ${f.url()}`); });

  // Make a folder.
  await onPage(page, "button").filter({ hasText: "New folder" }).first().click();
  await page.getByLabel("Folder name").fill(FOLDER);
  const rscBeforeCreate = rsc;
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForTimeout(3000);

  const createFlashes = await page.evaluate(() => window.__flashes ?? "context was replaced");
  check("creating a folder flashes no loading screen", createFlashes, 0);
  check("creating a folder reloads the document", loads, 0);
  // THE POINT OF THE PROBE. One fetch of `/decks` per write: the Server Action's
  // own `revalidatePath`. A reintroduced `router.refresh()` makes it two, and a
  // final DOM that happens to be current would hide that from every other check
  // here — so the count is asserted, not printed.
  check("the create costs one server round trip", rsc - rscBeforeCreate, 1);
  console.log(`      navigations: ${JSON.stringify(loadUrls)}`);

  // The shelf the reader is on after a create. Hugh's call: it must not move.
  // A row this run did not create is never recorded. The name carries a
  // timestamp, but a collision would mean the create was REFUSED and the id
  // found belongs to somebody's real folder — which cleanup would then delete.
  const made = await pool.query("select id from deck_folders where name = $1 and user_id = $2", [
    FOLDER,
    userId,
  ]);
  const fresh = made.rows.filter((r) => !idsBefore.has(r.id));
  fresh.forEach((r) => madeFolderIds.push(r.id));
  check("the create wrote exactly one folder row", fresh.length, 1);
  // AND STOP THERE. Continuing would rename and delete a shelf this run does not
  // own — the name is a timestamp, so the only way to miss here is a create that
  // was refused because somebody already holds that name.
  if (fresh.length !== 1) throw new Error("the create did not produce exactly one new folder");

  const onShelf = await page.evaluate(
    () => new URLSearchParams(window.location.search).get("folder"),
  );
  check("creating a folder does not move the reader", onShelf, null);

  // The deck about to be borrowed, and the shelf it is on now. Read before the
  // move, so the `finally` can put it back where it was.
  // BY ID, off the tile's own link. Deck names are not unique per account, so a
  // name lookup can borrow one row and restore another — and the deck it fails
  // to restore is the one the probe actually moved.
  const href = await onPage(page, "li a[href^='/decks/']").first().getAttribute("href");
  const borrowedId = href?.split("/")[2] ?? null;
  const borrowed = await pool.query(
    "select id, folder_id from decks where user_id = $1 and id = $2",
    [userId, borrowedId],
  );
  check("the borrowed deck was found in the database", borrowed.rows.length, 1);
  if (borrowed.rows[0]) borrowedDecks.push(borrowed.rows[0]);

  // File the first deck into it, from All decks.
  // The DECK's own menu, inside the grid: the shelf line's trigger carries the
  // same `Actions for …` prefix, and it opens rename and delete, not Move.
  await onPage(page, "li button[aria-label^='Actions for']").first().click();
  const menu = onPage(page, "button[aria-label^='Move ']").first();
  await menu.waitFor({ timeout: 10_000 });
  await page.evaluate(() => { window.__flashes = 0; });
  const rscBeforeMove = rsc;
  loads = 0;
  await menu.click();
  await page.getByRole("button", { name: new RegExp(`^${FOLDER}$`) }).click();
  await page.waitForTimeout(3500);

  const moveFlashes = await page.evaluate(() => window.__flashes ?? "context was replaced");
  check("filing a deck flashes no loading screen", moveFlashes, 0);
  check("filing a deck reloads the document", loads, 0);
  check("the move costs one server round trip", rsc - rscBeforeMove, 1);

  // And the menu is gone, rather than back at its first mode. THE MOVE ROW
  // ITSELF: the panel is a plain div, so a `[role=dialog]` scope matched nothing
  // whatever the panel was doing, and this check could not fail.
  const menuOpen = await onPage(page, "li button[aria-label^='Move ']").count();
  check("the deck menu closes after the move", menuOpen, 0);

  // THE GRID MUST NOT GO STALE. Whatever invalidates the route, the segment's
  // count has to carry the deck that was just filed — that is the reason a
  // refresh is in this path at all.
  const filedCount = await page.evaluate((name) => {
    const seg = [...document.querySelectorAll("[data-shelf-line] button")]
      .find((b) => b.textContent?.startsWith(name));
    return seg?.textContent?.replace(name, "").trim() ?? "no segment";
  }, FOLDER);
  check("the new shelf counts the deck just filed", filedCount, "1");

  // Repeat the round trip a few times: the reload was intermittent, so one
  // clean pass proves nothing.
  const rscBeforeRepeats = rsc;
  for (let i = 0; i < 4; i += 1) {
    await onPage(page, "li button[aria-label^='Actions for']").first().click();
    await onPage(page, "button[aria-label^='Move ']").first().click();
    await page.getByRole("button", { name: /^Unfiled$/ }).click();
    await page.waitForTimeout(1200);
    await onPage(page, "li button[aria-label^='Actions for']").first().click();
    await onPage(page, "button[aria-label^='Move ']").first().click();
    await page.getByRole("button", { name: new RegExp(`^${FOLDER}$`) }).click();
    await page.waitForTimeout(1200);
  }
  check("eight more moves reload the document", loads, 0);
  // Eight writes, eight revalidations, and nothing else.
  check("eight more moves cost eight server round trips", rsc - rscBeforeRepeats, 8);

  // Rename and delete lean on the same invalidation. If the action's own
  // `revalidatePath` is the only refresh in the round, these are where a
  // missing one would show as a stale label or a segment that will not go.
  // The shelf menu exists only on a SELECTED named shelf, and after the moves
  // above the reader is still on All decks (E20). Select it rather than clicking
  // a locator with no matches and waiting out Playwright's full action timeout
  // before a catch can recover.
  await onPage(page, "[data-shelf-line] button").filter({ hasText: FOLDER }).first().click();
  await onPage(page, "[data-shelf-line] button[aria-label^='Actions for']").first().waitFor({
    timeout: 10_000,
  });
  await onPage(page, "[data-shelf-line] button[aria-label^='Actions for']").first().click();
  const rscBeforeRename = rsc;
  await page.getByRole("button", { name: "Rename" }).click();
  await page.getByLabel("Folder name").fill(RENAMED);
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForTimeout(2000);
  check("the rename costs one server round trip", rsc - rscBeforeRename, 1);
  const renamed = await page.evaluate(
    (name) =>
      [...document.querySelectorAll("[data-shelf-line] button")].some((b) =>
        b.textContent?.startsWith(name),
      ),
    RENAMED,
  );
  check("the renamed shelf shows its new name without a client refresh", renamed, true);

  await onPage(page, "[data-shelf-line] button[aria-label^='Actions for']").first().click();
  const rscBeforeDelete = rsc;
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete folder" }).click();
  await page.waitForTimeout(2500);
  // THE RENAMED NAME. Checking the original would pass whatever the delete did:
  // the rename already took that name off the line.
  const gone = await page.evaluate(
    (name) =>
      [...document.querySelectorAll("[data-shelf-line] button")].every(
        (b) => !b.textContent?.startsWith(name),
      ),
    RENAMED,
  );
  check("the deleted shelf leaves the line without a client refresh", gone, true);
  // The payload, not only the segment: the deck the deleted folder held is
  // unfiled by the foreign key, and a line still drawing the old tree reads
  // `Unfiled` one short. That is what Hugh saw on staging (2026-09-28).
  check("Unfiled counts the deck the deleted folder held", await unfiledOnLine(page), await unfiledInDb());
  check("the delete leaves ?folder= off the URL", new URL(page.url()).searchParams.has("folder"), false);
  check("the delete costs one server round trip", rsc - rscBeforeDelete, 1);
  check("and the whole sequence reloaded the document never", loads, 0);
  const lateFlashes = await page.evaluate(() => window.__flashes ?? "context was replaced");
  check("eight more moves flash no loading screen", lateFlashes, 0);
}

/** Decks on no shelf, as the database has them now. */
async function unfiledInDb() {
  const r = await pool.query(
    "select count(*)::int as n from decks where user_id = $1 and folder_id is null",
    [userId],
  );
  return r.rows[0].n;
}

/** The `Unfiled` segment's count as the wide line draws it. */
function unfiledOnLine(page) {
  return page.evaluate(() => {
    const seg = [...document.querySelectorAll("main [data-shelf-line] button")]
      .find((b) => b.textContent?.startsWith("Unfiled"));
    return seg ? Number(seg.textContent.replace("Unfiled", "").trim()) : "no segment";
  });
}

/** Every row of the phone's shelf sheet, by its accessible name, then closed again. */
async function sheetRows(page) {
  await onPage(page, "[data-shelf-trigger] button[aria-haspopup=dialog]").first().click();
  const sheet = page.getByRole("dialog", { name: "Shelves" });
  await sheet.waitFor({ timeout: 10_000 });
  const rows = await sheet.locator("button[aria-label]").evaluateAll((bs) =>
    bs.map((b) => b.getAttribute("aria-label")),
  );
  await page.getByRole("button", { name: "Close shelves" }).click();
  await sheet.waitFor({ state: "detached", timeout: 10_000 });
  return rows;
}

// THE PHONE, where Hugh's walk found the delete leaving the old tree on screen:
// the deleted shelf still listed with its deck and `Unfiled` one short, until a
// reload. The cause was a URL write racing the action's revalidated payload,
// which settles by timing, so this path is walked with Hugh's exact steps — a
// folder made, a deck filed into it, that shelf selected, then deleted from it.
async function runPhone(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await signIn(page);
    await page.goto(`${BASE}/decks`, { waitUntil: "load" });
    await page.waitForSelector("main [data-shelf-trigger]", { timeout: 30_000 });

    await onPage(page, "[data-shelf-trigger] button[aria-haspopup=dialog]").first().click();
    await page.getByRole("dialog", { name: "Shelves" }).getByRole("button", { name: /New folder/ }).click();
    await page.getByLabel("Folder name").fill(PHONE_FOLDER);
    await page.getByRole("button", { name: "Create" }).click();
    // Polled rather than slept, and held to the desktop run's rule: exactly one
    // row this run made, or stop before touching anything else.
    let fresh = [];
    for (let i = 0; i < 20 && fresh.length === 0; i += 1) {
      await page.waitForTimeout(500);
      const madeRows = await pool.query(
        "select id from deck_folders where name = $1 and user_id = $2",
        [PHONE_FOLDER, userId],
      );
      fresh = madeRows.rows.filter((r) => !idsBefore.has(r.id));
    }
    fresh.forEach((r) => madeFolderIds.push(r.id));
    check("390: the create wrote exactly one folder row", fresh.length, 1);
    if (fresh.length !== 1) throw new Error(`390: expected one new folder row, found ${fresh.length}`);

    const href = await onPage(page, "li a[href^='/decks/']").first().getAttribute("href");
    const deckId = href?.split("/")[2] ?? null;
    const borrowed = await pool.query(
      "select id, folder_id from decks where user_id = $1 and id = $2",
      [userId, deckId],
    );
    // Usually the same deck the desktop run borrowed, which that run's delete has
    // since unfiled. Recording it again would restore it to null, over the real
    // shelf the first record holds.
    const again = borrowedDecks.some((b) => b.id === borrowed.rows[0]?.id);
    if (borrowed.rows[0] && !again) borrowedDecks.push(borrowed.rows[0]);
    await onPage(page, "li button[aria-label^='Actions for']").first().click();
    await onPage(page, "button[aria-label^='Move ']").first().click();
    await page.getByRole("button", { name: new RegExp(`^${PHONE_FOLDER}$`) }).click();
    await page.waitForTimeout(2500);

    await onPage(page, "[data-shelf-trigger] button[aria-haspopup=dialog]").first().click();
    await page.getByRole("dialog", { name: "Shelves" })
      .getByRole("button", { name: new RegExp(`^${PHONE_FOLDER}, `) }).click();
    await page.waitForTimeout(1000);
    await onPage(page, "[data-shelf-trigger] button[aria-label^='Actions for']").first().click();
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete folder" }).click();
    await page.waitForTimeout(3000);

    const unfiled = await unfiledInDb();
    const unfiledRow = `Unfiled, ${unfiled} ${unfiled === 1 ? "deck" : "decks"}`;
    const rows = await sheetRows(page);
    check("390: the deleted shelf leaves the sheet", rows.some((r) => r?.startsWith(`${PHONE_FOLDER},`)), false);
    check("390: Unfiled counts the deck the deleted folder held", rows.includes(unfiledRow), true);
    check("390: the selection falls back to All decks", (await onPage(page, "[data-shelf-trigger] button[aria-haspopup=dialog]").first().getAttribute("aria-label"))?.startsWith("Shelf: All decks"), true);
    check("390: the delete leaves ?folder= off the URL", new URL(page.url()).searchParams.has("folder"), false);

    // A fresh document at the same address, once the router has gone quiet: a
    // load started while its prefetches are in flight is aborted (ERR_ABORTED),
    // which says nothing about the page.
    await page.waitForLoadState("networkidle");
    // Clerk's dev instance can answer a document load with a handshake redirect,
    // which aborts the load Playwright was waiting on (ERR_ABORTED) and lands on
    // the same page a moment later. The shelf control arriving is the real wait.
    await page.goto(page.url(), { waitUntil: "load" }).catch((error) => {
      if (!String(error).includes("ERR_ABORTED")) throw error;
    });
    await page.waitForSelector("main [data-shelf-trigger]", { timeout: 30_000 });
    const reloaded = await sheetRows(page);
    check("390: a reload draws the same shelves", JSON.stringify(reloaded), JSON.stringify(rows));
  } finally {
    await context.close();
  }
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    const c = await pool.connect();
    // By id, and only the ids this run made. A `like` on the name would reach a
    // concurrent run's folder and unfile decks belonging to it.
    // A fallback lookup, because the id list is written after the create's own
    // assertions: anything throwing between the two would otherwise leave the
    // folder behind, against this script's own promise to clean up after itself.
    // EVERY RUN, not only when nothing was recorded: the desktop walk always records its folder
    // before the phone walk starts, so a phone create that committed and then threw before its
    // id was pushed would be skipped by a "nothing recorded" gate and left on the account.
    if (userId) {
      const late = await c.query(
        "select id from deck_folders where user_id = $1 and name = any($2::text[])",
        [userId, [FOLDER, RENAMED, PHONE_FOLDER]],
      );
      // Still only rows that did not exist before this run. A name collision is
      // the case this fallback exists for and also the case where the name names
      // somebody else's folder, so the name alone can never authorise a delete.
      late.rows
        .filter((r) => !idsBefore.has(r.id) && !madeFolderIds.includes(r.id))
        .forEach((r) => madeFolderIds.push(r.id));
    }
    // Back to the shelf each was on, which may well have been a real one.
    for (const borrowedDeck of borrowedDecks) {
      await c.query("update decks set folder_id = $1 where id = $2 and user_id = $3", [
        borrowedDeck.folder_id,
        borrowedDeck.id,
        userId,
      ]);
    }
    if (madeFolderIds.length > 0) {
      await c.query(
        "update decks set folder_id = null where folder_id = any($1::uuid[]) and user_id = $2",
        [madeFolderIds, userId],
      );
      await c.query("delete from deck_folders where id = any($1::uuid[]) and user_id = $2", [
        madeFolderIds,
        userId,
      ]);
    }
    c.release();
    await pool.end();
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  });
