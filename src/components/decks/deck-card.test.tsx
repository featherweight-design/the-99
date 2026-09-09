import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeckCard } from "./deck-card";
import type { DeckListItem } from "../../lib/decks/read";

vi.mock("./deck-card-overflow", () => ({
  DeckCardOverflow: () => <button type="button">Actions</button>,
}));

const now = new Date("2026-09-07T12:00:00Z");
const daysBefore = (n: number) => new Date(now.getTime() - n * 86_400_000);

const deck = (over: Partial<DeckListItem> = {}): DeckListItem => ({
  id: "d1",
  name: "Atraxa, Praetors' Voice",
  createdAt: daysBefore(30),
  commanderName: "Atraxa, Praetors' Voice",
  commanderColorIdentity: ["W", "U", "B", "G"],
  commanderImageUri: "https://example.test/atraxa.jpg",
  commanderArtCropUri: "https://example.test/atraxa-crop.jpg",
  built: 99,
  ownedCount: 96,
  toBuyCount: 3,
  unresolvedCount: 0,
  statusPill: "To buy",
  lastPlayedAt: daysBefore(2),
  inUseElsewhere: 0,
  ...over,
});

describe("DeckCard", () => {
  it("shows the status, the count with its denominator, and the explaining figure", () => {
    render(
      <DeckCard deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
    );
    expect(screen.getByText("To buy")).toBeInTheDocument();
    expect(screen.getByText("99 / 99")).toBeInTheDocument();
    expect(screen.getByText("3 unowned · $18.40")).toBeInTheDocument();
    expect(screen.getByText("2 days ago")).toBeInTheDocument();
  });

  // `toBuyCount` is `built − ownedCount` and counts basics; the roll-up refuses
  // them, as every Shopping surface does. Printing the deck's number beside the
  // roll-up's cost would be a figure and a price covering different cards.
  it("counts the roll-up's copies, not the deck's, so the count and the cost agree", () => {
    render(
      <DeckCard
        deck={deck({ toBuyCount: 3 })}
        shopping={{ copies: 1, cents: 620, pricedCopies: 1 }}
        now={now}
      />,
    );
    expect(screen.getByText("1 unowned · $6.20")).toBeInTheDocument();
  });

  it("prints the copies without a cost when nothing in the deck has a price", () => {
    render(<DeckCard deck={deck()} shopping={{ copies: 3, cents: 0, pricedCopies: 0 }} now={now} />);
    expect(screen.getByText("3 unowned")).toBeInTheDocument();
  });

  // A deck whose only unowned cards are basics clears the `To buy` threshold —
  // that one counts them — and has no roll-up entry, because no Shopping
  // surface sells them. Falling back to `toBuyCount` here would print an
  // "unowned" figure that disagrees with every other surface in the app.
  it("draws no figure for a To buy deck the roll-up has nothing for", () => {
    render(<DeckCard deck={deck({ toBuyCount: 3 })} shopping={undefined} now={now} />);
    expect(screen.queryByText(/unowned/)).toBeNull();
  });

  it("has no call to action — the pill is the message and the tile is the target", () => {
    render(<DeckCard deck={deck()} shopping={undefined} now={now} />);
    // One link (the whole tile) and one button (the overflow). Nothing else.
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /open|build|edit/i })).toBeNull();
  });

  it("draws commander art on a Draft tile, because every deck has a commander", () => {
    const { container } = render(
      <DeckCard
        deck={deck({
          statusPill: "Draft",
          built: 0,
          ownedCount: 0,
          toBuyCount: 0,
          lastPlayedAt: null,
          createdAt: now,
        })}
        shopping={undefined}
        now={now}
      />,
    );
    expect(container.querySelector("[data-deck-art]")?.innerHTML).toContain("atraxa-crop.jpg");
    expect(screen.getByText("0 / 99")).toBeInTheDocument();
    expect(screen.getByText("created today")).toBeInTheDocument();
    expect(screen.queryByText(/no commander/i)).toBeNull();
  });

  it("bands the art at 2.2:1 with a floor, not a fixed height", () => {
    const { container } = render(<DeckCard deck={deck()} shopping={undefined} now={now} />);
    const band = container.querySelector("[data-deck-art]");
    expect(band?.className).toContain("aspect-[2.2/1]");
    expect(band?.className).toContain("min-h-[104px]");
    expect(band?.className).not.toContain("h-[124px]");
  });

  it("leaves a Draft tile's track empty and its last-played slot unrendered", () => {
    render(
      <DeckCard
        deck={deck({ statusPill: "Draft", built: 0, lastPlayedAt: null, createdAt: now })}
        shopping={undefined}
        now={now}
      />,
    );
    // The track is drawn for every status; only the fill is withheld, which is
    // what "empty track" means. A Draft tile's detail row carries its created
    // figure alone.
    expect(document.querySelector("[data-deck-bar-fill]")).toBeNull();
    expect(document.querySelector("[data-deck-bar]")).toBeTruthy();
    expect(screen.queryByText("never played")).toBeNull();
  });

  it("prints never played rather than leaving the corner blank", () => {
    render(<DeckCard deck={deck({ lastPlayedAt: null })} shopping={undefined} now={now} />);
    expect(screen.getByText("never played")).toBeInTheDocument();
  });

  it("gives each status its own explaining figure", () => {
    const cases: Array<[Partial<DeckListItem>, string]> = [
      [{ statusPill: "Complete", toBuyCount: 0, ownedCount: 99 }, "all owned"],
      [{ statusPill: "Unresolved", unresolvedCount: 2 }, "2 lines unresolved"],
      [{ statusPill: "Unresolved", unresolvedCount: 1 }, "1 line unresolved"],
      [{ statusPill: "Over", built: 104 }, "5 over"],
      [{ statusPill: "Building", built: 87 }, "87 / 99"],
    ];
    for (const [over, text] of cases) {
      const { unmount } = render(<DeckCard deck={deck(over)} shopping={undefined} now={now} />);
      expect(screen.getByText(text)).toBeInTheDocument();
      unmount();
    }
  });

  it("fills an empty detail slot with the in-use-elsewhere clause", () => {
    render(
      <DeckCard
        deck={deck({ statusPill: "Building", built: 87, inUseElsewhere: 3 })}
        shopping={undefined}
        now={now}
      />,
    );
    expect(screen.getByText("3 in use elsewhere")).toBeInTheDocument();
  });

  it("never lets the clause displace a status's own figure", () => {
    render(
      <DeckCard
        deck={deck({ statusPill: "Unresolved", unresolvedCount: 2, inUseElsewhere: 3 })}
        shopping={undefined}
        now={now}
      />,
    );
    expect(screen.getByText("2 lines unresolved")).toBeInTheDocument();
    expect(screen.queryByText("3 in use elsewhere")).toBeNull();
  });

  // `detailDraft` is the literal `created today`, so it is only true on the day
  // of creation. There is no copy key for an older Draft, so it falls back to
  // its count rather than being told a date it does not have.
  it("falls back to the count for a Draft older than the day it was created", () => {
    render(
      <DeckCard
        deck={deck({ statusPill: "Draft", built: 0, createdAt: daysBefore(9) })}
        shopping={undefined}
        now={now}
      />,
    );
    expect(screen.queryByText("created today")).toBeNull();
    expect(screen.getByText("0 / 99")).toBeInTheDocument();
  });

  it("names the whole tile for a screen reader, in the order the tile reads", () => {
    render(
      <DeckCard deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
    );
    expect(
      screen.getByRole("link", {
        name: "Atraxa, Praetors' Voice, To buy, 99 / 99, 3 unowned · $18.40",
      }),
    ).toBeInTheDocument();
  });

  // The detail figure moves between the meta row and the detail row by grid
  // area, never by rendering twice: a doubled node reads the figure twice to a
  // screen reader and passes a property check on both columns while being wrong.
  it("renders the phone and desktop layouts from one set of nodes", () => {
    const { container } = render(
      <DeckCard deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
    );
    expect(screen.getAllByText("3 unowned · $18.40")).toHaveLength(1);
    expect(container.querySelectorAll("[data-deck-art]")).toHaveLength(1);
  });

  // §4 of the handoff: the wash owns one band, carrying the name, the subtitle
  // and the status chip. Everything else sits below a divider on flat ground.
  it("prints the commander name under the deck name, in the band", () => {
    render(
      <DeckCard
        deck={deck({ name: "Blink and you'll miss it", commanderName: "Yuriko, the Tiger's Shadow" })}
        shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }}
        now={now}
      />,
    );
    expect(screen.getByText("Yuriko, the Tiger's Shadow")).toBeInTheDocument();
  });

  it("separates the band from the data with a divider", () => {
    const { container } = render(
      <DeckCard deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
    );
    const footer = container.querySelector(".deck-card-footer") as HTMLElement;
    expect(footer.style.borderTop).toBe("1px solid var(--border)");
  });
});
