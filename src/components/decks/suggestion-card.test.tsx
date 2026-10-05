import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";

import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import type { TuningItem } from "../../lib/tuning/state";
import { SuggestionCard, type CardActions } from "./suggestion-card";

const open = vi.fn();
vi.mock("../cards/card-detail-provider", () => ({ useCardDetail: () => ({ open }), useCardIntent: () => ({}) }));
vi.mock("../../app/decks/tuning-actions", () => ({
  applySuggestion: vi.fn(), cancelTuningRun: vi.fn(), dismissSuggestion: vi.fn(),
  readTuningPanel: vi.fn(), restoreSuggestion: vi.fn(), runTuning: vi.fn(), saveDeckIntent: vi.fn(), undoSuggestion: vi.fn(),
}));

const copy = deckTuningCopy.card;

const item: TuningItem = {
  id: "i1",
  addOracleId: "add",
  addName: "Rhystic Study",
  addTypeLine: "Enchantment",
  cutOracleId: "cut",
  cutName: "Divination",
  rationale: "Cards in hand was marked against you in 7 of 9 games.",
  rationaleShort: "Draw steadily instead.",
  evidence: [
    { kind: "games", value: "cards in hand 7 of 9 games" },
    { kind: "mix", value: "draw 4 of 10" },
  ],
  position: 0,
  verdict: "pending",
  addImageUri: null,
  cutImageUri: null,
  owned: true,
  ownedQuantity: 1,
  availability: { owned: 1, hard: 0, soft: 0, free: 1, claims: [] },
  price: null,
  bracketAfter: null,
  applies: true,
  cutInDeck: true,
  addInDeck: false,
  cutLocked: false,
};

const ok = async () => ({ ok: true as const });
const actions = (over: Partial<CardActions> = {}): CardActions => ({ apply: ok, undo: ok, reject: ok, restore: ok, ...over });

function draw(i: TuningItem, over: Partial<CardActions> = {}, permits: number[] = [3]) {
  const onSettled = vi.fn();
  render(
    <SuggestionCard item={i} permits={permits as never} newestPriceAsOf={null} actions={actions(over)} onSettled={onSettled} />,
  );
  return onSettled;
}

