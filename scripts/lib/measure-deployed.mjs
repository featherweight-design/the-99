// measure:load against a DEPLOYED app (Hugh, 2026-10-12: local `next start` skews the figures).
// The pure halves of `MEASURE_DEPLOYED=1`, kept apart from the browser harness so each rule can be
// unit tested: which host it may sign in to, how a sign-in token is minted, and how the `[perf]`
// lines the deployed function wrote are read back out of Vercel's runtime logs.
//
// The HARNESS writes nothing to any database in deployed mode; the pages it loads do what any
// reader's visit does (Home persists its commander scores on a miss, every write moves the
// reader's data stamp), which is why it is staging only and signs in as the measurement account.
// It never marks About entries seen: one document
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
 * The request id Vercel logs a request under: the last segment of its `x-vercel-id` response
 * header (`sfo1::pdx1::pxmsz-1791830682642-bc0f83b831af` is logged as `pxmsz-…-bc0f83b831af`,
 * checked against staging on 2026-10-12). Null when the header is absent.
 */
export function vercelRequestId(header) {
  if (typeof header !== "string" || !header) return null;
  return header.split("::").pop() || null;
}

/**
 * Every `[perf]` line in `vercel logs --json` output, keyed by the id of the request that logged
 * it. A line can sit in the entry's `message` or in its `logs` array, as a string or as
 * `{ message }`, depending on how the runtime batched it; all four shapes are read, and anything
 * else is skipped rather than thrown on, because the stream holds every request the deployment
 * served.
 */
export function perfLinesFromVercel(jsonl) {
  const byId = new Map();
  for (const raw of jsonl.split("\n")) {
    if (!raw.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(raw);
    } catch {
      continue;
    }
    if (typeof entry.id !== "string") continue;
    const texts = [entry.message, ...(Array.isArray(entry.logs) ? entry.logs : [])]
      .map((l) => (typeof l === "string" ? l : l?.message))
      .filter((t) => typeof t === "string");
    for (const text of texts) {
      for (const line of text.split("\n")) {
        if (!line.startsWith("[perf] ")) continue;
        const lines = byId.get(entry.id) ?? [];
        lines.push(line.slice(7));
        byId.set(entry.id, lines);
      }
    }
  }
  return byId;
}

/**
 * The `[perf]` line for `pattern` that the request `id` logged, or null. Matched by REQUEST, never
 * by time: the harness's clock and Vercel's are different clocks, and a time window either drops a
 * request stamped early or takes a neighbour's (the sign-in load, a prefetch, the step before).
 */
export function spansForRequest(byId, id, pattern) {
  if (!id) return null;
  return (byId.get(id) ?? []).find((l) => l.startsWith(`${pattern} `)) ?? null;
}

/** The read-only figure `pg_stat_statements` gives between two snapshots: no reset, no write. */
export function statDelta(before, after) {
  return {
    ms: Math.round(Number(after.ms) - Number(before.ms)),
    calls: Number(after.calls) - Number(before.calls),
  };
}
