import { commanderSlug } from "./slug";
import { edhrecPageMissing, type PageProbe } from "./missing-page";
import { parseEdhrecPayload } from "./parse";
import type { EdhrecFetchResult } from "./client";
import { synergyStateFrom } from "../recs/synergy-state";

/**
 * Partner pairs: their own EDHREC page, their own composition, their own support list.
 *
 * `commander_support` is keyed per oracle id and neither commander's page describes the pair,
 * so an earlier draft gave pairs the colour-count fallback — the weakest reading in the whole
 * skeleton, handed to the one deck this suite was started for. EDHREC has real pair pages and
 * discovery is cheap, so they get real data.
 */

/** The pair, in the order the tables store it: lexicographically smaller oracle id first. */
export type CanonicalPair = { commanderOracleId: string; partnerOracleId: string };

/**
 * THE ONE NORMALISATION, used by every write AND every read.
 *
 * `decks` stores a pair in a meaningful order — `commander_oracle_id` is the primary — while
 * the tables store it canonically, so a lookup that passes the deck's order straight through
 * silently misses every row whose primary carries the larger id. The CHECK constraint makes a
 * bad WRITE loud; only calling this on the read side makes a bad READ loud too.
 */
export function canonicalPair(a: string, b: string): CanonicalPair {
  return a < b
    ? { commanderOracleId: a, partnerOracleId: b }
    : { commanderOracleId: b, partnerOracleId: a };
}

/**
 * The slugs to try, in order.
 *
 * EDHREC slugs a pair page by its two commanders in ALPHABETICAL NAME order, which is not the
 * same as canonical oracle-id order — so the first candidate is a guess and the second is the
 * other arrangement. Getting it wrong is cheap: the wrong order answers with a 67-byte
 * redirect stub naming the canonical page (measured 2026-09-20), not a 404.
 */
export function pairSlugCandidates(nameA: string, nameB: string): [string, string] {
  const [x, y] = [commanderSlug(nameA), commanderSlug(nameB)].sort();
  return [`${x}-${y}`, `${y}-${x}`];
}

const pairUrl = (slug: string) => `https://json.edhrec.com/pages/commanders/${slug}.json`;

/** What a redirect stub looks like. A 200 with a JSON body, never a 3xx. */
type MaybeRedirect = { redirect?: unknown };
const redirectTarget = (payload: unknown): string | null => {
  const r = (payload as MaybeRedirect | null)?.redirect;
  return typeof r === "string" && r.length > 0 ? r : null;
};
const slugFromPath = (path: string): string | null =>
  /\/commanders\/([^/]+)\/?$/.exec(path)?.[1] ?? null;

export type PairFetcher = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/**
 * Fetches a pair page, following the redirect stub.
 *
 * THE STUB IS THE TRAP. It arrives as a 200 carrying `{"redirect": "/commanders/…"}`, so a
 * caller that treats any 200 as a payload caches 67 bytes as though it were a commander page
 * — `parseEdhrecPayload` finds no `cardlists` and reports a commander EDHREC does not index,
 * which is indistinguishable from the real absent case. Following it costs one request and is
 * the only way the wrong-order guess is free.
 *
 * Shared by the index pass and the demand path, because the trap is the same on both and a
 * second copy of the follow logic is a second place to forget it.
 */
/**
 * A pair fetch's result, plus the raw payload.
 *
 * The raw body is carried because the DEMAND path caches it — `edhrec_pair_cache` stores what
 * upstream sent, not what we parsed, so a later parse widening reads old rows correctly
 * rather than being stuck with whatever fields the parser understood on the day. That is the
 * same reason `edhrec_cache` stores a payload rather than a projection.
 */
export type PairFetchResult = EdhrecFetchResult & { rawPayload: unknown };

export async function fetchPair(
  nameA: string,
  nameB: string,
  fetcher: PairFetcher,
  probe?: PageProbe,
): Promise<PairFetchResult> {
  const [first, second] = pairSlugCandidates(nameA, nameB);
  const tried = new Set<string>();

  for (let slug: string | null = first; slug !== null; ) {
    // A redirect loop is upstream's problem, not an infinite one — and it is degraded rather
    // than absent, for the same reason an unparseable target is.
    if (tried.has(slug)) return { data: null, unreachable: true, rawPayload: null };
    tried.add(slug);
    let res;
    try {
      res = await fetcher(pairUrl(slug));
    } catch {
      // Network error or timeout: unreachable, not "this pair does not exist". The
      // distinction is the same one `synergyStateFrom` draws for single commanders.
      return { data: null, unreachable: true, rawPayload: null };
    }
    // 429 means the service is throttling us, which says nothing about the pair.
    if (res.status === 429) return { data: null, unreachable: true, rawPayload: null };
    // 403 is a throttle OR a slug with no page, and the JSON API answers both the same way;
    // the HTML page's 404 is what tells them apart (#712). A missing page takes the ordinary
    // 4xx path below, so the other arrangement is still tried — before this, a first guess
    // with no page stopped the pair as unreachable and the second was never asked.
    if (res.status === 403 && !(await edhrecPageMissing(slug, probe))) {
      return { data: null, unreachable: true, rawPayload: null };
    }
    if (res.status >= 400 && res.status < 500) {
      // A genuine 4xx on the FIRST guess just means the other arrangement is the real one.
      slug = tried.has(second) ? null : second;
      continue;
    }
    if (!res.ok) return { data: null, unreachable: true, rawPayload: null };

    // Guarded for the same reason the socket error above is: a truncated or malformed body
    // is upstream misbehaving, and an exception escaping here would take out the whole index
    // pass rather than degrading one pair. Both single-commander fetches in `client.ts` have
    // their `res.json()` inside the try that returns `unreachable`; this one did not.
    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      return { data: null, unreachable: true, rawPayload: null };
    }
    const target = redirectTarget(payload);
    if (target !== null) {
      const next = slugFromPath(target);
      // A redirect we cannot parse — `/commanders/<slug>/<theme>`, say — is upstream behaving
      // in a way we do not understand, NOT a pair that does not exist. Reporting `absent`
      // would make the index write an absent header over a pair it already had data for and
      // cascade-delete its support list, which is exactly what the socket-error path above
      // goes out of its way to avoid.
      if (next === null) return { data: null, unreachable: true, rawPayload: null };
      slug = next;
      continue;
    }
    return { data: parseEdhrecPayload(payload), unreachable: false, rawPayload: payload };
  }
  return { data: null, unreachable: false, rawPayload: null };
}

