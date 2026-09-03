import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SynergySelection, SelectableLiveAnnouncer, SynergySelectionProvider } from "./synergy-selection";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import type { SynergyCard } from "../../lib/commanders/synergy-cards";

const owned = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ oracleId: `o${i}`, owned: true }));
const unowned = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ oracleId: `u${i}`, owned: false }));

const synergyCard = (id: string): SynergyCard => ({
  oracleId: id,
  name: id,
  typeLine: "Creature — Human",
  facet: "creature",
  inclusionPct: null,
  synergyPts: null,
  owned: true,
});
const synergyCards = (n: number): SynergyCard[] =>
  Array.from({ length: n }, (_, i) => synergyCard(`o${i}`));

describe("SynergySelection", () => {
  it("renders nothing at zero selection so the locked promise stands alone", () => {
    const { container } = render(
      <SynergySelection selectedCards={[]} onClear={() => {}} width="desktop" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("states the fill, the pick and the total", () => {
    render(<SynergySelection selectedCards={owned(7)} onClear={() => {}} width="desktop" />);
    expect(screen.getByText(synergyCopy.select.promise("68", "7", "75"))).toBeInTheDocument();
  });

  it("names the unowned cards in the selection", () => {
    render(
      <SynergySelection
        selectedCards={[...owned(5), ...unowned(2)]}
        onClear={() => {}}
        width="desktop"
      />,
    );
    expect(screen.getByText(synergyCopy.select.promiseUnowned("2"))).toBeInTheDocument();
  });

  it("clamps at 99 and says the selection fills the deck on its own", () => {
    render(<SynergySelection selectedCards={owned(40)} onClear={() => {}} width="desktop" />);
    expect(screen.getByText(synergyCopy.select.promiseFull("40"))).toBeInTheDocument();
  });

  it("takes the mobile promise string at phone width", () => {
    render(<SynergySelection selectedCards={owned(7)} onClear={() => {}} width="phone" />);
    expect(screen.getByText(synergyCopy.select.promiseMobile("68", "7", "75"))).toBeInTheDocument();
    expect(
      screen.queryByText(synergyCopy.select.promise("68", "7", "75")),
    ).not.toBeInTheDocument();
  });

  it("clears the selection", () => {
    const onClear = vi.fn();
    render(<SynergySelection selectedCards={owned(3)} onClear={onClear} width="desktop" />);
    fireEvent.click(screen.getByRole("button", { name: synergyCopy.select.clearAria("3") }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});

describe("SelectableLiveAnnouncer", () => {
  it("renders exactly one ARIA live region regardless of how many breakpoint containers exist", () => {
    // Simulates the detail page structure: one announcer mounted outside any
    // breakpoint container, serving both phone and desktop widths. If someone
    // moves it back inside a hidden container or mounts a second one, this
    // query returning a single element will fail.
    const { container } = render(
      <SynergySelectionProvider>
        <SelectableLiveAnnouncer cards={synergyCards(3)} />
      </SynergySelectionProvider>,
    );
    const regions = container.querySelectorAll('[aria-live="polite"]');
    expect(regions).toHaveLength(1);
    expect(regions[0]).toHaveClass("sr-only");
  });
});
