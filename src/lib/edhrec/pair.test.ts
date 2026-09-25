import { describe, expect, it, vi } from "vitest";

import { canonicalPair, fetchPair, pairSlugCandidates, toPairRows } from "./pair";
import type { EdhrecData } from "./parse";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const CARD = "33333333-3333-4333-8333-333333333333";

const ok = (json: unknown) => ({ ok: true, status: 200, json: async () => json });

const data = (over: Partial<EdhrecData> = {}): EdhrecData => ({
  topCards: [], inclusionByName: {}, synergyByName: {}, tags: [],
  bracketCounts: {}, budgetCounts: {}, similarNames: [],
  deckCount: null, rank: null, saltScore: null, composition: null, manaCurve: null,
  ...over,
});

describe("canonicalPair", () => {
  it("puts the lexicographically smaller oracle id first, either way round", () => {
    expect(canonicalPair(A, B)).toEqual({ commanderOracleId: A, partnerOracleId: B });
    expect(canonicalPair(B, A)).toEqual({ commanderOracleId: A, partnerOracleId: B });
  });

  // `decks` stores the pair in a MEANINGFUL order — the primary commander is first — so a
  // read that passes that order straight to the tables misses every row whose primary holds
  // the larger id. The CHECK makes a bad write loud; this makes a bad read impossible.
  it("is what a deck's own order must be passed through before any lookup", () => {
    const deckOrder = { commander: B, partner: A }; // primary carries the LARGER id
    expect(canonicalPair(deckOrder.commander, deckOrder.partner).commanderOracleId).toBe(A);
  });
});

describe("pairSlugCandidates", () => {
  it("offers the alphabetical arrangement first and the other second", () => {
    expect(pairSlugCandidates("Kratos, Stoic Father", "Atreus, Impulsive Son")).toEqual([
      "atreus-impulsive-son-kratos-stoic-father",
      "kratos-stoic-father-atreus-impulsive-son",
    ]);
  });

  it("gives the same pair of candidates whichever order it is asked in", () => {
    const one = pairSlugCandidates("Kratos, Stoic Father", "Atreus, Impulsive Son");
    const two = pairSlugCandidates("Atreus, Impulsive Son", "Kratos, Stoic Father");
    expect(one).toEqual(two);
  });
});

