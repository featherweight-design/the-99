import { describe, expect, it } from "vitest";
import {
  activeControlCount,
  defaultParams,
  parseLaneParams,
  serializeLaneParams,
} from "./lane-params";
import type { LaneParams } from "./lane-params";

const sp = (s: string) => new URLSearchParams(s);

describe("parseLaneParams", () => {
  it("returns the lane's defaults for an empty query string", () => {
    expect(parseLaneParams(sp(""), "owned")).toEqual({
      q: "",
      colors: [],
      match: "contains",
      avail: "all",
      order: "fit",
      scope: "bestfit",
    });
    expect(parseLaneParams(sp(""), "discover").order).toBe("popularity");
  });

  it("reads colours in WUBRG order regardless of how they were written", () => {
    expect(parseLaneParams(sp("c=g,b"), "owned").colors).toEqual(["b", "g"]);
  });

  it("drops unknown colour letters", () => {
    expect(parseLaneParams(sp("c=b,x,g"), "owned").colors).toEqual(["b", "g"]);
  });

  it("maps the exact URL value onto the exactly mode", () => {
    expect(parseLaneParams(sp("m=exact"), "owned").match).toBe("exactly");
    expect(parseLaneParams(sp("m=any"), "owned").match).toBe("contains");
    expect(parseLaneParams(sp("m=nonsense"), "owned").match).toBe("contains");
  });

  it("ignores availability on the discover lane", () => {
    expect(parseLaneParams(sp("a=free"), "discover").avail).toBe("all");
    expect(parseLaneParams(sp("a=free"), "owned").avail).toBe("free");
  });

  it("ignores scope on the owned lane", () => {
    expect(parseLaneParams(sp("s=new"), "owned").scope).toBe("bestfit");
    expect(parseLaneParams(sp("s=new"), "discover").scope).toBe("new");
  });

  it("rejects an order that does not belong to the lane", () => {
    expect(parseLaneParams(sp("o=popularity"), "owned").order).toBe("fit");
    expect(parseLaneParams(sp("o=added"), "discover").order).toBe("popularity");
    expect(parseLaneParams(sp("o=recent"), "discover").order).toBe("recent");
  });

  it("falls back to the legacy join, avail and sort keys", () => {
    expect(parseLaneParams(sp("join=exact"), "owned").match).toBe("exactly");
    expect(parseLaneParams(sp("avail=free"), "owned").avail).toBe("free");
    expect(parseLaneParams(sp("sort=name"), "owned").order).toBe("name");
  });

  it("reads the legacy sort=new as the discover scope, not an order", () => {
    const p = parseLaneParams(sp("sort=new"), "discover");
    expect(p.scope).toBe("new");
    expect(p.order).toBe("popularity");
  });

  it("prefers the new key when both are present", () => {
    expect(parseLaneParams(sp("m=any&join=exact"), "owned").match).toBe("contains");
    expect(parseLaneParams(sp("a=all&avail=free"), "owned").avail).toBe("all");
  });

  it("applies the lane rules to a legacy key as it does to a new one", () => {
    expect(parseLaneParams(sp("avail=free"), "discover").avail).toBe("all");
    expect(parseLaneParams(sp("sort=new"), "owned").scope).toBe("bestfit");
  });
});

describe("serializeLaneParams", () => {
  it("serialises every default as an absence", () => {
    expect(serializeLaneParams(defaultParams("owned"), "owned")).toBe("");
    expect(serializeLaneParams(defaultParams("discover"), "discover")).toBe("");
  });

  it("writes only the non-default keys, in a stable order", () => {
    expect(
      serializeLaneParams(
        { q: "druid", colors: ["b", "g"], match: "exactly", avail: "free", order: "name", scope: "bestfit" },
        "owned",
      ),
    ).toBe("?q=druid&c=b%2Cg&m=exact&a=free&o=name");
  });

  it("never writes availability on discover, nor scope on owned", () => {
    expect(
      serializeLaneParams({ ...defaultParams("discover"), avail: "free" }, "discover"),
    ).toBe("");
    expect(
      serializeLaneParams({ ...defaultParams("owned"), scope: "new" }, "owned"),
    ).toBe("");
  });

  it("round-trips through parse", () => {
    const p: LaneParams = { q: "a b", colors: ["u"], match: "exactly", avail: "all", order: "recent", scope: "new" };
    const qs = serializeLaneParams(p, "discover");
    expect(parseLaneParams(new URLSearchParams(qs), "discover")).toEqual(p);
  });

  it("never writes a legacy key, so a legacy URL self-heals on the first write", () => {
    const qs = serializeLaneParams(parseLaneParams(sp("join=exact&avail=free"), "owned"), "owned");
    expect(qs).toBe("?m=exact&a=free");
  });
});

describe("activeControlCount", () => {
  it("is zero at rest", () => {
    expect(activeControlCount(defaultParams("owned"), "owned")).toBe(0);
    expect(activeControlCount(defaultParams("discover"), "discover")).toBe(0);
  });

  it("never counts search", () => {
    expect(activeControlCount({ ...defaultParams("owned"), q: "druid" }, "owned")).toBe(0);
  });

  it("never counts order", () => {
    expect(activeControlCount({ ...defaultParams("owned"), order: "name" }, "owned")).toBe(0);
  });

  it("counts the colour set as one control however many pips are lit", () => {
    expect(activeControlCount({ ...defaultParams("owned"), colors: ["b", "g", "r"] }, "owned")).toBe(1);
  });

  it("counts colour match only once a pip is lit", () => {
    expect(activeControlCount({ ...defaultParams("owned"), match: "exactly" }, "owned")).toBe(0);
    expect(
      activeControlCount({ ...defaultParams("owned"), colors: ["b"], match: "exactly" }, "owned"),
    ).toBe(2);
  });

  it("ceilings at 4 on owned and 3 on discover", () => {
    expect(
      activeControlCount(
        { q: "x", colors: ["b"], match: "exactly", avail: "free", order: "name", scope: "bestfit" },
        "owned",
      ),
    ).toBe(3);
    expect(
      activeControlCount(
        { q: "x", colors: ["b"], match: "exactly", avail: "all", order: "recent", scope: "new" },
        "discover",
      ),
    ).toBe(3);
  });
});
