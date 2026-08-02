import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckSuggestion } from "../../lib/decks/suggest";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { DECK_ADD_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";

const { addCardToDeck } = vi.hoisted(() => ({ addCardToDeck: vi.fn() }));
vi.mock("../../app/decks/actions", () => ({ addCardToDeck }));

const { SuggestionCard } = await import("./suggestion-card");

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const suggestion = {
  oracleId: "sol-ring",
  name: "Sol Ring",
  reasonType: "edhrec",
  reasonLabel: "82% of decks",
  owned: true,
} as DeckSuggestion;

function clickAdd() {
  return act(async () => {
    screen.getByRole("button", { name: /Add Sol Ring to deck/ }).click();
  });
}

beforeEach(() => {
  addCardToDeck.mockReset();
});

describe("SuggestionCard", () => {
  it("shows the committed state before the action resolves", async () => {
    const pending = deferred<DeckMutationResult>();
    addCardToDeck.mockReturnValue(pending.promise);

    render(<SuggestionCard suggestion={suggestion} deckId="d1" inDeck={false} />);
    await clickAdd();

    expect(screen.getByText("✓ In deck")).toBeInTheDocument();

    await act(async () => {
      pending.resolve({ ok: true });
    });
  });

  it("reverts and explains why when the server rejects the add", async () => {
    const pending = deferred<DeckMutationResult>();
    addCardToDeck.mockReturnValue(pending.promise);

    render(<SuggestionCard suggestion={suggestion} deckId="d1" inDeck={false} />);
    await clickAdd();
    await act(async () => {
      pending.resolve({ ok: false, message: "This card sits outside your commander's colors." });
    });

    expect(screen.getByRole("button", { name: /Add Sol Ring to deck/ })).toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("This card sits outside your commander's colors.");
    expect(alert).toHaveAttribute("aria-live", "polite");
  });

  it("reverts with a plain message when the action throws", async () => {
    addCardToDeck.mockRejectedValue(new Error("boom"));

    render(<SuggestionCard suggestion={suggestion} deckId="d1" inDeck={false} />);
    await clickAdd();

    expect(screen.getByRole("alert")).toHaveTextContent(DECK_ADD_FALLBACK_MESSAGE);
    expect(screen.getByRole("button", { name: /Add Sol Ring to deck/ })).toBeInTheDocument();
  });
});
