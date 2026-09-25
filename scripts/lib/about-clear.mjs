// Clears the one-time About sheet (About R6) for a probe, so a card drawn over the page
// cannot corrupt what the probe measures (R6 audit E5).
//
// ADDITIVE, and deliberately so. Every probe already raises `user_prefs.about_version_seen`
// for the account it signs in as, some with a capture-and-restore of their own, and that
// write is what keeps the proxy from drawing the sheet on any later document load. On
// every sign-in path here today that write is enough by itself: the first load is signed
// out, so the proxy passes it, and `Clerk.setActive` refreshes through the router (an RSC
// request), which the proxy never decides on. So this is a guard, not a fix, and it is
// the audit's E5 rule rather than a response to a card anyone has seen: a probe that loads
// a document signed in BEFORE its write would meet the sheet, and nothing in the probe
// would say so. It sets the sheet's cookie for the current version, which the proxy reads
// as "shown", and presses Later if a card is on screen, which writes nothing.
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
