import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { UploadPreview } from "../../app/collection/actions";
import { ReviewScreen } from "./review-screen";

const preview = (over: Partial<UploadPreview>): UploadPreview => ({
  uploadId: "u",
  matchedCardCount: 1,
  unmatchedRows: [{ name: "X", setCode: "abc", line: 2, quantity: 1 }],
  skippedByDesignCount: 1,
  parseErrors: [],
  currentCollectionCount: 1,
  filename: "c.csv",
  rowCount: 1,
  ...over,
});

const text = (p: UploadPreview) => {
  const { container } = render(
    <ReviewScreen preview={p} onCancel={() => {}} onContinue={() => {}} />,
  );
  return container.textContent ?? "";
};

describe("ReviewScreen counts", () => {
  it("says 1 row and 1 card, never 1 rows or 1 cards", () => {
    const t = text(preview({}));
    expect(t).not.toMatch(/\b1 (rows|cards)\b/);
    expect(t).toMatch(/1 row\b/);
    expect(t).toMatch(/1 card\b/);
  });

  it("keeps the plural for more than one", () => {
    const t = text(preview({ rowCount: 5, matchedCardCount: 4, currentCollectionCount: 3, skippedByDesignCount: 2 }));
    expect(t).toMatch(/5 rows/);
    expect(t).toMatch(/4 cards/);
  });
});
