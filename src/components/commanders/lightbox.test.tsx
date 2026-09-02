import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommanderLightbox, type LightboxCommander } from "./lightbox";

function commander(overrides: Partial<LightboxCommander> = {}): LightboxCommander {
  return {
    name: "Krenko, Mob Boss",
    manaCost: "{2}{R}{R}",
    typeLine: "Legendary Creature — Goblin Warrior",
    oracleText: "Tap: Create X 1/1 red Goblin creature tokens.",
    colorIdentity: ["R"],
    imageUri: null,
    ...overrides,
  };
}

describe("CommanderLightbox", () => {
  // The surface is called "Full card". It drew one — name, pips and oracle text
  // over an identity gradient — even for a commander whose real card art the
  // catalog already had, so "Full card" opened onto something that was not the
  // card.
  it("shows the real card when the catalog has one", () => {
    render(
      <CommanderLightbox
        commander={commander({ imageUri: "https://cards.scryfall.io/normal/krenko.jpg" })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByAltText("Krenko, Mob Boss")).toHaveAttribute(
      "src",
      "https://cards.scryfall.io/normal/krenko.jpg",
    );
  });

  // The image carries the rules text as pixels, so the text ships alongside it.
  it("keeps the type line and oracle text readable beside the image", () => {
    render(
      <CommanderLightbox
        commander={commander({ imageUri: "https://cards.scryfall.io/normal/krenko.jpg" })}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Legendary Creature — Goblin Warrior.*Create X 1\/1 red Goblin/),
    ).toBeInTheDocument();
  });

  it("falls back to the drawn frame when there is no image", () => {
    render(<CommanderLightbox commander={commander()} onClose={vi.fn()} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("heading", { name: "Krenko, Mob Boss" })).toBeInTheDocument();
    expect(screen.getByText("Legendary Creature — Goblin Warrior")).toBeInTheDocument();
  });
});
