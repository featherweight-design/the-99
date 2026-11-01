import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createPortal } from "react-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CardSearchRow } from "../../lib/card-search/search";
import type { OpenAddCards } from "../collection/add-cards-host";
import type { SearchLayerProps } from "./search-layer";

// Add a card from anywhere, PR 3: a row's + (and ⌘↵ / Ctrl ↵) closes the search under the shell's Add cards sheet with
// that card on the list, and the search comes back as it was (C3 to C6, C-D2, C-D3). A save reads the rows again (O6).
const GHALTA: CardSearchRow = {
  oracleId: "o-gh", name: "Ghalta, Primal Hunger", imageUri: "https://img/gh.jpg", flavorName: null,
  owned: 0, decks: [], wishlist: false,
};
const actions = vi.hoisted(() => ({
  searchAllCardsAction: vi.fn(async (_q: string): Promise<CardSearchRow[]> => []),
  cardSignalsAction: vi.fn(async (_ids: string[]) => ({})),
}));
vi.mock("../../app/card-search-actions", () => actions);
let pathname = "/decks";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ refresh: () => {} }) }));
// The results' half stands in with the rows' own press targets, portalled into the frame's body as the real one is.
let lastLayer: SearchLayerProps | null = null;
vi.mock("./search-layer", () => ({
  SearchLayer: (p: SearchLayerProps) => {
    lastLayer = p;
    const from = p.searching ? p.rows : p.recentRows;
    return p.bodyEl
      ? createPortal(
          <div>
            {p.onAddSeveral && !p.searching ? (
              <button type="button" data-card-search-add-several="" onClick={p.onAddSeveral}>
                Add several cards
              </button>
            ) : null}
            {from.map((r, i) => (
              <div key={r.oracleId} role="option" aria-selected={i === p.active} tabIndex={-1} data-card-search-row={r.oracleId}>
                <span data-owned="">{r.owned}</span>
                {p.onAdd ? (
                  <button type="button" data-card-search-add="" onClick={() => p.onAdd!(from, i)}>
                    +
                  </button>
                ) : null}
              </div>
            ))}
          </div>,
          p.bodyEl,
        )
      : null;
  },
}));
const asks: OpenAddCards[] = [];
// The host drops the next ask at once (a sheet already up), telling its opener as the real host does.
let dropNext = false;
vi.mock("../collection/add-cards-host", () => ({
  useAddCards: () => (o: OpenAddCards) => {
    asks.push(o);
    if (dropNext) {
      dropNext = false;
      o.onClosed?.({ saved: false });
      return false;
    }
    return true;
  },
}));

const { CardSearchRoot, CardSearchIcon } = await import("./card-search");
const { CollectionEditScope } = await import("../cards/collection-edit-scope");

function mount() {
  render(
    <CollectionEditScope>
      <CardSearchRoot userId="u1">
        <CardSearchIcon />
      </CardSearchRoot>
    </CollectionEditScope>,
  );
  return screen.getByRole("button", { name: "Search all cards" });
}
const field = () => screen.getByRole("combobox") as HTMLInputElement;
const plus = () => document.querySelector<HTMLButtonElement>(`[data-card-search-row="o-gh"] [data-card-search-add]`);
const ghaltaRow = () => document.querySelector<HTMLElement>(`[data-card-search-row="o-gh"]`);

async function searchGhalta() {
  const icon = mount();
  await act(async () => fireEvent.click(icon));
  await act(async () => {});
  await act(async () => fireEvent.change(field(), { target: { value: "ghalta, p" } }));
  await waitFor(() => expect(plus()).toBeTruthy());
}

