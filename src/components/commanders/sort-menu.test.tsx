import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { SortMenu } from "./sort-menu";

const open = () => fireEvent.click(screen.getByRole("button", { name: /Sort:/ }));

describe("SortMenu", () => {
  it("names the current sort on the trigger", () => {
    render(<SortMenu sort="new" hasDecks onChange={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: discoveryCopy.sort.triggerAria(discoveryCopy.sort.new) }),
    ).toBeTruthy();
  });

  it("reports the chosen sort and closes", () => {
    const onChange = vi.fn();
    render(<SortMenu sort="fit" hasDecks onChange={onChange} />);
    open();
    fireEvent.click(screen.getByRole("menuitemradio", { name: discoveryCopy.sort.newAria }));
    expect(onChange).toHaveBeenCalledWith("new");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  // Ruling 8: the option stays present and says why it cannot be chosen. Removing
  // it would leave the player with no way to learn that building a deck turns a
  // second ranking on.
  it("keeps the novelty sort visible, disabled and explained, with no decks", () => {
    const onChange = vi.fn();
    render(<SortMenu sort="fit" hasDecks={false} onChange={onChange} />);
    open();
    const option = screen.getByRole("menuitemradio", {
      name: discoveryCopy.sort.newDisabledAria,
    });
    expect(option.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText(discoveryCopy.sort.newDisabled)).toBeTruthy();

    fireEvent.click(option);
    expect(onChange).not.toHaveBeenCalled();
    // The menu stays open: the reason it gives is the thing worth reading.
    expect(screen.queryByRole("menu")).toBeTruthy();
  });

  it("closes on Escape", () => {
    render(<SortMenu sort="fit" hasDecks onChange={vi.fn()} />);
    open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
