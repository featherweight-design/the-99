import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeckStatsView } from "./deck-stats-view";
import { manaCurve, typeCurve } from "../../lib/decks/stats";
import { manaSupply, type ManaSupplyCardRow } from "../../lib/mana/supply";

const base = { curve: manaCurve([]), types: typeCurve([]) };
const spell = (manaCost: string, quantity = 1, ramp = false): ManaSupplyCardRow => ({ typeLine: "Creature", manaCost, quantity, ramp });
const land = (produces: ManaSupplyCardRow["produces"], quantity = 1): ManaSupplyCardRow => ({ typeLine: "Land", manaCost: null, quantity, produces });
const draw = (rows: ManaSupplyCardRow[]) => render(<DeckStatsView data={{ ...base, mana: manaSupply(rows) }} />);
const card = () => screen.getByRole("figure", { name: /^Colors/ });

describe("DeckStatsView colors card", () => {
  it("states pips and lands in the figure label and draws a row per color asked for or made", () => {
    const { container } = draw([spell("{B}{B}", 2), spell("{R}"), land(["B", "R"], 3), land(["C"])]);
    expect(screen.getByRole("figure", { name: "Colors, asked for and made, 5 pips · 4 lands" })).toBeInTheDocument();
    expect([...container.querySelectorAll("[data-color-row]")].map((r) => r.getAttribute("data-color-row"))).toEqual(["B", "R", "C"]);
    expect(screen.getByLabelText("black: 4 pips asked for, 3 land sources made")).toBeInTheDocument();
    expect(screen.getByLabelText("colorless: 0 pips asked for, 1 land source made")).toBeInTheDocument();
    expect(card()).toHaveTextContent("A land counts once for each color it can add, so a dual counts twice.");
  });

  it("prints counts with shares, and 0 bare", () => {
    draw([spell("{B}{B}{B}"), spell("{R}"), land(["B"], 1), land(["R"], 1), land(["C"], 2)]);
    expect(card()).toHaveTextContent("3 · 75%");
    expect(card()).toHaveTextContent("1 · 25%");
    expect(card()).toHaveTextContent("2 · 50%");
  });

  it("leads with Every pip is green when one color is asked for", () => {
    draw([spell("{G}{G}"), land(["G"], 3)]);
    expect(card()).toHaveTextContent("Every pip is green. A land counts once for each color it can add; shares are of all land sources.");
  });

  it("says so when there are no lands, with every source 0", () => {
    const { container } = draw([spell("{B}"), spell("{R}")]);
    expect(card()).toHaveTextContent("No lands yet, so no sources are counted.");
    expect(card()).toHaveTextContent("0 lands");
    expect(container.querySelectorAll("[data-color-row]")).toHaveLength(2);
  });

  it("draws one dashed square per non-land source, with the singular and plural lines", () => {
    const { container, rerender } = draw([spell("{G}"), land(["G"]), { typeLine: "Artifact", manaCost: "{1}", quantity: 1, ramp: true }]);
    expect(container.querySelector("[data-colors-nonland] span[aria-hidden]")!.children).toHaveLength(1);
    expect(card()).toHaveTextContent("1 more mana source isn’t a land. It’s counted, but its color isn’t.");
    rerender(<DeckStatsView data={{ ...base, mana: manaSupply([land(["G"]), spell("{G}", 3, true)]) }} />);
    expect(card()).toHaveTextContent("3 more mana sources aren’t lands");
  });

  it("omits the non-land block at zero", () => {
    const { container } = draw([spell("{G}"), land(["G"])]);
    expect(container.querySelector("[data-colors-nonland]")).toBeNull();
  });

  it("stays a shell where the land read failed", () => {
    const { container } = render(<DeckStatsView data={{ ...base, mana: null }} />);
    expect(container.querySelector('[data-stats-card="colors"]')!.querySelector("[data-colors-rows]")).toBeNull();
  });
});
