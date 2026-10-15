// probe:collection-sync-ui — Collection Sync's review and confirm, pressed in a real browser at 390x844 and
// 1300x900 (plan `2026-10-15-collection-sync.md`, PR 3; handoff STATES K1, K1b, K2, K3, X2).
//
// What jsdom cannot see, and the unit tests therefore do not prove:
//   - the whole path from a real upload: the choice's third card, Continue, and the review drawn from the
//     server's own dry run against a real base;
//   - each answer re-reading that dry run, so the tiles move as the engine says (App into kept, File into
//     from the file), and the bulk press acting as a RULE;
//   - the held confirm: `aria-disabled`, still focusable and pressable, its press moving focus into the first
//     unanswered row and raising no alert;
//   - the confirm landing on the receipt with the merge the review drew, written as one `upload_sync` entry.
//
// THE FIXTURE, per width, for the signed-in account (`E2E_AUDIT_USER_EMAIL`), on the database `.env` names. It
// must be a SCRATCH branch: staging and production are refused by `neon.branch_id`. Five printings no deck of
// the account holds, so no lowering can leave a deck short or prune a reservation:
//   - the account's collection becomes the APP side (the hand changes since the last upload): P1 ×3, P2 ×1,
//     P3 ×1, P4 ×1, P5 ×2;
//   - a confirmed upload with no ledger entry is the anchor, the last Replace (the BASE): P1 ×1, P3 ×2, P4 ×1, P5 ×1;
//   - the probe uploads a CSV through the page (the FILE, a new unconfirmed upload): P1 ×2, P2 ×2, P4 ×2, P5 ×1.
// So P1, P2 and P3 are conflicts, P4 is taken from the file and P5 is kept: 3 to decide.
//
// CLEAN-UP, in a `finally`: every table the confirm can write for this account (`collection_items`, the token
// rows, `card_assignments`, `commander_scores`) is put back exactly from a snapshot taken first, and the uploads
// and ledger entries the run made are deleted. The one thing not restored is a ledger entry the write's own
// retention prune removes, which only an entry past the retention window can be.
//
// The server: `next start` of a build with the worktree's `.env`, started with
//   COLLECTION_EDIT_ENABLED=true COLLECTION_SYNC_ENABLED=true
//
// Written for PR 3 and not yet run by its author: browser probes are run by hand.
//
//   PROBE_BASE=http://localhost:3311 pnpm probe:collection-sync-ui
import { neon } from "@neondatabase/serverless";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, CLERK_SECRET_KEY, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
// A local server only: the probe writes fixtures, so a remote host is never a target, whatever it serves.
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "" || u.pathname !== "/") {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback server with a port only (http://localhost:3311)`);
  }
}
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
if (!CLERK_SECRET_KEY.startsWith("sk_test_")) throw new Error("refusing: CLERK_SECRET_KEY is not a development instance's");
const sql = neon(DATABASE_URL);
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

/** Every per-account table a Sync's confirm can write, restored exactly from the snapshot. */
const RESTORED = ["collection_items", "token_ownership", "token_reads", "token_printing_holdings", "deck_token_joins", "card_assignments", "commander_scores"];

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

/** Five nonfoil printings of five cards no deck of the account holds. */
async function pickPrintings(userId) {
  const rows = await sql`
    select distinct on (c.name) p.scryfall_id::text as id, p.oracle_id::text as oracle, p.set_code as set, p.collector_number as cn, c.name
    from printings p join cards c on c.oracle_id = p.oracle_id
    where c.name !~ '//' and c.name !~ ',' and p.collector_number ~ '^[0-9]+$'
      and not exists (
        select 1 from deck_cards dc join decks d on d.id = dc.deck_id where d.user_id = ${userId} and dc.oracle_id = p.oracle_id
      )
    order by c.name, p.set_code, p.collector_number
    limit 5`;
  if (rows.length < 5) throw new Error("the catalog has fewer than five usable printings");
  return rows;
}

const item = (p, quantity) => ({
  oracleId: p.oracle, setCode: p.set, collectorNumber: p.cn, finish: "nonfoil", scryfallId: p.id, condition: null, quantity, name: p.name,
});

/** The account's state before the run, for the `finally`. */
async function snapshot(userId) {
  const tables = {};
  for (const t of RESTORED) {
    const [{ rows }] = await sql.query(`select coalesce(json_agg(t), '[]'::json) as rows from ${t} t where user_id = $1`, [userId]);
    tables[t] = rows;
  }
  const uploads = (await sql`select id::text from csv_uploads where user_id = ${userId}`).map((r) => r.id);
  const entries = (await sql`select id::text from collection_history where user_id = ${userId}`).map((r) => r.id);
  return { tables, uploads, entries };
}

