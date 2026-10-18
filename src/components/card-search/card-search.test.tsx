import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchFieldCopy } from "../../lib/copy/search-field";

const searchAllCardsAction = vi.fn(async (_q: string) => []);
const cardSignalsAction = vi.fn(async (_ids: string[]) => ({}));
vi.mock("../../app/card-search-actions", () => ({
  searchAllCardsAction: (q: string) => searchAllCardsAction(q),
  cardSignalsAction: (ids: string[]) => cardSignalsAction(ids),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/collection", useRouter: () => ({ refresh: () => {} }) }));
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

// The board's `.clr`: a bare ✕, none of the shared field's filled circle (`rounded-full`, `bg-[color:var(--border)]`).
function expectBareClear(clear: HTMLElement, size: readonly string[]) {
  const cls = clear.className.split(/\s+/);
  for (const c of [...size, "rounded-none", "bg-transparent", "text-[13px]", "text-[color:var(--fg-faint)]"]) expect(cls).toContain(c);
  for (const c of ["rounded-full", "bg-[color:var(--border)]", "h-[24px]", "w-[24px]", "text-[12px]"].filter((c) => !size.includes(c))) expect(cls).not.toContain(c);
}

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

  it("draws the clear as the board's bare ✕, which still empties the field and keeps focus there", async () => {
    const icon = mount();
    await act(async () => fireEvent.click(icon));
    await type("sol");
    const clear = screen.getByRole("button", { name: searchFieldCopy.clear });
    expectBareClear(clear, ["h-8", "w-8"]);
    await act(async () => fireEvent.click(clear));
    expect((field() as HTMLInputElement).value).toBe("");
    expect(document.activeElement).toBe(field());
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

  it("opens with an empty field after the Close button, after Back,", async () => {
    const icon = mount();
    for (const leave of [
      () => fireEvent.click(screen.getByRole("button", { name: "Close search" })),
      () => fireEvent(window, new PopStateEvent("popstate")),
    ]) {
      await act(async () => fireEvent.click(icon));
      await type("sol");
      expect((field() as HTMLInputElement).value).toBe("sol");
      await act(async () => void leave());
      expect(screen.queryByRole("dialog")).toBeNull();
      await act(async () => fireEvent.click(icon));
      expect((field() as HTMLInputElement).value).toBe("");
      await act(async () => fireEvent.click(screen.getByRole("button", { name: "Close search" })));
    }
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
