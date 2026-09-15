import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { availabilityCopy } from "../../lib/copy/availability";
import { cardTileCopy, manaCopy, spokenManaCost } from "../../lib/copy/card-surfaces";
import type { Availability } from "../../lib/decks/availability";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { CardDetailProvider, cardDetailCopy } from "../cards/card-detail-provider";
import { proxyCopy } from "../../lib/copy/proxies";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { PendingChangeProvider } from "./pending-change";

const { addCardToDeck, removeCardFromDeck } = vi.hoisted(() => ({
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
}));
vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck,
  removeCardFromDeck,
  keepAutoCard: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));

const { DeckCardTile } = await import("./deck-card-tile");

const card = {
  oracleId: "sol-ring",
  name: "Sol Ring",
  owned: true,
  quantity: 1,
  manaCost: "{1}",
  imageUri: "https://cards.example/sol-ring.jpg",
} as DeckDetailCard;

/** The tile's art is a CardDetailTrigger, which needs the provider's context. */
function renderTile(ui: React.ReactNode) {
  render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>{ui}</CardDetailProvider>,
  );
}

beforeEach(() => {
  removeCardFromDeck.mockReset();
  addCardToDeck.mockReset();
});

afterEach(cleanup);

describe("DeckCardTile — the four states of Matrix 2", () => {
  // Owned and free: the marker has nothing to say, so the top-left slot is
  // empty. The `$` chip is the unowned state's, and drawing it here would ask
  // the player to buy a card they already have.
  it("draws nothing in the availability slot for an owned card with no claim", () => {
    renderTile(<DeckCardTile deckId="d1" card={card} />);

    expect(screen.queryByText("$")).not.toBeInTheDocument();
    expect(screen.queryByText(cardTileCopy.slotUnownedAria)).not.toBeInTheDocument();
  });

  // The tile's `$` is the floor, not the shop: it says "not owned" and carries
  // no figure, where the All row's identical glyph speaks a price.
  it("says `not owned` rather than a price on an unowned card", () => {
    renderTile(<DeckCardTile deckId="d1" card={{ ...card, owned: false }} />);

    expect(screen.getByText("$")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(cardTileCopy.slotUnownedAria)).toBeInTheDocument();
  });

  // The Card view drew this tile's `$` off `card.owned` alone, so a printed card
  // — which is unowned by design — was told to buy itself, one toggle away from
  // the List view saying the opposite about the same card.
  it("draws the proxy mark instead of the buy tag on a printed card", () => {
    renderTile(
      <DeckCardTile deckId="d1" card={{ ...card, owned: false, proxied: true }} />,
    );

    expect(screen.getByText(proxyCopy.tag.glyph)).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(proxyCopy.tag.aria)).toBeInTheDocument();
    // The two share a slot and can never co-occur.
    expect(screen.queryByText("$")).not.toBeInTheDocument();
    expect(screen.queryByText(cardTileCopy.slotUnownedAria)).not.toBeInTheDocument();
  });

  it("draws no availability chip on a printed card the player owns", () => {
    // Printing is the deck's answer about the slot, so it outranks the chip that
    // would otherwise describe the copies competing for it.
    const availability: Availability = { owned: 2, hard: 0, soft: 1, free: 1, claims: [] };
    renderTile(
      <DeckCardTile deckId="d1" card={{ ...card, owned: true, proxied: true, availability }} />,
    );

    expect(screen.getByText(proxyCopy.tag.aria)).toBeInTheDocument();
    expect(screen.queryByText("$")).not.toBeInTheDocument();
  });

  // The chip sits outside the trigger, whose own accessible name would
  // otherwise replace everything nested under it — so it is in the tree in its
  // own right and speaks §17's prose itself.
  it("draws and speaks the chip on a card with copies in a brew", () => {
    const availability: Availability = { owned: 2, hard: 0, soft: 1, free: 1, claims: [] };

    renderTile(<DeckCardTile deckId="d1" card={{ ...card, availability }} />);

    expect(screen.getByText(availabilityCopy.marker.soft(1))).toBeInTheDocument();
    expect(screen.getByText(availabilityCopy.marker.softAria(1))).toBeInTheDocument();
  });

  it("marks an over-committed tile on its border as well as in the chip", () => {
    // Negative `free` is the whole over signal: on this vantage the deck's own
    // copies are already out of supply, so `free === 0` is silence and only a
    // genuine shortfall goes negative.
    const availability: Availability = { owned: 1, hard: 0, soft: 0, free: -1, claims: [] };

    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <DeckCardTile deckId="d1" card={{ ...card, availability }} />
      </CardDetailProvider>,
    );

    expect(screen.getByText(availabilityCopy.marker.over(1))).toBeInTheDocument();
    expect(container.querySelector("[class*='avail-over-border']")).not.toBeNull();
  });
});

