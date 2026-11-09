import { describe, expect, it } from "vitest";
import { assertNamedEntries, assertNamedFiles, missingNamedFiles, staleNamedEntries } from "./named-files.mjs";

const disk: Record<string, string> = { "/r/a.tsx": "<input />", "/r/b.tsx": "nothing here" };
const exists = (p: string) => p in disk;
const read = (p: string) => disk[p]!;
const opts = { root: "/r", exists, read };

describe("missingNamedFiles", () => {
  it("is empty when every named file exists", () => {
    expect(missingNamedFiles("g", "ALLOWED", ["a.tsx", "b.tsx"], opts)).toEqual([]);
  });

  it("names the guard, the entry, the map and what to do for each missing file", () => {
    expect(missingNamedFiles("g", "ALLOWED", ["a.tsx", "gone.tsx"], opts)).toEqual([
      "g: gone.tsx is named in ALLOWED but does not exist: moved? update the entry or delete it",
    ]);
  });

  it("accepts an import-path spelling when an extension is given", () => {
    expect(missingNamedFiles("g", "M", ["a"], { root: "/r", exists, extensions: ["", ".tsx"] })).toEqual([]);
    expect(missingNamedFiles("g", "M", ["a"], { root: "/r", exists })).toHaveLength(1);
  });

  it("reads the real disk by default", () => {
    expect(missingNamedFiles("g", "M", ["scripts/lib/named-files.mjs"])).toEqual([]);
    expect(missingNamedFiles("g", "M", ["scripts/lib/no-such-file.mjs"])).toHaveLength(1);
  });
});

describe("staleNamedEntries", () => {
  it("passes an entry whose file still holds the thing, by regex or predicate", () => {
    expect(
      staleNamedEntries("g", "ALLOWED", [
        { path: "a.tsx", holds: /<input/, what: "an <input>" },
        { path: "a.tsx", holds: (t: string) => t.length > 3, what: "text" },
      ], opts),
    ).toEqual([]);
  });

  it("reports a missing file the way missingNamedFiles does", () => {
    expect(staleNamedEntries("g", "ALLOWED", [{ path: "gone.tsx", holds: /x/, what: "x" }], opts)).toEqual([
      "g: gone.tsx is named in ALLOWED but does not exist: moved? update the entry or delete it",
    ]);
  });

  it("reports a file that exists but no longer holds the thing as a stale entry", () => {
    const [msg] = staleNamedEntries("g", "ALLOWED", [{ path: "b.tsx", holds: /<input/, what: "an <input>" }], opts);
    expect(msg).toContain("g: stale entry b.tsx in ALLOWED");
    expect(msg).toContain("no longer contains an <input>");
  });

  it("is not fooled by a global regex's lastIndex across entries", () => {
    const holds = /<input/g;
    const entries = [1, 2, 3].map(() => ({ path: "a.tsx", holds, what: "an <input>" }));
    expect(staleNamedEntries("g", "ALLOWED", entries, opts)).toEqual([]);
  });
});

describe("assert variants", () => {
  it("throw the joined messages, and are silent when nothing is stale", () => {
    expect(() => assertNamedFiles("g", "M", ["a.tsx"], opts)).not.toThrow();
    expect(() => assertNamedFiles("g", "M", ["x.tsx", "y.tsx"], opts)).toThrow(/x\.tsx[\s\S]*y\.tsx/);
    expect(() => assertNamedEntries("g", "M", [{ path: "b.tsx", holds: /<input/, what: "an <input>" }], opts)).toThrow(/stale entry b\.tsx/);
  });
});
