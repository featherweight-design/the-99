import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CardSearchRow } from "../../lib/card-search/search";
import { cardSearchCopy } from "../../lib/copy/card-search";

// Add a card from anywhere, PR 2 (C2, C-D1): the open search's Add several cards row.
vi.mock("next/navigation", () => ({ usePathname: () => "/decks", useRouter: () => ({ refresh: () => {} }) }));
const { SearchLayer } = await import("./search-layer");
type Props = React.ComponentProps<typeof SearchLayer>;

const row: CardSearchRow = { oracleId: "o-1", name: "Sol Ring", imageUri: null, flavorName: null, owned: 1, decks: [], wishlist: false };
const NAME = new RegExp(`^${cardSearchCopy.addSeveral.lead}.*${cardSearchCopy.addSeveral.aside}$`);

function draw(over: Partial<Props>) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const props: Props = {
    bodyEl: host, query: "", searching: false, phase: "idle", rows: [], rowsFor: "", recentRows: [],
    recentsHeld: false, online: true, active: -1, returned: null, listboxId: "l", onPick: vi.fn(), onClear: vi.fn(),
    onRetry: vi.fn(), onAnnounce: vi.fn(), onCardDismissed: vi.fn(), onCardFailed: vi.fn(),
    onCardShown: vi.fn(), recentsFailed: false, open: true, openCardRef: { current: null }, onAddSeveral: vi.fn(),
    ...over,
  };
  render(<SearchLayer {...props} />);
  return { props, host };
}
const way = () => screen.queryByRole("button", { name: NAME });

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("Add several cards", () => {
  it("is the first row above Recent cards, and opens the sheet on a press", () => {
    const { props, host } = draw({ recentsHeld: true, recentRows: [row] });
    const press = way()!;
    expect(press).toBeTruthy();
    expect(press.getAttribute("aria-haspopup")).toBe("dialog");
    const heading = screen.getByText(cardSearchCopy.recent.heading);
    // Before the heading in document order: the row sits above Recent cards.
    expect(press.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(host.firstElementChild).toBe(press);
    fireEvent.click(press);
    expect(props.onAddSeveral).toHaveBeenCalledTimes(1);
  });

  it("sits above the empty state when there are no recent cards", () => {
    const { host } = draw({ recentsHeld: false });
    expect(host.firstElementChild).toBe(way());
    expect(screen.getByText(cardSearchCopy.empty.title)).toBeTruthy();
  });

  it("stands alone while the recents' signals are on the way", () => {
    const { host } = draw({ recentsHeld: true, recentRows: [] });
    expect(host.children).toHaveLength(1);
    expect(host.firstElementChild).toBe(way());
  });

  it("is not drawn once a query is typed (C3, C-D2)", () => {
    draw({ query: "sol", searching: true, phase: "results", rows: [row], rowsFor: "sol" });
    expect(way()).toBeNull();
  });

  it("is not drawn offline (C7)", () => {
    draw({ online: false, recentsHeld: true, recentRows: [row] });
    expect(way()).toBeNull();
  });

  it("is not drawn where the shell mounted no Add cards host", () => {
    draw({ onAddSeveral: null, recentsHeld: true, recentRows: [row] });
    expect(way()).toBeNull();
    expect(screen.getByText(cardSearchCopy.recent.heading)).toBeTruthy();
  });

  it("takes the sheet's way-row shape: 52px on the phone, 44px in the desktop dropdown", () => {
    draw({ recentsHeld: true, recentRows: [row] });
    const cls = way()!.className.split(/\s+/);
    for (const c of ["min-h-[52px]", "rounded-[10px]", "px-[14px]", "gap-3", "text-[14px]", "bg-[color:var(--bg)]", "border-[color:var(--border)]", "mx-4", "mt-3", "mb-[2px]"]) {
      expect(cls).toContain(c);
    }
    for (const c of ["md:min-h-[44px]", "md:rounded-[9px]", "md:px-3", "md:gap-[10px]", "md:text-[13.5px]", "md:mx-[14px]", "md:mt-[6px]", "md:mb-1"]) {
      expect(cls).toContain(c);
    }
    // The aside reads faint, after the lead.
    expect(screen.getByText(cardSearchCopy.addSeveral.aside).className).toContain("text-[color:var(--fg-faint)]");
  });
});
