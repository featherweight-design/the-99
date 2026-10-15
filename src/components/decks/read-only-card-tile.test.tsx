import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import { ReadOnlyCardTile } from "./read-only-card-tile";

const card = (over: Partial<DeckDetailCard> = {}) => ({
  oracleId: "wastes", name: "Wastes", owned: true, quantity: 15, typeLine: "Basic Land",
  printedSetCode: "cmm", printedCollectorNumber: "287", imageUri: "https://img/w.jpg", ...over,
}) as DeckDetailCard;

const tile = (c: DeckDetailCard, basic?: { arts: number }) =>
  render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
      <ul><ReadOnlyCardTile card={c} basic={basic} /></ul>
    </CardDetailProvider>,
  );

describe("ReadOnlyCardTile", () => {
  it("says an unowned card is not owned in words beside the dot, and names the precon's printing", () => {
    tile(card({ oracleId: "sol", name: "Sol Ring", owned: false, quantity: 1, printedCollectorNumber: "312" }));
    expect(screen.getByLabelText("Not owned")).toBeInTheDocument();
    expect(screen.getByText("not owned")).toBeInTheDocument();
    expect(screen.getByText("CMM 312")).toBeInTheDocument();
  });

  it("draws an owned card with a dot and no words", () => {
    tile(card({ oracleId: "sol", name: "Sol Ring", owned: true, quantity: 1 }));
    expect(screen.getByLabelText("Owned")).toBeInTheDocument();
    expect(screen.queryByText("not owned")).toBeNull();
  });

  it("draws a basic with its copies, no dot, and its arts", () => {
    tile(card(), { arts: 3 });
    expect(screen.getByText("×15")).toBeInTheDocument();
    expect(screen.getByText("basic · not counted")).toBeInTheDocument();
    expect(screen.getByText("CMM · first of 3 arts")).toBeInTheDocument();
    expect(screen.queryByLabelText("Owned")).toBeNull();
    expect(screen.getByTestId("read-only-basic-tile")).toBeInTheDocument();
  });

  it("names a basic held in one art by its printing", () => {
    tile(card(), { arts: 1 });
    expect(screen.getByText("CMM 287")).toBeInTheDocument();
  });

  it("speaks the copies of a card held more than once in the trigger's name", () => {
    tile(card({ oracleId: "rats", name: "Relentless Rats", owned: true, quantity: 3, typeLine: "Creature — Rat" }));
    expect(screen.getByRole("button", { name: /Relentless Rats, 3 copies/ })).toBeInTheDocument();
  });
});

// The foil film (foil handoff R1): a card every copy of which the box holds in foil.
describe("ReadOnlyCardTile foil film", () => {
  it("marks the ring span foil when the box's copies are all foil, and only over art", () => {
    const { unmount } = tile(card({ printedFoil: true }));
    expect(document.querySelector("[data-foil]")?.getAttribute("data-foil")).toBe("foil");
    unmount();
    tile(card({ printedFoil: true, imageUri: null }));
    expect(document.querySelector("[data-foil]")).toBeNull();
  });
  it("draws no film for a card the box holds plain", () => {
    tile(card({ printedFoil: false }));
    expect(document.querySelector("[data-foil]")).toBeNull();
  });
});
