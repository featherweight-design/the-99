import { describe, expect, it } from "vitest";
import { synergyStateFrom } from "./synergy-state";

const data = { topCards: ["Sol Ring"], inclusionByName: { "Sol Ring": 90 } };

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
  it("data present wins even if unreachable is somehow set", () => {
    // client.ts returns stale-cache hits as unreachable:false, but the state
    // must be driven by data presence so a future contract change cannot
    // mark a row that has real synergy data for refetch.
    expect(synergyStateFrom({ data, unreachable: true })).toBe("ok");
  });
});
