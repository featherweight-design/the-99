import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { UploadPreview } from "../../app/collection/actions";
import { ReviewScreen } from "./review-screen";

const preview = (over: Partial<UploadPreview>): UploadPreview => ({
  uploadId: "u",
  matchedCardCount: 1,
  unmatchedRows: [{ name: "X", setCode: "abc", line: 2, quantity: 1 }],
  skippedByDesignCount: 1,
  parseErrors: [{ line: 3, reason: "bad" }],
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
    expect(t).not.toMatch(/\b1\s*(rows|cards|unreadable lines|token and emblem rows)/);
    expect(t).toMatch(/ · 1 row/);
    expect(t).toMatch(/1\s*card matched & ready/);
    expect(t).toMatch(/card matched to the Oracle database/);
    expect(t).not.toMatch(/cards matched/);
    expect(t).toMatch(/1\s*unreadable line(?!s)/);
    expect(t).toMatch(/1\s*token and emblem row skipped/);
    expect(t).toMatch(/1\s*row read/);
    expect(t).toMatch(/replaces your 1 card with/);
  });

  const oneSkipped = { skippedByDesignCount: 0, parseErrors: [] };

  it("says 1 row will be skipped, and skips 1 row, on a replace", () => {
    const t = text(preview({ ...oneSkipped, currentCollectionCount: 7 }));
    expect(t).toMatch(/1 row will be skipped/);
    expect(t).toMatch(/Skips 1 row · replaces your 7 cards/);
    expect(t).not.toMatch(/\b1\s*rows/);
  });

  it("says imports 1 card and skips 1 row on a first import", () => {
    const t = text(preview({ ...oneSkipped, currentCollectionCount: 0 }));
    expect(t).toMatch(/Imports 1 card · skips 1 row/);
    expect(t).not.toMatch(/\b1\s*(rows|cards)/);
  });

  it("keeps the plural for more than one", () => {
    const t = text(preview({ rowCount: 5, matchedCardCount: 4, currentCollectionCount: 3, skippedByDesignCount: 2 }));
    expect(t).toMatch(/5 rows/);
    expect(t).toMatch(/4 cards/);
  });
});
