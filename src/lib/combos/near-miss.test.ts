import { describe, it, expect } from "vitest";
import { bestPartnerPerCard, type PairRow } from "./near-miss";

/** A row as the two queries return it. `produces` defaults to something the system counts. */
const row = (over: Partial<PairRow>): PairRow => ({
  variant_id: over.variant_id ?? "1-1",
  produces: over.produces ?? ["Infinite mana"],
  // `in` rather than `??`, because `popularity` is nullable and NULL is a case under test:
  // `over.popularity ?? 100` turns a deliberate null into 100 and the null case measures
  // nothing. The first version of this helper did exactly that.
  popularity: "popularity" in over ? (over.popularity ?? null) : 100,
  present_id: over.present_id ?? "card-a",
  missing_id: over.missing_id ?? "partner-1",
  missing_name: over.missing_name ?? "Partner One",
  missing_must_be_commander: over.missing_must_be_commander ?? false,
});

describe("bestPartnerPerCard", () => {
  // WHAT IT PRODUCES DECIDES, never the card count — 703 of 3,842 sampled two-card variants
  // produce something this system does not count.
  //
  // The example is a mundane pair rather than "infinite squirrels", which is the phrase the
  // repo's own note uses and which DOES count: `INFINITE` is `/^infinite /i`, so anything
  // unbounded passes whatever it is unbounded in. The uncounted case is a pair that produces
  // something merely useful.
  it("drops a pair that produces nothing this system counts", () => {
    const out = bestPartnerPerCard(
      [row({ produces: ["Two 1/1 white Soldier creature tokens"] })],
      { requireCastable: true },
    );
    expect(out.size).toBe(0);
    // And keeps one that is unbounded in something silly, because unbounded is the test.
    expect(
      bestPartnerPerCard([row({ produces: ["Infinite squirrels"] })], { requireCastable: true })
        .size,
    ).toBe(1);
  });

  // RULE 2. A piece that only works from the command zone is not completed by adding it to the
  // 99, so `completes with X` on that row would be a false positive — and a false `completes`
  // is the one failure this design cannot survive.
  it("drops a partner that only works from the command zone, when castability is required", () => {
    const rows = [row({ missing_must_be_commander: true })];
    expect(bestPartnerPerCard(rows, { requireCastable: true }).size).toBe(0);
    // The collection read makes no claim about assembling anything — it says the reader owns
    // two cards — so the same row survives there.
    expect(bestPartnerPerCard(rows, { requireCastable: false }).size).toBe(1);
  });

  // ONE PARTNER PER CARD, because the clause names exactly one and no count may appear beside
  // it: detection excludes template-gated variants by design, so a number would be the first
  // thing on the surface that is not true.
  it("keeps one partner per card, the most popular", () => {
    const out = bestPartnerPerCard(
      [
        row({ variant_id: "a", popularity: 10, missing_id: "p-low", missing_name: "Low" }),
        row({ variant_id: "b", popularity: 900, missing_id: "p-high", missing_name: "High" }),
        row({ variant_id: "c", popularity: 40, missing_id: "p-mid", missing_name: "Mid" }),
      ],
      { requireCastable: true },
    );
    expect(out.size).toBe(1);
    expect(out.get("card-a")?.partnerName).toBe("High");
  });

  // STABLE ACROSS RELOADS is Design's only requirement of the tiebreak, so the order must not
  // depend on the order rows arrived in.
  it("picks the same partner whichever order the rows arrive in", () => {
    const a = row({ variant_id: "aaa", popularity: 50, missing_id: "p1", missing_name: "One" });
    const b = row({ variant_id: "bbb", popularity: 50, missing_id: "p2", missing_name: "Two" });
    expect(bestPartnerPerCard([a, b], { requireCastable: true }).get("card-a")?.partnerName)
      .toBe(bestPartnerPerCard([b, a], { requireCastable: true }).get("card-a")?.partnerName);
  });

  // NULLS SORT LAST rather than winning. `popularity` is nullable in the schema — the
  // handoff's dependency 4 rests on a sampled record where it was null — and is in fact
  // non-null on all 5,031 two-card variants in the shipped index. This keeps the choice sane
  // if that ever stops being true.
  it("prefers a known popularity to an unknown one", () => {
    const out = bestPartnerPerCard(
      [
        row({ variant_id: "a", popularity: null, missing_id: "p-null", missing_name: "Unknown" }),
        row({ variant_id: "b", popularity: 1, missing_id: "p-one", missing_name: "Known" }),
      ],
      { requireCastable: true },
    );
    expect(out.get("card-a")?.partnerName).toBe("Known");
  });

  it("answers per card, not per collection", () => {
    const out = bestPartnerPerCard(
      [
        row({ present_id: "card-a", missing_name: "For A" }),
        row({ present_id: "card-b", missing_name: "For B" }),
      ],
      { requireCastable: true },
    );
    expect(out.get("card-a")?.partnerName).toBe("For A");
    expect(out.get("card-b")?.partnerName).toBe("For B");
  });
});
