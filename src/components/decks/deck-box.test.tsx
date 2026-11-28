import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { bandName, BandText, DeckBox, DeckBoxBand, splitBand } from "./deck-box";

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

  it("truncates the title alone, so the count never wraps or leaves the band (#3440)", () => {
    render(<DeckBoxBand title="Fixture title" count={3} aside={<span>Fixture aside</span>} />);
    const title = screen.getByText("Fixture title");
    expect(title.className).toContain("truncate");
    expect(title.className).toContain("min-w-0");
    const count = screen.getByText("3");
    expect(title.contains(count)).toBe(false);
    expect(count.parentElement?.className).toContain("flex-none");
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

describe("BandText", () => {
  it("splits a count off the last separator, and draws a copy with none as the title alone", () => {
    expect(splitBand("Fixture head · 4")).toEqual({ title: "Fixture head", count: "4" });
    expect(splitBand("Fixture head")).toEqual({ title: "Fixture head" });
    expect(splitBand("Fixture · odd head · 4")).toEqual({ title: "Fixture · odd head", count: "4" });
    expect(bandName("Fixture · odd head · 4")).toBe("Fixture · odd head 4");
  });

  it("names a heading by its title and count, with the diamond hidden from the name", () => {
    render(<h2><BandText text="Fixture · odd head · 4" /></h2>);
    expect(screen.getByRole("heading", { name: "Fixture · odd head 4" })).toBeTruthy();
    render(<h3><BandText text="Fixture head" /></h3>);
    expect(screen.getByRole("heading", { name: "Fixture head" })).toBeTruthy();
  });
});
