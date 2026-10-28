import { describe, expect, it } from "vitest";
import { ENTRY_TARGETS, LABEL_TARGETS } from "./entry-targets";
import { TOOLS } from "./tools";

describe("ENTRY_TARGETS", () => {
  it("is exactly TOOLS' entry → target pairs", () => {
    expect(ENTRY_TARGETS).toEqual(Object.fromEntries(TOOLS.map((t) => [t.entry, t.target])));
  });

  it("LABEL_TARGETS is exactly TOOLS' label → target pairs", () => {
    expect(LABEL_TARGETS).toEqual(Object.fromEntries(TOOLS.flatMap((t) => t.labels.map((l) => [l, t.target]))));
  });
});
