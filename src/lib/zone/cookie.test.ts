import { describe, expect, it } from "vitest";

import { zoneFor } from "./cookie";

describe("the zone cookie", () => {
  it("reads a zone the runtime knows, encoded or not", () => {
    expect(zoneFor("America/New_York")).toBe("America/New_York");
    expect(zoneFor("America%2FNew_York")).toBe("America/New_York");
  });
  it("reads nothing for a missing, stale or hand-edited value", () => {
    expect(zoneFor(undefined)).toBeNull();
    expect(zoneFor("")).toBeNull();
    expect(zoneFor("Mars/Olympus")).toBeNull();
  });
});
