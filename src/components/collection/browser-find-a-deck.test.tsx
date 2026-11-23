import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ refresh: () => {} }),
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ userId: "user_1" }) }));
const capture = vi.hoisted(() => vi.fn());
vi.mock("../../lib/analytics/posthog", () => ({ captureToolEvent: capture }));
const closeAction = vi.hoisted(() => vi.fn(async () => ({ ok: true, changed: true })));
vi.mock("../../app/collection/find-a-deck-actions", () => ({ closeFindADeckAction: closeAction }));

import { CollectionBrowser } from "./browser";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { resetFindADeckCalloutForTest } from "./find-a-deck-callout";
import type { BrowseListCard } from "../../lib/collection/browse";
import type { FindADeckState } from "../../lib/collection/find-a-deck";

// Tool discovery call 1: the call-out on All and on Free alone, and the labelled button beside each Free card.
const card = (over: Partial<BrowseListCard> = {}): BrowseListCard =>
  ({
    oracleId: "o1",
    name: "Lightning Bolt",
    quantity: 1,
    colorIdentity: ["R"],
    typeLine: "Instant",
    setCodes: ["LEA"],
    setCounts: [["LEA", 1]],
    primarySetCode: "LEA",
    rarity: "common",
    cmc: 1,
    ...over,
  }) as BrowseListCard;

const CARDS = [
  card(),
  card({ oracleId: "o2", name: "Counterspell", colorIdentity: ["U"] }),
  card({ oracleId: "o3", name: "Shahrazad", colorIdentity: [] }),
];
const ON: FindADeckState = { hasDeck: true, closed: false, illegal: ["o3"] };

function view(findADeck: FindADeckState | null) {
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <CollectionBrowser cards={CARDS} ownedSets={[]} availabilityOk findADeck={findADeck} />
    </CardDetailProvider>
  );
}

const callout = () => document.querySelector<HTMLElement>("[data-find-a-deck-callout]");

describe("CollectionBrowser — Find a deck", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/collection?view=rows");
    resetFindADeckCalloutForTest();
    capture.mockClear();
    closeAction.mockClear();
  });

  it("on All, draws the call-out with the Free count, and Show them narrows to Free", () => {
    render(view(ON));
    const box = callout();
    expect(box?.dataset.findADeckCallout).toBe("all");
    expect(within(box!).getByText("3 of your cards are in no deck")).toBeInTheDocument();
    expect(document.querySelector("[data-find-a-deck]")).toBeNull();
    fireEvent.click(within(box!).getByRole("button", { name: "Show them" }));
    expect(capture).toHaveBeenCalledWith("find_a_deck_opened", { from: "callout_show_them" });
    expect(window.location.search).toContain("avail=free");
    expect(callout()?.dataset.findADeckCallout).toBe("free");
  });

  it("on Free alone, drops Show them and puts a button by every Commander-legal card only", () => {
    window.history.replaceState(null, "", "/collection?view=rows&avail=free");
    render(view(ON));
    expect(within(callout()!).queryByRole("button", { name: "Show them" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Find a deck for Lightning Bolt" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Find a deck for Counterspell" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Find a deck for Shahrazad" })).toBeNull();
  });

  it("sends the place the button sat in", () => {
    window.history.replaceState(null, "", "/collection?view=rows&avail=free");
    render(view(ON));
    fireEvent.click(document.querySelector('[data-find-a-deck="strip"]')!);
    expect(capture).toHaveBeenCalledWith("find_a_deck_opened", { from: "row_strip" });
  });

  it("draws nothing without a deck, after a failed read, or once closed", () => {
    const { unmount } = render(view({ ...ON, hasDeck: false }));
    expect(callout()).toBeNull();
    unmount();
    const second = render(view(null));
    expect(callout()).toBeNull();
    second.unmount();
    render(view({ ...ON, closed: true }));
    expect(callout()).toBeNull();
  });

  it("the ✕ hides it at once, writes the close, and keeps it gone on a remount", () => {
    const { unmount } = render(view(ON));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(callout()).toBeNull();
    expect(closeAction).toHaveBeenCalledTimes(1);
    unmount();
    render(view(ON));
    expect(callout()).toBeNull();
  });

  it("draws no call-out on another availability", () => {
    window.history.replaceState(null, "", "/collection?view=rows&avail=inuse");
    render(view(ON));
    expect(callout()).toBeNull();
  });
});
