// Clears the one-time About sheet (About R6) for a probe, so a card drawn over the page
// cannot corrupt what the probe measures (R6 audit E5).
//
// ADDITIVE, and deliberately so. Every probe already raises `user_prefs.about_version_seen`
// for the account it signs in as, some with a capture-and-restore of their own, and that
// write is what keeps the proxy from ever deciding to draw the sheet again. What it cannot
// reach is the browser: the sign-in load happens BEFORE the write, and with the switch on
// that load can already have drawn a sheet on the current document and left no cookie
// the probe knows about. This sets the sheet's cookie for the current version and, if a
// card is on screen, presses Later, which writes nothing.
//
// It never touches the database, so no probe's cleanup has anything new to undo.

import { readFileSync } from "node:fs";

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

/** Marks this browser as having shown the sheet, and dismisses one already drawn. */
export async function clearAboutSheet(page, userId) {
  await page.context().addCookies([sheetCookie(userId, page.url())]);
  const card = page.getByRole("region", { name: /^(New in About|About The\s99)$/ });
  if (await card.isVisible().catch(() => false)) {
    await card.getByRole("button", { name: "Later" }).click();
  }
}
