import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DeckDetailCard } from "../../lib/decks/grouping";
import { addPanelCopy } from "../../lib/copy/decks-builder";

// The basics stepper (handoff `design_handoff_the99_basic_lands_stepper`, R2; plan
// `2026-10-14-basic-lands-stepper.md`, PR 2): the row and the tile, the settle, and the two failures.

const { removeCardFromDeck, setBasicQuantity } = vi.hoisted(() => ({
  removeCardFromDeck: vi.fn(),
  setBasicQuantity: vi.fn(),
}));
vi.mock("../../app/decks/actions", () => ({ removeCardFromDeck, setBasicQuantity, setCardLocked: vi.fn() }));

const { DecklistRow } = await import("./decklist-row");
const { DeckCardTile } = await import("./deck-card-tile");
const { CardDetailProvider } = await import("../cards/card-detail-provider");
const { LockCardsProvider } = await import("./lock-cards");
const { SETTLE_MS } = await import("./use-basic-count");
const { PendingChangeProvider } = await import("./pending-change");
const { deckVersioningCopy } = await import("../../lib/copy/deck-versioning");

const copy = addPanelCopy.basicStepper;
const island = {
  oracleId: "o-island",
  name: "Island",
  typeLine: "Basic Land — Island",
  cardTypeGroup: "Lands",
  owned: true,
  quantity: 6,
} as DeckDetailCard;

function wrap(ui: React.ReactNode) {
  return render(<CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>{ui}</CardDetailProvider>);
}
const press = (name: string) => act(async () => { fireEvent.click(screen.getByRole("button", { name })); });
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(SETTLE_MS); });
const field = () => screen.getByRole("textbox", { name: copy.countAria("Island") }) as HTMLInputElement;

beforeEach(() => {
  vi.useFakeTimers();
  removeCardFromDeck.mockReset();
  setBasicQuantity.mockReset();
  setBasicQuantity.mockImplementation(async (_d: string, _o: string, n: number) => ({ ok: true, quantity: n, changed: true }));
});
afterEach(() => vi.useRealTimers());

