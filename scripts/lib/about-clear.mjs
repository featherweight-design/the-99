// Clears About's announcements for a probe, so nothing About draws can corrupt what the probe measures (R6 audit E5):
// once the one-time sheet, now Home's banner lines (About visual PR 6b).
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
import { requireEnv } from "./env.mjs";

/**
 * The database every About write here goes to: `.env`'s `DATABASE_URL`, the one each probe's own branch guard checks.
 * A walk whose dev server should read a scratch branch points the worktree's `.env` at it, never `.env.local`, or the
 * server and this write disagree (2026-10-28: a walk wrote local-dev's About row while its server read a scratch
 * branch). The branch written is printed before the first write, so a mismatch shows. Opened once per run.
 */
let shared = null;
export function aboutSql() {
  shared ??= neon(requireEnv(["DATABASE_URL"]).DATABASE_URL);
  return shared;
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
  // Every entry's variant id too: an entry drawn in its variant is seen by that id alone (`isSeen`).
  const ids = [...catalogIds(), ...variantIds()];
  await announce(sql);
  await sql`insert into user_prefs (user_id, about_version_seen, about_seen_ids) values (${userId}, ${version}, ${ids})
    on conflict (user_id) do update set
      about_version_seen = greatest(user_prefs.about_version_seen, ${version}),
      about_seen_ids = array(select distinct unnest(user_prefs.about_seen_ids || ${ids}::text[]) order by 1)`;
}

/**
 * Marks every entry seen, so no About launch line sits on Home's banner over what a probe measures. The one-time sheet
 * and the gate's redirect it once followed back retired with About visual PR 6b; the name stays for its many callers.
 * `page` is unused now and kept so no caller changes. A reader holding every catalog id at the current floor is told
 * nothing by the pages' rule either (`pages-visible.test.ts`).
 */
export async function clearAboutSheet(page, userId) {
  await markEveryEntrySeen(userId);
}

/**
 * The account's About row as it stands, for `restoreAboutSeen` to put back: both columns, or
 * `existed: false` when there is no row. Taken BEFORE the probe's first write to it.
 */
export async function captureAboutSeen(userId, sql = aboutSql()) {
  const [row] = await sql`select about_version_seen, about_seen_ids, moments_spent from user_prefs where user_id = ${userId}`;
  return row
    ? { userId, existed: true, version: row.about_version_seen, ids: row.about_seen_ids, spent: row.moments_spent }
    : { userId, existed: false, version: null, ids: null, spent: null };
}

/**
 * Puts back exactly what `captureAboutSeen` read: the About columns and the moments already spent
 * (moments are always live, so a page a run opens can spend one) as they were, or no row at all
 * when there was none.
 */
export async function restoreAboutSeen(capture, sql = aboutSql()) {
  await announce(sql);
  if (!capture.existed) {
    await sql`delete from user_prefs where user_id = ${capture.userId}`;
    return;
  }
  // An upsert, not an update: a probe may delete the row part-way through a run, and the row it
  // captured has to come back either way.
  await sql`insert into user_prefs (user_id, about_version_seen, about_seen_ids, moments_spent)
      values (${capture.userId}, ${capture.version}, ${capture.ids}, ${capture.spent})
    on conflict (user_id) do update set about_version_seen = ${capture.version}, about_seen_ids = ${capture.ids}, moments_spent = ${capture.spent}`;
}
