import { describe, expect, it } from "vitest";
import { LABEL_TARGETS } from "./entry-targets";
import { TOOLS } from "./tools";

describe("LABEL_TARGETS", () => {
  it("LABEL_TARGETS is exactly TOOLS' label → target pairs", () => {
    expect(LABEL_TARGETS).toEqual(Object.fromEntries(TOOLS.flatMap((t) => t.labels.map((l) => [l, t.target]))));
  });
});
