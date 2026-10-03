import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommitmentsCard } from "./commitments-card";

const shopping = (copies: number, cents: number) => ({
  byDeck: new Map(),
  total: { copies, cents, pricedCopies: copies },
});

describe("CommitmentsCard", () => {
  it("prints cards in use against the collection's total copies", () => {
    render(
      <CommitmentsCard
        commitments={{ inUse: 312, overCommitted: 3 }}
        shopping={shopping(18, 9480)}
        totalCards={1284}
      />,
    );
    expect(screen.getByText("312 of 1,284")).toBeInTheDocument();
  });

  it("prints the over-committed figure in cards, singular at one", () => {
    render(
      <CommitmentsCard
        commitments={{ inUse: 0, overCommitted: 1 }}
        shopping={shopping(0, 0)}
        totalCards={10}
      />,
    );
    expect(screen.getByText("1 card")).toBeInTheDocument();
  });

  it("prints the shopping total as copies and money", () => {
    render(
      <CommitmentsCard
        commitments={{ inUse: 0, overCommitted: 0 }}
        shopping={shopping(18, 9480)}
        totalCards={10}
      />,
    );
    expect(screen.getByText("18 · $94.80")).toBeInTheDocument();
  });

  it("still renders every row at zero — a zero here is a fact, not an absence", () => {
    render(
      <CommitmentsCard
        commitments={{ inUse: 0, overCommitted: 0 }}
        shopping={shopping(0, 0)}
        totalCards={0}
      />,
    );
    expect(screen.getByText("0 of 0")).toBeInTheDocument();
    expect(screen.getByText("0 cards")).toBeInTheDocument();
    expect(screen.getByText("0 · $0.00")).toBeInTheDocument();
  });

  it("routes to the commitments review", () => {
    render(
      <CommitmentsCard
        commitments={{ inUse: 0, overCommitted: 0 }}
        shopping={shopping(0, 0)}
        totalCards={0}
      />,
    );
    expect(screen.getByRole("link", { name: "Review commitments" })).toBeInTheDocument();
  });

  it("reviews the over-committed cards alone, not the merely sleeved ones (H2)", () => {
    render(
      <CommitmentsCard
        commitments={{ inUse: 1015, overCommitted: 43 }}
        shopping={shopping(18, 9480)}
        totalCards={1284}
      />,
    );
    expect(screen.getByRole("link", { name: "Review commitments" }).getAttribute("href")).toBe(
      "/collection?avail=over",
    );
  });
});
