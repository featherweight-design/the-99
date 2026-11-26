import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DeckBox, DeckBoxBand } from "./deck-box";

describe("DeckBoxBand", () => {
  it("names the heading by its title and count alone, never by the aside", () => {
    render(
      <DeckBox>
        <DeckBoxBand title="Fixture title" count={3} aside={<span>Fixture aside</span>} />
      </DeckBox>,
    );
    const heading = screen.getByRole("heading");
    expect(heading.textContent).toContain("Fixture title");
    expect(heading.textContent).not.toContain("Fixture aside");
    expect(screen.getByRole("heading", { name: /^Fixture title\s*3$/ })).toBeTruthy();
    expect(heading.contains(screen.getByText("Fixture aside"))).toBe(false);
  });

  it("draws the heading at the level it is given, with the id the box is labelled by", () => {
    render(
      <DeckBox aria-labelledby="fixture-head">
        <DeckBoxBand id="fixture-head" as="h3" title="Fixture title" />
      </DeckBox>,
    );
    expect(screen.getByRole("heading", { level: 3 }).id).toBe("fixture-head");
    expect(screen.getByRole("region", { name: "Fixture title" })).toBeTruthy();
  });
});
