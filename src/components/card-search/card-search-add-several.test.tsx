import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createPortal } from "react-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenAddCards } from "../collection/add-cards-host";
import type { SearchLayerProps } from "./search-layer";

// Add a card from anywhere, PR 2: Add several cards closes the search under the shell's Add cards sheet, and the
// search comes back as it was once the sheet has gone (C2, C-D3).
vi.mock("../../app/card-search-actions", () => ({
  searchAllCardsAction: vi.fn(async () => []),
  cardSignalsAction: vi.fn(async () => ({})),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/decks", useRouter: () => ({ refresh: () => {} }) }));
// The results' half stands in with just the row under test, portalled into the frame's body as the real one is.
vi.mock("./search-layer", () => ({
  SearchLayer: (p: SearchLayerProps) =>
    p.bodyEl && p.onAddSeveral
      ? createPortal(
          <button type="button" data-card-search-add-several="" onClick={p.onAddSeveral}>
            Add several cards
          </button>,
          p.bodyEl,
        )
      : null,
}));
const asks: OpenAddCards[] = [];
let hosted = true;
vi.mock("../collection/add-cards-host", () => ({
  useAddCards: () => (hosted ? (o: OpenAddCards) => asks.push(o) : null),
}));

const { CardSearchRoot, CardSearchIcon } = await import("./card-search");

function mount() {
  render(
    <CardSearchRoot userId="u1">
      <CardSearchIcon />
    </CardSearchRoot>,
  );
  return screen.getByRole("button", { name: "Search all cards" });
}
const field = () => screen.getByRole("combobox") as HTMLInputElement;
const way = () => screen.queryByRole("button", { name: "Add several cards" });
async function openWithLayer(icon: HTMLElement) {
  await act(async () => fireEvent.click(icon));
  // The layer's chunk lands on the open's intent.
  await act(async () => {});
}

beforeEach(() => {
  asks.length = 0;
  hosted = true;
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("Add several cards from the search", () => {
  it("closes the search under the sheet, veiled until the sheet is drawn", async () => {
    const icon = mount();
    await openWithLayer(icon);
    await act(async () => fireEvent.click(way()!));
    expect(asks).toHaveLength(1);
    expect(asks[0].initialCard).toBeUndefined();
    expect(asks[0].initialQuery).toBeUndefined();
    // No dialog stands while the sheet is on its way, and the frame is held inert behind the veil.
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector("[data-card-search-veil]")).toBeTruthy();
    await act(async () => asks[0].onOpened?.());
    expect(document.querySelector("[data-card-search-veil]")).toBeNull();
  });

  it("comes back as it was once the sheet closes: the query kept and focus on the row", async () => {
    const icon = mount();
    await openWithLayer(icon);
    await act(async () => fireEvent.change(field(), { target: { value: "x" } }));
    await act(async () => fireEvent.click(way()!));
    await act(async () => asks[0].onOpened?.());
    await act(async () => asks[0].onClosed?.({ saved: true }));
    expect(screen.getByRole("dialog", { name: "Search all cards" })).toBeTruthy();
    expect(field().value).toBe("x");
    expect(document.activeElement).toBe(way());
  });

  it("is not offered where the shell mounted no Add cards host", async () => {
    hosted = false;
    const icon = mount();
    await openWithLayer(icon);
    expect(way()).toBeNull();
  });
});
