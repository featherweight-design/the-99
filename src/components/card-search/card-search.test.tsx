import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const searchAllCardsAction = vi.fn(async (_q: string) => []);
const cardSignalsAction = vi.fn(async (_ids: string[]) => ({}));
vi.mock("../../app/card-search-actions", () => ({
  searchAllCardsAction: (q: string) => searchAllCardsAction(q),
  cardSignalsAction: (ids: string[]) => cardSignalsAction(ids),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/collection" }));
// The results' half is its own chunk with its own tests; here only the shell's half is under test.
vi.mock("./search-layer", () => ({ SearchLayer: () => null }));

const { CardSearchRoot, CardSearchIcon, SEARCH_DEBOUNCE_MS } = await import("./card-search");
const { pushRecent } = await import("../../lib/card-search/recent");

function mount() {
  render(
    <CardSearchRoot userId="u1">
      <CardSearchIcon />
    </CardSearchRoot>,
  );
  return screen.getByRole("button", { name: "Search all cards" });
}
const field = () => screen.getByRole("combobox");
const type = (value: string) => act(async () => fireEvent.change(field(), { target: { value } }));

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  searchAllCardsAction.mockClear();
  cardSignalsAction.mockClear();
  window.localStorage.clear();
});

describe("the search sheet (phone)", () => {
  it("is no dialog in the DOM until it opens (the swap receipt waits for none to exist)", async () => {
    const icon = mount();
    expect(document.querySelector('[role="dialog"], [aria-modal="true"]')).toBeNull();
    await act(async () => fireEvent.click(icon));
    expect(document.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it("opens on recent cards with none keyboard-active (D2 is the desktop's alone)", async () => {
    pushRecent("u1", { oracleId: "a", name: "Alpha", imageUri: null, flavorName: null });
    const icon = mount();
    await act(async () => fireEvent.click(icon));
    await act(async () => {});
    expect(field().getAttribute("aria-activedescendant")).toBeNull();
  });

  it("opens with the field focused in the icon's own press, and marks the icon open", async () => {
    const icon = mount();
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => fireEvent.click(icon));
    expect(screen.getByRole("dialog", { name: "Search all cards" })).toBeTruthy();
    expect(document.activeElement).toBe(field());
    expect(icon.getAttribute("aria-expanded")).toBe("true");
  });

  it("reads from two characters, 150ms after the last key, once, with the query trimmed", async () => {
    const icon = mount();
    await act(async () => fireEvent.click(icon));
    await type("s");
    await act(async () => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2));
    expect(searchAllCardsAction).not.toHaveBeenCalled();
    await type("so ");
    await type("sol ");
    await act(async () => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1));
    expect(searchAllCardsAction).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(searchAllCardsAction).toHaveBeenCalledTimes(1);
    expect(searchAllCardsAction).toHaveBeenCalledWith("sol");
  });

  it("reads nothing offline, and runs the search by itself once back online (S7)", async () => {
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const icon = mount();
    await act(async () => fireEvent.click(icon));
    await act(async () => window.dispatchEvent(new Event("offline")));
    await type("sol");
    await act(async () => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2));
    expect(searchAllCardsAction).not.toHaveBeenCalled();
    online.mockReturnValue(true);
    await act(async () => window.dispatchEvent(new Event("online")));
    await act(async () => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(searchAllCardsAction).toHaveBeenCalledWith("sol");
    online.mockRestore();
  });

  it("Escape clears the query first, then closes, and focus goes back to the icon", async () => {
    const icon = mount();
    await act(async () => fireEvent.click(icon));
    await type("sol");
    await act(async () => fireEvent.keyDown(field(), { key: "Escape" }));
    expect((field() as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("dialog", { name: "Search all cards" })).toBeTruthy();
    await act(async () => fireEvent.keyDown(field(), { key: "Escape" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(icon);
  });

  it("asks for the recent cards' signals fresh on open, and only when there are any", async () => {
    const icon = mount();
    await act(async () => fireEvent.click(icon));
    expect(cardSignalsAction).not.toHaveBeenCalled();
    await act(async () => fireEvent.keyDown(field(), { key: "Escape" }));
    window.localStorage.setItem(
      "card-search:recent:u1",
      JSON.stringify([{ oracleId: "o-1", name: "Sol Ring", imageUri: null, flavorName: null }]),
    );
    await act(async () => fireEvent.click(icon));
    expect(cardSignalsAction).toHaveBeenCalledWith(["o-1"]);
  });
});