describe("the basics stepper on a decklist row", () => {
  it("takes the ✕'s place and the ×N's on a basic land", () => {
    wrap(<DecklistRow deckId="d1" card={island} newestAsOf={null} />);
    expect(field()).toHaveValue("6");
    expect(screen.getByRole("button", { name: copy.fewerAria("Island", 5) })).toBeEnabled();
    expect(screen.getByRole("button", { name: copy.moreAria("Island", 7) })).toBeEnabled();
    expect(screen.queryByText("×6")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: addPanelCopy.row.removeCopyAria("Island", 6) })).not.toBeInTheDocument();
  });

  it("leaves a card that is not a basic its ✕", () => {
    wrap(<DecklistRow deckId="d1" card={{ ...island, oracleId: "o-sol", name: "Sol Ring", typeLine: "Artifact", quantity: 1 }} newestAsOf={null} />);
    expect(screen.getByRole("button", { name: addPanelCopy.row.removeAria("Sol Ring") })).toBeInTheDocument();
    expect(screen.queryByTestId("count-stepper-row")).not.toBeInTheDocument();
  });

  it("draws nothing to press on a read-only list", () => {
    wrap(<DecklistRow deckId="d1" card={island} newestAsOf={null} readOnly />);
    expect(screen.queryByTestId("count-stepper-row")).not.toBeInTheDocument();
  });

  it("moves the count at once and sends ONE save, with the last figure, once the presses stop", async () => {
    wrap(<DecklistRow deckId="d1" card={island} newestAsOf={null} />);
    await press(copy.moreAria("Island", 7));
    await press(copy.moreAria("Island", 8));
    await press(copy.moreAria("Island", 9));
    expect(field()).toHaveValue("9");
    expect(setBasicQuantity).not.toHaveBeenCalled();
    await settle();
    expect(setBasicQuantity).toHaveBeenCalledTimes(1);
    expect(setBasicQuantity).toHaveBeenCalledWith("d1", "o-island", 9);
    expect(screen.getByRole("status")).toHaveTextContent(copy.settled("Island", 9));
  });

  it("sends the newer figure when a press lands while a save is out", async () => {
    let answer!: (v: unknown) => void;
    setBasicQuantity.mockImplementationOnce(() => new Promise((r) => { answer = r; }));
    wrap(<DecklistRow deckId="d1" card={island} newestAsOf={null} />);
    await press(copy.moreAria("Island", 7));
    await settle();
    expect(setBasicQuantity).toHaveBeenLastCalledWith("d1", "o-island", 7);
    await press(copy.moreAria("Island", 8));
    await act(async () => { answer({ ok: true, quantity: 7, changed: true }); });
    await settle();
    expect(setBasicQuantity).toHaveBeenCalledTimes(2);
    expect(setBasicQuantity).toHaveBeenLastCalledWith("d1", "o-island", 8);
  });

  it("puts the saved count back and says the deck is unchanged when the save is refused", async () => {
    setBasicQuantity.mockResolvedValueOnce({ ok: false, reason: "out-of-range" });
    wrap(<DecklistRow deckId="d1" card={island} newestAsOf={null} />);
    await press(copy.fewerAria("Island", 5));
    expect(field()).toHaveValue("5");
    await settle();
    expect(field()).toHaveValue("6");
    expect(screen.getByRole("alert")).toHaveTextContent(copy.refused);
  });

  it("never claims a revert when the save throws, since it may have landed", async () => {
    setBasicQuantity.mockRejectedValueOnce(new Error("lost"));
    wrap(<DecklistRow deckId="d1" card={island} newestAsOf={null} />);
    await press(copy.fewerAria("Island", 5));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent(copy.unconfirmed);
    expect(screen.queryByText(copy.refused)).not.toBeInTheDocument();
  });

  it("is the shipped ✕ at 1, and that press is a removal", async () => {
    removeCardFromDeck.mockResolvedValue(undefined);
    wrap(<DecklistRow deckId="d1" card={{ ...island, quantity: 1 }} newestAsOf={null} />);
    expect(screen.queryByRole("button", { name: copy.fewerAria("Island", 0) })).not.toBeInTheDocument();
    await press(addPanelCopy.row.removeAria("Island"));
    expect(removeCardFromDeck).toHaveBeenCalledWith("d1", "o-island");
    expect(setBasicQuantity).not.toHaveBeenCalled();
  });

  // The ✕ pressed while a − is still settling: the − 's save must not land after the removal and
  // leave a copy, nor come back as a stale refusal once the row is gone.
  it("cancels a settling burst and removes by an absolute 0 when the ✕ is pressed inside it", async () => {
    wrap(<DecklistRow deckId="d1" card={{ ...island, quantity: 2 }} newestAsOf={null} />);
    await press(copy.fewerAria("Island", 1));
    await press(addPanelCopy.row.removeAria("Island"));
    await settle();
    expect(removeCardFromDeck).not.toHaveBeenCalled();
    expect(setBasicQuantity).toHaveBeenCalledTimes(1);
    expect(setBasicQuantity).toHaveBeenCalledWith("d1", "o-island", 0);
    expect(screen.queryByText(copy.refused)).not.toBeInTheDocument();
  });

  // A committed deck whose draft had not touched the Island: the burst draws `from 6` before any pending move
  // exists, so the row has to say it itself, through the name's description.
  it("speaks `from N` on a row the draft had not touched", async () => {
    wrap(
      <PendingChangeProvider value={{ moves: new Map() } as never}>
        <DecklistRow deckId="d1" card={island} newestAsOf={null} />
      </PendingChangeProvider>,
    );
    await press(copy.moreAria("Island", 7));
    expect(screen.getByText(copy.from(6))).toBeInTheDocument();
    const trigger = screen.getAllByRole("button").find((b) => b.getAttribute("aria-describedby")?.length)!;
    const ids = trigger.getAttribute("aria-describedby")!.split(" ");
    const spoken = ids.map((id) => document.getElementById(id)?.textContent ?? "");
    expect(spoken).toContain(deckVersioningCopy.pending.addMarkRecountedA11y(6, 7));
    await settle();
  });

  // List ↔ Card swaps the row for the tile mid-burst: the count the row showed is still saved.
  it("saves a burst whose row unmounts before the settle", async () => {
    const view = wrap(<DecklistRow deckId="d1" card={island} newestAsOf={null} />);
    await press(copy.moreAria("Island", 7));
    view.unmount();
    await settle();
    expect(setBasicQuantity).toHaveBeenCalledTimes(1);
    expect(setBasicQuantity).toHaveBeenCalledWith("d1", "o-island", 7);
  });

  // Focus survives 2 → 1: the − and the ✕ are the same button node, so a keyboard user stays put.
  it("keeps focus on the − slot when it becomes the ✕", async () => {
    wrap(<DecklistRow deckId="d1" card={{ ...island, quantity: 2 }} newestAsOf={null} />);
    const minus = screen.getByRole("button", { name: copy.fewerAria("Island", 1) });
    minus.focus();
    await act(async () => { fireEvent.click(minus); });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: addPanelCopy.row.removeAria("Island") }));
    await settle();
  });

  describe("the typed count", () => {
    const type = (text: string, key = "Enter") =>
      act(async () => {
        fireEvent.change(field(), { target: { value: text } });
        fireEvent.keyDown(field(), { key });
      });

    it("commits on Enter", async () => {
      wrap(<DecklistRow deckId="d1" card={{ ...island, quantity: 35 }} newestAsOf={null} />);
      await type("20");
      await settle();
      expect(setBasicQuantity).toHaveBeenCalledWith("d1", "o-island", 20);
    });

    it("restores on Escape and writes nothing", async () => {
      wrap(<DecklistRow deckId="d1" card={island} newestAsOf={null} />);
      await type("20", "Escape");
      await settle();
      expect(field()).toHaveValue("6");
      expect(setBasicQuantity).not.toHaveBeenCalled();
    });

    // The field's bound is 99 and the server's is 999 (plan, "The two bounds, together"): a typed 150 has
    // one outcome, the saved figure back and nothing written. A 0 is the same: removal is the ✕ at 1.
    it.each(["150", "0"])("restores a typed %s and writes nothing", async (text) => {
      wrap(<DecklistRow deckId="d1" card={island} newestAsOf={null} />);
      await type(text);
      await settle();
      expect(field()).toHaveValue("6");
      expect(setBasicQuantity).not.toHaveBeenCalled();
    });

    it("steps by one on the arrow keys", async () => {
      wrap(<DecklistRow deckId="d1" card={island} newestAsOf={null} />);
      await act(async () => { fireEvent.keyDown(field(), { key: "ArrowUp" }); });
      expect(field()).toHaveValue("7");
    });
  });

  it("yields to the lock toggle in Lock cards mode", () => {
    const value = { mode: true, pending: new Set<string>(), errors: new Map(), toggle: vi.fn() } as unknown as Parameters<typeof LockCardsProvider>[0]["value"];
    wrap(
      <LockCardsProvider value={value}>
        <DecklistRow deckId="d1" card={island} newestAsOf={null} />
      </LockCardsProvider>,
    );
    expect(screen.queryByTestId("count-stepper-row")).not.toBeInTheDocument();
    // The count stays readable while the stepper has stepped aside.
    expect(screen.getByText("×6")).toBeInTheDocument();
  });
});

describe("the basics stepper on a card tile", () => {
  it("rides the art's foot, and the caption loses its ×N and its ✕ column", () => {
    wrap(<ul><DeckCardTile deckId="d1" card={island} /></ul>);
    expect(screen.getByTestId("count-stepper-band")).toBeInTheDocument();
    expect(field()).toHaveValue("6");
    expect(screen.queryByText("×6")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: addPanelCopy.row.removeCopyAria("Island", 6) })).not.toBeInTheDocument();
  });

  it("sends one save from the tile too", async () => {
    wrap(<ul><DeckCardTile deckId="d1" card={island} /></ul>);
    await press(copy.moreAria("Island", 7));
    await press(copy.moreAria("Island", 8));
    await settle();
    expect(setBasicQuantity).toHaveBeenCalledTimes(1);
    expect(setBasicQuantity).toHaveBeenCalledWith("d1", "o-island", 8);
  });
});
