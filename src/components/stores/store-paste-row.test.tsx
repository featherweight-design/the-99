import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StorePasteRow } from "./store-paste-row";
import { storeCopy } from "../../lib/copy/store";
import { PASTE_URLS, STORE_INFO } from "../../lib/stores/info";

// Store choice, call 6: the copy-and-paste row for a store with no whole-list link.
const lines = [
  { name: "Sol Ring", quantity: 1 },
  { name: "Cultivate", quantity: 2 },
];

afterEach(() => vi.useRealTimers());

describe("StorePasteRow", () => {
  it("copies the shown list as `quantity name` lines, swaps to Copied, says so, and swaps back", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<StorePasteRow store={STORE_INFO.tcgplayer} lines={lines} />);
    const press = screen.getByRole("button", { name: storeCopy.copyAria(3) });
    expect(press).toHaveTextContent(storeCopy.copyList);
    await act(async () => fireEvent.click(press));
    expect(writeText).toHaveBeenCalledWith("1 Sol Ring\n2 Cultivate");
    expect(press).toHaveTextContent(storeCopy.copied);
    // The accessible name swaps with the label, so a screen reader on the press hears Copied too.
    expect(press).toHaveAccessibleName(storeCopy.copied);
    expect(screen.getByRole("status")).toHaveTextContent(storeCopy.copied);
    await act(async () => vi.advanceTimersByTime(1500));
    expect(press).toHaveTextContent(storeCopy.copyList);
    expect(press).toHaveAccessibleName(storeCopy.copyAria(3));
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("says a failed copy out loud and never claims it worked", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) }, configurable: true });
    // jsdom has no execCommand; the fallback copy fails too.
    Object.defineProperty(document, "execCommand", { value: () => false, configurable: true });
    render(<StorePasteRow store={STORE_INFO.cardkingdom} lines={lines} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: storeCopy.copyAria(3) })));
    expect(screen.getByRole("status")).toHaveTextContent(storeCopy.copyFailed);
    expect(screen.getByRole("button", { name: storeCopy.copyAria(3) })).toHaveTextContent(storeCopy.copyList);
  });

  it("opens each store's own paste page, from the one constant", () => {
    const { rerender } = render(<StorePasteRow store={STORE_INFO.tcgplayer} lines={lines} />);
    expect(screen.getByRole("link", { name: new RegExp(storeCopy.openPaste(STORE_INFO.tcgplayer)) })).toHaveAttribute("href", PASTE_URLS.tcgplayer);
    rerender(<StorePasteRow store={STORE_INFO.cardkingdom} lines={lines} />);
    expect(screen.getByRole("link", { name: new RegExp(storeCopy.openPaste(STORE_INFO.cardkingdom)) })).toHaveAttribute("href", PASTE_URLS.cardkingdom);
  });

  it("draws nothing for a store with a cart link, or with nothing to buy", () => {
    const { container, rerender } = render(<StorePasteRow store={STORE_INFO.manapool} lines={lines} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<StorePasteRow store={STORE_INFO.tcgplayer} lines={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
