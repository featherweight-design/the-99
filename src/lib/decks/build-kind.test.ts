import { describe, expect, it } from "vitest";
import { isDeckBuildKind } from "./build-kind";

describe("isDeckBuildKind", () => {
  it("takes the two kinds a reader can choose and nothing a crafted request can send", () => {
    expect(isDeckBuildKind("free")).toBe(true);
    expect(isDeckBuildKind("empty")).toBe(true);
    for (const bad of ["guided", "", "FREE", undefined, null, 1, {}, ["free"]]) expect(isDeckBuildKind(bad)).toBe(false);
  });
});
