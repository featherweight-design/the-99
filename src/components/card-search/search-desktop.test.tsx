import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { searchFieldCopy } from "../../lib/copy/search-field";

vi.mock("../../app/card-search-actions", () => ({
  searchAllCardsAction: async () => [],
  cardSignalsAction: async () => ({}),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/collection", useRouter: () => ({ refresh: () => {} }) }));
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

// The board's `.clr`: a bare ✕, none of the shared field's filled circle (`rounded-full`, `bg-[color:var(--border)]`).
function expectBareClear(clear: HTMLElement, size: readonly string[]) {
  const cls = clear.className.split(/\s+/);
  for (const c of [...size, "rounded-none", "bg-transparent", "text-[13px]", "text-[color:var(--fg-faint)]"]) expect(cls).toContain(c);
  for (const c of ["rounded-full", "bg-[color:var(--border)]", "h-[24px]", "w-[24px]", "text-[12px]"].filter((c) => !size.includes(c))) expect(cls).not.toContain(c);
}

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

  it("a second press does not pull focus back into the field while another dialog is up", async () => {
    mount("Win32");
    await press({ ctrlKey: true });
    render(<div role="dialog" aria-modal="true" aria-label="Account" />);
    const other = screen.getByRole("dialog", { name: "Account" });
    other.tabIndex = -1;
    other.focus();
    await press({ ctrlKey: true });
    expect(document.activeElement).toBe(other);
  });

  it("is focusable as a frame, so lowering the keyboard and a card's return land inside it", async () => {
    mount("Win32");
    await press({ ctrlKey: true });
    expect(frame()?.getAttribute("tabindex")).toBe("-1");
  });

  it("keeps focus in the field when a resize swaps the frame, in both directions", async () => {
    const listeners = new Set<() => void>();
    let wide = true;
    vi.spyOn(navigator, "platform", "get").mockReturnValue("Win32");
    vi.stubGlobal("matchMedia", (q: string) => ({
      get matches() {
        return q.includes("768") ? wide : false;
      },
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    }));
    const tree = () => (
      <CardSearchRoot userId="u1">{wide ? <SearchDesktop /> : null}</CardSearchRoot>
    );
    const { rerender } = render(tree());
    const inField = () => {
      const at = document.activeElement;
      return at?.getAttribute("role") === "combobox" && at.isConnected && at.closest("[data-card-search-sheet]") !== null;
    };
    await press({ ctrlKey: true });
    expect(inField()).toBe(true);
    for (const next of [false, true]) {
      wide = next;
      await act(async () => {
        listeners.forEach((fn) => fn());
        rerender(tree());
      });
      expect(inField()).toBe(true);
    }
  });

  it("draws the clear as the board's bare ✕, which still empties the field and keeps focus there", async () => {
    mount("MacIntel");
    await press({ metaKey: true });
    await act(async () => void fireEvent.change(combobox(), { target: { value: "sol" } }));
    const clear = screen.getByRole("button", { name: searchFieldCopy.clear });
    expectBareClear(clear, ["w-[28px]", "h-[24px]"]);
    await act(async () => fireEvent.click(clear));
    expect((combobox() as HTMLInputElement).value).toBe("");
    expect(document.activeElement).toBe(combobox());
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

  it("does not open under the veil while a picked card is on its way up", async () => {
    pushRecent("u1", { oracleId: "a", name: "Alpha", imageUri: null, flavorName: null });
    mount("Win32");
    await press({ ctrlKey: true });
    await act(async () => {});
    await act(async () => void fireEvent.keyDown(combobox(), { key: "Enter" }));
    expect(document.querySelector("[data-card-search-veil]")).not.toBeNull();
    expect(frame()).toBeNull();
    await press({ ctrlKey: true });
    expect(frame()).toBeNull();
  });

  it("opens no card on ↵ while the results' host is inert under a navigation's screen", async () => {
    pushRecent("u1", { oracleId: "a", name: "Alpha", imageUri: null, flavorName: null });
    mount("Win32");
    await press({ ctrlKey: true });
    await act(async () => {});
    const host = frame()?.querySelector("[data-covered-with-main]");
    expect(host).toBeTruthy();
    host?.setAttribute("inert", "");
    await act(async () => void fireEvent.keyDown(combobox(), { key: "Enter" }));
    expect(document.querySelector("[data-card-search-veil]")).toBeNull();
    expect(frame()).not.toBeNull();
    // Typing stays live.
    await act(async () => void fireEvent.change(combobox(), { target: { value: "al" } }));
    expect((combobox() as HTMLInputElement).value).toBe("al");
  });

  it("D2: nothing is active once a query is typed", async () => {
    pushRecent("u1", { oracleId: "a", name: "Alpha", imageUri: null, flavorName: null });
    mount("Win32");
    await press({ ctrlKey: true });
    await act(async () => {});
    await act(async () => void fireEvent.change(combobox(), { target: { value: "al" } }));
    expect(combobox().getAttribute("aria-activedescendant")).toBeNull();
  });

  it("is no dialog in the DOM until it opens", async () => {
    mount("Win32");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await press({ ctrlKey: true });
    expect(document.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it("closes on a press outside", async () => {
    mount("Win32");
    await press({ ctrlKey: true });
    await act(async () => void fireEvent.pointerDown(document.querySelector('[aria-hidden="true"].fixed.inset-0')!));
    expect(frame()).toBeNull();
  });
});
