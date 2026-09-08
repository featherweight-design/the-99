import { describe, expect, it } from "vitest";
import { parseJoin } from "./params";

// `parseScope` and `parseSort` went with the `?scope=` toggle: the lane is now
// the route, and `lane-params.ts` reads the ranking for both lanes. Their
// guarantees are pinned in `lane-params.test.ts` and `scope-redirect.test.ts`.

describe("parseJoin", () => {
  it("defaults to contains", () => {
    expect(parseJoin(undefined)).toBe("contains");
    expect(parseJoin(null)).toBe("contains");
    expect(parseJoin("nonsense")).toBe("contains");
    expect(parseJoin(["exact"])).toBe("contains"); // a repeated param is not a mode
  });
  // The param says `exact` and the mode says `exactly`; this is the mapping.
  it("reads exact as the exactly mode", () => expect(parseJoin("exact")).toBe("exactly"));
  it("does not read the mode's own name from the URL", () =>
    expect(parseJoin("exactly")).toBe("contains"));
});