describe("DeckCardTile — the count and the way out", () => {
  // The badge is drawn and aria-hidden; the trigger is the only accessible name
  // a tile has, so the count rides it or goes unsaid.
  it("hides the quantity badge at one copy", () => {
    renderTile(<DeckCardTile deckId="d1" card={card} />);

    expect(screen.queryByText(addPanelCopy.row.quantity(1))).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }),
    ).toBeInTheDocument();
  });

  it("draws the badge and rides the count on the trigger's name above one copy", () => {
    renderTile(<DeckCardTile deckId="d1" card={{ ...card, quantity: 2 }} />);

    expect(screen.getByText(addPanelCopy.row.quantity(2))).toHaveAttribute("aria-hidden", "true");
    expect(
      screen.getByRole("button", {
        name: `${cardDetailCopy.triggerAria("Sol Ring")}, ${cardTileCopy.copiesAria(2)}`,
      }),
    ).toBeInTheDocument();
  });

  it("removes the card from the ✕ in the caption", async () => {
    removeCardFromDeck.mockResolvedValue(undefined);
    renderTile(<DeckCardTile deckId="d1" card={card} />);

    await act(async () => {
      screen.getByRole("button", { name: addPanelCopy.row.removeAria("Sol Ring") }).click();
    });

    expect(removeCardFromDeck).toHaveBeenCalledWith("d1", "sol-ring");
  });

  // A card with no art draws a plate, never a colour-identity gradient:
  // `DeckDetailCard` carries no colour identity, so a gradient would be a claim
  // about the card guessed from nothing.
  it("draws the no-art plate when the card has no image", () => {
    renderTile(<DeckCardTile deckId="d1" card={{ ...card, imageUri: null }} />);

    expect(screen.getByText(addPanelCopy.tile.noArt)).toBeInTheDocument();
  });
});

describe("DeckCardTile — the spent slot", () => {
  it("draws the undo receipt in the tile's own shape", async () => {
    addCardToDeck.mockResolvedValue(undefined);
    renderTile(<DeckCardTile deckId="d1" card={card} spent />);

    expect(screen.getByText(addPanelCopy.undo.removed("Sol Ring"))).toBeInTheDocument();

    await act(async () => {
      screen.getByRole("button", { name: addPanelCopy.undo.actionAria("Sol Ring") }).click();
    });

    expect(addCardToDeck).toHaveBeenCalledWith("d1", "sol-ring");
  });
});

