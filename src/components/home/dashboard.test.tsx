import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "./dashboard";
import type { DeckListItem } from "../../lib/decks/read";

// `inUse` is a Map and `ready` a slice rather than a list, because the sections
// that read them (tasks 15–17) take exactly what the loader assembled once.
const BASE = {
  stats: { totalCards: 1284, uniqueCards: 900 },
  lastUpdated: new Date("2026-09-05T00:00:00Z"),
  ready: { shown: [], moreCount: 0, floor: null },
  inUse: new Map(),
  decks: [],
  commitments: { inUse: 312, overCommitted: 3 },
  shopping: { byDeck: new Map(), total: { copies: 18, cents: 9480, pricedCopies: 18 } },
  now: "2026-09-07T12:00:00.000Z",
};

describe("Dashboard header", () => {
  it("greets without a name and prints both kicker figures", () => {
    render(<Dashboard {...BASE} />);
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByText("1,284 cards · read 2 days ago")).toBeInTheDocument();
  });

  it("still prints a kicker when the collection has never been dated", () => {
    render(<Dashboard {...BASE} lastUpdated={null} />);
    expect(screen.getByText(/1,284 cards/)).toBeInTheDocument();
  });

  it("sends Update collection to the replace flow", () => {
    render(<Dashboard {...BASE} />);
    expect(screen.getByRole("link", { name: "Update collection" })).toHaveAttribute(
      "href",
      "/collection/replace",
    );
  });
});

describe("Dashboard commitments", () => {
  it("hands the cart switch to the card: Shop all decks with it on, absent by default", () => {
    const { unmount } = render(<Dashboard {...BASE} cartEnabled />);
    expect(screen.getByRole("link", { name: "Shop all decks" })).toHaveAttribute("href", "/decks/shopping");
    unmount();
    render(<Dashboard {...BASE} />);
    expect(screen.queryByRole("link", { name: "Shop all decks" })).toBeNull();
  });
});

const deck = (o: Partial<DeckListItem> = {}): DeckListItem => ({
  id: "d1",
  name: "Atraxa",
  createdAt: new Date("2026-09-01T00:00:00Z"),
  commanderName: "Atraxa, Praetors' Voice",
  commanderColorIdentity: ["W", "U", "B", "G"],
  commanderImageUri: null,
  commanderArtCropUri: null,
  partnerName: null,
  partnerColorIdentity: null,
  folderId: null,
  folderName: null,
  built: 99,
  ownedCount: 96,
  toBuyCount: 3,
  unresolvedCount: 0,
  pendingChanges: 0,
  versionNumber: null,
  statusPill: "To buy",
  bracket: null,
  lastPlayedAt: null,
  lastEditedAt: new Date("2026-09-01T00:00:00Z"),
  lastCommittedAt: null,
  inUseElsewhere: 0,
  proxiedCount: 0,
  ...o,
});

