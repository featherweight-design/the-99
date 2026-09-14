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

neonConfig.webSocketConstructor = ws;

const {
  E2E_AUDIT_USER_EMAIL: EMAIL,
  E2E_AUDIT_USER_PASSWORD: PASSWORD,
  DATABASE_URL,
} = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const FOLDER = `probe-flash-${Date.now()}`;

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
let borrowedDeck = null;
const RENAMED = `${FOLDER}-renamed`;

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
  } finally {
    // Teardown belongs here rather than at the end of the happy path: any
    // selector wait that throws would otherwise orphan Chromium.
    await browser.close();
  }
}

async function run(browser) {
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();

  // Clerk's dev instance: only `window.Clerk` plus a `+clerk_test` code signs in.
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

  // TWO VISITS, deliberately. The FIRST create after a cold `pnpm dev` reloads
  // the document while Next compiles the route, and that is the bundler rather
  // than the app — so the route is compiled and its chunks are in cache before
  // any counter starts. Without this the probe fails a build with no defect in
  // it, which is worse than not checking at all.
  await page.goto(`${BASE}/decks`, { waitUntil: "load" });
  await page.waitForSelector("main [data-shelf-line]", { timeout: 30_000 });
  await page.goto(`${BASE}/decks`, { waitUntil: "load" });
  await page.waitForSelector("main [data-shelf-line]", { timeout: 30_000 });
  userId = await page.evaluate(() => window.Clerk?.user?.id ?? null);
  if (!userId) throw new Error("could not read the signed-in Clerk user id");
  // Every folder this account already has. Anything outside this set after the
  // create is this run's, and nothing inside it is ever touched by cleanup.
  const before = await pool.query("select id from deck_folders where user_id = $1", [userId]);
  const idsBefore = new Set(before.rows.map((r) => r.id));

  // Every appearance of the route's loading screen, and every RSC round trip.
  await page.evaluate(() => {
    window.__flashes = 0;
    const seen = () =>
      [...document.querySelectorAll("[role=status]")].some((n) =>
        n.textContent?.includes("Shuffling up"),
      );
    new MutationObserver(() => {
      if (seen()) window.__flashes += 1;
    }).observe(document.body, { childList: true, subtree: true });
  });

  let rsc = 0;
  page.on("request", (r) => {
    const u = r.url();
    if (u.includes("/decks") && (u.includes("_rsc") || r.method() === "POST")) rsc += 1;
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
  borrowedDeck = borrowed.rows[0] ?? null;

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

  await page.locator("[data-shelf-line] button[aria-label^='Actions for']").first().click();
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
  check("the delete costs one server round trip", rsc - rscBeforeDelete, 1);
  check("and the whole sequence reloaded the document never", loads, 0);
  const lateFlashes = await page.evaluate(() => window.__flashes ?? "context was replaced");
  check("eight more moves flash no loading screen", lateFlashes, 0);
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
    if (madeFolderIds.length === 0 && userId) {
      const late = await c.query(
        "select id from deck_folders where user_id = $1 and name = any($2::text[])",
        [userId, [FOLDER, RENAMED]],
      );
      late.rows.forEach((r) => madeFolderIds.push(r.id));
    }
    if (borrowedDeck) {
      // Back to the shelf it was on, which may well have been a real one.
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
