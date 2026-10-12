import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PreconArrivalBand } from "./arrival-strip";

const arrival = { name: "Eldrazi Unbound", setCode: "CMM", cards: 100, unmapped: 0, owned: 74, of: 85 };

describe("PreconArrivalBand (precons S2, S2b)", () => {
  it("names the precon, what you own, and what went to Shopping", () => {
    render(<PreconArrivalBand deckId="d1" arrival={arrival} />);
    expect(screen.getByText("Started from the Eldrazi Unbound precon")).toBeInTheDocument();
    expect(screen.getByText(
      "All 100 cards are in, as the precon lists them. You own 74 of its 85, and the 11 you don’t are in Shopping. It’s a draft until you commit it.",
    )).toBeInTheDocument();
    expect(screen.getByText("CMM · printings picked from the copies you hold")).toBeInTheDocument();
  });

  it("says what the catalog lacks when it could not map every card", () => {
    render(<PreconArrivalBand deckId="d3" arrival={{ ...arrival, cards: 99, unmapped: 1 }} />);
    expect(screen.getByText(/^99 cards are in\. 1 more from the precon isn’t in our catalog yet\./)).toBeInTheDocument();
    expect(screen.queryByText(/as the precon lists them/)).toBeNull();
  });

  it("drops the Shopping clause when you own every card", () => {
    render(<PreconArrivalBand deckId="d2" arrival={{ ...arrival, owned: 85 }} />);
    expect(screen.getByText(/You own every one\./)).toBeInTheDocument();
    expect(screen.queryByText(/Shopping/)).toBeNull();
  });
});
