// Waiting out the server's switch snapshot memo after a probe writes `flag_overrides` straight to the database.
//
// The memo (`src/lib/flags/snapshot.ts`) is held per instance for `SNAPSHOT_TTL_MS` (30s) and, past that, served
// STALE while one read refreshes it behind the response. So sleeping out the window is no longer enough: the first
// request after it still sees the old rows. The proxy and render hold separate memos, so this sleeps the window and makes
// two requests: one with the page's cookies (a signed-in proxy pass, whose memo feeds every signed-in page's switches)
// and one with none (the signed-out landing, render's own read). Each is served stale and starts its refresh; then it
// gives the refreshes time to land. `page` is a Playwright page; signed in or not, both memos are primed.
export const SWITCH_MEMO_MS = 31_000;

export async function waitOutSwitchMemo(page, base) {
  await page.waitForTimeout(SWITCH_MEMO_MS);
  await page.request.get(`${base}/`, { maxRedirects: 0 }).catch(() => {});
  // No `accept: text/html`: Clerk's dev instance answers a cookieless document request with a 307 to its handshake.
  await fetch(`${base}/`, { redirect: "manual" }).then((r) => r.text()).catch(() => {});
  await page.waitForTimeout(2_000);
}