// The printed name (#467 follow-on). Both quantities are asserted deliberately:
// `ariaLabel` is composed only above one copy, and at one copy the provider
// falls back to composing the label from the `name` prop — the common case.
describe("DeckCardTile printed name", () => {
  const renamed = {
    ...card,
    name: "World at War",
    printedName: "Battle of Olympus // Aftermath",
    // The front-face cut asks the layout word, so a fixture without one would
    // caption the whole string — a split card is one face and keeps both halves.
    layout: "transform",
  } as DeckDetailCard;

  it("captions the tile with the printed front face and drops the tooltip", () => {
    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <DeckCardTile deckId="d1" card={renamed} />
      </CardDetailProvider>,
    );
    expect(screen.getByText("Battle of Olympus")).toBeInTheDocument();
    expect(screen.queryByText("World at War")).not.toBeInTheDocument();
    // A `title` is pointer-only recovery on a phone-first surface, and the
    // trigger's accessible name already carries the full string properly.
    expect(container.querySelector("[title]")).toBeNull();
  });

  it("carries the full printed name on the trigger at one copy", () => {
    renderTile(<DeckCardTile deckId="d1" card={{ ...renamed, quantity: 1 } as DeckDetailCard} />);
    expect(
      screen.getByRole("button", {
        name: cardDetailCopy.triggerAria("Battle of Olympus // Aftermath"),
      }),
    ).toBeInTheDocument();
  });

  it("carries it at more than one copy too, where the label is composed", () => {
    renderTile(<DeckCardTile deckId="d1" card={{ ...renamed, quantity: 2 } as DeckDetailCard} />);
    expect(
      screen.getByRole("button", {
        name: `${cardDetailCopy.triggerAria("Battle of Olympus // Aftermath")}, ${cardTileCopy.copiesAria(2)}`,
      }),
    ).toBeInTheDocument();
  });

  it("leaves an ordinary card on its oracle name, byte for byte", () => {
    renderTile(<DeckCardTile deckId="d1" card={{ ...card, name: "Fire // Ice" } as DeckDetailCard} />);
    expect(screen.getByText("Fire // Ice")).toBeInTheDocument();
  });
});

describe("DeckCardTile — the cost the art already prints", () => {
  // The drawn pips are gone from a tile with art: the card prints its cost in
  // its own top-right corner, and a run of discs over the bottom-left said it
  // twice. Asserted on the pip ELEMENTS rather than on the spoken string, which
  // survives the change and would go green either way.
  it("draws no cost pips over a tile with art", () => {
    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <DeckCardTile deckId="d1" card={{ ...card, manaCost: "{3}{W}{W}" }} />
      </CardDetailProvider>,
    );

    expect(container.querySelector("[data-testid='tile-cost-pips']")).toBeNull();
  });

  // The pips were this tile's only cost for a reader who cannot see the art, so
  // dropping them has to leave the spoken form behind.
  it("still speaks the cost", () => {
    renderTile(<DeckCardTile deckId="d1" card={{ ...card, manaCost: "{3}{W}{W}" }} />);

    expect(screen.getByText(spokenManaCost("{3}{W}{W}"))).toBeInTheDocument();
  });

  // The rule is "the card is visible", so it does not reach a tile with no
  // image: that one draws a plate printing nothing, and the pips are the only
  // cost anyone can see.
  it("keeps the pips on a tile with no art", () => {
    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <DeckCardTile
          deckId="d1"
          card={{ ...card, manaCost: "{3}{W}{W}", imageUri: null } as DeckDetailCard}
        />
      </CardDetailProvider>,
    );

    expect(container.querySelector("[data-testid='tile-cost-pips']")).not.toBeNull();
    expect(screen.getByText(spokenManaCost("{3}{W}{W}"))).toBeInTheDocument();
  });
});

describe("DeckCardTile — a cost string with nothing in it", () => {
  // `spokenManaCost` answers `no mana cost` for a string it cannot parse, which
  // is a claim about the CARD rather than about the string — a land. The tile
  // must stay silent instead, which is what the retired `CostPips` path did by
  // drawing nothing.
  it("says nothing for a nonempty cost holding no symbols", () => {
    renderTile(<DeckCardTile deckId="d1" card={{ ...card, manaCost: "???" }} />);

    expect(screen.queryByText(manaCopy.costNone)).not.toBeInTheDocument();
  });

  it("says nothing for it on a tile with no art either", () => {
    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <DeckCardTile deckId="d1" card={{ ...card, manaCost: "???", imageUri: null } as DeckDetailCard} />
      </CardDetailProvider>,
    );

    expect(screen.queryByText(manaCopy.costNone)).not.toBeInTheDocument();
    expect(container.querySelector("[data-testid='tile-cost-pips']")).toBeNull();
  });
});

