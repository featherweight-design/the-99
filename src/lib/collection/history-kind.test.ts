import { describe, expect, it } from "vitest";
import { historyKindOf } from "./history-kind";

describe("historyKindOf", () => {
  it("maps each ledger kind to the list's kind", () => {
    expect(historyKindOf({ kind: "upload_replace", removesOnly: false, source: null })).toBe("uploadReplace");
    expect(historyKindOf({ kind: "upload_add", removesOnly: false, source: null })).toBe("uploadAdd");
    expect(historyKindOf({ kind: "add", removesOnly: false, source: null })).toBe("add");
    expect(historyKindOf({ kind: "revert", removesOnly: false, source: null })).toBe("revert");
  });

  it("reads an edit that leaves every row at zero as a removal, and only an edit", () => {
    expect(historyKindOf({ kind: "edit", removesOnly: true, source: null })).toBe("remove");
    expect(historyKindOf({ kind: "edit", removesOnly: false, source: null })).toBe("edit");
    // A revert or an upload that empties every row it touched is still that revert or upload.
    expect(historyKindOf({ kind: "revert", removesOnly: true, source: null })).toBe("revert");
    expect(historyKindOf({ kind: "upload_replace", removesOnly: true, source: null })).toBe("uploadReplace");
  });

  it("reads an edit sourced from a deck's Shopping list as From Shopping, and only an edit", () => {
    expect(historyKindOf({ kind: "edit", removesOnly: false, source: "shopping:7284ff0a-6e76-4dc0-8af5-fc630a403b2b" })).toBe("shopping");
    expect(historyKindOf({ kind: "edit", removesOnly: false, source: "details" })).toBe("edit");
    // The undo of a purchase is a revert, whatever the source it reverted.
    expect(historyKindOf({ kind: "revert", removesOnly: true, source: "shopping:x" })).toBe("revert");
  });
});
