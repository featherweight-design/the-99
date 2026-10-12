import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";

import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import type { PairItem as TuningItem } from "../../lib/tuning/state";
import { SuggestionCard, type CardActions } from "./suggestion-card";

const open = vi.fn();
vi.mock("../cards/card-detail-provider", () => ({ useCardDetail: () => ({ open }), useCardIntent: () => ({}) }));
vi.mock("../../app/decks/tuning-actions", () => ({
  applySuggestion: vi.fn(), dismissSuggestion: vi.fn(),
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

  it("draws the buy tag for an add the player does not own, and never for a basic", () => {
    draw({ ...item, owned: false, ownedQuantity: 0, availability: null });
    expect(screen.getAllByText("buy").length).toBeGreaterThan(0);
    cleanup();
    draw({ ...item, owned: false, ownedQuantity: 0, availability: null, addTypeLine: "Basic Land — Forest" });
    expect(screen.queryAllByText("buy")).toHaveLength(0);
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

  // Bug batch 2026-10-12: an owned add with no copy free, or one already overcommitted, is still a
  // copy to buy, so it carries the buy tag and its price beside the marker, as a Shopping row does.
  describe("an owned add the player would still buy", () => {
    const claim = { id: "d2", name: "Other", quantity: 1, mature: true, pending: false, commander: false, senior: true };
    const NEWEST = new Date("2026-10-12T09:00:00Z");
    const priced = { cents: 1250, foilCents: null, etchedCents: null, asOf: NEWEST };
    const buyTags = () => screen.queryAllByText("buy");

    it("draws `buy` and the price beside `none free`", () => {
      render(<SuggestionCard item={{ ...item, price: priced, availability: { owned: 1, hard: 1, soft: 0, free: 0, claims: [claim] } }}
        permits={[3]} newestPriceAsOf={NEWEST} actions={actions()} onSettled={vi.fn()} />);
      expect(screen.getAllByText(/none free/).length).toBeGreaterThan(0);
      expect(buyTags().length).toBeGreaterThan(0);
      expect(screen.getAllByText("$12.50").length).toBeGreaterThan(0);
    });

    it("draws `buy` beside `short` for an overcommitted add", () => {
      render(<SuggestionCard item={{ ...item, availability: { owned: 1, hard: 2, soft: 0, free: -1, claims: [claim, { ...claim, id: "d3" }] } }}
        permits={[3]} newestPriceAsOf={null} actions={actions()} onSettled={vi.fn()} />);
      // `bareOne`: one copy short reads `short`, as on the deck page.
      expect(screen.getAllByText(/^short$/).length).toBeGreaterThan(0);
      expect(buyTags().length).toBeGreaterThan(0);
    });

    it("draws no `buy` for a free copy, a draft's hold, the deck's own copy, or a basic", () => {
      const cases: TuningItem[] = [
        item,
        { ...item, availability: { owned: 2, hard: 0, soft: 1, free: 1, claims: [{ ...claim, mature: false, pending: true }] } },
        { ...item, addInDeck: true, availability: { owned: 1, hard: 0, soft: 0, free: 0, claims: [] } },
        { ...item, addTypeLine: "Basic Land — Island", availability: { owned: 1, hard: 1, soft: 0, free: 0, claims: [claim] } },
      ];
      for (const c of cases) {
        const { unmount } = render(<SuggestionCard item={c} permits={[3]} newestPriceAsOf={null} actions={actions()} onSettled={vi.fn()} />);
        expect(buyTags()).toHaveLength(0);
        unmount();
      }
    });
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

  it("flips to applied at once while the apply is in flight, its Undo held until it lands", async () => {
    draw(item, { apply: () => new Promise(() => {}) });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.apply })); });
    expect(screen.getByTestId("answered-applied")).toHaveTextContent("Rhystic Study");
    expect(screen.getByRole("button", { name: copy.undo })).toBeDisabled();
  });

  it("keeps an applied card drawn applied when the panel's re-read fails, and releases it when one lands", async () => {
    const onSettled = vi.fn(async () => false);
    const view = render(<SuggestionCard item={item} permits={[3] as never} newestPriceAsOf={null} actions={actions({})} onSettled={onSettled} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.apply })); });
    expect(onSettled).toHaveBeenCalled();
    expect(screen.getByTestId("answered-applied")).toBeInTheDocument();
    // A landed re-read hands the server's verdict down; the card is the server's again.
    view.rerender(<SuggestionCard item={{ ...item, verdict: "accepted" }} permits={[3] as never} newestPriceAsOf={null} actions={actions({})} onSettled={onSettled} />);
    expect(screen.getByTestId("answered-applied")).toBeInTheDocument();
  });

  it("rolls a refused apply back to the card, with its refusal", async () => {
    let answer!: (r: { ok: false; message: string }) => void;
    draw(item, { apply: () => new Promise((r) => { answer = r; }) });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.apply })); });
    expect(screen.getByTestId("answered-applied")).toBeInTheDocument();
    await act(async () => { answer({ ok: false, message: copy.applyRefused }); });
    expect(screen.queryByTestId("answered-applied")).toBeNull();
    expect(screen.getByRole("button", { name: copy.apply })).not.toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(copy.applyRefused);
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
