import { describe, expect, it } from "vitest";
import { rgbaToTensor } from "./geometry";
import { cropToRgba } from "./photo";

describe("the scan's photo", () => {
  it("turns a normalised crop back into the pixels it was made from", () => {
    // a 2x2 RGBA picture, normalised as the embedder's input is, then read back at the same size
    const rgba = new Uint8ClampedArray([10, 20, 30, 255, 200, 100, 50, 255, 0, 0, 0, 255, 255, 255, 255, 255]);
    const back = cropToRgba(rgbaToTensor(rgba, 2, 2), 2, 2, 2, 2);
    expect([...back]).toEqual([...rgba]);
  });

  it("samples a smaller photo from each output pixel's centre", () => {
    // 4x1: left half red, right half blue, read at 2x1
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255, 255]);
    const back = cropToRgba(rgbaToTensor(rgba, 4, 1), 4, 1, 2, 1);
    expect([...back]).toEqual([255, 0, 0, 255, 0, 0, 255, 255]);
  });
});