describe("Dashboard body", () => {
  // `Your decks` is gone from both widths — heading, rows, count and footer
  // link. It was a second, worse /decks one tap from the real one, and the rail
  // and the tab bar both carry Decks.
  it("draws no deck rail", () => {
    const decks = [
      deck({ id: "a", name: "Alpha", lastPlayedAt: new Date("2026-09-01T00:00:00Z") }),
      deck({ id: "b", name: "Beta", lastPlayedAt: new Date("2026-09-05T00:00:00Z") }),
      deck({ id: "c", name: "Gamma" }),
    ];
    render(<Dashboard {...BASE} decks={decks} />);
    expect(screen.queryByText(/Your decks/)).toBeNull();
    // One link per deck, not two: the rail is not drawing them a second time.
    expect(screen.getAllByRole("link", { name: /Gamma/ })).toHaveLength(1);
  });

  // The count `Your decks · 3` used to carry now rides inside the control that
  // goes to /decks, so the number is a destination rather than a label.
  it("carries the deck total in the resume block's footer", () => {
    const decks = [1, 2, 3, 4, 5, 6].map((n) =>
      deck({
        id: `d${n}`,
        name: `Deck ${n}`,
        lastPlayedAt: null,
        lastEditedAt: new Date(`2026-09-0${n}T00:00:00Z`),
      }),
    );
    render(<Dashboard {...BASE} decks={decks} />);
    expect(screen.getByText("2 more decks")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All 6 decks" })).toHaveAttribute("href", "/decks");
  });

  // Four rows, because the resume block is the only route back into a deck now.
  it("draws four resume rows, most recently touched first", () => {
    const decks = [1, 2, 3, 4, 5].map((n) =>
      deck({
        id: `d${n}`,
        name: `Deck ${n}`,
        lastPlayedAt: null,
        lastEditedAt: new Date(`2026-09-0${n}T00:00:00Z`),
      }),
    );
    render(<Dashboard {...BASE} decks={decks} />);
    expect(screen.getByRole("link", { name: /Deck 5/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Deck 1/ })).toBeNull();
  });

  // The order is a claim, so each row prints its evidence — and the verb names
  // the act that won the sort rather than restating the block's heading.
  it("stamps each row with the act that touched it", () => {
    const decks = [
      deck({
        id: "a", name: "Edited", lastPlayedAt: null,
        lastEditedAt: new Date("2026-09-12T12:00:00Z"),
      }),
      deck({
        id: "b", name: "Played", lastPlayedAt: new Date("2026-09-11T12:00:00Z"),
        lastEditedAt: new Date("2026-01-01T00:00:00Z"),
      }),
    ];
    render(<Dashboard {...BASE} decks={decks} now="2026-09-13T12:00:00Z" />);
    // Exactly 24 hours is `yesterday`, not `1d ago` — the ladder reads hours
    // below a day, then yesterday, then days.
    expect(screen.getByText("edited yesterday")).toBeInTheDocument();
    expect(screen.getByText("played 2d ago")).toBeInTheDocument();
  });

  // The block says what its order means once, in a caption. Not a control: the
  // block has one order, and a dropdown would imply it is a list.
  it("captions the block with its order", () => {
    render(<Dashboard {...BASE} decks={[deck({ id: "a", name: "Alpha" })]} />);
    expect(screen.getByText("last touched")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sort/i })).toBeNull();
  });

  it("leaves the Commitments card out when the availability read failed", () => {
    render(<Dashboard {...BASE} commitments={null} />);
    expect(screen.queryByText("Commitments")).toBeNull();
    // A card of three zeroes after a failed query is a lie, so nothing stands
    // in for it — not a zero, not a placeholder.
    expect(screen.queryByRole("link", { name: "Review commitments" })).toBeNull();
  });

  it("draws the Commitments figures against the collection's own total", () => {
    render(<Dashboard {...BASE} />);
    expect(screen.getByText("312 of 1,284")).toBeInTheDocument();
    expect(screen.getByText("18 · $94.80")).toBeInTheDocument();
  });
});

// First-run R2 and Hugh's O1/O7 rulings, 2026-09-28: Home at a read collection and no decks.
describe("Dashboard at zero decks", () => {
  const filled = (el: HTMLElement) => el.className.includes("bg-[color:var(--fg)]");

  it("puts the ways in where the resume block would be", () => {
    render(<Dashboard {...BASE} decks={[]} />);
    expect(screen.getByRole("heading", { name: "No decks yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse commanders" })).toHaveAttribute("href", "/commanders");
    expect(screen.getByRole("link", { name: "Import a deck" })).toHaveAttribute("href", "/decks/import");
    expect(screen.queryByText(/Pick up where you left off/i)).toBeNull();
  });

  it("draws no buildable line on Home (Hugh's ruling; /decks states the count)", () => {
    render(<Dashboard {...BASE} decks={[]} />);
    expect(screen.queryByText(/commanders buildable from/)).toBeNull();
  });

  // Ready to build's cards carry a fill each (one per region); none are drawn here.
  it("makes Browse commanders the fill and draws the header's New deck as a ghost", () => {
    render(<Dashboard {...BASE} decks={[]} />);
    const fills = screen.getAllByRole("link").filter(filled);
    expect(fills.map((a) => a.textContent)).toEqual(["Browse commanders"]);
    expect(filled(screen.getByRole("link", { name: "New deck" }))).toBe(false);
  });

  it("gives New deck the fill back, and drops the section, once a deck exists", () => {
    render(<Dashboard {...BASE} decks={[deck()]} />);
    expect(filled(screen.getByRole("link", { name: "New deck" }))).toBe(true);
    expect(screen.queryByRole("heading", { name: "No decks yet" })).toBeNull();
  });
});
