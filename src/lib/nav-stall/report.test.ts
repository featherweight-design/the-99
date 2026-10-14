import { describe, expect, it } from "vitest";
import { parseStall, pathPattern, skewOf, stallLine, type StallReport } from "./report";

const good: StallReport = {
  kind: "pending", from: "/decks/[x]/import", to: "/decks", at: "/decks/[x]/import", moved: false,
  elapsedMs: 8012, loader: "overlay", rsc: "none", rscStatus: 0, rscMs: 0, rscBytes: 0, visible: true,
  wasHidden: false, online: true, connection: "4g", worker: true, deployment: "dpl_abc123",
};

describe("pathPattern", () => {
  it("keeps the app's own segments and turns every id, slug and code into [x]", () => {
    expect(pathPattern("/decks/0b49cb44-8ae2-4c19-b558-633344a2f4ed/import")).toBe("/decks/[x]/import");
    expect(pathPattern("/commanders/atraxa-praetors-voice")).toBe("/commanders/[x]");
    expect(pathPattern("/collection/sets/fdn")).toBe("/collection/sets/[x]");
  });
  it("drops the query and the hash", () => {
    expect(pathPattern("/decks/shopping?d=a,b#top")).toBe("/decks/shopping");
    expect(pathPattern("/?q=sol ring")).toBe("/");
  });
});

describe("parseStall", () => {
  it("takes a well-formed report as it is", () => {
    expect(parseStall(JSON.parse(JSON.stringify(good)))).toEqual(good);
    expect(parseStall({ ...good, deployment: null })).toEqual({ ...good, deployment: null });
  });
  it("refuses a raw path, a slug or a query in any path field", () => {
    for (const field of ["from", "to", "at"] as const) {
      for (const value of ["/decks/0b49cb44", "/commanders/atraxa", "/decks?x=1", "decks", "/[x]/../admin"]) {
        expect(parseStall({ ...good, [field]: value })).toBeNull();
      }
    }
  });
  it("refuses a value outside its closed set, an out-of-range number and a wrong type", () => {
    for (const bad of [
      { kind: "other" }, { loader: "spinner" }, { rsc: "partial" }, { connection: "5g" },
      { elapsedMs: -1 }, { elapsedMs: 1.5 }, { elapsedMs: 4_000_000 }, { rscStatus: 600 }, { rscBytes: "10" },
      { moved: "yes" }, { online: 1 }, { deployment: "dpl_has space" }, { deployment: "anything" },
    ]) {
      expect(parseStall({ ...good, ...bad })).toBeNull();
    }
  });
  it("refuses a missing field and anything that is not an object", () => {
    const { worker: _, ...missing } = good;
    expect(parseStall(missing)).toBeNull();
    for (const raw of [null, "x", 5, [good]]) expect(parseStall(raw)).toBeNull();
  });
  it("carries no field the line could print as free text: extra keys are dropped", () => {
    expect(parseStall({ ...good, note: "hello", userId: "user_1" })).toEqual(good);
  });
});

describe("the log line", () => {
  it("says whether the page outlived a deploy, never which deployment", () => {
    expect(skewOf("dpl_a", "dpl_a")).toBe("same");
    expect(skewOf("dpl_a", "dpl_b")).toBe("other");
    expect(skewOf(null, "dpl_b")).toBe("unknown");
    expect(skewOf("dpl_a", undefined)).toBe("unknown");
    const line = stallLine(good, "other");
    expect(line).toBe(
      "[nav-stall] kind=pending from=/decks/[x]/import to=/decks at=/decks/[x]/import moved=false elapsed=8012 " +
        "loader=overlay rsc=none rscStatus=0 rscMs=0 rscBytes=0 visible=true wasHidden=false online=true conn=4g worker=true skew=other",
    );
    expect(line).not.toContain("dpl_");
  });
});
