// measure:load against a DEPLOYED app (Hugh, 2026-10-12: local `next start` skews the figures).
// The pure halves of `MEASURE_DEPLOYED=1`, kept apart from the browser harness so each rule can be
// unit tested: which host it may sign in to, how a sign-in token is minted, and how the `[perf]`
// lines the deployed function wrote are read back out of Vercel's runtime logs.
//
// Deployed mode WRITES NOTHING to any database. It never marks About entries seen: one document
// load after sign-in lets the proxy decide the sheet and set its own cookie, which every measured
// context then carries (the proxy's value names the switched entries, so a hand-built one never
// matches on staging). It never resets
// `pg_stat_statements` (it reads deltas between snapshots instead), and reads no server log file.

/** The one host deployed mode may sign in to. Production is ruled out (option C, the-99-d9). */
export const DEPLOYED_HOSTS = new Set(["staging.the-99.dev"]);

/** Refuses any base that is not a staging host, before a session is created anywhere. */
export function assertDeployedBase(base) {
  const { protocol, hostname } = new URL(base);
  if (protocol !== "https:" || !DEPLOYED_HOSTS.has(hostname)) {
    throw new Error(
      `MEASURE_DEPLOYED signs in only to ${[...DEPLOYED_HOSTS].join(", ")} over https, not ${base}.`,
    );
  }
}

/**
 * Mints a one-use sign-in token for `userId` from Clerk's Backend API. The browser redeems it on
 * the app's own origin (`signIn.create({ strategy: "ticket" })`), which needs no email code and no
 * testing token: testing tokens exist only for a development instance, and a deployed app runs the
 * production one. `fetchImpl` is injected for tests.
 */
export async function mintSignInToken(secretKey, userId, fetchImpl = fetch) {
  const response = await fetchImpl("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 600 }),
  });
  if (!response.ok) throw new Error(`Clerk refused the sign-in token: ${response.status}.`);
  const { token } = await response.json();
  if (!token) throw new Error("Clerk answered without a sign-in token.");
  return token;
}

/** The Clerk user id of the one account with `email`, from the Backend API. Read-only. */
export async function lookupUserId(secretKey, email, fetchImpl = fetch) {
  const response = await fetchImpl(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  if (!response.ok) throw new Error(`Clerk refused the user lookup: ${response.status}.`);
  const users = await response.json();
  if (!Array.isArray(users) || users.length !== 1) {
    throw new Error(`Expected one Clerk user for the measurement email, found ${Array.isArray(users) ? users.length : "none"}.`);
  }
  return users[0].id;
}

/**
 * Every `[perf]` line in `vercel logs --json` output, with the request's timestamp. A line can sit
 * in the entry's `message` or in its `logs` array, as a string or as `{ message }`, depending on how
 * the runtime batched it; all four shapes are read, and anything else is skipped rather than thrown
 * on, because the log stream is shared with every other request the deployment served.
 */
export function perfLinesFromVercel(jsonl) {
  const lines = [];
  for (const raw of jsonl.split("\n")) {
    if (!raw.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(raw);
    } catch {
      continue;
    }
    const texts = [entry.message, ...(Array.isArray(entry.logs) ? entry.logs : [])]
      .map((l) => (typeof l === "string" ? l : l?.message))
      .filter((t) => typeof t === "string");
    for (const text of texts) {
      for (const line of text.split("\n")) {
        if (line.startsWith("[perf] ")) lines.push({ at: Number(entry.timestamp), line: line.slice(7) });
      }
    }
  }
  return lines.sort((a, b) => a.at - b.at);
}

/**
 * The first `[perf]` line for `pattern` logged inside [from, to] (epoch milliseconds), or null. The
 * same rule as the local server log's: filtered by route PATTERN, because a page's prefetches and a
 * card press can log in the same window, and the first match is the measured request's. Vercel
 * stamps a request on ITS clock, so the window opens up to a second early for skew, but never
 * before `floor`, the end of the previous step: without it, a request the previous step made in
 * its last second would be read as this step's (a cached press, then the next cold one).
 */
export function spansInWindow(lines, from, to, pattern, floor = -Infinity) {
  const start = Math.max(from - 1000, floor);
  const hit = lines.find((l) => l.at > start && l.at <= to && l.line.startsWith(`${pattern} `));
  return hit ? hit.line : null;
}

/** Each deferred window's floor: the end of the window before it in time, or none for the first. */
export function windowFloors(windows) {
  const sorted = [...windows].sort((a, b) => a.from - b.from);
  return new Map(sorted.map((w, i) => [w, i === 0 ? -Infinity : sorted[i - 1].to]));
}

/** The read-only figure `pg_stat_statements` gives between two snapshots: no reset, no write. */
export function statDelta(before, after) {
  return {
    ms: Math.round(Number(after.ms) - Number(before.ms)),
    calls: Number(after.calls) - Number(before.calls),
  };
}
