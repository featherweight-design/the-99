import { afterEach, describe, expect, it, vi } from "vitest";
import { scanMeasure } from "./marks";

describe("scanMeasure", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps only each name's latest measure, with its span and detail", () => {
    const calls: unknown[][] = [];
    vi.stubGlobal("performance", {
      mark: () => {},
      clearMeasures: (name: string) => void calls.push(["clear", name]),
      measure: (name: string, o: unknown) => void calls.push(["measure", name, o]),
    });
    scanMeasure("scan:read-readback", 10, 14, { bytes: 4 });
    scanMeasure("scan:read-warp", 14, 20);
    expect(calls).toEqual([
      ["clear", "scan:read-readback"],
      ["measure", "scan:read-readback", { start: 10, end: 14, detail: { bytes: 4 } }],
      ["clear", "scan:read-warp"],
      ["measure", "scan:read-warp", { start: 14, end: 20 }],
    ]);
  });

  it("never throws where user timing is missing or refuses", () => {
    vi.stubGlobal("performance", { mark: () => {}, clearMeasures: () => {}, measure: () => { throw new Error("no"); } });
    expect(() => scanMeasure("scan:read-capture", 0, 1)).not.toThrow();
    vi.stubGlobal("performance", undefined);
    expect(() => scanMeasure("scan:read-capture", 0, 1)).not.toThrow();
  });
});
