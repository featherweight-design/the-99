import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import type { LineItem } from "../../lib/tuning/state";
import type { CardActions } from "./suggestion-card";
import { SuggestionLine } from "./suggestion-line";

const open = vi.fn();
vi.mock("../cards/card-detail-provider", () => ({ useCardDetail: () => ({ open }), useCardIntent: () => ({}) }));

const copy = deckTuningCopy.lists;

const add: LineItem = {
  side: "add", id: "l1", cardOracleId: "a", cardName: "Three Visits", cardTypeLine: "Sorcery", cardImageUri: null,
  rationale: "Fetches a Forest untapped for two.", rationaleShort: "Ramp.",
  evidence: [{ kind: "games", value: "mana 5 of 9" }], position: 0, verdict: "pending",
  owned: true, ownedQuantity: 1, availability: null, price: null, bracketAfter: null,
  applies: true, inDeck: false, locked: false,
};
const cut: LineItem = { ...add, side: "cut", id: "l2", cardOracleId: "c", cardName: "Rampant Growth", owned: false, ownedQuantity: 0, inDeck: true };

const ok = async () => ({ ok: true as const });
const actions = (over: Partial<CardActions> = {}): CardActions => ({ apply: ok, undo: ok, reject: ok, restore: ok, ...over });

function draw(i: LineItem, over: Partial<CardActions> = {}, permits: number[] = [3]) {
  const onSettled = vi.fn();
  render(<SuggestionLine item={i} permits={permits as never} newestPriceAsOf={null} actions={actions(over)} onSettled={onSettled} />);
  return onSettled;
}

describe("SuggestionLine", () => {
  it("draws an addition with Add and Reject, its reason and its citations", () => {
    draw(add);
    expect(screen.getAllByRole("button", { name: copy.add }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: copy.reject }).length).toBeGreaterThan(0);
    expect(screen.getByText(add.rationale)).toBeInTheDocument();
    expect(screen.getByText("mana 5 of 9")).toBeInTheDocument();
  });

  it("draws a cut with Cut, struck, and no ownership mark", () => {
    draw(cut);
    expect(screen.getAllByRole("button", { name: copy.cut }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: copy.open("Rampant Growth") })).toHaveClass("line-through");
  });

  it("opens the card on a name press", () => {
    draw(add);
    fireEvent.click(screen.getByRole("button", { name: copy.open("Three Visits") }));
    expect(open).toHaveBeenCalledWith("a", expect.any(Array), undefined, expect.anything());
  });

  it("wires apply and announces the added card", async () => {
    const apply = vi.fn(ok);
    const settled = draw(add, { apply });
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: copy.add })[0]); });
    expect(apply).toHaveBeenCalledWith("l1");
    expect(settled).toHaveBeenCalledWith(deckTuningCopy.announce.addedCard("Three Visits"));
  });

  it("announces a cut", async () => {
    const settled = draw(cut);
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: copy.cut })[0]); });
    expect(settled).toHaveBeenCalledWith(deckTuningCopy.announce.cutCard("Rampant Growth"));
  });

  it("wires reject", async () => {
    const reject = vi.fn(ok);
    const settled = draw(add, { reject });
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: copy.reject })[0]); });
    expect(reject).toHaveBeenCalledWith("l1");
    expect(settled).toHaveBeenCalledWith(deckTuningCopy.announce.rejected);
  });

  it("draws the line as added at once, its Undo held while the press is in flight", async () => {
    let release: () => void = () => {};
    const apply = vi.fn(() => new Promise<{ ok: true }>((r) => { release = () => r({ ok: true }); }));
    draw(add, { apply });
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: copy.add })[0]); });
    expect(screen.getByTestId("answered-applied")).toHaveTextContent(copy.added);
    expect(screen.queryAllByRole("button", { name: copy.reject })).toHaveLength(0);
    expect(screen.getByRole("button", { name: copy.undo })).toBeDisabled();
    await act(async () => { release(); });
  });

  it("shows a refusal and leaves the line open", async () => {
    draw(add, { apply: async () => ({ ok: false, message: "Nope." }) });
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: copy.add })[0]); });
    expect(screen.getByText("Nope.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: copy.add }).length).toBeGreaterThan(0);
  });

  it("draws an applied addition as added with Undo, and undoes it", async () => {
    const undo = vi.fn(ok);
    const settled = draw({ ...add, verdict: "accepted" }, { undo });
    expect(screen.getByTestId("answered-applied")).toHaveTextContent(copy.added);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.undo })); });
    expect(undo).toHaveBeenCalledWith("l1");
    expect(settled).toHaveBeenCalledWith(deckTuningCopy.announce.undoneAdd("Three Visits"));
  });

  it("labels an applied cut as cut", () => {
    draw({ ...cut, verdict: "accepted" });
    expect(screen.getByTestId("answered-applied")).toHaveTextContent(copy.cutDone);
  });

  it("draws a rejected line with Show it again, and restores it", async () => {
    const restore = vi.fn(ok);
    const settled = draw({ ...add, verdict: "dismissed" }, { restore });
    expect(screen.getByTestId("answered-rejected")).toHaveTextContent(copy.rejected);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.showAgain })); });
    expect(restore).toHaveBeenCalledWith("l1");
    expect(settled).toHaveBeenCalledWith(deckTuningCopy.announce.restored);
  });

  it("says why a line no longer applies, per side", () => {
    draw({ ...add, applies: false, inDeck: true });
    expect(screen.getByText(copy.addAlreadyIn("Three Visits"))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: copy.add })).toBeNull();
  });

  it("names a cut that has left the deck, and a locked cut", () => {
    const { unmount } = render(
      <SuggestionLine item={{ ...cut, applies: false, inDeck: false }} permits={[3] as never} newestPriceAsOf={null} actions={actions()} onSettled={vi.fn()} />,
    );
    expect(screen.getByText(copy.cutGone("Rampant Growth"))).toBeInTheDocument();
    unmount();
    draw({ ...cut, applies: false, locked: true });
    expect(screen.getByText(lockedCardsCopy.tuning.cutLocked("Rampant Growth"))).toBeInTheDocument();
  });

  // Bug batch 2026-10-12: an owned add with no free copy is a copy to buy, tagged as a Shopping row is.
  it("tags an owned add with no free copy `buy`, beside its marker, and never a cut", () => {
    const claim = { id: "d2", name: "Other", quantity: 1, mature: true, pending: false, commander: false, senior: true };
    const contested = { owned: 1, hard: 1, soft: 0, free: 0, claims: [claim] };
    const { unmount } = render(
      <SuggestionLine item={{ ...add, availability: contested }} permits={[3] as never} newestPriceAsOf={null} actions={actions()} onSettled={vi.fn()} />,
    );
    expect(screen.getAllByText(/none free/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("buy").length).toBeGreaterThan(0);
    unmount();
    draw({ ...cut, owned: true, ownedQuantity: 1, availability: contested });
    expect(screen.queryAllByText("buy")).toHaveLength(0);
  });

  it("flags a bracket move", () => {
    draw({ ...add, bracketAfter: [4] }, {}, [3]);
    expect(screen.getByTestId("bracket-flag")).toBeInTheDocument();
  });
});
