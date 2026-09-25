import { describe, expect, it } from "vitest";
import { ABOUT_VERSION, aboutEntries } from "../copy/about";
import { readSheetState } from "./sheet-state";

const h = (v?: string) => new Headers(v === undefined ? {} : { "x-about-sheet": v });

describe("readSheetState", () => {
  it("draws nothing without the proxy's header", () => {
    expect(readSheetState(h())).toEqual({ kind: "none" });
  });

  it("introduces the page to a brand-new account, listing nothing", () => {
    expect(readSheetState(h("0"))).toEqual({ kind: "firstRun" });
  });

  it("lists the entries newer than the reader's seen, in page order", () => {
    const seen = ABOUT_VERSION - 1;
    const want = aboutEntries.filter((e) => e.since > seen).map((e) => ({ id: e.id, title: e.title }));
    expect(want.length).toBeGreaterThan(0);
    expect(readSheetState(h(String(seen)))).toEqual({ kind: "behind", entries: want });
  });

  it("lists more for a reader further behind", () => {
    const near = readSheetState(h(String(ABOUT_VERSION - 1)));
    const far = readSheetState(h("1"));
    expect(near.kind === "behind" && far.kind === "behind" && far.entries.length > near.entries.length).toBe(true);
  });

  it("draws nothing for a header that is not a bare non-negative integer", () => {
    for (const v of ["", "x", "-1", "1.5", "8a"]) expect(readSheetState(h(v))).toEqual({ kind: "none" });
  });

  it("draws nothing when the header names nothing new", () => {
    expect(readSheetState(h(String(ABOUT_VERSION)))).toEqual({ kind: "none" });
  });
});
