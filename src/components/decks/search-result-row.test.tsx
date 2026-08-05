import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { DECK_ADD_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { CardDetailProvider } from "./card-detail-provider";
import type { SearchResult } from "../../app/decks/[id]/search-action";

const { addCardToDeck } = vi.hoisted(() => ({ addCardToDeck: vi.fn() }));
vi.mock("../../app/decks/actions", () => ({ addCardToDeck }));

const { SearchResultRow } = await import("./search-result-row");

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const result = {
  oracleId: "sol-ring",
  name: "Sol Ring",
  typeLine: "Artifact",
  owned: true, ownedQty: 1,
  cardTypeGroup: "Artifacts",
  role: "ramp",
  imageUri: null,
} satisfies SearchResult;

function clickAdd() {
  return act(async () => {
    screen.getByRole("button", { name: /Add Sol Ring to deck/ }).click();
  });
}

beforeEach(() => {
  addCardToDeck.mockReset();
});

// These rows wrap their card name in CardDetailTrigger (#127), which needs the
// provider's context; the mutation behaviour under test is independent of it.
function renderRow(ui: React.ReactNode) {
  render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>{ui}</CardDetailProvider>,
  );
}

describe("SearchResultRow", () => {
  it("shows the committed state before the action resolves", async () => {
    const pending = deferred<DeckMutationResult>();
    addCardToDeck.mockReturnValue(pending.promise);

    renderRow(<SearchResultRow result={result} deckId="d1" inDeck={false} />);
    await clickAdd();

    expect(screen.getByText("✓ In deck")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add Sol Ring/ })).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve({ ok: true });
    });
  });

  it("reverts and explains why when the server rejects the add", async () => {
    const pending = deferred<DeckMutationResult>();
    addCardToDeck.mockReturnValue(pending.promise);

    renderRow(<SearchResultRow result={result} deckId="d1" inDeck={false} />);
    await clickAdd();
    await act(async () => {
      pending.resolve({ ok: false, message: "This deck is already at 99 cards." });
    });

    expect(screen.getByRole("button", { name: /Add Sol Ring to deck/ })).toBeInTheDocument();
    expect(screen.queryByText("✓ In deck")).not.toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("This deck is already at 99 cards.");
    // role="alert" carries the implicit assertive live region; no aria-live needed.
    expect(alert).not.toHaveAttribute("aria-live");
  });

  it("reverts with a plain message when the action throws", async () => {
    addCardToDeck.mockRejectedValue(new Error("boom"));

    renderRow(<SearchResultRow result={result} deckId="d1" inDeck={false} />);
    await clickAdd();

    expect(screen.getByRole("alert")).toHaveTextContent(DECK_ADD_FALLBACK_MESSAGE);
    expect(screen.getByRole("button", { name: /Add Sol Ring to deck/ })).toBeInTheDocument();
  });

  // The optimistic override must survive until the server value itself changes,
  // otherwise the row flashes "+ Add" again between resolve and re-render.
  it("does not flash back to Add when the add succeeds", async () => {
    const pending = deferred<DeckMutationResult>();
    addCardToDeck.mockReturnValue(pending.promise);

    function Harness() {
      const [inDeck, setInDeck] = useState(false);
      return (
        <>
          <SearchResultRow result={result} deckId="d1" inDeck={inDeck} />
          <button type="button" onClick={() => setInDeck(true)}>
            revalidate
          </button>
        </>
      );
    }

    renderRow(<Harness />);
    await clickAdd();
    await act(async () => {
      pending.resolve({ ok: true });
      screen.getByRole("button", { name: "revalidate" }).click();
    });

    expect(screen.getByText("✓ In deck")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps basics addable after an optimistic add", async () => {
    const pending = deferred<DeckMutationResult>();
    addCardToDeck.mockReturnValue(pending.promise);
    const forest = {
      oracleId: "forest", name: "Forest", typeLine: "Basic Land — Forest", owned: true, ownedQty: 1,
      cardTypeGroup: "Lands", role: "land", imageUri: null,
    } satisfies SearchResult;

    renderRow(<SearchResultRow result={forest} deckId="d1" inDeck />);
    await act(async () => {
      screen.getByRole("button", { name: /Add Forest to deck/ }).click();
    });

    expect(screen.getByRole("button", { name: /Add Forest to deck/ })).toBeInTheDocument();

    await act(async () => {
      pending.resolve({ ok: true });
    });
  });

  // A refusal answers a question the server can later settle differently — the
  // card gets added in another tab. The row survives revalidation, so the stale
  // message would otherwise sit under a row that now reads "in deck".
  it("clears a stale refusal once the server commits the card", async () => {
    addCardToDeck.mockResolvedValue({ ok: false, message: "This deck is full." });

    function Harness() {
      const [inDeck, setInDeck] = useState(false);
      return (
        <>
          <SearchResultRow result={result} deckId="d1" inDeck={inDeck} />
          <button type="button" onClick={() => setInDeck(true)}>
            revalidate
          </button>
        </>
      );
    }

    renderRow(<Harness />);
    await clickAdd();
    expect(screen.getByRole("alert")).toHaveTextContent("This deck is full.");

    await act(async () => {
      screen.getByRole("button", { name: "revalidate" }).click();
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("✓ In deck")).toBeInTheDocument();
  });
});
