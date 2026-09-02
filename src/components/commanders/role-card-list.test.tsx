// Role Coverage chips: truncation, and the chip opening card detail. Tested at
// the list rather than through CommanderDetail, which renders every role panel
// twice (mobile band + desktop column) and would double every count here.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import type { RoleCard } from "../../lib/recs/score";
import { RoleCardList } from "./role-card-list";
import { CardDetailProvider } from "../decks/card-detail-provider";

vi.mock("../../app/card-detail-action", () => ({
  getCardDetail: vi.fn(async () => null),
}));

function cards(n: number): RoleCard[] {
  return Array.from({ length: n }, (_, i) => ({
    oracleId: `oracle-${i}`,
    name: `Card ${i}`,
  }));
}

function renderList(list: RoleCard[], fetchCard?: (id: string) => Promise<BrowseCard | null>) {
  return render(
    <CardDetailProvider fetchCard={fetchCard ?? (async () => null)}>
      <RoleCardList cards={list} emptyLabel="No ramp cards in your pool" />
    </CardDetailProvider>,
  );
}

describe("RoleCardList", () => {
  it("shows every card when the pool is short enough to read", () => {
    renderList(cards(9));
    expect(screen.getAllByRole("button")).toHaveLength(9);
    expect(screen.queryByText(/Show \d+ more/)).not.toBeInTheDocument();
  });

  // The reported bug: a well-stocked pool put hundreds of chips under one role
  // and pushed the panels below it off the page.
  it("truncates a long pool and names how many are left", () => {
    renderList(cards(40));
    expect(screen.getAllByText(/^Card \d+$/)).toHaveLength(12);
    expect(screen.getByRole("button", { name: "Show 28 more" })).toBeInTheDocument();
  });

  it("reveals the rest and collapses again", () => {
    renderList(cards(40));
    fireEvent.click(screen.getByRole("button", { name: "Show 28 more" }));
    expect(screen.getAllByText(/^Card \d+$/)).toHaveLength(40);

    fireEvent.click(screen.getByRole("button", { name: "Show fewer" }));
    expect(screen.getAllByText(/^Card \d+$/)).toHaveLength(12);
  });

  // The chips it reveals are its own siblings, so the toggle is a disclosure and
  // a screen reader should hear which way it currently sits.
  it("reports the disclosure state on the toggle", () => {
    renderList(cards(40));
    const toggle = screen.getByRole("button", { name: "Show 28 more" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Show fewer" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("opens card detail for the chip that was clicked", async () => {
    const fetchCard = vi.fn(async () => null);
    renderList(cards(3), fetchCard);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "View details for Card 1" }));
    });
    expect(fetchCard).toHaveBeenCalledWith("oracle-1");
  });

  it("says so rather than rendering an empty row when the pool has none", () => {
    renderList([]);
    expect(screen.getByText("No ramp cards in your pool")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
