import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../../app/decks/assignment-actions", () => ({ assignCopy: vi.fn() }));

import { AddedCopyFigureBody } from "./purchase-figures";
import { ADDED_COPY_ROWS } from "../../lib/about/fixtures";
import { addedCopyCopy } from "../../lib/copy/added-copy";

describe("AddedCopyFigureBody", () => {
  it("draws each row's sentence and its Change", () => {
    render(<AddedCopyFigureBody />);
    for (const r of ADDED_COPY_ROWS) {
      expect(screen.getByText(r.sentence)).toBeTruthy();
      expect(screen.getByRole("button", { name: addedCopyCopy.changeAria(r.cardName) })).toBeTruthy();
    }
  });
});
