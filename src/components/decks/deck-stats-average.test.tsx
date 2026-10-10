import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { jobTally } from "../../lib/decks/job-tally";
import { manaCurve, typeCurve } from "../../lib/decks/stats";
import { averageComparison, type AverageDeck } from "../../lib/decks/stats-average";
import { DeckStatsView } from "./deck-stats-view";

const TARGETS = { land: 36, basic: 20, nonbasic: 16, creature: 26, instant: 8, sorcery: 9, artifact: 10, enchantment: 6, planeswalker: 1, battle: 0 };
const avg = (over: Partial<AverageDeck> = {}): AverageDeck => ({
  basis: { of: "commander", names: ["Korvold, Fae-Cursed King"], label: "", decks: 1812 },
  targets: TARGETS,
  curve: [1, 9, 14, 13, 11, 8, 4, 4],
  manaValue: 3.4,
  roles: { ramp: 11.4, draw: 10.2, removal: 7.9, wipes: 2.6 },
  ...over,
});
const cards = [
  { cmc: 0, typeLine: "Land", quantity: 33 },
  { cmc: 2, typeLine: "Creature", quantity: 14 },
  { cmc: 3, typeLine: "Instant", quantity: 9 },
];
const draw = (a: AverageDeck, count = 99) => {
  const jobs = jobTally([{ oracleId: "r", name: "R", copies: 12 }], { r: ["ramp"] });
  const average = averageComparison(a, { curve: manaCurve(cards), types: typeCurve(cards), jobs, cards: count });
  return render(<DeckStatsView data={{ curve: manaCurve(cards), types: typeCurve(cards), average }} />);
};
const card = () => screen.getByRole("figure", { name: /^Against the average deck/ });

describe("DeckStatsView average card", () => {
  it("names its denominator in the label and the basis under the title", () => {
    draw(avg());
    expect(screen.getByRole("figure", { name: "Against the average deck, 1,812 decks" })).toBeInTheDocument();
    expect(card()).toHaveTextContent("minus the average Korvold, Fae-Cursed King deck’s, from EDHREC’s 1,812 decks.");
    expect(card()).toHaveTextContent("Counts the 99, not the commander.");
  });

  it("states each row whole in its label, with the average and the difference in words", () => {
    draw(avg());
    expect(screen.getByLabelText("Lands: this deck 33, average 36, 3 fewer")).toBeInTheDocument();
    expect(screen.getByLabelText("Ramp: this deck 12, average 11.4, 0.6 more")).toBeInTheDocument();
    expect(screen.getByLabelText("Mana value: this deck 2.4, average 3.4, 1 lower")).toBeInTheDocument();
    expect(screen.getByLabelText("Board wipes: this deck 0, average 2.6, 2.6 fewer")).toBeInTheDocument();
  });

  it("draws a bar to the side of the difference only, and a mark where it is cut off", () => {
    const { container } = draw(avg());
    const lands = container.querySelector('[data-average-row="lands"]')!;
    expect((lands.querySelector('[data-bar="fewer"]') as HTMLElement).style.width).toBe("75%");
    expect((lands.querySelector('[data-bar="more"]') as HTMLElement).style.width).toBe("0%");
    expect(lands.querySelector("[data-cut]")).toBeNull();
    // A gap past the scale is cut (the words read 1 lower, the raw gap is 1.009); one inside it is not.
    expect(container.querySelector('[data-average-row="instant"] [data-cut]')).toBeNull();
    const creatures = container.querySelector('[data-average-row="creature"]')!;
    expect(creatures.querySelector('[data-cut="fewer"]')).not.toBeNull();
    expect(container.querySelector('[data-average-row="battle"] [data-cut]')).toBeNull();
  });

  it("draws eight mini curve columns, more above the line and fewer below", () => {
    const { container } = draw(avg());
    const cols = container.querySelectorAll("[data-average-curve] li");
    expect(cols).toHaveLength(8);
    expect(cols[0]).toHaveAttribute("aria-label", "Mana value 0: 1.0 fewer than the average");
    expect(cols[2]).toHaveAttribute("aria-label", "Mana value 2: the same as the average");
  });

  it("names the pair, the colors and the starting mix", () => {
    const { unmount } = draw(avg({ basis: { of: "pair", names: ["Tymna", "Kraum"], label: "", decks: 812 } }));
    expect(card()).toHaveTextContent("minus the average Tymna and Kraum deck’s, from EDHREC’s 812 decks.");
    unmount();
    const id = draw(avg({ basis: { of: "identity", names: ["X"], label: "Jund", decks: null } }));
    expect(card()).toHaveTextContent("minus the average Jund deck’s.");
    expect(screen.getByRole("figure", { name: "Against the average deck, Jund decks" })).toBeInTheDocument();
    id.unmount();
    draw(avg({ basis: { of: "baseline", names: ["Aang, at the Crossroads"], label: "", decks: null }, targets: null, curve: null, manaValue: null }));
    expect(card()).toHaveTextContent("Aang, at the Crossroads has no average yet");
    expect(card()).toHaveTextContent("The starting mix has jobs only");
    expect(card().querySelector("[data-average-curve]")).toBeNull();
    expect(card().querySelector('[data-average-group="shape"]')).toBeNull();
    expect(card().querySelector('[data-average-group="jobs"]')).not.toBeNull();
  });

  it("explains a short deck whose bars are cut off", () => {
    draw(avg(), 56);
    expect(card()).toHaveTextContent("56 of 99 cards so far.");
  });

  it("stays a shell without the basis", () => {
    render(<DeckStatsView data={{ curve: manaCurve(cards), types: typeCurve(cards), average: null }} />);
    expect(screen.getByRole("figure", { name: "Against the average deck" })).toBeInTheDocument();
    expect(document.querySelector("[data-average-basis]")).toBeNull();
  });
});
