import * as React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CardSearchRow } from "../../lib/card-search/search";

// Add a card from anywhere, PR 3, through the real results (`SearchLayer`'s Rows and SearchRow, inside its own card
// details provider): the + adds and opens no card, and ⌘↵ on a row focus came back to adds it (READINESS O4).
vi.mock("next/navigation", () => ({ usePathname: () => "/decks", useRouter: () => ({ refresh: () => {} }) }));
const { SearchLayer } = await import("./search-layer");
type Props = React.ComponentProps<typeof SearchLayer>;

const rows: CardSearchRow[] = [
  { oracleId: "o-gh", name: "Ghalta, Primal Hunger", imageUri: null, flavorName: null, owned: 0, decks: [], wishlist: false },
  { oracleId: "o-sol", name: "Sol Ring", imageUri: null, flavorName: null, owned: 1, decks: [], wishlist: false },
];

function draw(over: Partial<Props> = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const props: Props = {
    bodyEl: host, query: "gh", searching: true, phase: "results", rows, rowsFor: "gh", recentRows: [],
    recentsHeld: false, online: true, active: -1, returned: null, listboxId: "l", onPick: vi.fn(), onClear: vi.fn(),
    onRetry: vi.fn(), onAnnounce: vi.fn(), onCardDismissed: vi.fn(), onCardFailed: vi.fn(),
    onCardShown: vi.fn(), recentsFailed: false, open: true, openCardRef: { current: null }, onAdd: vi.fn(),
    ...over,
  };
  render(<SearchLayer {...props} />);
  return { props, host };
}
const rowEl = (host: HTMLElement, id: string) => host.querySelector<HTMLElement>(`[data-card-search-row="${id}"]`)!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("the real result rows' add", () => {
  it("a press on the + adds that row's card and opens no card details", () => {
    const { props, host } = draw();
    fireEvent.click(rowEl(host, "o-sol").querySelector("[data-card-search-add]")!);
    expect(props.onAdd).toHaveBeenCalledTimes(1);
    expect(props.onAdd).toHaveBeenCalledWith(rows, 1);
    expect(props.onPick).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("a press anywhere else on the row opens the card, and adds nothing", () => {
    const { props, host } = draw();
    fireEvent.click(rowEl(host, "o-gh"));
    expect(props.onPick).toHaveBeenCalledWith(rows, 0);
    expect(props.onAdd).not.toHaveBeenCalled();
  });

  it("⌘↵ or Ctrl ↵ on a focused row adds it, once for a held key; ↵ still opens it", () => {
    const { props, host } = draw({ returned: "o-gh" });
    const gh = rowEl(host, "o-gh");
    gh.focus();
    fireEvent.keyDown(gh, { key: "Enter", metaKey: true });
    fireEvent.keyDown(gh, { key: "Enter", metaKey: true, repeat: true });
    expect(props.onAdd).toHaveBeenCalledTimes(1);
    expect(props.onAdd).toHaveBeenCalledWith(rows, 0);
    fireEvent.keyDown(gh, { key: "Enter", ctrlKey: true });
    expect(props.onAdd).toHaveBeenCalledTimes(2);
    expect(props.onPick).not.toHaveBeenCalled();
    fireEvent.keyDown(gh, { key: "Enter" });
    expect(props.onPick).toHaveBeenCalledWith(rows, 0);
  });

  it("draws no + and takes no ⌘↵ where nothing can add", () => {
    const onPick = vi.fn();
    const { host } = draw({ onAdd: null, onPick });
    expect(host.querySelector("[data-card-search-add]")).toBeNull();
    const gh = rowEl(host, "o-gh");
    fireEvent.keyDown(gh, { key: "Enter", metaKey: true });
    // As before this PR: the row's ↵ opens it, modifier or not.
    expect(onPick).toHaveBeenCalledWith(rows, 0);
  });
});
