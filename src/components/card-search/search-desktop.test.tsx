import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../app/card-search-actions", () => ({
  searchAllCardsAction: async () => [],
  cardSignalsAction: async () => ({}),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/collection" }));
vi.mock("./search-layer", () => ({ SearchLayer: () => null }));
// md and up: the desktop's frame, not the phone's.
vi.mock("../ui/use-min-width", () => ({ useMinWidth: () => true }));

const { CardSearchRoot } = await import("./card-search");
const { pushRecent } = await import("../../lib/card-search/recent");
const { SearchDesktop } = await import("./search-desktop");

function mount(platform: string) {
  vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("768"),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  render(
    <CardSearchRoot userId="u1">
      <input aria-label="page field" />
      <SearchDesktop />
    </CardSearchRoot>,
  );
}
const frame = () => screen.queryByRole("dialog", { name: "Search all cards" });
const press = (init: KeyboardEventInit) => act(async () => void fireEvent.keyDown(window, { key: "k", ...init }));
const combobox = () => screen.getByRole("combobox");

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("the search on the desktop", () => {
  it("opens on ⌘K on a Mac, from inside a page field, and returns focus there on Escape", async () => {
    mount("MacIntel");
    const pageField = screen.getByLabelText("page field");
    pageField.focus();
    await press({ metaKey: true });
    expect(frame()).toBeTruthy();
    expect(document.activeElement).toBe(combobox());
    await act(async () => void fireEvent.keyDown(combobox(), { key: "Escape" }));
    expect(frame()).toBeNull();
    expect(document.activeElement).toBe(pageField);
  });

  it("never opens on Ctrl+K on a Mac, and opens on Ctrl+K elsewhere", async () => {
    mount("MacIntel");
    await press({ ctrlKey: true });
    expect(frame()).toBeNull();
    cleanup();
    mount("Win32");
    await press({ ctrlKey: true });
    expect(frame()).toBeTruthy();
  });

  it("does not open while another dialog is up", async () => {
    mount("Win32");
    render(<div role="dialog" aria-modal="true" aria-label="Card" />);
    await press({ ctrlKey: true });
    expect(frame()).toBeNull();
  });

  it("is not modal and shows the shortcut until typing starts, with no foot line before results", async () => {
    mount("MacIntel");
    await press({ metaKey: true });
    expect(frame()?.getAttribute("aria-modal")).toBeNull();
    expect(frame()?.textContent).toContain("⌘K");
    expect(frame()?.textContent).not.toContain("opens this from anywhere");
    await act(async () => void fireEvent.change(combobox(), { target: { value: "s" } }));
    expect(frame()?.querySelector("kbd")).toBeNull();
  });

  it("a second shortcut press from inside the field keeps the opener focus returns to", async () => {
    mount("Win32");
    const pageField = screen.getByLabelText("page field");
    pageField.focus();
    await press({ ctrlKey: true });
    await press({ ctrlKey: true });
    expect(document.activeElement).toBe(combobox());
    await act(async () => void fireEvent.keyDown(combobox(), { key: "Escape" }));
    expect(document.activeElement).toBe(pageField);
  });

  it("draws the offline box in its own frame, before the results' code has arrived", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    mount("Win32");
    await act(async () => void window.dispatchEvent(new Event("offline")));
    await press({ ctrlKey: true });
    expect(frame()?.textContent).toContain("offline");
  });

  it("D2: opens on recent cards with the first one active, so ↵ opens it and the arrows move from there", async () => {
    pushRecent("u1", { oracleId: "b", name: "Beta", imageUri: null, flavorName: null });
    pushRecent("u1", { oracleId: "a", name: "Alpha", imageUri: null, flavorName: null });
    mount("Win32");
    await press({ ctrlKey: true });
    await act(async () => {});
    expect(combobox().getAttribute("aria-activedescendant")).toBe("card-search-list-0");
    await act(async () => void fireEvent.keyDown(combobox(), { key: "ArrowDown" }));
    expect(combobox().getAttribute("aria-activedescendant")).toBe("card-search-list-1");
  });

  it("D2: nothing is active once a query is typed", async () => {
    pushRecent("u1", { oracleId: "a", name: "Alpha", imageUri: null, flavorName: null });
    mount("Win32");
    await press({ ctrlKey: true });
    await act(async () => {});
    await act(async () => void fireEvent.change(combobox(), { target: { value: "al" } }));
    expect(combobox().getAttribute("aria-activedescendant")).toBeNull();
  });

  it("closes on a press outside", async () => {
    mount("Win32");
    await press({ ctrlKey: true });
    await act(async () => void fireEvent.pointerDown(document.querySelector('[aria-hidden="true"].fixed.inset-0')!));
    expect(frame()).toBeNull();
  });
});
