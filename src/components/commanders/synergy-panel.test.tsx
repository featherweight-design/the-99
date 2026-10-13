import { describe, it, expect, vi } from "vitest";
import { act, render, screen, within, fireEvent } from "@testing-library/react";
import { SynergyPanel } from "./synergy-panel";
import { explainedCopy } from "../../lib/copy/commander-explained";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import type { SynergyCard } from "../../lib/commanders/synergy-cards";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();

function make(n: number, facet: SynergyCard["facet"] = "creature"): SynergyCard[] {
  return Array.from({ length: n }, (_, i) => ({
    oracleId: `id-${facet}-${i}`, name: `${facet} ${i}`, typeLine: "Creature — Human",
    facet, inclusionPct: 50, imageUri: null, synergyPts: 100 - i, owned: i % 2 === 0, committedTo: null, availability: null, price: null, manaCost: null,
  }));
}

const props = {
  ownedCount: 62,
  edhrecTotal: 258,
  selected: new Set<string>(),
  onToggle: () => {},
  newestAsOf: null,
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

  // The three clauses share one paragraph with the three pips, which render no
  // text, so the paragraph reads as the clauses joined by spaces.
  const SYNERGY_LEGEND = [
    explainedCopy.committed.dotOwned,
    explainedCopy.committed.dotUnowned,
  ].join(" ");

  // TWO states, always. The legend was conditional on a visible committed row,
  // because the mark it explained was the committed dot; the dot is ownership
  // now and this is the only panel that can draw an unowned row, so both states
  // are reachable on every render.
  it("labels both dot states", () => {
    wrap(<SynergyPanel {...props} cards={make(3)} width="desktop" />);
    expect(screen.getByText(SYNERGY_LEGEND)).toBeInTheDocument();
  });

  it("draws the legend even when every visible row is owned and free", () => {
    const cards = make(3).map((c) => ({ ...c, owned: true, availability: null }));
    wrap(<SynergyPanel {...props} cards={cards} width="desktop" />);
    expect(screen.getByText(SYNERGY_LEGEND)).toBeInTheDocument();
  });

  // `committedTo` is set ON PURPOSE. Left unset, the retired code drew no legend
  // at all — it was gated on a visible committed row — so this assertion passed
  // against the version it exists to rule out. The card has to be one the old
  // condition would have fired on.
  it("names no retired committed state", () => {
    const cards = make(3);
    cards[0] = { ...cards[0], committedTo: "Atraxa" };
    wrap(<SynergyPanel {...props} cards={cards} width="desktop" />);
    expect(screen.getByText(SYNERGY_LEGEND)).toBeInTheDocument();
    expect(screen.queryByText(/already in a deck/i)).toBeNull();
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

  // The other half of that same row, and the half the collapse above does not
  // deliver: the `<ul>` is one DOM node across every facet and every disclosure,
  // so the offset it was left at survives while the box is unscrollable and comes
  // back the moment the expansion returns. Switching facets from a list scrolled
  // to its foot and pressing `Show all` reopened at the BOTTOM of a list the
  // reader had never scrolled.
  it("discards the scroll offset when the facet changes and when the list reopens", () => {
    const cards = [...make(30, "creature"), ...make(20, "land")];
    wrap(<SynergyPanel {...props} cards={cards} width="desktop" />);

    fireEvent.click(
      screen.getByRole("button", { name: synergyCopy.disclosure.showAllAria("30", "Creatures") }),
    );
    const list = screen.getAllByRole("listitem")[0].parentElement as HTMLElement;
    list.scrollTop = 400;

    fireEvent.click(screen.getByRole("radio", { name: synergyCopy.facet.itemAria("Lands", "20") }));
    expect(list.scrollTop).toBe(0);

    list.scrollTop = 400;
    fireEvent.click(
      screen.getByRole("button", { name: synergyCopy.disclosure.showAllAria("20", "Lands") }),
    );
    expect(list.scrollTop).toBe(0);
  });

  // Reachable only because FacetStrip keeps a zero-count pill selectable.
  it("says the facet is empty when its pill is selected and it holds no rows", () => {
    wrap(<SynergyPanel {...props} cards={make(20, "land")} width="desktop" />);
    fireEvent.click(
      screen.getByRole("radio", { name: synergyCopy.facet.itemAria("Artifacts", "0") }),
    );
    expect(screen.getByText(synergyCopy.facet.empty("Artifacts"))).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  // The pill reads "All", but the disclosure copy puts the label in a sentence.
  // Substituting the pill's own label there produced "Show all 30 All", and the
  // aria template appends "cards" of its own, so the prose noun cannot simply
  // become "cards" everywhere either.
  it("reads the All facet as cards in the disclosure, without doubling the noun", () => {
    wrap(<SynergyPanel {...props} cards={make(30)} width="desktop" />);
    fireEvent.click(screen.getByRole("radio", { name: synergyCopy.facet.itemAria("All", "30") }));
    const button = screen.getByRole("button", { name: "Show all 30 cards" });
    expect(button).toHaveTextContent("Show all 30 cards");
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: synergyCopy.disclosure.showFewer }))
      .toHaveAttribute("aria-expanded", "true");
    // The scroll container keeps the pill's label: "All, 30 cards".
    expect(screen.getByRole("list")).toHaveAccessibleName(
      synergyCopy.facet.itemAria(synergyCopy.facet.all, "30"),
    );
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

  // The legend's unit token is the one accent-coloured span on an otherwise
  // locked-grey line, so it has to survive as its own element.
  it("colours the legend's +pts token with the accent", () => {
    wrap(<SynergyPanel {...props} cards={make(3)} width="desktop" />);
    expect(screen.getByText(synergyCopy.panel.legendToken)).toHaveStyle({
      color: "var(--accent)",
    });
  });

  it("reports a toggle by oracle id", () => {
    const onToggle = vi.fn();
    wrap(<SynergyPanel {...props} onToggle={onToggle} cards={make(3)} width="desktop" />);
    const rows = screen.getAllByRole("listitem");
    fireEvent.click(within(rows[0]).getByRole("button", { name: /^Add / }));
    expect(onToggle).toHaveBeenCalledWith("id-creature-0");
  });
});

// The provider previews only where a pointer can hover; a row's art shows only if its owner mounted one.
function hoverable() {
  vi.useFakeTimers();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({ matches: query === "(hover: hover)", media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }),
  });
}

describe("SynergyPanel hover preview", () => {
  it("previews the row's own art when the pointer rests on its name", () => {
    hoverable();
    try {
      const cards = make(2).map((c) => ({ ...c, imageUri: `https://img.test/${c.oracleId}.jpg` }));
      wrap(<SynergyPanel {...props} cards={cards} width="desktop" />);
      const name = within(screen.getAllByRole("listitem")[0]).getAllByRole("button")[0];
      fireEvent.mouseEnter(name, { clientX: 10, clientY: 10 });
      act(() => { vi.advanceTimersByTime(1000); });
      expect(screen.getByTestId("hover-preview").getAttribute("style")).toContain(cards[0].imageUri);
    } finally { vi.useRealTimers(); }
  });
});
