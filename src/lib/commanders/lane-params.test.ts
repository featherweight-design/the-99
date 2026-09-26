import { describe, expect, it } from "vitest";
import {
  activeControlCount,
  defaultParams,
  discoverSort,
  laneQuery,
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
      printedIn: [],
    });
    expect(parseLaneParams(sp(""), "discover").order).toBe("bestfit");
  });

  it("reads colours in WUBRG order regardless of how they were written", () => {
    expect(parseLaneParams(sp("c=g,b"), "owned").colors).toEqual(["b", "g"]);
  });

  // The collection browser writes `?c=` as an unseparated run and links carry
  // across, so a lane that only understood the comma form would open unfiltered.
  it("reads the collection browser's letter run, in either case", () => {
    expect(parseLaneParams(sp("c=GB"), "owned").colors).toEqual(["b", "g"]);
    expect(parseLaneParams(sp("c=wu"), "owned").colors).toEqual(["w", "u"]);
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

  // `?s=` was the scope control's key for the one build that shipped it. Its
  // novelty value is now an order, so the old link opens on that order rather
  // than on a control that no longer exists.
  it("reads the retired scope key as an order on discover, and ignores it on owned", () => {
    expect(parseLaneParams(sp("s=new"), "discover").order).toBe("new");
    expect(parseLaneParams(sp("s=new"), "owned").order).toBe("fit");
  });

  it("prefers an explicit order over the retired scope key", () => {
    expect(parseLaneParams(sp("s=new&o=recent"), "discover").order).toBe("recent");
  });

  it("rejects an order that does not belong to the lane", () => {
    expect(parseLaneParams(sp("o=popularity"), "owned").order).toBe("fit");
    expect(parseLaneParams(sp("o=recent"), "owned").order).toBe("fit");
    expect(parseLaneParams(sp("o=recent"), "discover").order).toBe("recent");
  });

  it("falls back to the legacy join, avail and sort keys", () => {
    expect(parseLaneParams(sp("join=exact"), "owned").match).toBe("exactly");
    expect(parseLaneParams(sp("avail=free"), "owned").avail).toBe("free");
    expect(parseLaneParams(sp("sort=name"), "owned").order).toBe("name");
  });

  it("reads the legacy sort=new as the novelty order", () => {
    expect(parseLaneParams(sp("sort=new"), "discover").order).toBe("new");
  });

  it("prefers the new key when both are present", () => {
    expect(parseLaneParams(sp("m=any&join=exact"), "owned").match).toBe("contains");
    expect(parseLaneParams(sp("a=all&avail=free"), "owned").avail).toBe("all");
  });

  it("applies the lane rules to a legacy key as it does to a new one", () => {
    expect(parseLaneParams(sp("avail=free"), "discover").avail).toBe("all");
    expect(parseLaneParams(sp("sort=new"), "owned").order).toBe("fit");
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
        { q: "druid", colors: ["b", "g"], match: "exactly", avail: "free", order: "name", printedIn: [] },
        "owned",
      ),
    ).toBe("?q=druid&c=b%2Cg&m=exact&a=free&o=name");
  });

  it("never writes availability on discover", () => {
    expect(
      serializeLaneParams({ ...defaultParams("discover"), avail: "free" }, "discover"),
    ).toBe("");
  });

  it("round-trips through parse", () => {
    const p: LaneParams = { q: "a b", colors: ["u"], match: "exactly", avail: "all", order: "recent", printedIn: [] };
    const qs = serializeLaneParams(p, "discover");
    expect(parseLaneParams(new URLSearchParams(qs), "discover")).toEqual(p);
  });

  it("never writes a legacy key, so a legacy URL self-heals on the first write", () => {
    const qs = serializeLaneParams(parseLaneParams(sp("join=exact&avail=free"), "owned"), "owned");
    expect(qs).toBe("?m=exact&a=free");
  });
});

describe("laneQuery", () => {
  // The retired key is cleared rather than carried, so a link from the build
  // that shipped the scope control stops being ambiguous on the first write.
  it("clears the retired scope key, keeping the order it was read as", () => {
    const live = sp("s=new");
    expect(laneQuery(live, parseLaneParams(live, "discover"), "discover")).toBe("?o=new");
  });

  it("keeps a parameter the lane does not own", () => {
    const live = sp("s=new&ref=email");
    expect(laneQuery(live, parseLaneParams(live, "discover"), "discover")).toBe(
      "?ref=email&o=new",
    );
  });
});

describe("Printed in", () => {
  it("reads ?p= as lower-cased, deduped, sorted set codes", () => {
    expect(parseLaneParams(sp("p=HOC,hob,,hob"), "discover").printedIn).toEqual(["hob", "hoc"]);
  });

  it("writes it after the lane's other keys, and round-trips on both lanes", () => {
    for (const lane of ["owned", "discover"] as const) {
      const p: LaneParams = { ...defaultParams(lane), colors: ["g"], printedIn: ["hob", "hoc"] };
      const qs = serializeLaneParams(p, lane);
      expect(qs).toBe("?c=g&p=hob%2Choc");
      expect(parseLaneParams(sp(qs), lane)).toEqual(p);
    }
  });

  it("is a lane key, so clearing it clears it from the live URL", () => {
    expect(laneQuery(sp("utm=x&p=hob"), defaultParams("owned"), "owned")).toBe("?utm=x");
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

  // Colours, match and Printed in on both lanes, plus availability on owned.
  // Search and order never count.
  it("counts a Printed in selection as one control, however many sets it names", () => {
    expect(activeControlCount({ ...defaultParams("owned"), printedIn: ["hob", "hoc"] }, "owned")).toBe(1);
    expect(activeControlCount({ ...defaultParams("discover"), printedIn: ["hob"] }, "discover")).toBe(1);
  });

  it("ceilings at 4 on owned and 3 on discover", () => {
    expect(
      activeControlCount(
        { q: "x", colors: ["b"], match: "exactly", avail: "free", order: "name", printedIn: ["hob"] },
        "owned",
      ),
    ).toBe(4);
    expect(
      activeControlCount(
        { q: "x", colors: ["b"], match: "exactly", avail: "all", order: "recent", printedIn: ["hob"] },
        "discover",
      ),
    ).toBe(3);
  });

  // The rankings are orders like any other now, so picking one lights no badge
  // and produces no chip — the trigger beside the badge already names it.
  it("never counts a discover ranking", () => {
    expect(activeControlCount({ ...defaultParams("discover"), order: "new" }, "discover")).toBe(0);
  });
});

describe("discoverSort", () => {
  it("asks for the novelty ranking only under the novelty order", () => {
    expect(discoverSort("new")).toBe("new");
  });

  // The point of the split: three of the five orders arrange a list the client
  // already holds, so flipping between them must not reach the server.
  it("asks for the fit ranking under every other order", () => {
    for (const o of ["bestfit", "popularity", "name", "recent"] as const) {
      expect(discoverSort(o)).toBe("fit");
    }
  });
});
