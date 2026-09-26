import { describe, expect, it } from "vitest";
import { readySlice, READY_COUNT, READY_SHOWN } from "./ready-to-build";

const list = (...scores: number[]) => scores.map((rankScore, i) => ({ rankScore, oracleId: `c${i}` }));

// The rotation is a fact about the reader and the UTC day; every assertion about
// the SET and its figures has to hold whichever pair those two produce, so the
// helper pins them and the set-level tests read through it.
const AT = { userId: "user-a", now: new Date("2026-09-16T09:00:00Z") };
const slice = (items: ReturnType<typeof list>, at: Parameters<typeof readySlice>[1] = AT) => readySlice(items, at);

const on = (iso: string, userId = "user-a") => ({ userId, now: new Date(iso) });

describe("readySlice — the set and its figures", () => {
  it("counts the rest of the set, with its last commander as the floor", () => {
    // Two weeks deep (READY_COUNT), then whatever ranks below it.
    const s = slice(list(...Array.from({ length: READY_COUNT + 2 }, (_, i) => 100 - i)));
    expect(s.shown).toHaveLength(READY_SHOWN);
    expect(s.moreCount).toBe(READY_COUNT - READY_SHOWN);
    expect(s.floor).toBe(100 - (READY_COUNT - 1));
  });

  // The figures are facts about the SET, not about the two, which is what lets
  // the pair rotate without touching either of them.
  it("keeps moreCount and floor whatever the rotation draws", () => {
    const items = list(...Array.from({ length: READY_COUNT + 2 }, (_, i) => 100 - i));
    for (let d = 1; d <= 20; d += 1) {
      const s = slice(items, on(`2026-10-${String(d).padStart(2, "0")}T09:00:00Z`));
      expect(s.moreCount).toBe(READY_COUNT - READY_SHOWN);
      expect(s.floor).toBe(100 - (READY_COUNT - 1));
    }
  });

  it("never reaches past the set, however long the list", () => {
    const items = list(...Array.from({ length: 400 }, (_, i) => 100 - i));
    const s = slice(items);
    expect(s.moreCount).toBe(READY_COUNT - READY_SHOWN);
    expect(s.floor).toBe(100 - (READY_COUNT - 1));
    // The whole point of a rank cut: a rotation that could reach rank 40 would be
    // showing Home a commander the ranking does not stand behind.
    for (const card of s.shown) expect(card.rankScore).toBeGreaterThanOrEqual(s.floor as number);
  });

  it("truncates the set when fewer commanders are ranked than it holds", () => {
    const s = slice(list(80, 60, 50, 40));
    expect(s.shown).toHaveLength(2);
    expect(s.moreCount).toBe(2);
    expect(s.floor).toBe(40);
  });

  it("omits the more-above line when nothing sits behind the two shown", () => {
    const s = slice(list(80, 60));
    expect(s.moreCount).toBe(0);
    expect(s.floor).toBe(60);
  });

  it("shows a lone commander, and gives an empty list no floor at all", () => {
    expect(slice(list(80)).shown).toHaveLength(1);
    expect(slice(list()).shown).toEqual([]);
    expect(slice(list()).floor).toBeNull();
    expect(slice(list()).moreCount).toBe(0);
  });

  it("orders by rankScore even when the caller does not", () => {
    // Read through the floor rather than through `shown`, which rotates: an
    // unsorted caller would put 41 in the set and drop the floor to it.
    expect(slice(list(41, 74, 68, 71)).floor).toBe(41);
    expect(slice(list(41, 74, 68, 71, 12)).floor).toBe(12);
  });
});

