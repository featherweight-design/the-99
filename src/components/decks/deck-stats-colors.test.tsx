import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeckStatsView } from "./deck-stats-view";
import { manaCurve, typeCurve } from "../../lib/decks/stats";
import { manaSupply, type ManaSupplyCardRow } from "../../lib/mana/supply";

const base = { curve: manaCurve([]), types: typeCurve([]) };
let seq = 0;
const spell = (manaCost: string, quantity = 1, ramp = false, produces: ManaSupplyCardRow["produces"] = []): ManaSupplyCardRow => ({ id: `s${++seq}`, typeLine: "Creature", manaCost, quantity, ramp, produces });
const land = (produces: ManaSupplyCardRow["produces"], quantity = 1): ManaSupplyCardRow => ({ id: `l${++seq}`, typeLine: "Land", manaCost: null, quantity, produces });
const draw = (rows: ManaSupplyCardRow[]) => render(<DeckStatsView data={{ ...base, mana: manaSupply(rows) }} />);
const card = () => screen.getByRole("figure", { name: /^Mana colors/ });

describe("DeckStatsView colors card", () => {
  it("states pips and sources in the figure label and draws a row per color asked for or made", () => {
    const { container } = draw([spell("{B}{B}", 2), spell("{R}"), land(["B", "R"], 3), land(["C"])]);
    expect(screen.getByRole("figure", { name: "Mana colors, 5 pips · 4 sources" })).toBeInTheDocument();
    expect([...container.querySelectorAll("[data-color-row]")].map((r) => r.getAttribute("data-color-row"))).toEqual(["B", "R", "C"]);
    expect(screen.getByLabelText("Black, 4 pips, 80 percent; 3 sources, 43 percent")).toBeInTheDocument();
    expect(screen.getByLabelText("Colorless, 0 pips, 0 percent; 1 source, 14 percent")).toBeInTheDocument();
  });

  it("inks each pip tile with the token that reads on it, red in black", () => {
    const { container } = draw([spell("{R}"), spell("{U}"), land(["R", "U"])]);
    const ink = (c: string) => (container.querySelector(`[data-color-row="${c}"] > span`) as HTMLElement).style.color;
    expect(ink("R")).toBe("var(--pip-ink-black)");
    expect(ink("U")).toBe("var(--pip-ink-light)");
  });

  it("prints counts with shares, and 0 bare", () => {
    draw([spell("{B}{B}{B}"), spell("{R}"), land(["B"], 1), land(["R"], 1), land(["C"], 2)]);
    expect(card()).toHaveTextContent("3 · 75%");
    expect(card()).toHaveTextContent("1 · 25%");
    expect(card()).toHaveTextContent("2 · 50%");
  });

  it("opens the tooltip on press, leads it with Every pip is green for one color, and Esc closes it", () => {
    draw([spell("{G}{G}"), land(["G"], 3)]);
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "How this is counted" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Every pip is green. A source counts once for each color it can add");
    expect(screen.getByRole("tooltip")).toHaveTextContent("A card that makes mana in a color we can’t read isn’t counted.");
    fireEvent.keyDown(screen.getByRole("button", { name: "How this is counted" }), { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows the tooltip for a hovering mouse, ignores touch hover, and a press after a hover still pins it", () => {
    draw([spell("{G}"), land(["G"])]);
    const info = screen.getByRole("button", { name: "How this is counted" });
    fireEvent.pointerEnter(info, { pointerType: "touch" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.pointerEnter(info, { pointerType: "mouse" });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(info);
    fireEvent.pointerLeave(info, { pointerType: "mouse" });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(info);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens for keyboard focus, names the figure's description, and does not count a land that adds nothing", () => {
    draw([spell("{G}"), land(["G"], 2), land([], 3)]);
    expect(screen.getByRole("figure", { name: /^Mana colors/ })).toHaveAttribute("aria-describedby");
    const id = screen.getByRole("figure", { name: /^Mana colors/ }).getAttribute("aria-describedby")!;
    expect(document.getElementById(id)).toHaveAttribute("hidden");
    // jsdom has no :focus-visible; the keyboard is what sets it in a browser.
    const info = screen.getByRole("button", { name: "How this is counted" });
    const matches = vi.spyOn(HTMLElement.prototype, "matches").mockImplementation(() => true);
    act(() => info.focus());
    matches.mockRestore();
    expect(document.getElementById(id)).not.toHaveAttribute("hidden");
    expect(card()).toHaveTextContent("1 pip · 2 sources");
  });

  it("closes a pinned tooltip on a press outside it, and not on a press inside", () => {
    draw([spell("{G}"), land(["G"])]);
    fireEvent.click(screen.getByRole("button", { name: "How this is counted" }));
    fireEvent.pointerDown(screen.getByRole("tooltip"));
    expect(screen.getByRole("tooltip")).not.toHaveAttribute("hidden");
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("says so when there are no sources, with every source 0", () => {
    const { container } = draw([spell("{B}"), spell("{R}")]);
    expect(card()).toHaveTextContent("No lands yet, so no sources are counted.");
    expect(card()).toHaveTextContent("0 sources");
    expect(container.querySelectorAll("[data-color-row]")).toHaveLength(2);
  });

  it("says every source is a land when there is no other, and draws no stripe", () => {
    const { container } = draw([spell("{G}"), land(["G"])]);
    expect(card()).toHaveTextContent("Every source is a land. This deck has no mana rocks, dorks or land search.");
    expect(container.querySelector("[data-segment=nonland]")).toBeNull();
  });

  it("draws a striped segment after the land one, a legend, and counts non-land sources in the denominator", () => {
    const { container } = draw([spell("{G}"), land(["G"], 2), spell("{1}", 1, true, ["G", "U"])]);
    const row = container.querySelector('[data-color-row="G"]')!;
    expect([...row.querySelectorAll("[data-segment]")].map((e) => e.getAttribute("data-segment"))).toEqual(["land", "nonland"]);
    expect(container.querySelector('[data-color-row="U"] [data-segment=land]')).toBeNull();
    expect(card()).toHaveTextContent("1 pip · 3 sources");
    expect(card()).toHaveTextContent("Land 2");
    expect(card()).toHaveTextContent("Mana rock, dork or land search 1");
    expect(screen.getByLabelText("Green, 1 pip, 100 percent; 3 sources, 2 lands and 1 other, 75 percent")).toBeInTheDocument();
  });

  it("does not draw or count a source whose color is unreadable, and does not say there are no rocks", () => {
    const { container } = draw([land(["G"]), spell("{1}", 1, true, [])]);
    expect(container.querySelector("[data-segment=nonland]")).toBeNull();
    expect(card()).not.toHaveTextContent("Every source is a land");
    expect(card()).toHaveTextContent("1 source");
  });

  it("does not say there are no lands when the lands there are add nothing", () => {
    draw([spell("{G}"), land([], 2)]);
    expect(card()).not.toHaveTextContent("No lands yet");
    expect(card()).not.toHaveTextContent("Every source is a land");
  });

  it("stays a shell where the land read failed", () => {
    const { container } = render(<DeckStatsView data={{ ...base, mana: null }} />);
    expect(container.querySelector('[data-stats-card="colors"]')!.querySelector("[data-colors-rows]")).toBeNull();
  });
});
