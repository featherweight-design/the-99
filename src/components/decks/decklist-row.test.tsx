import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { CardDetailProvider } from "./card-detail-provider";

const { removeCardFromDeck } = vi.hoisted(() => ({ removeCardFromDeck: vi.fn() }));
vi.mock("../../app/decks/actions", () => ({ removeCardFromDeck }));

const { DecklistRow } = await import("./decklist-row");

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const card = {
  oracleId: "sol-ring",
  name: "Sol Ring",
  owned: true,
  quantity: 1,
} as DeckDetailCard;

function clickRemove() {
  return act(async () => {
    screen.getByRole("button", { name: "Remove Sol Ring" }).click();
  });
}

beforeEach(() => {
  removeCardFromDeck.mockReset();
});

// These rows wrap their card name in CardDetailTrigger (#127), which needs the
// provider's context; the mutation behaviour under test is independent of it.
function renderRow(ui: React.ReactNode) {
  render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>{ui}</CardDetailProvider>,
  );
}

describe("DecklistRow", () => {
  it("hides the card before the removal resolves", async () => {
    const pending = deferred<void>();
    removeCardFromDeck.mockReturnValue(pending.promise);

    renderRow(<DecklistRow deckId="d1" card={card} />);
    await clickRemove();

    expect(screen.queryByText("Sol Ring")).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve();
    });
  });

  // Removal takes one copy, so a stack keeps its row; hiding it would blank a
  // line the deck still holds eight of.
  it("keeps the row when more than one copy remains", async () => {
    const pending = deferred<void>();
    removeCardFromDeck.mockReturnValue(pending.promise);

    renderRow(<DecklistRow deckId="d1" card={{ ...card, quantity: 9 }} />);
    await clickRemove();

    expect(screen.getByText("Sol Ring")).toBeInTheDocument();

    await act(async () => {
      pending.resolve();
    });
  });

  it("brings the card back and explains when the removal fails", async () => {
    removeCardFromDeck.mockRejectedValue(new Error("boom"));

    renderRow(<DecklistRow deckId="d1" card={card} />);
    await clickRemove();

    expect(screen.getByText("Sol Ring")).toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(DECK_REMOVE_FALLBACK_MESSAGE);
    // role="alert" carries the implicit assertive live region; no aria-live needed.
    expect(alert).not.toHaveAttribute("aria-live");
  });
});
