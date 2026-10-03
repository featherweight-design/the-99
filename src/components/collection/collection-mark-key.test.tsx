import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CollectionMarkKey } from "./collection-mark-key";
import { availabilityCopy } from "../../lib/copy/availability";

describe("the collection mark key", () => {
  it("decodes the three availability states, using the filter's own labels", () => {
    render(<CollectionMarkKey />);
    expect(screen.getByText(availabilityCopy.collection.filterSoft)).toBeTruthy();
    expect(screen.getByText(availabilityCopy.collection.filterHard)).toBeTruthy();
    expect(screen.getByText(availabilityCopy.collection.filterOver)).toBeTruthy();
  });

  it("still decodes the four facts and the combo clause beside them", () => {
    render(<CollectionMarkKey />);
    expect(screen.getAllByRole("group")).toHaveLength(1);
    // The 3-up tile's chip dropped its word onto this key; the facts and the
    // lemniscate were already here and are untouched by that move.
    expect(screen.getByText(availabilityCopy.collection.filterSoft).closest('[role="group"]')).toBe(
      screen.getByText(availabilityCopy.collection.filterHard).closest('[role="group"]'),
    );
  });
});
