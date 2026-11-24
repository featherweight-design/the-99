import { describe, expect, it } from "vitest";
import { keyLabel } from "./key-label";

describe("keyLabel", () => {
  it("names the file and drops the export's name", () => {
    expect(keyLabel("src/lib/copy/help-me-choose.ts#helpCopy.intake.title")).toEqual({ file: "help-me-choose", path: "intake.title" });
  });
  it("keeps a branch suffix on the leaf", () => {
    expect(keyLabel("src/lib/copy/about-pages.ts#ABOUT_PAGE_STRINGS.moreTools#t1")).toEqual({ file: "about-pages", path: "moreTools#t1" });
  });
  it("leaves a bare export alone", () => {
    expect(keyLabel("src/lib/copy/x.ts#title")).toEqual({ file: "x", path: "title" });
  });
});