describe("readySlice — the rotation", () => {
  const nine = list(74, 71, 71, 70, 70, 70, 70, 70, 70);
  const ids = (at: { userId: string; now: Date }) =>
    slice(nine, at)
      .shown.map((c) => c.oracleId)
      .join();

  it("holds the same pair across a whole UTC day", () => {
    expect(ids(on("2026-09-16T00:00:00Z"))).toBe(ids(on("2026-09-16T23:59:59Z")));
  });

  // The complaint this exists to answer, stated as a property: not "usually
  // different" but never the same two days running, which is what a cycle buys
  // over a daily hash.
  it("shares no card with yesterday, on any day of a month", () => {
    for (let d = 1; d < 31; d += 1) {
      const today = slice(nine, on(`2026-10-${String(d).padStart(2, "0")}T09:00:00Z`));
      const tomorrow = slice(nine, on(`2026-10-${String(d + 1).padStart(2, "0")}T09:00:00Z`));
      const overlap = today.shown.filter((c) => tomorrow.shown.some((o) => o.oracleId === c.oracleId));
      expect(overlap).toEqual([]);
    }
  });

  it("draws two different commanders on any single day", () => {
    for (let d = 1; d <= 31; d += 1) {
      const s = slice(nine, on(`2026-10-${String(d).padStart(2, "0")}T09:00:00Z`));
      expect(new Set(s.shown.map((c) => c.oracleId)).size).toBe(2);
    }
  });

  // Every commander in the set comes up on a fixed beat: nine of them, two a day,
  // so five days covers all nine from any starting point. A daily hash cannot
  // promise this — simulated, its worst gap was 15 days.
  it("shows every commander in the set within five days", () => {
    for (const userId of ["user-a", "user-b", "user-c", "user-d"]) {
      const seen = new Set<string>();
      for (let d = 1; d <= 5; d += 1) {
        for (const card of slice(nine, on(`2026-10-0${d}T09:00:00Z`, userId)).shown) {
          seen.add(card.oracleId);
        }
      }
      expect(seen.size).toBe(nine.length);
    }
  });

  // THE SHUFFLE, stated as the thing it prevents. A cycle walked in RANK order
  // pairs adjacent ranks — 1&2, then 3&4, then 5&6, then 7&8 — so once every 4.5
  // days Home draws the two weakest of the nine together and the reader watches
  // the pair march down the list. Every other test in this block passes over that
  // build, because a rank-order cycle rotates perfectly well; this is the one
  // that fails.
  it("does not pair commanders by their rank neighbourhood", () => {
    const rank = new Map(nine.map((c, i) => [c.oracleId, i]));
    let nonAdjacent = 0;
    for (let d = 1; d <= 30; d += 1) {
      const s = slice(nine, on(`2026-10-${String(d).padStart(2, "0")}T09:00:00Z`));
      const [a, b] = s.shown.map((c) => rank.get(c.oracleId) as number);
      // Cyclically adjacent, so the walk's wrap pair is not miscounted as a win.
      const gap = Math.abs(a - b);
      if (gap !== 1 && gap !== nine.length - 1) nonAdjacent += 1;
    }
    expect(nonAdjacent).toBeGreaterThan(15);
  });

  // The rotation block above is pinned to a set of NINE, which is what a stocked
  // collection has. Every size between is reachable — `readySlice` truncates the
  // set — and the guarantee is not the same at all of them, so sweep it.
  it("draws two distinct cards at every set size it rotates", () => {
    for (let size = 3; size <= READY_COUNT; size += 1) {
      const set = list(...Array.from({ length: size }, (_, i) => 100 - i));
      for (let d = 1; d <= 20; d += 1) {
        const s = slice(set, on(`2026-10-${String(d).padStart(2, "0")}T09:00:00Z`));
        expect(s.shown).toHaveLength(READY_SHOWN);
        expect(new Set(s.shown.map((c) => c.oracleId)).size).toBe(READY_SHOWN);
      }
    }
  });

  // THE EXCEPTION, pinned rather than papered over. Consecutive days are disjoint
  // only while `2 * READY_SHOWN <= size`, so a set of three repeats exactly one
  // card a day — two out of three, twice, cannot avoid it. Asserted as `1` and not
  // as `<= 1`, because a set of three drawing the SAME PAIR two days running would
  // be a real regression and `<=` would pass it.
  it("repeats exactly one card a day at three, and none from four up", () => {
    for (let size = 3; size <= READY_COUNT; size += 1) {
      const set = list(...Array.from({ length: size }, (_, i) => 100 - i));
      for (let d = 1; d < 20; d += 1) {
        const today = slice(set, on(`2026-10-${String(d).padStart(2, "0")}T09:00:00Z`));
        const next = slice(set, on(`2026-10-${String(d + 1).padStart(2, "0")}T09:00:00Z`));
        const shared = today.shown.filter((c) => next.shown.some((o) => o.oracleId === c.oracleId)).length;
        expect(shared).toBe(size === 3 ? 1 : 0);
      }
    }
  });

  it("seeds on the account, so two readers are not locked to one sequence", () => {
    const days = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"];
    const seqFor = (userId: string) => days.map((d) => ids(on(`${d}T09:00:00Z`, userId))).join("|");
    expect(seqFor("user-a")).not.toBe(seqFor("user-b"));
  });

  // THE SHUFFLE'S QUALITY, which every other test here is blind to. The order is
  // built by Fisher-Yates over a seeded PRNG, and swapping that PRNG for a
  // modulus-2^32 LCG passes all of them: per-step marginals stay uniform, the
  // rotation still rotates, adjacency is still broken. What collapses is the
  // reachable permutation space, because `state % (i + 1)` reads an LCG's LOW
  // bits and those have period 2^k — so accounts silently share an order.
  // Measured over these 5,000 seeds: 4,430 distinct tours from the LCG against
  // 4,977 from xorshift32, out of 9! = 362,880 possible. The floor sits between.
  it("gives accounts their own order rather than a handful of shared ones", () => {
    const tours = new Set<string>();
    for (let u = 0; u < 5_000; u += 1) {
      // Five days is a full tour of nine at two a day, so the sequence names the
      // permutation — read through the public surface rather than by exporting
      // the shuffle, because the order accounts actually GET is the claim.
      const tour: string[] = [];
      for (let d = 1; d <= 5; d += 1) {
        for (const c of slice(nine, on(`2026-10-0${d}T09:00:00Z`, `acct-${u}`)).shown) {
          tour.push(c.oracleId);
        }
      }
      tours.add(tour.join(","));
    }
    expect(tours.size).toBeGreaterThan(4_700);
  });

  // A set of two is both cards every day, so there is nothing to rotate between —
  // and swapping which side they sit on would be motion carrying no information.
  it("leaves a set it cannot rotate exactly where it is", () => {
    const pair = list(80, 60);
    const first = slice(pair, on("2026-10-01T09:00:00Z")).shown.map((c) => c.oracleId);
    const second = slice(pair, on("2026-10-02T09:00:00Z")).shown.map((c) => c.oracleId);
    expect(first).toEqual(["c0", "c1"]);
    expect(second).toEqual(["c0", "c1"]);
  });
});

