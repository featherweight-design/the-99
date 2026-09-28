import { fetchDir, readFetchedJson } from "../catalog/fetch-dir";

export const MANAPOOL_SINGLES_URL = "https://manapool.com/api/v1/prices/singles";

export const MANAPOOL_HEADERS = {
  accept: "application/json",
  // Weekly ~51MB pulls should be attributable. An identified caller is one
  // ManaPool can contact about a change in cadence or shape; an anonymous
  // one is only ever something to rate-limit.
  "user-agent": "the-99 (+https://the-99.dev)",
};

// The response was ~50.9MB on 2026-08-29 and is served uncompressed-to-us by
// undici's default. Five minutes is generous for a single large body on a
// runner; the enclosing workflow, not this timeout, is the real backstop.
const TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Downloads ManaPool's full singles price feed.
 *
 * Returns the raw payload; `parseManapoolPayload` owns every shape assumption,
 * so a field rename upstream is one file's problem rather than two.
 *
 * Deliberately buffers the whole body rather than streaming, unlike
 * `seed-printings.ts`. That feed is ~2 GB and has no choice; this one was
 * ~51 MB on 2026-08-29, and `res.json()` keeps the parser a pure function of a
 * plain object — which is what makes the fixture-driven tests in `parse.test.ts`
 * possible at all. Both callers — `price-refresh.yml` and the canary step in
 * `scryfall-contract.yml` — set `NODE_OPTIONS=--max-old-space-size=4096` to cover
 * the parsed-object expansion. If the feed passes ~250 MB, revisit:
 * stream it and give the parser a row iterator instead.
 */
export async function fetchManapoolSingles(): Promise<unknown> {
  // The feed the `fetch` job saved, so both legs price from the same bytes.
  const dir = fetchDir();
  if (dir) return readFetchedJson(dir, "manapool-singles.json");
  const res = await fetch(MANAPOOL_SINGLES_URL, {
    headers: MANAPOOL_HEADERS,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`ManaPool responded ${res.status} ${res.statusText}`);
  }
  return res.json();
}
