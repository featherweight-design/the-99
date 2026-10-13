import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetailCard, DeckUnresolvedRow } from "../../lib/decks/grouping";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import { Decklist } from "./decklist";
import { UnresolvedGroup } from "./unresolved-group";
import { recommendedMix } from "../../lib/decks/mix";

/** The asserted baseline, through the real function rather than restated — a hand-built
 *  literal drifts from the type the moment a field is added, which is how 120 of these broke. */
const TEST_MIX = recommendedMix(null, false);

const copy = deckImportCopy.unresolved;

const row = (over: Partial<DeckUnresolvedRow> = {}): DeckUnresolvedRow => ({
  id: "r1",
  rawName: "Lightning Bolt",
  quantity: 1,
  sourceLine: 41,
  ...over,
});

const card = (over: Partial<DeckDetailCard> = {}): DeckDetailCard => ({
  oracleId: "sol-ring",
  name: "Sol Ring",
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts",
  role: "ramp",
  cmc: 2,
  owned: false,
  quantity: 1,
  auto: false,
  printedName: null,
  printedSetCode: null,
  printedCollectorNumber: null,
  ...over,
});

function renderDecklist(props: Partial<React.ComponentProps<typeof Decklist>> = {}) {
  return render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
      <Decklist mix={TEST_MIX}
        deckId="d1"
        commanderOracleId="cmdr"
        newestAsOf={null}
        deckOracleIds={[]}
        cards={[card()]}
        unresolvedRows={[row()]}
        built={1}
        bodySize={99}
        filter="all"
        grouping="type"
        onFilterChange={vi.fn()}
        onGroupingChange={vi.fn()}
        {...props}
      />
    </CardDetailProvider>,
  );
}

describe("UnresolvedGroup", () => {
  it("counts its lines, not the copies on them, so it agrees with the banner", () => {
    render(<UnresolvedGroup mix={TEST_MIX} deckId="d1" deckOracleIds={[]} rows={[row({ id: "a", quantity: 4 }), row({ id: "b" })]} />);
    const group = screen.getByRole("region");
    expect(group).toHaveAccessibleName(`${copy.groupLabel} · 2`);
    expect(group).not.toHaveAccessibleName(`${copy.groupLabel} · 5`);
  });

  it("orders rows by their line in the import, not alphabetically", () => {
    render(
      <UnresolvedGroup mix={TEST_MIX}
        deckId="d1"
        deckOracleIds={[]}
        rows={[
          row({ id: "a", rawName: "Zephyr", sourceLine: 12 }),
          row({ id: "b", rawName: "Anvil", sourceLine: 40 }),
        ]}
      />,
    );
    const names = screen.getAllByText(/Zephyr|Anvil/).map((el) => el.textContent);
    expect(names).toEqual(["Zephyr", "Anvil"]);
  });

  it("gives each row its source line and the unmatched tag", () => {
    render(<UnresolvedGroup mix={TEST_MIX} deckId="d1" deckOracleIds={[]} rows={[row()]} />);
    expect(screen.getByText("line 41 of the import")).toBeInTheDocument();
    expect(screen.getByText(copy.rowTag)).toBeInTheDocument();
  });

  it("offers each row as a disclosure and tells the phone so", () => {
    render(<UnresolvedGroup mix={TEST_MIX} deckId="d1" deckOracleIds={[]} rows={[row()]} />);
    expect(
      screen.getByText(`${copy.footnoteMobile} ${copy.footnoteMobileResolve}`),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.rowAria("Lightning Bolt", 1) })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });


  // The Shopping filter empties the group outright, so it can go without any row
  // collapsing. The phone hides its quick-add bar for as long as this reads
  // true, and it used to stay true forever — the bar never came back.
  it("reports itself collapsed when the filter takes it away mid-expansion", () => {
    const onExpanded = vi.fn();
    const { rerender } = render(<UnresolvedGroup mix={TEST_MIX} deckId="d1" deckOracleIds={[]} rows={[row()]} onExpandedChange={onExpanded} />);
    fireEvent.click(screen.getByRole("button", { name: copy.rowAria("Lightning Bolt", 1) }));
    expect(onExpanded).toHaveBeenLastCalledWith(true);

    rerender(<div />);
    expect(onExpanded).toHaveBeenLastCalledWith(false);
  });

  it("renders nothing at zero rows", () => {
    const { container } = render(<UnresolvedGroup mix={TEST_MIX} deckId="d1" deckOracleIds={[]} rows={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("the unresolved group inside the decklist", () => {
  it("pins the group last, after every card group", () => {
    const { container } = renderDecklist();
    const text = container.textContent ?? "";
    expect(text.indexOf(copy.groupLabel)).toBeGreaterThan(text.indexOf("Artifacts"));
  });

  // Unresolved rows are outside toBuyCount by definition, so a shopping view
  // listing them would show something the player cannot go and buy.
  it("hides the group entirely under the Shopping filter", () => {
    renderDecklist({ filter: "shopping" });
    expect(screen.queryByText(copy.groupLabel)).not.toBeInTheDocument();
  });

  // Otherwise a deck whose every line failed reads "No cards in this deck"
  // directly above the lines it is denying.
  it("does not claim the deck is empty when only unresolved rows remain", () => {
    renderDecklist({ cards: [], built: 0 });
    expect(screen.queryByText("No cards in this deck.")).not.toBeInTheDocument();
    expect(screen.getByText(copy.groupLabel)).toBeInTheDocument();
  });
});
