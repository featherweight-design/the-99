import { describe, expect, it } from "vitest";
import { MAX_FRAME_BYTES, parseResult } from "./result";

const ok = {
  guessOracleId: "4b2a6f1e-0c3d-4e5f-8a9b-0c1d2e3f4a5b", correct: true, score: 0.82, margin: 0.11,
  latencyMs: 240, detectorMs: 40, embedMs: 150, matchMs: 20, agreedFrames: 3, indexVersion: "single-20261015",
};

describe("scan-lab result", () => {
  it("keeps a well-formed tap and no frame", () => {
    expect(parseResult(ok)).toMatchObject({ correct: true, latencyMs: 240, frame: null });
  });

  it("keeps a JPEG frame and refuses anything else", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]).toString("base64");
    expect(parseResult({ ...ok, frame: jpeg })?.frame?.length).toBe(6);
    expect(parseResult({ ...ok, frame: Buffer.from("not a jpeg").toString("base64") })).toBeNull();
    const big = Buffer.alloc(MAX_FRAME_BYTES + 1, 0);
    big[0] = 0xff; big[1] = 0xd8;
    expect(parseResult({ ...ok, frame: big.toString("base64") })).toBeNull();
  });

  it("refuses a malformed guess, a missing verdict or a bad latency", () => {
    expect(parseResult({ ...ok, guessOracleId: "Lightning Bolt" })).toBeNull();
    expect(parseResult({ ...ok, correct: "yes" })).toBeNull();
    expect(parseResult({ ...ok, latencyMs: -1 })).toBeNull();
    expect(parseResult({ ...ok, indexVersion: "a b" })).toBeNull();
    expect(parseResult({ ...ok, guessOracleId: null })).toMatchObject({ guessOracleId: null });
  });
});
