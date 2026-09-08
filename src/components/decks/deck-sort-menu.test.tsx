import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DeckSortMenu } from "./deck-sort-menu";

function open(sort: "lastPlayed" | "name" | "newest" = "lastPlayed") {
  const onChange = vi.fn();
  render(<DeckSortMenu sort={sort} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: /^Sort · / }));
  return { onChange, options: () => screen.getAllByRole("menuitemradio") };
}

describe("DeckSortMenu", () => {
  it("opens onto the order already in force, not the first row", () => {
    const { options } = open("newest");
    expect(options()[2]).toHaveFocus();
  });

  // `role="menu"` promises the ARIA menu keyboard model. Exactly one option is
  // tabbable at a time and the arrows move between them, or the roles are
  // making a promise the keyboard does not keep.
  it("moves between options on the arrows, and wraps", () => {
    const { options } = open();
    expect(options()[0]).toHaveFocus();
    fireEvent.keyDown(options()[0], { key: "ArrowDown" });
    expect(options()[1]).toHaveFocus();
    fireEvent.keyDown(options()[1], { key: "ArrowUp" });
    expect(options()[0]).toHaveFocus();
    fireEvent.keyDown(options()[0], { key: "ArrowUp" });
    expect(options()[2]).toHaveFocus();
  });

  it("jumps to either end on Home and End", () => {
    const { options } = open();
    fireEvent.keyDown(options()[0], { key: "End" });
    expect(options()[2]).toHaveFocus();
    fireEvent.keyDown(options()[2], { key: "Home" });
    expect(options()[0]).toHaveFocus();
  });

  it("keeps exactly one option tabbable", () => {
    const { options } = open();
    fireEvent.keyDown(options()[0], { key: "ArrowDown" });
    expect(options().map((o) => o.getAttribute("tabindex"))).toEqual(["-1", "0", "-1"]);
  });

  it("hands focus back to the trigger on a choice", () => {
    const { onChange, options } = open();
    fireEvent.click(options()[1]);
    expect(onChange).toHaveBeenCalledWith("name");
    expect(screen.getByRole("button", { name: /^Sort · / })).toHaveFocus();
  });
});
