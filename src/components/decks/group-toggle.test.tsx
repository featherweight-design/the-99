import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GroupToggle } from "./group-toggle";
import { priceCopy } from "../../lib/copy/price";
import type { PriceSummary, ProvenanceForm } from "../../lib/decks/price";
import { summarisePrices } from "../../lib/decks/price";
import { cardCopies } from "../../lib/decks/grouping";

const provenance: ProvenanceForm = { behind: false, when: "Monday" };
const summary: PriceSummary = { totalCents: 1240, pricedCopies: 6, totalCopies: 8 };

const props = {
  allCount: 42,
  shoppingCount: 8,
  grouping: "type" as const,
  onFilterChange: () => {},
  onGroupingChange: () => {},
  shoppingCards: [{ name: "Sol Ring", quantity: 1 }],
};

describe("GroupToggle price strip", () => {
  it("shows the strip under the Shopping filter", () => {
    render(
      <GroupToggle
        {...props}
        filter="shopping"
        priceSummary={summary}
        provenance={provenance}
      />,
    );
    expect(screen.getByText("$12.40")).toBeInTheDocument();
  });

  // The strip's scope is the filter, not the deck: under `All` it would be
  // summing a list the player is not shopping from.
  it("hides the strip under the All filter", () => {
    render(
      <GroupToggle {...props} filter="all" priceSummary={summary} provenance={provenance} />,
    );
    expect(screen.queryByText("$12.40")).toBeNull();
  });

  // The strip's link is only as good as the list the toggle hands down: a
  // dropped prop would render the strip whole and the basket empty.
  it("hands the shopping list down to the strip's buy link", () => {
    render(
      <GroupToggle
        {...props}
        filter="shopping"
        priceSummary={summary}
        provenance={provenance}
      />,
    );
    const href = screen.getByRole("link").getAttribute("href")!;
    expect(atob(decodeURIComponent(new URL(href).searchParams.get("deck")!))).toBe("1 Sol Ring");
  });

  it("renders no strip when there is no summary", () => {
    render(
      <GroupToggle {...props} filter="shopping" priceSummary={null} provenance={provenance} />,
    );
    expect(screen.queryByText(/prices from ManaPool/)).toBeNull();
  });

  // The pills and the strip are one flex column, so the pill row keeps its own
  // centring and gap. Left on the container they would centre the pills and
  // turn the pill gap into the gap above the strip.
  it("keeps the pill row's alignment off the column", () => {
    const { container } = render(
      <GroupToggle
        {...props}
        filter="shopping"
        priceSummary={summary}
        provenance={provenance}
      />,
    );
    const column = container.firstElementChild!;
    expect(column).toHaveClass("flex-col");
    expect(column).not.toHaveClass("items-center");
    const pillRow = column.firstElementChild!;
    expect(pillRow).toHaveClass("items-center", "gap-[7px]");
  });
});

// One fact, two renderings. The strip's denominator and the Shopping pill both
// count copies of the same cards, and a screen showing "6 of 7 priced" beside
// "Shopping 8" would be the app disagreeing with itself.
describe("GroupToggle denominator", () => {
  it("matches the Shopping pill in the same render", () => {
    // One row priced, the rest not: the clause only renders when something is
    // priced, and its denominator is still every copy on the list.
    const asOf = new Date("2026-09-01T09:00:00Z");
    const shoppingCards = [
      { quantity: 1, price: { cents: 1240, foilCents: null, etchedCents: null, asOf } },
      { quantity: 5, price: null },
      { quantity: 2, price: null },
    ];
    const count = cardCopies(shoppingCards);
    const derived = summarisePrices(shoppingCards, asOf);

    render(
      <GroupToggle
        {...props}
        shoppingCount={count}
        filter="shopping"
        priceSummary={derived}
        provenance={provenance}
      />,
    );

    expect(screen.getByRole("button", { name: `Shopping ${count}` })).toBeInTheDocument();
    expect(
      screen.getByText(priceCopy.strip.pricedClause(1, count)),
    ).toBeInTheDocument();
  });
});