describe("SuggestionCard", () => {
  it("cites with the denominator intact and never a percentage", () => {
    draw(item);
    expect(screen.getByText("cards in hand 7 of 9 games")).toBeInTheDocument();
    expect(screen.getByText("draw 4 of 10")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  // "Additional notes" (H35, PR 4b): its own chip key beside the shipped "you said" (`intent`),
  // so a reader can tell the standing description from what was asked for this one run.
  it("names a notes citation with its own chip, never the description's", () => {
    draw({ ...item, evidence: [{ kind: "notes", value: "more removal" }] });
    expect(screen.getByText(copy.cite.notes)).toBeInTheDocument();
    expect(screen.queryByText(copy.cite.intent)).not.toBeInTheDocument();
  });

  it("draws the full reason at both widths (H35-E)", () => {
    draw(item);
    const full = screen.getByText(item.rationale).className;
    expect(full).not.toMatch(/\bhidden\b/);
    expect(full).not.toMatch(/\bmd:hidden\b/);
    expect(screen.queryByText(item.rationaleShort)).not.toBeInTheDocument();
  });

  it("opens either card with the pair as the list the modal pages through", async () => {
    draw(item);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.open("Divination") })); });
    const pair = [
      { oracleId: "cut", name: "Divination", imageUri: null },
      { oracleId: "add", name: "Rhystic Study", imageUri: null },
    ];
    // The pressed control rides along as the opener, so focus can come back to it on close.
    expect(open).toHaveBeenLastCalledWith("cut", pair, undefined, {
      opener: screen.getByRole("button", { name: copy.open("Divination") }),
    });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.open("Rhystic Study") })); });
    expect(open).toHaveBeenLastCalledWith("add", pair, undefined, {
      opener: screen.getByRole("button", { name: copy.open("Rhystic Study") }),
    });
  });

  it("draws the buy tag for an add the player does not own", () => {
    draw({ ...item, owned: false, ownedQuantity: 0, availability: null });
    expect(screen.getAllByText("buy").length).toBeGreaterThan(0);
  });

  it("draws no mark for an owned add with a free copy, and the hard mark for a contested one", () => {
    const { unmount } = render(
      <SuggestionCard item={item} permits={[3]} newestPriceAsOf={null} actions={actions()} onSettled={vi.fn()} />,
    );
    expect(screen.queryByText(/none free/)).toBeNull();
    unmount();
    const claim = { id: "d2", name: "Other", quantity: 1, mature: true, pending: false, commander: false, senior: true };
    const contested: TuningItem = { ...item, availability: { owned: 1, hard: 1, soft: 0, free: 0, claims: [claim] } };
    render(<SuggestionCard item={contested} permits={[3]} newestPriceAsOf={null} actions={actions()} onSettled={vi.fn()} />);
    expect(screen.getAllByText(/none free/).length).toBeGreaterThan(0);
  });

  it("flags a swap that raises the bracket, worded against the reading on screen", () => {
    draw({ ...item, bracketAfter: [4] }, {}, [3]);
    const flag = screen.getByTestId("bracket-flag");
    expect(within(flag).getByText(copy.bracketRaises)).toBeInTheDocument();
  });

  it("words a narrowed range with the same lowest bracket as a change", () => {
    draw({ ...item, bracketAfter: [4] }, {}, [4, 5]);
    expect(within(screen.getByTestId("bracket-flag")).getByText(copy.bracketChanges)).toBeInTheDocument();
  });

  it("draws no flag when the stored flag agrees with the reading now", () => {
    draw({ ...item, bracketAfter: [4] }, {}, [4]);
    expect(screen.queryByTestId("bracket-flag")).not.toBeInTheDocument();
  });

  it("stays mounted while applying, with the card in place", async () => {
    draw(item, { apply: () => new Promise(() => {}) });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.apply })); });
    expect(screen.getByRole("button", { name: copy.applying })).toBeInTheDocument();
    expect(screen.getByText("Rhystic Study")).toBeInTheDocument();
  });

  it("keeps the card and says why when an apply is refused", async () => {
    const onSettled = draw(item, { apply: async () => ({ ok: false, message: copy.applyRefused }) });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.apply })); });
    expect(screen.getByRole("alert")).toHaveTextContent(copy.applyRefused);
    expect(onSettled).not.toHaveBeenCalled();
  });

  it("says the apply failed and frees the card when the action rejects", async () => {
    draw(item, { apply: () => Promise.reject(new Error("network")) });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.apply })); });
    expect(screen.getByRole("alert")).toHaveTextContent(copy.applyRefused);
    expect(screen.getByRole("button", { name: copy.apply })).not.toBeDisabled();
  });

  // The claim is read with this deck's own ask subtracted. When the deck already holds the add, a
  // free of 0 is that copy sitting where it belongs, not a rival holding it.
  it("reads the add's claim as self-excluded exactly when the deck holds the add", () => {
    const held: TuningItem = { ...item, availability: { owned: 1, hard: 0, soft: 0, free: 0, claims: [] } };
    const { unmount } = render(
      <SuggestionCard item={{ ...held, addInDeck: true }} permits={[3]} newestPriceAsOf={null} actions={actions()} onSettled={vi.fn()} />,
    );
    expect(screen.queryByText(/none free/)).toBeNull();
    unmount();
    render(<SuggestionCard item={held} permits={[3]} newestPriceAsOf={null} actions={actions()} onSettled={vi.fn()} />);
    expect(screen.getAllByText(/none free/).length).toBeGreaterThan(0);
  });

  it("collapses an applied swap to a row that can be put back", async () => {
    const undo = vi.fn(ok);
    draw({ ...item, verdict: "accepted" }, { undo });
    expect(screen.getByTestId("answered-applied")).toHaveTextContent(copy.applied);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.undo })); });
    expect(undo).toHaveBeenCalledWith("i1");
  });

  it("collapses a rejected swap to a row that can be shown again", () => {
    draw({ ...item, verdict: "dismissed" });
    expect(screen.getByTestId("answered-rejected")).toHaveTextContent(copy.rejected);
    expect(screen.getByRole("button", { name: copy.restore })).toBeInTheDocument();
  });

  it("says which half broke when a swap no longer applies, and offers no apply", () => {
    draw({ ...item, applies: false, cutInDeck: false });
    expect(screen.getByText(copy.cutGone("Divination"))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: copy.apply })).not.toBeInTheDocument();
  });

  // Locked, F4: a locked cut is still IN the deck, so the row names the lock, not the add.
  it("names a locked cut as the reason, ahead of the add being in", () => {
    draw({ ...item, applies: false, cutInDeck: true, cutLocked: true });
    expect(screen.getByText(lockedCardsCopy.tuning.cutLocked("Divination"))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: copy.apply })).not.toBeInTheDocument();
  });
});