// Hugh, 2026-09-27: "I've seen the same few rotate in and out over the last couple of weeks."
// Nine at two a day repeated every four and a half days. The set is two weeks deep now, and the
// walk leans on what the reader has not played.
describe("readySlice — two weeks without a repeat, leaning on the new", () => {
  const deep = list(...Array.from({ length: 400 }, (_, i) => 100 - i / 10));
  const fortnight = (at: (d: number) => Parameters<typeof readySlice>[1]) => {
    const seen = new Map<string, number>();
    for (let d = 1; d <= 14; d += 1) {
      for (const c of slice(deep, at(d)).shown) seen.set(c.oracleId, (seen.get(c.oracleId) ?? 0) + 1);
    }
    return seen;
  };
  const day = (d: number) => `2026-10-${String(d).padStart(2, "0")}T09:00:00Z`;

  it("shows 28 different commanders over 14 days, each once", () => {
    const seen = fortnight((d) => on(day(d)));
    expect(seen.size).toBe(28);
    expect([...seen.values()].every((n) => n === 1)).toBe(true);
  });

  // Novelty for the set: the ten newest are c18..c27, the bottom of the 28, the rest 0.
  const unplayed = new Map(Array.from({ length: 28 }, (_, i) => [`c${i}`, i >= 18 ? 30 - i : 0] as const));

  it("still shows each of the 28 once over 14 days with the lean", () => {
    const seen = fortnight((d) => ({ ...on(day(d)), unplayed }));
    expect(seen.size).toBe(28);
    expect([...seen.values()].every((n) => n === 1)).toBe(true);
  });

  // Exactly fourteen of the 28 have themes the reader has not played, so the newer half IS those
  // fourteen: every day must draw exactly one of them. A walk that ignored novelty draws zero or two
  // on some days, which is what this catches (the ten-of-28 form of this test passed without it).
  it("draws exactly one of the newer half on every day", () => {
    const fourteen = new Map(Array.from({ length: 28 }, (_, i) => [`c${i}`, i % 2 === 0 ? 1 + i : 0] as const));
    const newer = new Set<string>([...fourteen.entries()].filter(([, n]) => n > 0).map(([id]) => id));
    for (let d = 1; d <= 28; d += 1) {
      const shown = slice(deep, { ...on(`2026-11-${String(d).padStart(2, "0")}T09:00:00Z`), unplayed: fourteen }).shown;
      expect(shown.filter((c) => newer.has(c.oracleId))).toHaveLength(1);
    }
  });

  it("never repeats a card on consecutive days with the lean", () => {
    for (let d = 1; d < 28; d += 1) {
      const a = slice(deep, { ...on(`2026-11-${String(d).padStart(2, "0")}T09:00:00Z`), unplayed }).shown;
      const b = slice(deep, { ...on(`2026-11-${String(d + 1).padStart(2, "0")}T09:00:00Z`), unplayed }).shown;
      expect(a.filter((c) => b.some((o) => o.oracleId === c.oracleId))).toEqual([]);
    }
  });

  // A failed novelty read costs the lean, never the section: no map is exactly today's shuffle.
  it("walks the plain shuffle when there is no novelty to lean on", () => {
    for (let d = 1; d <= 14; d += 1) {
      const plain = slice(deep, on(day(d))).shown.map((c) => c.oracleId);
      expect(slice(deep, { ...on(day(d)), unplayed: null }).shown.map((c) => c.oracleId)).toEqual(plain);
      expect(slice(deep, { ...on(day(d)), unplayed: new Map() }).shown.map((c) => c.oracleId)).toEqual(plain);
    }
  });
});
