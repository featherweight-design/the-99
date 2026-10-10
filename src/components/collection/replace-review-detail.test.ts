import { describe, expect, it } from "vitest";
import { overwriteLine } from "./replace-review-detail";

const base = { editsSinceUpload: 3, lastUploadAt: "2026-09-12T10:00:00.000Z", historyReaches: true };

describe("overwriteLine", () => {
  it("quotes the count and the upload's date when history reaches it", () => {
    expect(overwriteLine(base)).toBe("This overwrites 3 changes you made in the app since your Sep 12 upload.");
    expect(overwriteLine({ ...base, editsSinceUpload: 1 })).toContain("1 change you made");
  });

  it("says nothing when history reaches and nothing was changed", () => {
    expect(overwriteLine({ ...base, editsSinceUpload: 0 })).toBeNull();
  });

  it("never quotes a number the history cannot back", () => {
    const line = overwriteLine({ ...base, historyReaches: false })!;
    expect(line).toMatch(/may overwrite changes/);
    expect(line).toContain("Sep 12");
    expect(line).not.toMatch(/\d+ changes/);
  });

  it("with no upload ever, counts every change made in the app", () => {
    expect(overwriteLine({ editsSinceUpload: 4, lastUploadAt: null, historyReaches: false })).toBe(
      "This overwrites 4 changes you made in the app.",
    );
    expect(overwriteLine({ editsSinceUpload: 0, lastUploadAt: null, historyReaches: false })).toBeNull();
  });
});
