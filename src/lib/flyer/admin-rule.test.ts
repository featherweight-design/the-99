import { describe, expect, it } from "vitest";
import { GROUP_NAME } from "../admin/groups-rule";
import { drawFlyerCode, flyerGroupName, parseStore, STORE_MAX } from "./admin-rule";
import { FLYER_ALPHABET, parseFlyerCode } from "./rules";

describe("parseStore", () => {
  it("trims, and refuses empty, over-long and control characters", () => {
    expect(parseStore("  Mox Boston ")).toBe("Mox Boston");
    expect(parseStore("   ")).toBeNull();
    expect(parseStore(undefined)).toBeNull();
    expect(parseStore("x".repeat(STORE_MAX))).toBe("x".repeat(STORE_MAX));
    expect(parseStore("x".repeat(STORE_MAX + 1))).toBeNull();
    expect(parseStore("a\nb")).toBeNull();
  });
});

describe("flyerGroupName", () => {
  it("names the group from the store, as the board draws it", () => {
    expect(flyerGroupName("Mox Boston")).toBe("mox-boston");
    expect(flyerGroupName("Pandemonium Books")).toBe("pandemonium-books");
    expect(flyerGroupName("Café  Ludique!")).toBe("cafe-ludique");
  });
  it("always passes the group name rule, within 40 characters, with or without a suffix", () => {
    for (const store of ["Mox Boston", "x".repeat(60), "a-".repeat(30), "9 lives"]) {
      for (const n of [1, 2, 6]) expect(GROUP_NAME.test(flyerGroupName(store, n)!)).toBe(true);
    }
    expect(flyerGroupName("x".repeat(60), 3)!.length).toBe(40);
    expect(flyerGroupName("Mox Boston", 2)).toBe("mox-boston-2");
  });
  it("is null when nothing is left to name it", () => {
    expect(flyerGroupName("!!!")).toBeNull();
  });
});

describe("drawFlyerCode", () => {
  it("draws six characters of the alphabet, a code the route parses", () => {
    let i = 0;
    const code = drawFlyerCode(() => i++ % FLYER_ALPHABET.length);
    expect(code).toHaveLength(6);
    expect(parseFlyerCode(code)).toBe(code);
  });
});
