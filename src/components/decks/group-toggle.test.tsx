import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GroupToggle, LockModeButton } from "./group-toggle";
import { priceCopy } from "../../lib/copy/price";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { viewToggleCopy } from "../../lib/copy/card-surfaces";
import type { PriceSummary, ProvenanceForm } from "../../lib/decks/price";
import { summarisePrices } from "../../lib/decks/price";
import { deckStatsCopy } from "../../lib/copy/deck-stats";
import { cardCopies } from "../../lib/decks/grouping";

const provenance: ProvenanceForm = { behind: false, when: "Monday" };
const summary: PriceSummary = { totalCents: 1240, pricedCopies: 6, totalCopies: 8 };

const props = {
  allCount: 42,
  shoppingCount: 8,
  grouping: "type" as const,
  onFilterChange: () => {},
  onGroupingChange: () => {},
  view: "list" as const,
  onViewChange: () => {},
  shoppingCards: [{ name: "Sol Ring", quantity: 1 }],
  sort: { key: "name" as const, direction: "asc" as const },
  onSortChange: () => {},
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
    const binary = atob(new URL(href).searchParams.get("deck")!);
    const text = new TextDecoder().decode(Uint8Array.from(binary, (ch) => ch.charCodeAt(0)));
    expect(text).toBe("1 Sol Ring");
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

describe("GroupToggle view well (#349)", () => {
  it("offers both views under the All filter", () => {
    render(<GroupToggle {...props} filter="all" />);
    expect(
      screen.getByRole("button", { name: viewToggleCopy.deck.list }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: viewToggleCopy.deck.card }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  // Absent, not disabled: a shopping list has no second way to be read, and a
  // dead control in the bar would say there is one.
  it("is absent under the Shopping filter", () => {
    render(<GroupToggle {...props} filter="shopping" />);
    expect(screen.queryByRole("button", { name: viewToggleCopy.deck.list })).toBeNull();
    expect(screen.queryByRole("button", { name: viewToggleCopy.deck.card })).toBeNull();
  });

  it("reports the view the reader picked", () => {
    const picked: string[] = [];
    render(
      <GroupToggle {...props} filter="all" onViewChange={(v) => picked.push(v)} />,
    );
    fireEvent.click(screen.getByRole("button", { name: viewToggleCopy.deck.card }));
    expect(picked).toEqual(["card"]);
  });

  // The label was inert — it named the two pills beside it and did nothing —
  // and the well needs the width it was holding on the phone.
  it("no longer draws the inert Group label", () => {
    render(<GroupToggle {...props} filter="all" />);
    expect(screen.queryByText("Group")).toBeNull();
  });
});

// `BuilderShell` passes `autoControls` whether or not there is anything to act
// on, so testing the object kept an empty wrapper — and its share of the row's
// gap — in a toolbar whose wrapping this round is otherwise careful about.
describe("GroupToggle's auto cluster at zero", () => {
  const row = () =>
    screen.getByRole("button", { name: "By type" }).parentElement!.parentElement!;

  const emptyChildren = () =>
    [...row().children].filter(
      (el) => (el.textContent ?? "").trim() === "" && el.getAttribute("aria-hidden") === null,
    );

  it("mounts no wrapper when there is no note and nothing to act on", () => {
    render(
      <GroupToggle
        {...props}
        filter="all"
        autoCount={0}
        keptCount={0}
        autoControls={{ onClear: () => {}, onKeepAll: () => {} }}
      />,
    );
    expect(screen.queryByRole("button", { name: /Keep all/ })).not.toBeInTheDocument();
    expect(emptyChildren()).toHaveLength(0);
  });

  it("mounts it when there is something to act on", () => {
    render(
      <GroupToggle
        {...props}
        filter="all"
        autoCount={3}
        keptCount={0}
        autoControls={{ onClear: () => {}, onKeepAll: () => {} }}
      />,
    );
    expect(screen.getByRole("button", { name: /Keep all 3/ })).toBeInTheDocument();
  });
});

// `Lock cards` / `Done` is exported for the About page's Locked cards figure. The export is only
// honest while the toolbar draws exactly what a standalone mount draws, in both states.
describe("LockModeButton", () => {
  it.each([false, true])("is the button the toolbar draws (mode %s)", (lockMode) => {
    const { container, unmount } = render(
      <GroupToggle {...props} filter="all" lockMode={lockMode} onLockModeChange={() => {}} />,
    );
    const label = lockMode ? lockedCardsCopy.mode.done : lockedCardsCopy.mode.button;
    const inToolbar = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === label);
    expect(inToolbar).toBeTruthy();
    const html = inToolbar!.outerHTML;
    unmount();
    const alone = render(<LockModeButton lockMode={lockMode} onToggle={() => {}} />);
    expect(alone.container.innerHTML).toBe(html);
  });
});

describe("GroupToggle's Stats segment", () => {
  it("is absent without the stats prop", () => {
    render(<GroupToggle {...props} filter="all" />);
    expect(screen.queryByRole("button", { name: deckStatsCopy.segment.aria })).toBeNull();
  });

  it("is drawn with it, reports a press, and shows the provenance line only when open", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <GroupToggle {...props} filter="all" stats={{ open: false, onChange }} />,
    );
    expect(screen.queryByText(deckStatsCopy.segment.provenance)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: deckStatsCopy.segment.aria }));
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(<GroupToggle {...props} filter="all" stats={{ open: true, onChange }} />);
    expect(screen.getByText(deckStatsCopy.segment.provenance)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: deckStatsCopy.segment.aria })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("draws All, Shopping and Stats as ONE group with one divider, and marks the selected segment", () => {
    const { container, rerender } = render(
      <GroupToggle {...props} filter="shopping" stats={{ open: false, onChange: vi.fn() }} />,
    );
    const groups = container.querySelectorAll("[data-toolbar-group]");
    expect(groups).toHaveLength(1);
    const group = groups[0] as HTMLElement;
    expect(group).toHaveAttribute("role", "group");
    const buttons = Array.from(group.querySelectorAll("button"));
    expect(buttons.map((b) => b.textContent)).toEqual([
      expect.stringMatching(/^All \d+$/),
      expect.stringMatching(/^Shopping \d+$/),
      "Stats",
    ]);
    // The divider sits between Shopping and Stats, inside the same container.
    const divider = group.querySelector("[data-toolbar-divider]") as HTMLElement;
    expect(group.children[2]).toBe(divider);
    expect(group.children[3]).toBe(buttons[2]);
    expect(buttons.map((b) => b.getAttribute("aria-pressed"))).toEqual(["false", "true", "false"]);
    // Shopping keeps its warm ink while selected.
    expect(buttons[1].className).toContain("text-[color:var(--warning)]");
    expect(buttons[1].className).toContain("bg-[color:var(--elevated)]");

    rerender(<GroupToggle {...props} filter="shopping" stats={{ open: true, onChange: vi.fn() }} />);
    expect(
      Array.from(container.querySelectorAll("[data-toolbar-group] button")).map((b) => b.getAttribute("aria-pressed")),
    ).toEqual(["false", "false", "true"]);
    expect(screen.getByText(deckStatsCopy.segment.provenance)).toBeInTheDocument();
  });

  it("is today's toolbar, with no group, when the switch is off", () => {
    const { container } = render(<GroupToggle {...props} filter="all" />);
    expect(container.querySelector("[data-toolbar-group]")).toBeNull();
    expect(container.querySelector("[data-toolbar-divider]")).toBeNull();
  });
});
