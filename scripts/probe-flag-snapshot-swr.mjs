// probe:flag-snapshot-swr: what a signed-out GET / waits on when the switch snapshot is past its window.
//
// The switch snapshot (`src/lib/flags/snapshot.ts`) is held per instance for SNAPSHOT_TTL_MS (30s). Before the
// stale-while-revalidate memo, the first request past the window waited on a fresh Neon read; with it, that request is
// served the held snapshot and the read runs behind the response. This probe times GET / (signed out, so render's
// `resolveFlags(null)` in generateMetadata and the landing is the only snapshot reader) in pairs:
//   warm  — inside the window, no read
//   stale — the first request after the window ends
// and fails when the stale request's median exceeds the warm one's by more than STALE_BUDGET_MS. On main the gap is
// the Neon read; with the fix it is noise.
//
// Usage: PROBE_BASE=http://localhost:3396 node scripts/probe-flag-snapshot-swr.mjs   (ROUNDS=5, STALE_BUDGET_MS=60)
// Read-only: it only loads the signed-out landing. Never point it at production.
const base = process.env.PROBE_BASE ?? "http://localhost:3000";
if (/the-99\.(app|com)|vercel\.app/.test(base) && !/staging/.test(base)) throw new Error("probe:flag-snapshot-swr never runs against production");
const rounds = Number(process.env.ROUNDS ?? 5);
const budget = Number(process.env.STALE_BUDGET_MS ?? 60);
const TTL_MS = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function timeGet() {
  const t0 = performance.now();
  // No `accept: text/html`: Clerk's dev instance answers a document request with no dev-browser cookie by a 307 to its
  // handshake. Without it the proxy passes the request through signed out and the landing renders.
  const res = await fetch(`${base}/`, { redirect: "manual" });
  await res.text();
  if (res.status !== 200) throw new Error(`GET / answered ${res.status}; the probe needs the signed-out page`);
  return performance.now() - t0;
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

// Two warm-ups: the first compiles (dev) and makes the instance's first read; the second is inside the window.
await timeGet();
await timeGet();
const warm = [];
const stale = [];
for (let i = 0; i < rounds; i++) {
  await sleep(TTL_MS + 1_500);
  stale.push(await timeGet()); // past the window: on main this waits on the read
  await sleep(300); // let a background refresh land
  warm.push(await timeGet()); // inside the fresh window
  console.log(`round ${i + 1}: stale ${Math.round(stale[i])}ms  warm ${Math.round(warm[i])}ms`);
}
const gap = median(stale) - median(warm);
console.log(`median stale ${Math.round(median(stale))}ms, warm ${Math.round(median(warm))}ms, gap ${Math.round(gap)}ms (budget ${budget}ms)`);
if (gap > budget) {
  console.log(" FAIL  the first request past the window waited on the snapshot read");
  process.exit(1);
}
console.log("all checks passed");
