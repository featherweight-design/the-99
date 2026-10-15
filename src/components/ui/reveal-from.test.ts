import { describe, expect, it } from "vitest";
import { REVEAL_CAP, REVEAL_DONE_MS, revealOf } from "./reveal-from";

describe("revealOf", () => {
  it("reveals nothing without a press of Show more", () => {
    expect(revealOf(0, null)).toEqual({});
    expect(revealOf(500, undefined)).toEqual({});
  });

  it("leaves the items already on screen alone", () => {
    expect(revealOf(0, 200)).toEqual({});
    expect(revealOf(199, 200)).toEqual({});
  });

  it("numbers the new batch from 0 and caps the number, so everything past the 12th arrives with it", () => {
    expect(revealOf(200, 200).style).toEqual({ "--reveal-n": 0 });
    expect(revealOf(200, 200).className).toBe("anim-reveal");
    expect(revealOf(205, 200).style).toEqual({ "--reveal-n": 5 });
    expect(revealOf(200 + REVEAL_CAP, 200).style).toEqual({ "--reveal-n": REVEAL_CAP });
    expect(revealOf(399, 200).style).toEqual({ "--reveal-n": REVEAL_CAP });
  });
});

describe("REVEAL_DONE_MS", () => {
  it("is past the last fade: the beat, the capped stagger and the fade", () => {
    expect(REVEAL_DONE_MS).toBeGreaterThan(100 + 40 * REVEAL_CAP + 200);
  });
});
