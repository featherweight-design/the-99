import { describe, expect, it } from "vitest";
import { readingCrop, streamHolder, tapBody, type Reading } from "./reading";

const ID = "11111111-1111-4111-8111-111111111111";

describe("scan-lab reading", () => {
  it("records a no-card frame's real detector timing, with no guess and no frame", () => {
    const r: Reading = { kind: "none", detMs: 42, totalMs: 47 };
    const body = tapBody(r, false, "v1", "AAAA");
    expect(body).toMatchObject({ guessOracleId: null, latencyMs: 47, detectorMs: 42, embedMs: null, frame: null, agreedFrames: 0 });
    expect(readingCrop(r)).toBeNull();
  });

  it("records a card frame's verdict and its own crop together", () => {
    const crop = new Float32Array([1, 2]);
    const r: Reading = {
      kind: "card", crop, guesses: [{ oracleId: ID, name: "A", score: 0.9 }], margin: 0.2, agreed: 3, committed: true,
      detMs: 10, embMs: 20, matchMs: 5, totalMs: 35,
    };
    expect(readingCrop(r)).toBe(crop);
    expect(tapBody(r, true, "v1", "AAAA")).toMatchObject({
      guessOracleId: ID, score: 0.9, margin: 0.2, latencyMs: 35, detectorMs: 10, embedMs: 20, matchMs: 5, agreedFrames: 3, frame: "AAAA",
    });
  });

  it("records nothing measured before the first frame", () => {
    expect(tapBody(null, false, "v1", null)).toMatchObject({ latencyMs: 0, detectorMs: null, guessOracleId: null });
  });
});

describe("scan-lab stream holder", () => {
  const fake = () => {
    const track = { stopped: 0, stop() { this.stopped++; } };
    return { track, stream: { getTracks: () => [track] } };
  };

  it("stops the held stream on close", () => {
    const h = streamHolder();
    const { track, stream } = fake();
    expect(h.accept(stream)).toBe(true);
    h.close();
    expect(track.stopped).toBe(1);
    expect(h.holds(stream)).toBe(false);
  });

  it("stops a stream that arrives after close", () => {
    const h = streamHolder();
    h.close();
    const { track, stream } = fake();
    expect(h.accept(stream)).toBe(false);
    expect(track.stopped).toBe(1);
  });

  it("accepts again once re-opened", () => {
    const h = streamHolder();
    h.close();
    h.open();
    const { track, stream } = fake();
    expect(h.accept(stream)).toBe(true);
    expect(track.stopped).toBe(0);
  });
});
