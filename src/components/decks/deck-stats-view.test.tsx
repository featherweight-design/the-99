import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeckStatsView } from "./deck-stats-view";
import { deckStatsCopy } from "../../lib/copy/deck-stats";

describe("DeckStatsView shells", () => {
  it("draws six titled figures and nothing else", () => {
    render(<DeckStatsView />);
    const figures = screen.getAllByRole("figure");
    expect(figures).toHaveLength(6);
    for (const title of Object.values(deckStatsCopy.cards)) {
      expect(screen.getByRole("figure", { name: title })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
