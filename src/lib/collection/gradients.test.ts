import { describe, expect, it } from "vitest";
import { commanderGradient, identityGradient } from "./gradients";

describe("identityGradient", () => {
  it("returns colorless gradient for empty identity", () => {
    const result = identityGradient([]);
    expect(result).toBe("linear-gradient(150deg, #b3a488, #726755 58%, #453e31)");
  });

  it("returns mono gradient for single-color identity", () => {
    expect(identityGradient(["W"])).toBe("linear-gradient(150deg, #efe9d8, #cbbf9c 58%, #9d8f6b)");
    expect(identityGradient(["U"])).toBe("linear-gradient(150deg, #6a9bcb, #305c88 58%, #1c3a57)");
    expect(identityGradient(["B"])).toBe("linear-gradient(150deg, #5a5464, #2c2833 58%, #17151d)");
    expect(identityGradient(["R"])).toBe("linear-gradient(150deg, #cf7157, #8c3627 58%, #571f16)");
    expect(identityGradient(["G"])).toBe("linear-gradient(150deg, #84b277, #406f3b 58%, #264823)");
  });

  it("returns colorless for unknown single-color identity", () => {
    const result = identityGradient(["X"]);
    expect(result).toBe("linear-gradient(150deg, #b3a488, #726755 58%, #453e31)");
  });

  it("returns 2-color blend for 2-color identity using first two colors", () => {
    const result = identityGradient(["W", "U"]);
    expect(result).toBe("linear-gradient(125deg, #cbbf9c, #efe9d8 40%, #6a9bcb 60%, #305c88)");
  });

  it("returns 2-color blend for 3+ color identity using first two colors", () => {
    const threeColor = identityGradient(["W", "U", "B"]);
    const twoColor = identityGradient(["W", "U"]);
    expect(threeColor).toBe(twoColor);
  });

  it("blend uses 125deg angle", () => {
    const result = identityGradient(["R", "G"]);
    expect(result).toContain("125deg");
  });
});

describe("commanderGradient", () => {
  it("uses the second identity color for the 55% stop on 3-color identities", () => {
    // §Art gradient formula: id0-mid, id0-light 34%, id1-light 55%, idN-mid 82%, idN-dark
    expect(commanderGradient(["W", "U", "B"])).toBe(
      "linear-gradient(130deg, #cbbf9c, #efe9d8 34%, #6a9bcb 55%, #2c2833 82%, #17151d)",
    );
  });

  it("uses second == last color for 2-color identities", () => {
    expect(commanderGradient(["R", "G"])).toBe(
      "linear-gradient(130deg, #8c3627, #cf7157 34%, #84b277 55%, #406f3b 82%, #264823)",
    );
  });

  it("falls back to mono/colorless gradients for 1 and 0 colors", () => {
    expect(commanderGradient(["G"])).toBe("linear-gradient(150deg, #84b277, #406f3b 58%, #264823)");
    expect(commanderGradient([])).toBe("linear-gradient(150deg, #b3a488, #726755 58%, #453e31)");
  });
});