beforeEach(() => {
  asks.length = 0;
  dropNext = false;
  lastLayer = null;
  pathname = "/decks";
  actions.searchAllCardsAction.mockReset();
  actions.searchAllCardsAction.mockImplementation(async () => [GHALTA]);
  actions.cardSignalsAction.mockReset();
  actions.cardSignalsAction.mockImplementation(async () => ({}));
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("a search row's + opens Add cards with that card", () => {
  it("asks the shell's host with the row's card, veiled until the sheet is drawn (C4, C-D2)", async () => {
    await searchGhalta();
    await act(async () => fireEvent.click(plus()!));
    expect(asks).toHaveLength(1);
    expect(asks[0].initialCard).toEqual({ oracleId: "o-gh", name: "Ghalta, Primal Hunger", imageUri: "https://img/gh.jpg" });
    expect(asks[0].initialQuery).toBeUndefined();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector("[data-card-search-veil]")).toBeTruthy();
    await act(async () => asks[0].onOpened?.());
    expect(document.querySelector("[data-card-search-veil]")).toBeNull();
  });

  it("comes back as it was: the query, the scroll, focus and the ring on the row (C6, C-D3)", async () => {
    await searchGhalta();
    // The element the frame placed for the results (`bodyRef`), which the layer portals into.
    const body = lastLayer!.bodyEl!;
    expect(body.contains(ghaltaRow())).toBe(true);
    body.scrollTop = 80;
    await act(async () => fireEvent.click(plus()!));
    await act(async () => asks[0].onOpened?.());
    body.scrollTop = 0;
    await act(async () => asks[0].onClosed?.({ saved: false }));
    expect(screen.getByRole("dialog", { name: "Search all cards" })).toBeTruthy();
    expect(field().value).toBe("ghalta, p");
    expect(lastLayer!.returned).toBe("o-gh");
    expect(document.activeElement).toBe(ghaltaRow());
    expect(body.scrollTop).toBe(80);
    // Closed without a save: nothing is read again, and the count is not lit.
    expect(actions.searchAllCardsAction).toHaveBeenCalledTimes(1);
    expect(lastLayer!.addedTo).toBeNull();
  });

  it("reads the standing query again after a save, so the row says ×1 owned (O6)", async () => {
    await searchGhalta();
    await act(async () => fireEvent.click(plus()!));
    await act(async () => asks[0].onOpened?.());
    actions.searchAllCardsAction.mockImplementation(async () => [{ ...GHALTA, owned: 1 }]);
    await act(async () => asks[0].onClosed?.({ saved: true }));
    await waitFor(() => expect(ghaltaRow()!.querySelector("[data-owned]")!.textContent).toBe("1"));
    expect(actions.searchAllCardsAction).toHaveBeenCalledTimes(2);
    expect(actions.searchAllCardsAction).toHaveBeenLastCalledWith("ghalta, p");
    expect(lastLayer!.addedTo).toBe("o-gh");
    expect(lastLayer!.returned).toBe("o-gh");
  });

  it("reads the recents' signals again in place after a save, the rows drawn meanwhile (O6)", async () => {
    window.localStorage.clear();
    const icon = mount();
    // A recent card, through a pick's own path: search, open it, close it.
    await act(async () => fireEvent.click(icon));
    await act(async () => {});
    await act(async () => fireEvent.change(field(), { target: { value: "ghalta, p" } }));
    await waitFor(() => expect(plus()).toBeTruthy());
    await act(async () => lastLayer!.onPick([GHALTA], 0));
    await act(async () => lastLayer!.onCardDismissed());
    await act(async () => fireEvent.change(field(), { target: { value: "" } }));
    await waitFor(() => expect(plus()).toBeTruthy());
    const before = actions.cardSignalsAction.mock.calls.length;
    await act(async () => fireEvent.click(plus()!));
    await act(async () => asks[0].onOpened?.());
    let release!: (v: Record<string, unknown>) => void;
    actions.cardSignalsAction.mockImplementation(() => new Promise((r) => (release = r as typeof release)));
    await act(async () => asks[0].onClosed?.({ saved: true }));
    expect(actions.cardSignalsAction.mock.calls.length).toBe(before + 1);
    // Still drawn while the read is out: the old figures, not an empty list.
    expect(ghaltaRow()).toBeTruthy();
    await act(async () => release({ "o-gh": { owned: 1, decks: [], wishlist: false } }));
    expect(ghaltaRow()!.querySelector("[data-owned]")!.textContent).toBe("1");
  });

  it("takes ⌘↵ / Ctrl ↵ on the active row as the same add (O4)", async () => {
    await searchGhalta();
    fireEvent.keyDown(field(), { key: "ArrowDown" });
    await act(async () => fireEvent.keyDown(field(), { key: "Enter", ctrlKey: true }));
    expect(asks).toHaveLength(1);
    expect(asks[0].initialCard?.oracleId).toBe("o-gh");
  });

  it("comes back at once when the host drops the ask, not left closed under the veil", async () => {
    await searchGhalta();
    dropNext = true;
    await act(async () => fireEvent.click(plus()!));
    expect(asks).toHaveLength(1);
    expect(document.querySelector("[data-card-search-veil]")).toBeNull();
    expect(screen.getByRole("dialog", { name: "Search all cards" })).toBeTruthy();
    expect(field().value).toBe("ghalta, p");
    expect(document.activeElement).toBe(ghaltaRow());
    expect(actions.searchAllCardsAction).toHaveBeenCalledTimes(1);
  });

  it("adds once for a held ⌘↵: a repeat does not ask again", async () => {
    await searchGhalta();
    fireEvent.keyDown(field(), { key: "ArrowDown" });
    await act(async () => fireEvent.keyDown(field(), { key: "Enter", metaKey: true, repeat: true }));
    expect(asks).toHaveLength(0);
    await act(async () => fireEvent.keyDown(field(), { key: "Enter", metaKey: true }));
    expect(asks).toHaveLength(1);
  });

  it("Add several drops a count lit by an earlier +, so no stale --success outlives it", async () => {
    await searchGhalta();
    await act(async () => fireEvent.click(plus()!));
    await act(async () => asks[0].onOpened?.());
    await act(async () => asks[0].onClosed?.({ saved: true }));
    await waitFor(() => expect(lastLayer!.addedTo).toBe("o-gh"));
    await act(async () => fireEvent.change(field(), { target: { value: "" } }));
    const several = document.querySelector<HTMLButtonElement>("[data-card-search-add-several]")!;
    await act(async () => fireEvent.click(several));
    expect(lastLayer!.addedTo).toBeNull();
    await act(async () => asks[1].onClosed?.({ saved: false }));
    expect(lastLayer!.addedTo).toBeNull();
    expect(lastLayer!.returned).toBeNull();
  });

  it("is not offered on the public card page (READINESS E6)", async () => {
    pathname = "/card/ghalta-primal-hunger";
    const icon = mount();
    await act(async () => fireEvent.click(icon));
    await act(async () => {});
    expect(lastLayer!.onAdd).toBeNull();
  });
});
