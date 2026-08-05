import { describe, expect, it } from "vitest";
import { synergyStateFrom } from "./synergy-state";

// Mirrors what parseEdhrecPayload actually emits: topCards keeps the card's
// own casing, while the name-keyed maps are lowercased.
const data = { topCards: ["Sol Ring"], inclusionByName: { "sol ring": 90 }, synergyByName: {} };

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
    const empty = { topCards: [], inclusionByName: {}, synergyByName: {} };
    expect(synergyStateFrom({ data: empty, unreachable: false })).toBe("absent");
  });
  it("parsed but empty topCards during an outage → degraded", () => {
    expect(synergyStateFrom({ data: { topCards: [], inclusionByName: {}, synergyByName: {} }, unreachable: true })).toBe("degraded");
  });
  it("data present wins even if unreachable is somehow set", () => {
    // client.ts returns stale-cache hits as unreachable:false, but the state
    // must be driven by data presence so a future contract change cannot
    // mark a row that has real synergy data for refetch.
    expect(synergyStateFrom({ data, unreachable: true })).toBe("ok");
  });
});
