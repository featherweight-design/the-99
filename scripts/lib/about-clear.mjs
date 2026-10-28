// Clears the one-time About sheet (About R6) for a probe, so a card drawn over the page
// cannot corrupt what the probe measures (R6 audit E5).
//
// ADDITIVE, and deliberately so. Every probe already raises `user_prefs.about_version_seen`
// for the account it signs in as, some with a capture-and-restore of their own, and that
// write is what keeps the proxy from drawing the sheet for every entry WITHOUT a switch.
//
// Since entries follow their features' switches (Hugh, 2026-09-25), the version is no
// longer enough on its own: an entry tied to a switch is seen by its ID, so a switch that is
// on in the server a probe runs against would still put a card over the page. So this is
// the ONE place a probe marks switched entries seen. It adds every entry id in the catalog to
// `about_seen_ids`, all of them rather than only the visible ones, because a probe cannot
// read the server's switches. That write is the guarantee now. The cookie below is only the
// proxy's fast path, and only while no switch is on: the proxy keys its cookie to the switched
// entries it draws, which a probe cannot know, so with one on the cookie never matches and the
// proxy reads the row instead, finding every entry seen. A card already drawn on the current
// document is pressed away with Later.
//
// A probe that puts the account's About row back afterwards does it with `captureAboutSeen`
// before its first write and `restoreAboutSeen` in its `finally`. Both columns, always: this
// module writes `about_seen_ids`, so a restore of the version alone leaves the ids it added
// behind and the fixture account changed. A probe that captures nothing leaves the row raised,
// which is what its `about_version_seen` write already says about the account.
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { parse } from "dotenv";
import { requireEnv } from "./env.mjs";

/**
 * The database every About write here goes to: `.env`'s `DATABASE_URL`, the one each probe's own branch guard checks,
 * and never another (an override would let the write escape that guard). The server a probe drives must read the
 * same database, so a worktree whose `.env.local` names a different `DATABASE_URL` (a dev server pointed at a scratch
 * branch that way) is refused before anything is written: point `.env` at that branch instead. A walk on 2026-10-28
 * wrote local-dev's About row while its server read a scratch branch through `.env.local`. Opened once per run.
 */
let shared = null;
export function aboutSql() {
  assertServerReadsEnv();
  shared ??= neon(requireEnv(["DATABASE_URL"]).DATABASE_URL);
  return shared;
}

/**
 * Refuses, before ANY read or write here, when the server reads another database than `.env`'s, whatever connection a
 * caller passed: a probe that captured through its own connection would otherwise restore through it after the clear
 * refused, and "nothing written" would not hold.
 */
export function assertServerReadsEnv(local = readLocalEnv()) {
  const refusal = serverMismatch(process.env.DATABASE_URL, local);
  if (refusal) throw new Error(refusal);
}

