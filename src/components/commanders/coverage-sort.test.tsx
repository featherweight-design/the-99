import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CoverageSortMenu, sortRoleCards } from "./coverage-sort";
import { explainedCopy } from "../../lib/copy/commander-explained";
import type { RoleCard } from "../../lib/recs/score";
import { avail } from "./availability-fixture";

const card = (
  name: string,
  reading: "free" | "soft" | "hard" | "over" | null = null,
): RoleCard => ({
  oracleId: name.toLowerCase(),
  name,
  inclusionPct: 50,
  committedTo: null,
  availability: reading === null ? null : avail(reading),
});

function mount(over: Partial<React.ComponentProps<typeof CoverageSortMenu>> = {}) {
  const onChange = vi.fn();
  render(
    <CoverageSortMenu
      sort="played"
      showFigures
      isDesktop
      onChange={onChange}
      {...over}
    />,
  );
  return { onChange };
}

const openMenu = () =>
  fireEvent.click(screen.getByRole("button", { name: explainedCopy.coverageSort.triggerAria }));

describe("sortRoleCards", () => {
  it("leaves the incoming order alone for the shipped sort", () => {
    const cards = [card("A", "hard"), card("B"), card("C", "hard")];
    expect(sortRoleCards(cards, "played")).toBe(cards);
  });

  // Availability is the shipped order partitioned, not a second ranking: within
  // each group a card keeps its neighbours.
  it("puts the free cards first and holds the order inside each group", () => {
    const cards = [card("A", "hard"), card("B"), card("C", "hard"), card("D")];
    expect(sortRoleCards(cards, "availability").map((c) => c.name)).toEqual([
      "B", "D", "A", "C",
    ]);
  });

  // The whole point of the four-way read. Under the old partition on
  // `committedTo` a brew's soft want and a finished deck's sleeved claim were one
  // bucket, so two readings the marker draws differently sorted the same.
  it("ranks the four readings free, soft, hard, over", () => {
    const cards = [card("over", "over"), card("hard", "hard"), card("soft", "soft"), card("free", "free")];
    expect(sortRoleCards(cards, "availability").map((c) => c.name)).toEqual([
      "free", "soft", "hard", "over",
    ]);
  });

  // Null is NO ROW — an unowned card, a basic, or a read that could not reach.
  // On a panel built from the owned pool that is nothing to report, so it ranks
  // beside free rather than being treated as a claim.
  it("sorts a card with no availability row as free", () => {
    const cards = [card("claimed", "hard"), card("norow")];
    expect(sortRoleCards(cards, "availability").map((c) => c.name)).toEqual([
      "norow", "claimed",
    ]);
  });

  // Stability is what makes this a partition of `Most played` rather than a
  // re-rank, and it is asserted on a list long enough that an unstable engine
  // would show.
  it("keeps the incoming order within a bucket", () => {
    const cards = ["a", "b", "c", "d", "e", "f"].map((n) => card(n, "soft"));
    expect(sortRoleCards(cards, "availability").map((c) => c.name)).toEqual([
      "a", "b", "c", "d", "e", "f",
    ]);
  });
});

describe("CoverageSortMenu", () => {
  it("names the chosen order on the trigger, behind the prefix", () => {
    mount({ sort: "availability" });
    const trigger = screen.getByRole("button", { name: explainedCopy.coverageSort.triggerAria });
    expect(trigger.textContent).toContain(explainedCopy.coverageSort.triggerPrefix);
    expect(trigger.textContent).toContain("Availability");
  });

  it("reports both options as radios and marks the chosen one", () => {
    mount({ sort: "availability" });
    openMenu();
    const options = screen.getAllByRole("menuitemradio");
    expect(options).toHaveLength(2);
    expect(options[1]).toHaveAttribute("aria-checked", "true");
    expect(options[0]).toHaveAttribute("aria-checked", "false");
  });

  // The one branch the figureless commander changes. R1 had this option greyed;
  // it is the default and the shipped behaviour, so it stays selectable and only
  // its reason-line changes.
  it("swaps the shipped option's sub-line rather than disabling it", () => {
    mount({ showFigures: false });
    openMenu();
    const played = screen.getAllByRole("menuitemradio")[0];
    expect(played).not.toHaveAttribute("aria-disabled");
    expect(played.textContent).toContain(explainedCopy.coverageSort.mostPlayed.subNoFigures);
    expect(played.textContent).not.toContain(explainedCopy.coverageSort.mostPlayed.sub);
  });

  it("reports the choice and closes, handing focus back to the trigger", () => {
    const { onChange } = mount();
    openMenu();
    fireEvent.click(screen.getAllByRole("menuitemradio")[1]);
    expect(onChange).toHaveBeenCalledWith("availability");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: explainedCopy.coverageSort.triggerAria })).toHaveFocus();
  });

  it("dismisses on Escape without reporting a choice", () => {
    const { onChange } = mount();
    openMenu();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("moves focus between the options with the arrow keys, and wraps", () => {
    mount();
    openMenu();
    const options = screen.getAllByRole("menuitemradio");
    expect(options[0]).toHaveFocus();
    fireEvent.keyDown(options[0], { key: "ArrowDown" });
    expect(options[1]).toHaveFocus();
    fireEvent.keyDown(options[1], { key: "ArrowDown" });
    expect(options[0]).toHaveFocus();
  });

  // Opening on the second option is the case where the roving tabindex and the focus
  // can disagree: the focused option would carry tabIndex={-1}, and the first arrow
  // key would step from the option above the one being looked at.
  it("keeps the tab stop on the option it opened onto", () => {
    mount({ sort: "availability" });
    openMenu();
    const options = screen.getAllByRole("menuitemradio");
    expect(options[1]).toHaveFocus();
    expect(options[1]).toHaveAttribute("tabindex", "0");
    expect(options[0]).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(options[1], { key: "ArrowDown" });
    expect(options[0]).toHaveFocus();
  });

  it("turns its chevron up while the menu is open", () => {
    mount();
    const trigger = screen.getByRole("button", { name: explainedCopy.coverageSort.triggerAria });
    expect(trigger.querySelector("[data-chevron]")?.getAttribute("data-open")).toBe("false");
    openMenu();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.querySelector("[data-chevron]")?.getAttribute("data-open")).toBe("true");
  });
});