async function restore(userId, snap) {
  // The run's own ledger entries and uploads first: the token rows' `entry_id` may name an entry of the run.
  await sql`delete from collection_history where user_id = ${userId} and not (id::text = any(${snap.entries}))`;
  await sql`delete from csv_uploads where user_id = ${userId} and not (id::text = any(${snap.uploads}))`;
  for (const t of RESTORED) {
    await sql.query(`delete from ${t} where user_id = $1`, [userId]);
    await sql.query(`insert into ${t} select * from json_populate_recordset(null::${t}, $1::json)`, [JSON.stringify(snap.tables[t])]);
    const [{ n }] = await sql.query(`select count(*)::int as n from ${t} where user_id = $1`, [userId]);
    check(n === snap.tables[t].length, `restore · ${t} holds its ${snap.tables[t].length} rows again`, `${n}`);
  }
}

/** The APP side and the BASE (a confirmed upload with no ledger entry: the last Replace). */
async function seed(userId, P) {
  await sql`delete from collection_items where user_id = ${userId}`;
  const app = [[P[0], 3], [P[1], 1], [P[2], 1], [P[3], 1], [P[4], 2]];
  for (const [p, q] of app) {
    await sql`insert into collection_items (user_id, oracle_id, quantity, set_code, scryfall_id, collector_number, finish, condition)
              values (${userId}, ${p.oracle}, ${q}, ${p.set}, ${p.id}, ${p.cn}, 'nonfoil', null)`;
  }
  const base = [item(P[0], 1), item(P[2], 2), item(P[3], 1), item(P[4], 1)];
  await sql`insert into csv_uploads (user_id, filename, row_count, unmatched_count, preview_payload, confirmed_at)
            values (${userId}, 'probe-sync-base.csv', ${base.length}, 0,
                    ${JSON.stringify({ pendingItems: base, unmatched: [], parseErrors: [], skippedByDesignCount: 0 })}::jsonb, now())`;
}

/** The FILE, as ManaBox exports it. */
function csv(P) {
  const line = (p, q) => `"${p.name}",${p.set},${p.cn},normal,${q},${p.id}`;
  return ["Name,Set code,Collector number,Foil,Quantity,Scryfall ID", line(P[0], 2), line(P[1], 2), line(P[3], 2), line(P[4], 1)].join("\n");
}

const tiles = (page) => onPage(page, "[aria-live='polite']").first().evaluate((el) => [...el.children].map((c) => c.textContent));

async function waitTiles(page, first) {
  await page.waitForFunction(
    (want) => document.querySelector("main [aria-live='polite']")?.children[0]?.textContent === want,
    first,
    { timeout: 15_000 },
  ).catch(() => {});
  return tiles(page);
}

