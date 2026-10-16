// The gate between the detector and the embedder: a card is read only when it is sharp enough and big enough in the
// frame. The rest of the pipeline draws on canvases and runs the models, which the lab's browser proof exercises.
import { describe, expect, it } from "vitest";
import { cardInView, MIN_CARD_AREA } from "./pipeline";
import { SHARPNESS_GATE } from "./models";

const W = 1000, H = 1000;
/** A square of the given share of the frame. */
const quad = (share: number) => {
  const side = Math.sqrt(share * W * H);
  return [{ x: 0, y: 0 }, { x: side, y: 0 }, { x: side, y: side }, { x: 0, y: side }];
};

describe("cardInView", () => {
  it("reads a sharp card that fills enough of the frame", () => {
    expect(cardInView(SHARPNESS_GATE, quad(0.3), W, H)).toBe(true);
  });

  it("passes over a blurred frame", () => {
    expect(cardInView(SHARPNESS_GATE - 0.001, quad(0.3), W, H)).toBe(false);
  });

  it("passes over a card too small in the frame", () => {
    expect(cardInView(1, quad(MIN_CARD_AREA * 0.9), W, H)).toBe(false);
    expect(cardInView(1, quad(MIN_CARD_AREA * 1.1), W, H)).toBe(true);
  });
});
