import { describe, expect, it } from "vitest";
import { historyKindOf } from "./history-kind";

describe("historyKindOf", () => {
  it("maps each ledger kind to the list's kind", () => {
    expect(historyKindOf({ kind: "upload_replace", removesOnly: false })).toBe("uploadReplace");
    expect(historyKindOf({ kind: "upload_add", removesOnly: false })).toBe("uploadAdd");
    expect(historyKindOf({ kind: "add", removesOnly: false })).toBe("add");
    expect(historyKindOf({ kind: "revert", removesOnly: false })).toBe("revert");
  });

  it("reads an edit that leaves every row at zero as a removal, and only an edit", () => {
    expect(historyKindOf({ kind: "edit", removesOnly: true })).toBe("remove");
    expect(historyKindOf({ kind: "edit", removesOnly: false })).toBe("edit");
    // A revert or an upload that empties every row it touched is still that revert or upload.
    expect(historyKindOf({ kind: "revert", removesOnly: true })).toBe("revert");
    expect(historyKindOf({ kind: "upload_replace", removesOnly: true })).toBe("uploadReplace");
  });
});
