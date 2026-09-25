import { describe, expect, it } from "vitest";
import { aboutEntries } from "../copy/about";
import { readSheetState } from "./sheet-state";

const h = (v?: string) => new Headers(v === undefined ? {} : { "x-about-sheet": v });

describe("readSheetState", () => {
  it("draws nothing without the proxy's header", () => {
    expect(readSheetState(h())).toEqual({ kind: "none" });
  });

  it("introduces the page to a brand-new account, listing nothing", () => {
    expect(readSheetState(h("0"))).toEqual({ kind: "firstRun" });
  });

  it("lists the entries the proxy named, in page order whatever order it named them", () => {
    const want = aboutEntries.slice(-3).map((e) => ({ id: e.id, title: e.title }));
    const header = [...want].reverse().map((e) => e.id).join(",");
    expect(readSheetState(h(header))).toEqual({ kind: "behind", entries: want });
  });

  it("names nothing for an id the catalog does not hold, and draws nothing when that is all", () => {
    const [one] = aboutEntries;
    expect(readSheetState(h(`${one.id},no-such-entry`))).toEqual({
      kind: "behind",
      entries: [{ id: one.id, title: one.title }],
    });
    for (const v of ["", "no-such-entry", ","]) expect(readSheetState(h(v))).toEqual({ kind: "none" });
  });
});
