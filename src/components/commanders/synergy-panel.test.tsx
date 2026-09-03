import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { SynergyPanel } from "./synergy-panel";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import type { SynergyCard } from "../../lib/commanders/synergy-cards";
import { CardDetailProvider } from "../cards/card-detail-provider";

function make(n: number, facet: SynergyCard["facet"] = "creature"): SynergyCard[] {
  return Array.from({ length: n }, (_, i) => ({
    oracleId: `id-${facet}-${i}`, name: `${facet} ${i}`, typeLine: "Creature — Human",
    facet, inclusionPct: 50, synergyPts: 100 - i, owned: i % 2 === 0,
  }));
}

const props = {
  ownedCount: 62,
  edhrecTotal: 258,
  selected: new Set<string>(),
  onToggle: () => {},
};

function wrap(ui: React.ReactElement) {
  return render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
      {ui}
    </CardDetailProvider>,
  );
}

describe("SynergyPanel", () => {
  it("rests on ten rows at desktop and reveals the rest behind the disclosure", () => {
    wrap(<SynergyPanel {...props} cards={make(30)} width="desktop" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    fireEvent.click(
      screen.getByRole("button", { name: synergyCopy.disclosure.showAllAria("30", "Creatures") }),
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(30);
  });

  it("rests on six rows at phone width", () => {
    wrap(<SynergyPanel {...props} cards={make(30)} width="phone" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });

  it("marks the disclosure expanded and points it at the list it opens", () => {
    wrap(<SynergyPanel {...props} cards={make(30)} width="desktop" />);
    const button = screen.getByRole("button", {
      name: synergyCopy.disclosure.showAllAria("30", "Creatures"),
    });
    expect(button).toHaveAttribute("aria-expanded", "false");
    const listId = button.getAttribute("aria-controls");
    expect(listId).toBeTruthy();
    expect(document.getElementById(listId!)).toBe(screen.getByRole("list"));
    fireEvent.click(button);
    expect(
      screen.getByRole("button", { name: synergyCopy.disclosure.showFewerAria("Creatures") }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  // The property table's *Expanded scroll container* row: "Facet change
  // collapses to the resting cap, preserves selection, discards scroll."
  it("defaults to the creature facet and collapses the expansion on a facet change", () => {
    const cards = [...make(30, "creature"), ...make(20, "land")];
    wrap(<SynergyPanel {...props} cards={cards} width="desktop" />);
    fireEvent.click(
      screen.getByRole("button", { name: synergyCopy.disclosure.showAllAria("30", "Creatures") }),
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(30);

    fireEvent.click(screen.getByRole("radio", { name: synergyCopy.facet.itemAria("Lands", "20") }));
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(
      screen.getByRole("button", { name: synergyCopy.disclosure.showAllAria("20", "Lands") }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the headline's locked of-top figure beside the facet's own count", () => {
    wrap(<SynergyPanel {...props} cards={make(30)} width="desktop" />);
    expect(screen.getByText(/of top 258/)).toBeInTheDocument();
  });

  // The headline is EDHREC's figure, not the visible row count. `make(30)` and
  // the creature facet would both give 30; the bar must still read 62/258.
  it("draws the headline count and bar from the commander's locked figures", () => {
    wrap(<SynergyPanel {...props} cards={make(30)} width="desktop" />);
    expect(screen.getByText("62")).toBeInTheDocument();
    expect(screen.getByText("24% owned")).toBeInTheDocument();
    expect(screen.getByTestId("synergy-owned-bar")).toHaveStyle({ width: "24%" });
  });

  it("states the ownership figure on one line at phone width", () => {
    wrap(<SynergyPanel {...props} cards={make(30)} width="phone" />);
    expect(screen.getByText("62 / 258 owned")).toBeInTheDocument();
  });

  it("reports a toggle by oracle id", () => {
    const onToggle = vi.fn();
    wrap(<SynergyPanel {...props} onToggle={onToggle} cards={make(3)} width="desktop" />);
    const rows = screen.getAllByRole("listitem");
    fireEvent.click(within(rows[0]).getByRole("button", { name: /^Add / }));
    expect(onToggle).toHaveBeenCalledWith("id-creature-0");
  });
});
