// @vitest-environment node
import { describe, expect, it } from "vitest";
import { inlineCssEnabled } from "../../../next.config";

describe("the inline CSS experiment", () => {
  it("is on only when its switch reads exactly true", () => {
    expect(inlineCssEnabled({ INLINE_CSS_ENABLED: "true" })).toBe(true);
    for (const v of [undefined, "", "false", "1", "TRUE"]) expect(inlineCssEnabled({ INLINE_CSS_ENABLED: v })).toBe(false);
  });
});
