import { describe, expect, it } from "vitest";
import type { EdhrecData } from "../edhrec/parse";
import { scoringSynergyState, synergyStateFrom } from "./synergy-state";

// New required fields added to EdhrecData that these tests don't exercise.
const EMPTY_WIDE = {
  tags: [], bracketCounts: {}, budgetCounts: {}, similarNames: [],
  deckCount: null, rank: null, saltScore: null,
};

// Mirrors what parseEdhrecPayload actually emits: topCards keeps the card's
// own casing, while the name-keyed maps are lowercased.
const data: EdhrecData = { topCards: ["Sol Ring"], inclusionByName: { "sol ring": 90 }, synergyByName: {}, ...EMPTY_WIDE };

// `synergyStateFrom` describes a LIVE read and is what `index-build.ts` stores.
// The scoring path uses `scoringSynergyState` instead — see below.
describe("synergyStateFrom", () => {
  it("real data → ok", () => {
    expect(synergyStateFrom({ data, unreachable: false })).toBe("ok");
  });
  it("no data, service reachable (4xx) → absent", () => {
    expect(synergyStateFrom({ data: null, unreachable: false })).toBe("absent");
  });
  it("no data, service unreachable (5xx/timeout) → degraded", () => {
    expect(synergyStateFrom({ data: null, unreachable: true })).toBe("degraded");
  });
  it("parsed but empty topCards → absent, matching the null fitSynergy it scores to", () => {
    // parseEdhrecPayload returns this shape when the payload doesn't match the
    // expected container.json_dict.cardlists structure.
    const empty: EdhrecData = { topCards: [], inclusionByName: {}, synergyByName: {}, ...EMPTY_WIDE };
    expect(synergyStateFrom({ data: empty, unreachable: false })).toBe("absent");
  });
  it("parsed but empty topCards during an outage → degraded", () => {
    expect(synergyStateFrom({ data: { topCards: [], inclusionByName: {}, synergyByName: {}, ...EMPTY_WIDE }, unreachable: true })).toBe("degraded");
  });
  it("data present wins even if unreachable is somehow set", () => {
    // client.ts returns stale-cache hits as unreachable:false, but the state
    // must be driven by data presence so a future contract change cannot
    // mark a row that has real synergy data for refetch.
    expect(synergyStateFrom({ data, unreachable: true })).toBe("ok");
  });
});

// The pair `commander_scores` constrains: `(synergy_state = 'ok') = (fit_synergy
// is not null)`. Ruling D moved the figure to the stored index while the state
// still came from the live fetch, and these are the two rows that would then
// abort `persistScores` — silently, since both call sites swallow it, leaving
// `/commanders` to recompute its whole fanout on every request forever.
describe("scoringSynergyState", () => {
  const live = (over: { data?: unknown; unreachable?: boolean } = {}) =>
    ({
      data: over.data === undefined ? data : over.data,
      unreachable: over.unreachable ?? false,
    }) as Parameters<typeof scoringSynergyState>[0];

  it("is ok whenever the index produced a figure, whatever the live read says", () => {
    expect(scoringSynergyState(live(), true)).toBe("ok");
    // The violation in one direction: an indexed commander whose live fetch
    // 404s. Keyed off the live read this was "absent" against a non-null figure.
    expect(scoringSynergyState(live({ data: null }), true)).toBe("ok");
    // And during an outage. "degraded" against a non-null figure.
    expect(scoringSynergyState(live({ data: null, unreachable: true }), true)).toBe("ok");
  });

  it("is never ok without a figure, however healthy the live read", () => {
    // The violation in the other direction, and the likelier one: a commander
    // the catalog has but the monthly index has not covered, whose EDHREC page
    // exists. Keyed off the live read this was "ok" against a null figure.
    expect(scoringSynergyState(live(), false)).toBe("absent");
  });

  it("still distinguishes a transient outage from a settled absence", () => {
    expect(scoringSynergyState(live({ data: null }), false)).toBe("absent");
    expect(scoringSynergyState(live({ data: null, unreachable: true }), false)).toBe("degraded");
  });

  // The property the constraint actually needs, asserted as a property rather
  // than as three examples: "ok" iff there is a figure, over every combination
  // of the live read's two dimensions.
  it("returns ok exactly when there is a figure, across every live outcome", () => {
    for (const d of [data, null]) {
      for (const unreachable of [false, true]) {
        for (const hasFigure of [false, true]) {
          const state = scoringSynergyState(live({ data: d, unreachable }), hasFigure);
          expect(state === "ok").toBe(hasFigure);
        }
      }
    }
  });
});
