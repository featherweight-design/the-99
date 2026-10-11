import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { gotItCopy } from "../../lib/copy/i-got-it";
import type { DeckDetailCard } from "../../lib/decks/grouping";

vi.mock("../../app/collection/edit-actions", () => ({ loadPrintingChoices: vi.fn().mockResolvedValue([]) }));
vi.mock("../../app/decks/mark-bought-actions", () => ({ markBought: vi.fn() }));

const { GotItProvider, useGotIt } = await import("./got-it");

const CARD = {
  oracleId: "33333333-3333-4333-8333-333333333333", name: "Etali, Primal Conqueror", typeLine: "Legendary Creature",
  cardTypeGroup: "Creatures", role: "other", cmc: 7, owned: false, quantity: 1, auto: false, availability: null,
  price: null, manaCost: "{5}{R}{G}", imageUri: null, printedName: null, printedSetCode: null, printedCollectorNumber: null,
} as unknown as DeckDetailCard;

function Harness({ row }: { row: boolean }) {
  const gotIt = useGotIt()!;
  return (
    <>
      <button type="button" data-shopping-filter="">Shopping</button>
      {row ? (
        <button type="button" onClick={(e) => gotIt.open(CARD, CARD.name, null, e.currentTarget)}>tag</button>
      ) : null}
    </>
  );
}

afterEach(cleanup);

describe("GotItProvider", () => {
  it("hands focus back to the tag that opened the confirm", async () => {
    render(<GotItProvider deckId="d1"><Harness row /></GotItProvider>);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "tag" })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: gotItCopy.confirm.cancel })));
    expect(screen.getByRole("button", { name: "tag" })).toHaveFocus();
  });

  // After a write the list re-reads and the row leaves before the confirm closes.
  it("hands focus to the Shopping filter when the tag has left the page", async () => {
    const { rerender } = render(<GotItProvider deckId="d1"><Harness row /></GotItProvider>);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "tag" })));
    rerender(<GotItProvider deckId="d1"><Harness row={false} /></GotItProvider>);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: gotItCopy.confirm.cancel })));
    expect(screen.getByRole("button", { name: "Shopping" })).toHaveFocus();
  });
});
