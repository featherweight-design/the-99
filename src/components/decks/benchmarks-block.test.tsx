import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DependencyWire } from "../../lib/benchmarks/wire";
import { benchmarksWire as wire, wireFixtureCard as wc } from "./__fixtures__/benchmarks";
import { deckBenchmarksCopy as copy } from "../../lib/copy/deck-benchmarks";
import { BenchmarksBlock } from "./benchmarks-block";

const graveyard: DependencyWire = { row: "graveyard", strength: "heavy", count: 14, commander: true, landsLeftOut: [], groups: [{ group: "usesGraveyard", cards: [wc("Eternal Witness"), wc("Mulch")] }] } as DependencyWire;
const combatHeavy: DependencyWire = { row: "combat", strength: "heavy", routes: 0, groups: [] } as DependencyWire;

describe("BenchmarksBlock", () => {
  it("draws four grades, each meter announcing its step", () => {
    render(<BenchmarksBlock benchmarks={wire()} analyzedAt="2026-10-01T12:00:00Z" />);
    expect(screen.getByRole("heading", { name: copy.heading })).toBeTruthy();
    expect(screen.getByText(copy.caption)).toBeTruthy();
    expect(screen.getByRole("img", { name: copy.stepAria("Mana velocity", "Typical", 3) })).toBeTruthy();
    expect(screen.getByRole("img", { name: copy.stepAria("Card flow", "High", 4) })).toBeTruthy();
    expect(screen.getByRole("img", { name: copy.stepAria("Interaction", "Modest", 2) })).toBeTruthy();
  });

  it("says No combo line with no meter and no opener when the deck assembles no line", () => {
    const { container } = render(<BenchmarksBlock benchmarks={wire()} analyzedAt="2026-10-01T12:00:00Z" onOpen={() => {}} />);
    const win = container.querySelector('[data-grade="win"]') as HTMLElement;
    expect(win.hasAttribute("data-no-combo")).toBe(true);
    expect(within(win).getByText(copy.noCombo)).toBeTruthy();
    expect(within(win).getByText(copy.noComboLine)).toBeTruthy();
    expect(within(win).queryByRole("img")).toBeNull();
    expect(within(win).queryByRole("button")).toBeNull();
  });

  it("grades win speed when a line exists, with odds and its opener", () => {
    const line = { variantId: "v1", cards: [], produces: ["Infinite mana"], mana: { kind: "unknown" as const }, steps: [], prerequisites: null, odds: 0.18 };
    const onOpen = vi.fn();
    const { container } = render(<BenchmarksBlock benchmarks={wire({ win: { step: 4, odds: 0.18, lines: [line], tutors: [] } })} analyzedAt="2026-10-01T12:00:00Z" onOpen={onOpen} />);
    const win = container.querySelector('[data-grade="win"]') as HTMLElement;
    expect(win.textContent).toContain("18%");
    fireEvent.click(within(win).getByRole("button", { name: copy.openAria("Win speed", "High") }));
    expect(onOpen).toHaveBeenCalledWith("win");
    expect(within(win).getByRole("button").textContent).toContain(copy.openCombo(1));
  });

  it("draws no opener at all without onOpen, so no control does nothing", () => {
    render(<BenchmarksBlock benchmarks={wire({ dependencies: [graveyard] })} analyzedAt="2026-10-01T12:00:00Z" />);
    expect(screen.queryAllByRole("button", { name: /see the/ })).toHaveLength(0);
  });

  it("opens a grade's cards, counting its ledger entries", () => {
    const onOpen = vi.fn();
    render(<BenchmarksBlock benchmarks={wire()} analyzedAt="2026-10-01T12:00:00Z" onOpen={onOpen} />);
    const flow = screen.getByRole("button", { name: copy.openAria("Card flow", "High") });
    expect(flow.textContent).toContain(copy.open(2));
    fireEvent.click(flow);
    expect(onOpen).toHaveBeenCalledWith("flow");
  });

  it("says nothing reaches the list when there are no dependencies, naming every row it checked", () => {
    const { container } = render(<BenchmarksBlock benchmarks={wire()} analyzedAt="2026-10-01T12:00:00Z" />);
    const none = container.querySelector("[data-dependencies-none]") as HTMLElement;
    expect(none.textContent).toContain(copy.deps.noneHead);
    expect(none.textContent).toContain(copy.deps.noneLine);
    expect(none.textContent).toContain(copy.deps.checked);
  });

  it("draws each dependency with its strength, figure and hate, and Combat Heavy with no opener", () => {
    const onOpen = vi.fn();
    const { container } = render(<BenchmarksBlock benchmarks={wire({ dependencies: [graveyard, combatHeavy] })} analyzedAt="2026-10-01T12:00:00Z" onOpen={onOpen} />);
    const gy = container.querySelector('[data-dependency="graveyard"]') as HTMLElement;
    expect(gy.dataset.strength).toBe("heavy");
    expect(gy.textContent).toContain("14 cards use the graveyard, your commander among them");
    expect(gy.textContent).toContain(copy.deps.hate.graveyard);
    fireEvent.click(within(gy).getByRole("button", { name: copy.deps.rowAria("Graveyard", "Heavy") }));
    expect(onOpen).toHaveBeenCalledWith("graveyard");
    const combat = container.querySelector('[data-dependency="combat"]') as HTMLElement;
    expect(combat.textContent).toContain("No way to win outside combat");
    expect(within(combat).queryByRole("button")).toBeNull();
  });

  it("captions a stale reading with its date, and never with the scale line", () => {
    render(<BenchmarksBlock benchmarks={wire()} stale analyzedAt="2026-10-01T12:00:00Z" />);
    expect(screen.queryByText(copy.caption)).toBeNull();
    expect(screen.getByText(/^Graded with the bracket on .+, before your changes\.$/)).toBeTruthy();
  });

  it("draws the phone form at any width for rows, with no md: restyling of its own", () => {
    const { container } = render(<BenchmarksBlock benchmarks={wire({ dependencies: [graveyard] })} analyzedAt="2026-10-01T12:00:00Z" layout="rows" onOpen={() => {}} />);
    // The shared InfoTip keeps its own popover placement; everything the block draws is the phone's.
    for (const el of container.querySelectorAll("[data-grades], [data-dependency], [data-benchmarks] > div:first-child")) {
      expect(el.outerHTML).not.toMatch(/\bmd:/);
    }
  });
});