async function walk(browser, w, userId, P) {
  console.log(`\n── ${w.name}`);
  await seed(userId, P);
  const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.phone, isMobile: w.phone });
  const page = await context.newPage();
  try {
    await signIn(page, EMAIL, PASSWORD);
    await clearAboutSheet(page, userId);
    await page.goto(`${BASE}/collection/replace`, { waitUntil: "domcontentloaded" });
    await onPage(page, "input[aria-label='Upload collection CSV']").setInputFiles({
      name: "probe-sync-file.csv", mimeType: "text/csv", buffer: Buffer.from(csv(P)),
    });

    // The choice: Sync is the third card, and its Continue opens its review.
    const syncCard = onPageRole(page, "radio", /Sync my collection/);
    await syncCard.waitFor({ timeout: 60_000 });
    await syncCard.click();
    const go = onPageRole(page, "button", "Review the sync →");
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll("main button")].find((x) => x.textContent === "Review the sync →");
      return b && !b.disabled;
    }, null, { timeout: 30_000 });
    await go.click();
    await onPage(page, "section[aria-labelledby='sync-conflicts-heading']").first().waitFor({ timeout: 30_000 });

    let t = await waitTiles(page, "3to decide");
    check(t[0] === "3to decide" && t[1] === "1from the file" && t[2] === "1kept from The 99", `${w.name} K1: the tiles read 3 to decide, 1 from the file, 1 kept`, JSON.stringify(t));
    const groups = onPage(page, "fieldset");
    check((await groups.count()) === 3, `${w.name} K1: three conflict rows`, `${await groups.count()}`);
    const firstName = await groups.first().locator("legend").textContent();
    check(/, at [A-Z][a-z]{2} \d+ ×1, app ×3, file ×2$/.test(firstName ?? ""), `${w.name} K4: a row's name carries the card and its counts`, firstName);
    const picked = await onPage(page, "fieldset input[type=radio]:checked").count();
    check(picked === 0, `${w.name} K1: nothing is pre-picked`, `${picked} checked`);

    // The held confirm (K1b): focusable, pressable, and its press moves into the first unanswered row.
    const confirm = onPageRole(page, "button", "Sync collection");
    const held = await confirm.evaluate((b) => ({ aria: b.getAttribute("aria-disabled"), disabled: b.disabled, opacity: getComputedStyle(b).opacity }));
    check(held.aria === "true" && !held.disabled && held.opacity === "0.4", `${w.name} K1: the confirm is held, not disabled`, JSON.stringify(held));
    await confirm.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    const focus = await page.evaluate(() => {
      const el = document.activeElement;
      const row = el?.closest("fieldset");
      return { tag: el?.tagName, type: el?.getAttribute("type"), undecided: row?.getAttribute("data-undecided"), alerts: document.querySelectorAll("main [role=alert]").length };
    });
    check(focus.tag === "INPUT" && focus.type === "radio" && focus.undecided === "true" && focus.alerts === 0,
      `${w.name} K1b: the held press focuses the first unanswered row, with no alert`, JSON.stringify(focus));
    const inView = await page.evaluate(() => {
      const r = document.activeElement?.closest("fieldset")?.getBoundingClientRect();
      return r ? r.top >= 0 && r.bottom <= window.innerHeight : false;
    });
    check(inView, `${w.name} K1b: the row is scrolled into view`, `${inView}`);

    // One answer by hand: App on the first row. The tiles follow the server's read.
    await groups.first().getByRole("radio", { name: /^App/ }).check({ force: true });
    t = await waitTiles(page, "2to decide");
    check(t[0] === "2to decide" && t[2] === "2kept from The 99", `${w.name}: an App answer moves a card into kept`, JSON.stringify(t));

    // The bulk press, as a rule: every conflict to the file, the hand answer included.
    const bulk = onPageRole(page, "button", "Take the file’s for all 3");
    await bulk.click();
    t = await waitTiles(page, "0to decide");
    check(t[0] === "0to decide" && t[1] === "4from the file", `${w.name} K3: the bulk press decides all three, to the file`, JSON.stringify(t));
    check((await bulk.getAttribute("aria-pressed")) === "true", `${w.name} K3: the bulk press reads as pressed`, await bulk.getAttribute("aria-pressed"));
    const status = await onPage(page, "section[aria-labelledby='sync-conflicts-heading'] [role=status]").first().textContent();
    check(status === "Took the file’s count for all 3. You can still change any one.", `${w.name} K3: the one status line`, status);
    const banner = await onPage(page, "text=/^Taking the file’s count overwrites 3 cards/").count();
    check(banner === 1, `${w.name} K2: the overwrite banner, for conflicts answered File`, `${banner}`);

    // The confirm, live now, lands on the receipt.
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll("main button")].find((x) => x.textContent === "Sync collection");
      return b && b.getAttribute("aria-disabled") === null;
    }, null, { timeout: 15_000 });
    await confirm.click();
    await page.waitForURL((u) => u.pathname.startsWith("/collection/replace/summary/"), { timeout: 60_000 });
    check(true, `${w.name}: the confirm lands on the receipt`, new URL(page.url()).pathname);

    const held2 = Object.fromEntries((await sql`select oracle_id::text as o, quantity from collection_items where user_id = ${userId}`).map((r) => [r.o, r.quantity]));
    const want = [2, 2, undefined, 2, 2];
    const got = P.map((p) => held2[p.oracle]);
    check(JSON.stringify(got) === JSON.stringify(want), `${w.name}: the collection is the merge the review drew`, `${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
    const [{ n }] = await sql`select count(*)::int as n from collection_history where user_id = ${userId} and kind = 'upload_sync' and created_at > now() - interval '5 minutes'`;
    check(n >= 1, `${w.name}: one upload_sync entry written`, `${n}`);
  } finally {
    await context.close();
  }
}

const [{ id: branch }] = await sql`select current_setting('neon.branch_id', true) as id`;
if (!branch || branch === PRODUCTION || branch === STAGING) {
  throw new Error(`refusing to run against ${branch ?? "an unknown branch"}: this probe replaces the account's collection. Point DATABASE_URL at a scratch branch.`);
}
console.log(`branch ${branch}`);

const browser = await chromium.launch();
let userId = null;
let snap = null;
let about = null;
try {
  const page = await browser.newPage();
  userId = await signIn(page, EMAIL, PASSWORD);
  await page.close();
  about = await captureAboutSeen(userId);
  snap = await snapshot(userId);
  const P = await pickPrintings(userId);
  console.log(`fixture: ${P.map((p) => `${p.name} (${p.set} ${p.cn})`).join(", ")}`);
  for (const w of WIDTHS) {
    // Each width starts from the account as it was, then its own fixture.
    if (w !== WIDTHS[0]) await restore(userId, snap);
    await walk(browser, w, userId, P);
  }
} finally {
  try {
    if (userId && snap) await restore(userId, snap);
    if (about) await restoreAboutSeen(about);
  } finally {
    await browser.close();
  }
}
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