describe("fetchPair", () => {
  // THE TRAP, measured live 2026-09-20: the wrong-order slug answers 200 with a 67-byte
  // `{"redirect": "/commanders/…"}` body. A caller treating any 200 as a payload caches that
  // as a commander page — and `parseEdhrecPayload` then reports a commander EDHREC does not
  // index, indistinguishable from a real absence.
  it("follows a redirect stub rather than parsing it as a payload", async () => {
    const fetcher = vi.fn(async (url: string) =>
      url.includes("atreus-impulsive-son-kratos")
        ? ok({ redirect: "/commanders/kratos-stoic-father-atreus-impulsive-son" })
        : ok({ container: { json_dict: { cardlists: [{ cardviews: [{ name: "Sol Ring" }] }] } } }),
    );
    const res = await fetchPair("Kratos, Stoic Father", "Atreus, Impulsive Son", fetcher);
    expect(res.unreachable).toBe(false);
    expect(res.data?.topCards).toEqual(["Sol Ring"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not loop forever on a redirect that points at itself", async () => {
    const fetcher = vi.fn(async () => ok({ redirect: "/commanders/self" }));
    const res = await fetchPair("A", "B", fetcher);
    expect(res.data).toBeNull();
    expect(fetcher.mock.calls.length).toBeLessThan(6);
  });

  it("tries the other arrangement when the first 404s", async () => {
    const fetcher = vi.fn(async (url: string) =>
      url.includes("a-name-b-name")
        ? { ok: false, status: 404, json: async () => ({}) }
        : ok({ container: { json_dict: { cardlists: [] } } }),
    );
    const res = await fetchPair("A name", "B name", fetcher);
    expect(res.unreachable).toBe(false);
    expect(res.data).not.toBeNull();
  });

  // 429/403 mean the service is blocking us and say nothing about the pair — the same
  // distinction `fetchEdhrecUncached` draws, and getting it wrong would overwrite a good row
  // with an absent one.
  it("reports unreachable on a rate limit rather than absent", async () => {
    // The page probe says the page exists, so a 403 here can only be a throttle.
    const pageExists = async () => ({ status: 200 });
    for (const status of [429, 403]) {
      const res = await fetchPair("A", "B", async () => ({ ok: false, status, json: async () => ({}) }), pageExists);
      expect(res).toEqual({ data: null, unreachable: true, rawPayload: null });
    }
  });

  // #712: a slug with no page answers a JSON 403, the same status as a throttle. The HTML
  // page's 404 says which it is, and a missing first guess must still try the other order —
  // before the probe, the pair stopped as unreachable and the second arrangement was never
  // asked.
  it("tries the other arrangement when the first 403s on a page that does not exist", async () => {
    const fetcher = vi.fn(async (url: string) =>
      url.includes("a-name-b-name")
        ? { ok: false, status: 403, json: async () => ({}) }
        : ok({ container: { json_dict: { cardlists: [] } } }),
    );
    const probe = vi.fn(async (url: string) => ({ status: url.endsWith("/a-name-b-name") ? 404 : 200 }));
    const res = await fetchPair("A name", "B name", fetcher, probe);
    expect(res.unreachable).toBe(false);
    expect(res.data).not.toBeNull();
    expect(probe).toHaveBeenCalledWith("https://edhrec.com/commanders/a-name-b-name");
  });

  it("reports absent when neither arrangement has a page", async () => {
    const res = await fetchPair(
      "A name", "B name",
      async () => ({ ok: false, status: 403, json: async () => ({}) }),
      async () => ({ status: 404 }),
    );
    expect(res.unreachable).toBe(false);
    expect(res.data).toBeNull();
  });

  // An unparseable redirect target is upstream behaving in a way we do not understand, not a
  // pair that does not exist — and the difference decides whether the index preserves the
  // pair's stored support list or cascade-deletes it.
  it("reports unreachable when a redirect target cannot be parsed", async () => {
    const res = await fetchPair("A", "B", async () => ok({ redirect: "/themes/aggro" }));
    expect(res).toEqual({ data: null, unreachable: true, rawPayload: null });
  });

  it("reports unreachable on a redirect loop rather than absent", async () => {
    let n = 0;
    const res = await fetchPair("A", "B", async () => {
      n++;
      return ok({ redirect: "/commanders/a-b" });
    });
    expect(res).toEqual({ data: null, unreachable: true, rawPayload: null });
    expect(n).toBeLessThan(6);
  });

  it("reports unreachable when the fetch throws", async () => {
    const res = await fetchPair("A", "B", async () => { throw new Error("socket"); });
    expect(res).toEqual({ data: null, unreachable: true, rawPayload: null });
  });
});

describe("toPairRows", () => {
  const pair = canonicalPair(A, B);
  const nameIndex = new Map([["sol ring", CARD]]);

  it("carries the pair's own composition, deck count and rank", () => {
    const { header } = toPairRows({
      pair,
      nameIndex,
      result: {
        unreachable: false,
        data: data({
          topCards: ["Sol Ring"],
          deckCount: 13332,
          rank: 159,
          bracketCounts: { "3": 1091 },
          composition: {
            land: 37, basic: 17, nonbasic: 20, creature: 26, instant: 11,
            sorcery: 5, artifact: 13, enchantment: 6, planeswalker: 0, battle: 0,
          },
          manaCurve: { "1": 4, "9": 1 },
        }),
      },
    });
    expect(header.deckCount).toBe(13332);
    expect(header.rank).toBe(159);
    expect(header.avgLand).toBe(37);
    expect(header.avgCurve).toEqual({ "1": 4, "9": 1 });
  });

  // A pair's body is 100 minus TWO commanders. Measured on the live Kratos/Atreus page:
  // the eight real types sum to 98, where a single commander's page sums to 99.
  it("stores a composition whose real types sum to the pair body, 98", () => {
    const { header } = toPairRows({
      pair, nameIndex,
      result: { unreachable: false, data: data({
        // A real page, so the state is ok — an empty topCards list reads ABSENT now, which is
        // the point of sharing synergyStateFrom rather than deriving the state inline.
        topCards: ["Sol Ring"],
        composition: {
          land: 37, basic: 17, nonbasic: 20, creature: 26, instant: 11,
          sorcery: 5, artifact: 13, enchantment: 6, planeswalker: 0, battle: 0,
        },
      }) },
    });
    const types = (header.avgLand ?? 0) + (header.avgCreature ?? 0) + (header.avgInstant ?? 0) +
      (header.avgSorcery ?? 0) + (header.avgArtifact ?? 0) + (header.avgEnchantment ?? 0) +
      (header.avgPlaneswalker ?? 0) + (header.avgBattle ?? 0);
    expect(types).toBe(98);
    expect((header.avgBasic ?? 0) + (header.avgNonbasic ?? 0)).toBe(header.avgLand);
  });

  it("assigns dense positions over the cards it emits", () => {
    const nx = new Map([["a", "aaaaaaaa-0000-4000-8000-000000000001"], ["c", "aaaaaaaa-0000-4000-8000-000000000003"]]);
    const { cards, unresolved } = toPairRows({
      pair, nameIndex: nx,
      result: { unreachable: false, data: data({ topCards: ["A", "B", "C"] }) },
    });
    // "B" is unresolvable and counted; positions stay 0,1 with no gap where it was, so a
    // reader ranking by position never sees a hole.
    expect(unresolved).toBe(1);
    expect(cards.map((c) => c.position)).toEqual([0, 1]);
  });

  it("drops either commander from its own support list", () => {
    const nx = new Map([["self", A], ["partner", B], ["sol ring", CARD]]);
    const { cards } = toPairRows({
      pair, nameIndex: nx,
      result: { unreachable: false, data: data({ topCards: ["Self", "Partner", "Sol Ring"] }) },
    });
    expect(cards.map((c) => c.oracleId)).toEqual([CARD]);
  });

  it("de-duplicates a card the list names twice", () => {
    const { cards } = toPairRows({
      pair, nameIndex,
      result: { unreachable: false, data: data({ topCards: ["Sol Ring", "Sol Ring"] }) },
    });
    expect(cards).toHaveLength(1);
  });

  // The check constraint pairs these: edhrecTotal is non-null iff the state is ok.
  it("writes a degraded header with no total and no composition", () => {
    const { header, cards } = toPairRows({
      pair, nameIndex, result: { data: null, unreachable: true },
    });
    expect(header.synergyState).toBe("degraded");
    expect(header.edhrecTotal).toBeNull();
    expect(header.avgLand).toBeNull();
    expect(header.bracketCounts).toEqual({});
    expect(cards).toEqual([]);
  });

  // The payload this file's header names as the trap, arriving through the OTHER door: a 200
  // that parses fine and carries no cards. Derived inline it reads `ok` with a total of 0,
  // and the write then deletes every card row the pair already had.
  it("treats a 200 carrying no cards as absent, not as an empty ok", () => {
    const { header, cards } = toPairRows({
      pair, nameIndex,
      result: { unreachable: false, data: data({ topCards: [] }) },
    });
    expect(header.synergyState).toBe("absent");
    expect(header.edhrecTotal).toBeNull();
    expect(cards).toEqual([]);
  });

  it("writes an absent header when upstream does not index the pair", () => {
    const { header } = toPairRows({
      pair, nameIndex, result: { data: null, unreachable: false },
    });
    expect(header.synergyState).toBe("absent");
    expect(header.edhrecTotal).toBeNull();
  });
});

describe("fetchPair — a malformed body", () => {
  // Round 2 of #754. `res.json()` sat OUTSIDE the try that returns `unreachable`, so a
  // truncated or malformed body threw out of the function: the index pass's pair loop and
  // the demand path would both take the exception rather than degrading one pair. Both
  // single-commander fetches in `client.ts` have theirs inside the try; this one did not.
  it("degrades rather than throwing", async () => {
    const result = await fetchPair("Atraxa", "Zzz", async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    }) as unknown as Response);
    expect(result).toEqual({ data: null, unreachable: true, rawPayload: null });
  });

  // Degraded, never absent — the distinction the whole file turns on. An absent header
  // overwrites a pair we already had and cascade-deletes its support list.
  it("is degraded, not absent", async () => {
    const result = await fetchPair("Atraxa", "Zzz", async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("socket hang up");
      },
    }) as unknown as Response);
    expect(result.unreachable).toBe(true);
  });
});