describe("DeckCardTile — the proxied state", () => {
  // `STATES-card-captions.md:31`: hollow dashed dot, the `P`, and NO count.
  // Each of the three is a separate way to claim something the state does not.
  const proxiedCard = {
    ...card,
    owned: true,
    quantity: 2,
    proxied: true,
  } as DeckDetailCard;

  it("draws a hollow dot even on a card the collection holds", () => {
    renderTile(<DeckCardTile deckId="d1" card={proxiedCard} />);

    // `owned` is a fact about the box; `proxied` is a fact about this deck's
    // slot. `grouping.ts:26-30` rules that the two are allowed to disagree out
    // loud, and a filled dot beside a `P` is the reading that lies.
    expect(screen.getByLabelText("Not owned")).toBeInTheDocument();
    expect(screen.queryByLabelText("Owned")).toBeNull();
  });

  it("claims no quantity, drawn or spoken", () => {
    renderTile(<DeckCardTile deckId="d1" card={proxiedCard} />);

    // A proxy covers this deck's whole ask for the card and takes no quantity,
    // so neither the meta line nor the trigger's accessible name may state one.
    expect(screen.queryByText(addPanelCopy.row.quantity(2))).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: new RegExp(cardTileCopy.copiesAria(2)) }),
    ).toBeNull();
  });

  it("still counts copies on a card that is not proxied", () => {
    renderTile(
      <DeckCardTile deckId="d1" card={{ ...card, owned: true, quantity: 2 } as DeckDetailCard} />,
    );

    expect(screen.getByText(addPanelCopy.row.quantity(2))).toBeInTheDocument();
  });
});

describe("DeckCardTile — the draft touched this card", () => {
  // Call B. The card view had NO draft treatment before this: `usePendingChange`
  // had exactly one consumer, so a deck with an uncommitted draft photographed
  // identically whether the draft was clean or not.
  function renderWithDraft(moves: Array<[string, { from: number; to: number }]>, card_: DeckDetailCard) {
    render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <PendingChangeProvider value={{ moves: new Map(moves) }}>
          <DeckCardTile deckId="d1" card={card_} />
        </PendingChangeProvider>
      </CardDetailProvider>,
    );
  }

  it("prints the pair where the count was, and speaks it", () => {
    renderWithDraft([[card.oracleId, { from: 1, to: 2 }]], { ...card, quantity: 2 });

    // The pair TAKES the count's position rather than sitting beside it, which
    // is what resolves the double statement — and it lands on the meta line
    // rather than in the name's place, because at 178px the name has no 30px to
    // give up.
    expect(screen.getByText(deckVersioningCopy.pending.tilePair(1, 2))).toBeInTheDocument();
    expect(screen.queryByText(addPanelCopy.row.quantity(2))).not.toBeInTheDocument();
    expect(
      screen.getByText(deckVersioningCopy.pending.addMarkRecountedA11y(1, 2)),
    ).toBeInTheDocument();
  });

  it("prints a signed delta for a card the draft added", () => {
    // The list view has no shape for this at all: a row the version did not hold
    // has no count to move. It is the one thing the tile says that the row cannot.
    renderWithDraft([[card.oracleId, { from: 0, to: 1 }]], card);

    expect(screen.getByText(deckVersioningCopy.pending.tileAdded(1))).toBeInTheDocument();
    expect(screen.getByText(deckVersioningCopy.pending.addMarkA11y)).toBeInTheDocument();
  });

  it("draws the accent edge on the caption, never the shell", () => {
    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <PendingChangeProvider value={{ moves: new Map([[card.oracleId, { from: 1, to: 2 }]]) }}>
          <DeckCardTile deckId="d1" card={card} />
        </PendingChangeProvider>
      </CardDetailProvider>,
    );

    // The shell's border already carries over-committed, and both are true at
    // once often enough to matter. An accent ring 1px inside that tint would be
    // two unrelated facts on one edge.
    const edged = [...container.querySelectorAll<HTMLElement>("*")].filter((el) =>
      el.style.boxShadow.includes("var(--accent)"),
    );
    expect(edged).toHaveLength(1);
    expect(edged[0].className).toContain("items-stretch");
  });

  it("leaves a clean draft alone", () => {
    renderWithDraft([["some-other-card", { from: 1, to: 2 }]], { ...card, quantity: 2 });

    expect(screen.getByText(addPanelCopy.row.quantity(2))).toBeInTheDocument();
    expect(screen.queryByText(deckVersioningCopy.pending.tilePair(1, 2))).not.toBeInTheDocument();
  });
});
