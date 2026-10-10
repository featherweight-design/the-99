import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeckStatsView } from "./deck-stats-view";
import { deckStatsCopy } from "../../lib/copy/deck-stats";
import { manaCurve, typeCurve } from "../../lib/decks/stats";

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

const list = [
  { cmc: 2, quantity: 3, typeLine: "Creature — Elf" },
  { cmc: 3, quantity: 1, typeLine: "Instant" },
  { cmc: 0, quantity: 36, typeLine: "Basic Land — Forest" },
];
const slice = { curve: manaCurve(list), types: typeCurve(list) };

describe("DeckStatsView curve card", () => {
  it("draws one square per cast copy and keeps zero-count chips", () => {
    const { container } = render(<DeckStatsView data={slice} />);
    expect(container.querySelectorAll("[data-curve-square]")).toHaveLength(4);
    expect(container.querySelector("[data-type-chip=battle]")).not.toBeNull();
    expect(container.querySelector("[data-type-chip=land]")).toHaveTextContent("Land 36");
  });

  it("bottom-aligns every column so the bucket rules share one baseline", () => {
    const { container } = render(<DeckStatsView data={slice} />);
    const columns = container.querySelectorAll("[data-curve-column]");
    expect(columns).toHaveLength(8);
    columns.forEach((c) => expect(c).toHaveClass("justify-end"));
  });

  it("hides the squares and names each bucket's types in text", () => {
    const { container } = render(<DeckStatsView data={slice} />);
    container.querySelectorAll("[data-curve-square]").forEach((q) => expect(q.parentElement).toHaveAttribute("aria-hidden", "true"));
    const sums = Array.from(container.querySelectorAll("[data-curve-summary]")).map((e) => e.textContent);
    expect(sums).toHaveLength(8);
    expect(sums[2]).toBe("Mana value 2: 3 cards, 3 Creatures");
    expect(sums[3]).toBe("Mana value 3: 1 card, 1 Instant");
    expect(sums[0]).toBe("Mana value 0: no cards");
  });

  it("hides each visual bucket count and axis label so the summary is the only announcement", () => {
    const { container } = render(<DeckStatsView data={slice} />);
    container.querySelectorAll("[data-curve-column]").forEach((c) => {
      const count = c.querySelector(":scope > span:first-child");
      expect(count).toHaveAttribute("aria-hidden", "true");
      const visible = Array.from(c.querySelectorAll(":scope > span:not([aria-hidden])"));
      expect(visible.map((e) => e.hasAttribute("data-curve-summary"))).toEqual([true]);
    });
  });

  it("announces the whole caption when a chip lights", () => {
    const { container } = render(<DeckStatsView data={slice} />);
    const live = container.querySelector("[aria-live=polite]");
    expect(live).toHaveAttribute("aria-atomic", "true");
  });

  it("lights one type on tap and clears on a second tap", () => {
    const { container } = render(<DeckStatsView data={slice} />);
    const chip = container.querySelector("[data-type-chip=creature]") as HTMLElement;
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    const card = within(screen.getByRole("figure", { name: /^The curve/ }));
    expect(card.getByText(deckStatsCopy.curve.lit("Creature", 3, 4))).toBeInTheDocument();
    const bg = (t: string) => (container.querySelector(`[data-curve-square=${t}]`) as HTMLElement).style.background;
    expect(bg("creature")).toBe("var(--type-creature)");
    expect(bg("instant")).toBe("var(--border-strong)");
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(bg("instant")).toBe("var(--type-instant)");
  });

  it("names no average for a deck with nothing cast", () => {
    const none = [{ cmc: 0, quantity: 99, typeLine: "Basic Land — Forest" }];
    render(<DeckStatsView data={{ curve: manaCurve(none), types: typeCurve(none) }} />);
    expect(screen.getByText(/average mana value none/)).toBeInTheDocument();
  });
});

describe("DeckStatsView caption", () => {
  it("says one land in the singular", () => {
    const one = [{ cmc: 2, quantity: 1, typeLine: "Creature — Elf" }, { cmc: 0, quantity: 1, typeLine: "Basic Land — Forest" }];
    render(<DeckStatsView data={{ curve: manaCurve(one), types: typeCurve(one) }} />);
    expect(screen.getByText(/· 1 land, not on the curve/)).toBeInTheDocument();
  });

  it("says 0 lands for a castable deck with none", () => {
    const zero = [{ cmc: 2, quantity: 1, typeLine: "Creature — Elf" }];
    render(<DeckStatsView data={{ curve: manaCurve(zero), types: typeCurve(zero) }} />);
    expect(screen.getByText(/· 0 lands, not on the curve/)).toBeInTheDocument();
    expect(document.querySelector('[data-type-chip="land"]')).toHaveTextContent("0");
  });
});
