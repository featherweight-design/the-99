import { describe, expect, it } from "vitest";
import { identityGradient } from "./gradients";

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
