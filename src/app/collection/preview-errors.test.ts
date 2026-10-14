import { describe, expect, it, vi } from "vitest";
import { importReviewCopy } from "../../lib/copy/import-review";

// Only the zero-row guard is under test: a list the parser could make nothing of must say so in
// the words of the entry it came through (a pasted list is not a file).
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, updateTag: () => {} }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("../../db", () => ({ db: {} }));
vi.mock("../../lib/collection/import", () => ({ replaceCollection: vi.fn(), loadMatchInputs: vi.fn() }));

const { previewPaste, previewUpload } = await import("./actions");

describe("a preview that reads no card rows", () => {
  it("says list, with the parser's reason, for a pasted list", async () => {
    await expect(previewPaste("3")).rejects.toThrow(/^We couldn’t read that list: /);
  });

  it("says list, with no reason, for a paste with no rows at all", async () => {
    await expect(previewPaste("")).rejects.toThrow(importReviewCopy.errors.pasteUnreadable);
  });

  it("says file, with the parser's reason, for an uploaded file", async () => {
    const fd = new FormData();
    fd.set("file", new File(["3"], "cards.csv", { type: "text/csv" }));
    await expect(previewUpload(fd)).rejects.toThrow(/^We couldn’t read this file: /);
  });

  it("says file, with the parser's reason, for an empty file", async () => {
    const fd = new FormData();
    fd.set("file", new File([""], "cards.csv", { type: "text/csv" }));
    await expect(previewUpload(fd)).rejects.toThrow(/^We couldn’t read this file: /);
  });
});
