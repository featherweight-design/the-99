import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { DeckSearchField } from "./deck-filter-column";

function Host({ size }: { size: "column" | "sheet" }) {
  const [q, setQ] = useState("elves");
  return <DeckSearchField value={q} onChange={setQ} size={size} />;
}

// The deck list's and the precon list's field is the shared `SearchField` now: it had no clear, and Safari's
// own cancel button is suppressed, so a typed search could only be deleted by hand.
describe("DeckSearchField", () => {
  for (const size of ["column", "sheet"] as const) {
    it(`clears in one tap and keeps focus (${size})`, () => {
      render(<Host size={size} />);
      const input = screen.getByRole("searchbox") as HTMLInputElement;
      const clear = screen.getByRole("button", { name: "Clear search" });
      expect(fireEvent.mouseDown(clear)).toBe(false);
      fireEvent.click(clear);
      expect(input.value).toBe("");
      expect(document.activeElement).toBe(input);
    });
  }
});
