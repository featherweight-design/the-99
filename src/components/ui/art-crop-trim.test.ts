import { describe, expect, it } from "vitest";
import { ART_CROP_TRIM, ART_TOP_TRIM, coverTopTrimMargin, PORTRAIT_RATIO } from "./art-crop-trim";
import * as wash from "./art-wash";

describe("the art_crop top trim", () => {
  it("is one value, shared: ArtWash re-exports this module's rather than holding its own", () => {
    expect(wash.ART_TOP_TRIM).toBe(ART_TOP_TRIM);
    expect(wash.PORTRAIT_RATIO).toBe(PORTRAIT_RATIO);
    expect(wash.coverTopTrimMargin).toBe(coverTopTrimMargin);
  });

  it("lifts a layer in a sized box by 3% of the crop, width-bound or height-bound, read off the box", () => {
    // 3 / 1.37 = 2.19% of the width is 3% of a width-bound crop; 3 / 0.97 = 3.09% of the height is 3% of a
    // height-bound one once the layer has grown by it. The larger always applies, as in `coverTopTrimMargin`.
    expect(ART_CROP_TRIM.layer.marginTop).toBe("calc(-1 * max(2.19cqw, 3.09cqh))");
    // Container units read the nearest size container: the box the layer fills, which clips the lift.
    expect(ART_CROP_TRIM.box).toBe("[container-type:size]");
  });
});
