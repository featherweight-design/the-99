import { describe, expect, it } from "vitest";
import type { Job } from "../labels/types";
import { sourceKindsOf } from "./source-kinds";

const ramp = (rampKind: string | null) => ({ space: "role", kind: "ramp", rampKind }) as unknown as Job;

describe("sourceKindsOf", () => {
  it("collects every lasting kind across a card's ramp jobs, once each, past a non-source job", () => {
    const jobs = [ramp("makesTreasure"), ramp("tapsForMana"), ramp("fetchesLand"), ramp("tapsForMana")];
    expect(sourceKindsOf(jobs)).toEqual(["tapsForMana", "fetchesLand"]);
  });
  it("is empty for kinds that leave no lasting source, a kindless job and other roles", () => {
    expect(sourceKindsOf([ramp("burstMana"), ramp("costReduction"), ramp(null), { space: "role", kind: "draw" } as unknown as Job])).toEqual([]);
  });
});
