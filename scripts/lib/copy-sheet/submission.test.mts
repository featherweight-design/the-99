import { describe, expect, it } from "vitest";
import { EDIT_BRANCH_RE, editBranch, MAX_EDITS, MAX_TEXT, parseSubmission } from "./submission.mjs";

const edit = (over: Record<string, unknown> = {}) => ({ key: "src/lib/copy/a.ts#x.y", from: "Zork plinth one", to: "Zork plinth two", ...over });

describe("editBranch", () => {
  it("names the branch in UTC to the second, and the workflow's pattern accepts it", () => {
    const name = editBranch(new Date("2026-11-24T18:35:12Z"));
    expect(name).toBe("copy-edit-20261124-183512");
    expect(EDIT_BRANCH_RE.test(name)).toBe(true);
  });

  it("refuses anything but that shape", () => {
    for (const bad of ["copy-edit-2026", "copy-edit-20261124-183512; rm -rf", "x/copy-edit-20261124-183512", "copy-edit-20261124-183512\n", "main"]) {
      expect(EDIT_BRANCH_RE.test(bad)).toBe(false);
    }
  });
});

describe("parseSubmission", () => {
  it("keeps the three fields of each edit and drops the rest", () => {
    expect(parseSubmission({ edits: [edit({ extra: "x" })] })).toEqual({ edits: [edit()] });
  });

  it.each([
    ["no body", null],
    ["no list", {}],
    ["an empty list", { edits: [] }],
    ["a text that is not text", { edits: [edit({ to: 3 })] }],
    ["a key outside the copy folder", { edits: [edit({ key: "src/lib/other.ts#x" })] }],
    ["a key with a shell character", { edits: [edit({ key: "src/lib/copy/a.ts#x;ls" })] }],
    ["an empty new text", { edits: [edit({ to: "" })] }],
    ["an unchanged text", { edits: [edit({ to: "Zork plinth one" })] }],
    ["a repeated key", { edits: [edit(), edit()] }],
    ["a new text over the cap", { edits: [edit({ to: "z".repeat(MAX_TEXT + 1) })] }],
  ])("refuses %s", (_name, body) => {
    expect(parseSubmission(body)).toHaveProperty("error");
  });

  it("refuses more than the cap of edits", () => {
    const edits = Array.from({ length: MAX_EDITS + 1 }, (_, i) => edit({ key: `src/lib/copy/a.ts#k${i}` }));
    expect(parseSubmission({ edits })).toHaveProperty("error");
  });
});