export type PairHeaderRow = {
  commanderOracleId: string;
  partnerOracleId: string;
  synergyState: "ok" | "absent" | "degraded";
  edhrecTotal: number | null;
  deckCount: number | null;
  rank: number | null;
  bracketCounts: Record<string, number>;
  avgLand: number | null; avgBasic: number | null; avgNonbasic: number | null;
  avgCreature: number | null; avgInstant: number | null; avgSorcery: number | null;
  avgArtifact: number | null; avgEnchantment: number | null; avgPlaneswalker: number | null;
  avgBattle: number | null; avgCurve: Record<string, number> | null;
};

export type PairCardRow = {
  commanderOracleId: string;
  partnerOracleId: string;
  oracleId: string;
  inclusion: number | null;
  synergy: number | null;
  /** EDHREC's own ordering, which is what `suggestions-read` ranks by. */
  position: number;
};

/**
 * One pair's fetch result -> the rows the tables store.
 *
 * Mirrors `toSupportRows` deliberately, including its two hard-won rules: an unresolvable name
 * is DROPPED AND COUNTED so it reduces measured coverage rather than shrinking a denominator,
 * and a card already emitted is skipped, because the composite primary key would otherwise
 * fail the whole insert for that pair.
 */
export function toPairRows(args: {
  pair: CanonicalPair;
  result: EdhrecFetchResult;
  nameIndex: Map<string, string>;
}): { header: PairHeaderRow; cards: PairCardRow[]; unresolved: number } {
  const { pair, result } = args;
  const d = result.data;
  // THE SHARED RULE, not an inline copy of it. `synergyStateFrom` additionally requires
  // NON-EMPTY topCards, because `parseEdhrecPayload` degrades to an empty list on an
  // unexpected payload shape — a 200 carrying no `cardlists` (a stub, a partial, an error
  // page rendered as JSON) parses to a perfectly non-null `EdhrecData`. An inline
  // `d === null ? absent : ok` writes that as `ok` with `edhrec_total: 0`, and `writePair`
  // then deletes every stored card row for the pair. This file's own header names that exact
  // payload as the trap it avoids; deriving the state twice is how it got back in.
  const state = synergyStateFrom(result);
  const c = state === "ok" ? (d!.composition ?? null) : null;

  const header: PairHeaderRow = {
    ...pair,
    synergyState: state,
    edhrecTotal: state === "ok" ? d!.topCards.length : null,
    deckCount: state === "ok" ? d!.deckCount : null,
    rank: state === "ok" ? d!.rank : null,
    bracketCounts: state === "ok" ? d!.bracketCounts : {},
    avgLand: c?.land ?? null,
    avgBasic: c?.basic ?? null,
    avgNonbasic: c?.nonbasic ?? null,
    avgCreature: c?.creature ?? null,
    avgInstant: c?.instant ?? null,
    avgSorcery: c?.sorcery ?? null,
    avgArtifact: c?.artifact ?? null,
    avgEnchantment: c?.enchantment ?? null,
    avgPlaneswalker: c?.planeswalker ?? null,
    avgBattle: c?.battle ?? null,
    avgCurve: state === "ok" ? (d!.manaCurve ?? null) : null,
  };

  if (state !== "ok") return { header, cards: [], unresolved: 0 };

  const cards: PairCardRow[] = [];
  const emitted = new Set<string>();
  let unresolved = 0;
  let position = 0;
  for (const name of d!.topCards) {
    const key = name.toLowerCase();
    const oracleId = args.nameIndex.get(key);
    if (oracleId === undefined) { unresolved++; continue; }
    if (oracleId === pair.commanderOracleId || oracleId === pair.partnerOracleId) continue;
    if (emitted.has(oracleId)) continue;
    emitted.add(oracleId);
    cards.push({
      ...pair,
      oracleId,
      inclusion: d!.inclusionByName[key] ?? null,
      synergy: d!.synergyByName[key] ?? null,
      // Position is assigned over the cards actually EMITTED, so it stays dense — a reader
      // ranking by it never sees a gap where an unresolvable name used to be.
      position: position++,
    });
  }
  return { header, cards, unresolved };
}
