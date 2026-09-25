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
// read the server's switches. The cookie still goes on as the guard it was: a probe that
// loads a document signed in before its write would otherwise measure a page with a card
// over it and say nothing.
//
// The ids it adds are NOT put back afterwards. They mark the fixture account as having seen
// every entry, which is what its `about_version_seen` write already says about the rest.
// `probe:about`, which needs the account behind, holds and restores both columns itself.
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { requireEnv } from "./env.mjs";

const VERSION_FILE = new URL("../../src/lib/copy/about.version.json", import.meta.url);

/** The cookie the proxy reads as "this browser has shown the sheet for this version". */
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

const CATALOG_FILE = new URL("../../src/lib/copy/about.ts", import.meta.url);

/**
 * Every entry id in the About catalog, read from its source. A probe is plain JS and cannot
 * import the TypeScript catalog; `about-clear.test.mts` asserts this equals `aboutEntries`,
 * so an entry added in a form this misses fails a test rather than a probe run.
 */
export function catalogIds(source = readFileSync(CATALOG_FILE, "utf8")) {
  return [...source.matchAll(/^ {4}id: '([^']+)',$/gm)].map((m) => m[1]);
}

/** Adds every catalog id to the account's seen ids, as a union: nothing it held is dropped. */
export async function markEveryEntrySeen(userId, sql = neon(requireEnv(["DATABASE_URL"]).DATABASE_URL)) {
  const ids = catalogIds();
  await sql`insert into user_prefs (user_id, about_seen_ids) values (${userId}, ${ids})
    on conflict (user_id) do update set about_seen_ids =
      array(select distinct unnest(user_prefs.about_seen_ids || ${ids}::text[]) order by 1)`;
}

/**
 * Marks every entry seen, marks this browser as having shown the sheet, and dismisses a card
 * already drawn.
 */
export async function clearAboutSheet(page, userId) {
  await markEveryEntrySeen(userId);
  await page.context().addCookies([sheetCookie(userId, page.url())]);
  const card = page.getByRole("region", { name: /^(New in About|About The\s99)$/ });
  if (await card.isVisible().catch(() => false)) {
    await card.getByRole("button", { name: "Later" }).click();
  }
}