/** The worktree's `.env.local`, parsed, or null without one. */
function readLocalEnv() {
  try {
    return parse(readFileSync(new URL("../../.env.local", import.meta.url), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

/** Why the About write must not go to `url`: `.env.local` points the server elsewhere. Pure, for the tests. */
export function serverMismatch(url, local) {
  const served = local?.DATABASE_URL;
  if (!served || served === url) return null;
  return "about-clear: .env.local sets a DATABASE_URL other than .env's, so the dev server reads another database than the About write would; point .env's DATABASE_URL at that database instead (nothing written).";
}

let announced = false;
/** Prints the Neon branch the shared connection writes on, once, before its first write. A caller passing its own
 *  connection already named where it writes. */
async function announce(sql) {
  if (sql !== shared || announced) return;
  announced = true;
  const [row] = await sql`select current_setting('neon.branch_id', true) as branch`;
  console.log(`about-clear: the About row is written on ${row?.branch || "an unnamed database"} (.env DATABASE_URL)`);
}

const VERSION_FILE = new URL("../../src/lib/copy/about.version.json", import.meta.url);

/**
 * The cookie the proxy reads as "this browser has shown the sheet", for a server with no
 * entry's switch on. With one on, the proxy's value also names the switched entries, so this
 * one does not match and the proxy falls back to the row `markEveryEntrySeen` wrote.
 */
export function sheetCookie(userId, origin, version = JSON.parse(readFileSync(VERSION_FILE, "utf8")).version) {
  const { hostname, protocol } = new URL(origin);
  return {
    name: "about_sheet",
    value: `${userId}.${version}`,
    domain: hostname,
    path: "/",
    httpOnly: true,
    secure: protocol === "https:",
    sameSite: "Lax",
  };
}

const CATALOG_FILE = new URL("../../src/lib/copy/about-entries.ts", import.meta.url);

/**
 * Every entry id in the About catalog, read from its source. A probe is plain JS and cannot
 * import the TypeScript catalog; `about-clear.test.mts` asserts this equals `aboutEntries`,
 * so an entry added in a form this misses fails a test rather than a probe run.
 */
export function catalogIds(source = readFileSync(CATALOG_FILE, "utf8")) {
  return [...source.matchAll(/^ {4}id: '([^']+)',$/gm)].map((m) => m[1]);
}

/**
 * The seen id of every entry's variant, `<id>@<SWITCH>`: the form `variantId` in
 * `src/lib/about/visible.ts` writes and `isSeen` checks for an entry drawn in its variant, mirrored
 * here because a probe cannot import TypeScript. `about-clear.test.mts` asserts it against the catalog.
 */
export function variantIds(source = readFileSync(CATALOG_FILE, "utf8")) {
  const starts = [...source.matchAll(/^ {4}id: '([^']+)',$/gm)];
  return starts.flatMap((m, i) => {
    const body = source.slice(m.index, starts[i + 1]?.index ?? source.length);
    const v = body.match(/^ {4}variant: \{\n(?:.*\n)*? {6}switch: '([A-Z_]+)',$/m);
    return v ? [`${m[1]}@${v[1]}`] : [];
  });
}

/**
 * Marks the account as having seen everything: the version floor raised to the current version
 * (never lowered), and every catalog id added to the seen ids as a union. Both halves, because a
 * probe may call this before writing any row of its own, and a row holding the ids at version 0
 * would still leave every entry WITHOUT a switch unseen.
 */
export async function markEveryEntrySeen(
  userId,
  sql = aboutSql(),
  version = JSON.parse(readFileSync(VERSION_FILE, "utf8")).version,
) {
  assertServerReadsEnv();
  // Every entry's variant id too: an entry drawn in its variant is seen by that id alone (`isSeen`).
  const ids = [...catalogIds(), ...variantIds()];
  await announce(sql);
  await sql`insert into user_prefs (user_id, about_version_seen, about_seen_ids) values (${userId}, ${version}, ${ids})
    on conflict (user_id) do update set
      about_version_seen = greatest(user_prefs.about_version_seen, ${version}),
      about_seen_ids = array(select distinct unnest(user_prefs.about_seen_ids || ${ids}::text[]) order by 1)`;
}

/**
 * Marks every entry seen, marks this browser as having shown the sheet, and dismisses a card
 * already drawn.
 *
 * A probe usually calls this after its first `goto`, and by then the About gate may already have
 * redirected that load to `/about?tab=reference&next=<path>`. Marking the entries seen does not
 * bring the page back, so the probe would wait on its own route's content and time out. When the
 * page sits on the gate's redirect, this follows its `next` back to the route the probe asked for.
 */
export async function clearAboutSheet(page, userId) {
  assertServerReadsEnv();
  await markEveryEntrySeen(userId);
  await page.context().addCookies([sheetCookie(userId, page.url())]);
  const back = gateReturn(page.url());
  if (back) {
    await page.goto(back, { waitUntil: "domcontentloaded", timeout: 120_000 });
    return;
  }
  const card = page.getByRole("region", { name: /^(New in About|About The\s99)$/ });
  if (await card.isVisible().catch(() => false)) {
    await card.getByRole("button", { name: "Later" }).click();
  }
}

/**
 * Where the About gate's redirect was taking the reader: the same-origin `next` path of a
 * `/about` URL, or null for any other URL. A reader who opened `/about` by hand carries no `next`.
 */
export function gateReturn(url) {
  const at = new URL(url);
  if (at.pathname !== "/about") return null;
  const next = at.searchParams.get("next");
  if (!next || !next.startsWith("/")) return null;
  // Judged on the resolved URL, not the prefix: `/\host` and a tab between two slashes both
  // pass a prefix check and resolve to another host.
  try {
    const back = new URL(next, at.origin);
    return back.origin === at.origin ? back.href : null;
  } catch {
    return null;
  }
}

/**
 * The account's About row as it stands, for `restoreAboutSeen` to put back: both columns, or
 * `existed: false` when there is no row. Taken BEFORE the probe's first write to it.
 */
export async function captureAboutSeen(userId, sql = aboutSql()) {
  assertServerReadsEnv();
  const [row] = await sql`select about_version_seen, about_seen_ids from user_prefs where user_id = ${userId}`;
  return row
    ? { userId, existed: true, version: row.about_version_seen, ids: row.about_seen_ids }
    : { userId, existed: false, version: null, ids: null };
}

/**
 * Puts back exactly what `captureAboutSeen` read: both columns as they were, or no row at all
 * when there was none.
 */
export async function restoreAboutSeen(capture, sql = aboutSql()) {
  assertServerReadsEnv();
  await announce(sql);
  if (!capture.existed) {
    await sql`delete from user_prefs where user_id = ${capture.userId}`;
    return;
  }
  // An upsert, not an update: a probe may delete the row part-way through a run, and the row it
  // captured has to come back either way.
  await sql`insert into user_prefs (user_id, about_version_seen, about_seen_ids)
      values (${capture.userId}, ${capture.version}, ${capture.ids})
    on conflict (user_id) do update set about_version_seen = ${capture.version}, about_seen_ids = ${capture.ids}`;
}
