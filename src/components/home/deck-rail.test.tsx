import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeckRail } from "./deck-rail";
import type { DeckListItem } from "../../lib/decks/read";
import type { ShoppingRollup } from "../../lib/decks/shopping-rollup";

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
  lastPlayedAt: null,
  lastEditedAt: new Date("2026-09-01T00:00:00Z"),
  lastCommittedAt: null,
  inUseElsewhere: 0,
  statusPill: "To buy",
  ...o,
});

const six = Array.from({ length: 6 }, (_, i) =>
  deck({ id: `d${i}`, name: `Deck ${i}` }),
);

// Only `byDeck` is read here — `total` is the Commitments card's figure, and a
// roll-up with no entry for a deck is the shipped shape for "nothing to buy".
const rollup = (copiesByDeck: Record<string, number> = {}): ShoppingRollup => ({
  byDeck: new Map(
    Object.entries(copiesByDeck).map(([id, copies]) => [id, { copies, cents: 0, pricedCopies: 0 }]),
  ),
  total: { copies: 0, cents: 0, pricedCopies: 0 },
});

/**
 * The rail renders both breakpoints' lists at once — different decks, different
 * rows, different counts — so a query that does not say which list it means is
 * asking a question the DOM has two honest answers to. jsdom applies no CSS, so
 * `hidden sm:block` hides nothing here.
 */
const list = (variant: "desktop" | "phone") => {
  const el = document.querySelector<HTMLElement>(`[data-rail="${variant}"]`);
  if (el === null) throw new Error(`no ${variant} list rendered`);
  return within(el);
};

describe("DeckRail", () => {
  it("heads with the total, not the number shown", () => {
    render(<DeckRail decks={six} shopping={rollup()} />);
    expect(screen.getByText("Your decks · 6")).toBeInTheDocument();
  });

  it("renders four rows on desktop and counts the rest", () => {
    render(<DeckRail decks={six} shopping={rollup()} />);
    expect(list("desktop").getAllByRole("link", { name: /^Deck / })).toHaveLength(4);
    expect(screen.getByText("2 more")).toBeInTheDocument();
  });

  it("counts the phone remainder against three rows", () => {
    render(<DeckRail decks={six} shopping={rollup()} />);
    expect(list("phone").getAllByRole("link", { name: /^Deck / })).toHaveLength(3);
    expect(screen.getByText("3 more")).toBeInTheDocument();
  });

  it("drops the more-count when everything fits", () => {
    render(<DeckRail decks={six.slice(0, 3)} shopping={rollup()} />);
    expect(screen.queryByText(/ more$/)).toBeNull();
    expect(list("desktop").getByRole("link", { name: "All decks" })).toBeInTheDocument();
    expect(list("phone").getByRole("link", { name: "All decks" })).toBeInTheDocument();
  });

  it("prints the copies clause beside the status on phone", () => {
    render(
      <DeckRail decks={[deck({ statusPill: "To buy" })]} shopping={rollup({ d1: 3 })} />,
    );
    expect(screen.getByText("To buy · 3 cards")).toBeInTheDocument();
  });

  // The roll-up excludes basics and `toBuyCount` (`built − ownedCount`) does
  // not, so a deck whose only unowned cards are basics wears the pill and has
  // no roll-up entry. The two are different definitions of "unowned", and the
  // rail prints the one every other Shopping surface prints or none at all.
  it("prints the status alone when the roll-up has nothing for the deck", () => {
    render(
      <DeckRail decks={[deck({ statusPill: "To buy", toBuyCount: 3 })]} shopping={rollup()} />,
    );
    expect(list("phone").getByText("To buy")).toBeInTheDocument();
    expect(screen.queryByText(/cards/)).toBeNull();
  });

  it("prints the unresolved clause beside the status", () => {
    render(
      <DeckRail
        decks={[deck({ statusPill: "Unresolved", unresolvedCount: 2 })]}
        shopping={rollup()}
      />,
    );
    expect(screen.getByText("Unresolved · 2 lines unresolved")).toBeInTheDocument();
  });

  it("prints the status alone when it has no figure", () => {
    render(
      <DeckRail decks={[deck({ statusPill: "Complete", toBuyCount: 0 })]} shopping={rollup()} />,
    );
    expect(list("phone").getByText("Complete")).toBeInTheDocument();
    expect(list("desktop").getByText("Complete")).toBeInTheDocument();
  });

  // Decision 21. The denominator is the whole of the rail's pair handling: no
  // second name, no halved art spine, just the ceiling this deck actually has.
  it("prints 98 as a pair row's denominator and nothing else about the pair", () => {
    render(
      <DeckRail
        decks={[deck({ built: 95, partnerName: "Bruse Tarl, Boorish Herder" })]}
        shopping={rollup()}
      />,
    );
    expect(list("phone").getByText("95 / 98")).toBeInTheDocument();
    // Nothing about the pair is drawn. The phone row's accessible name is the
    // one exception, checked below: it is heard, not seen, and the desktop row
    // has no pair handling at all.
    expect(list("desktop").queryByText(/Bruse Tarl/)).toBeNull();
    expect(list("phone").queryByText("Bruse Tarl, Boorish Herder")).toBeNull();
  });

  // The denominator says `pair` only to a reader who can see it and knows the
  // ceiling, so the row names both commanders in full to a screen reader.
  it("names both commanders in the phone pair row's accessible name", () => {
    render(
      <DeckRail
        decks={[deck({ built: 95, partnerName: "Bruse Tarl, Boorish Herder" })]}
        shopping={rollup()}
      />,
    );
    expect(
      list("phone").getByText("Atraxa, Praetors' Voice, with partner Bruse Tarl, Boorish Herder"),
    ).toBeInTheDocument();
  });

  // Over WHAT this deck's ceiling is: 99 cards is one over for a pair and
  // exactly full for a single commander.
  it("counts a pair's overflow against 98", () => {
    render(
      <DeckRail
        decks={[deck({ built: 99, statusPill: "Over", partnerName: "Bruse Tarl, Boorish Herder" })]}
        shopping={rollup()}
      />,
    );
    expect(screen.getByText("Over · 1 over")).toBeInTheDocument();
  });

  it("renders nothing at all when there are no decks", () => {
    const { container } = render(<DeckRail decks={[]} shopping={rollup()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
