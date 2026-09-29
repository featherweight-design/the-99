"use client";

import { createContext, useContext, useOptimistic } from "react";
import {
  isBasicLand,
  unresolvedCardCount,
  type DeckDetailCard,
  type DeckUnresolvedRow,
} from "../../lib/decks/grouping";

/**
 * Deck-wide optimistic card list.
 *
 * `use-deck-mutation` already made the clicked *button* answer instantly, but
 * the decklist, the counter strip and the All/Shopping tallies all still waited
 * on the server round-trip — so adding a card looked like nothing had happened
 * everywhere except the one control the user had stopped looking at.
 *
 * The override is dispatched inside the mutation's transition, which for a
 * revalidating server action ends when the new server HTML lands rather than
 * when the promise resolves. That is what makes the handoff seamless in both
 * directions: on success the optimistic row is replaced by the real one with no
 * intervening frame, and on failure React drops it with no explicit revert.
 */
type AddOptimisticCard = (card: DeckDetailCard) => void;
/** The whole card, not an id: the shell announces the removal and holds the
 *  spent slot the undo row is drawn from, and both need the name. */
type RemoveOptimisticCard = (card: DeckDetailCard) => void;
/**
 * The two halves of a removal that must not run in the same place. `remove` is
 * the optimistic dispatch and belongs inside the mutation's transition;
 * `markSpent` is ordinary state, which React would hold for the length of that
 * async transition, so the row calls it straight from the click instead.
 */
type MarkSlotSpent = (card: DeckDetailCard) => void;
/** Undo's announcement, made from the click rather than inside the transition. */
type AnnounceUndo = (card: DeckDetailCard) => void;

/**
 * The spent slot's Undo, which is optimistic (Hugh, 2026-09-28). The re-add puts the card straight
 * back in the list, which is the decklist's cue to stop drawing the slot, so the receipt unmounts
 * before the server answers. A refusal therefore needs an owner that outlives it, exactly as a
 * failed removal does: the shell holds it, keyed on the card, and the receipt the reverted
 * prediction draws again reads it back.
 *
 * `restore` is the bare re-add, not the shell's `add`: that one also announces an add, and it would
 * land when the transition settles, over the undo's own announcement.
 */
type UndoSpentSlot = {
  restore: AddOptimisticCard;
  /** `removal` is the generation the undo was pressed under: a report from an undo that a newer
   *  removal has since overtaken is dropped, or it would land on that removal's receipt. */
  reportFailure: (oracleId: string, message: string, removal: number) => void;
  failure: { oracleId: string; message: string } | null;
  /** Bumped by every removal that leaves a receipt. */
  removal: number;
};

/**
 * Keeping a card the fill added. The server clears the row's `auto` flag, and
 * until that revalidation lands the deck-wide list still calls the card the
 * fill's — so "Clear auto", which reads that flag, would offer to sweep a card
 * the player has just told us to keep, and would predict its removal.
 */
type KeepOptimisticCard = (oracleId: string) => void;

/**
 * "Clear auto", which deletes whole rows rather than decrementing copies. A
 * loop of `remove` would take one copy off each row, leaving 36 of a fill's 37
 * basics on screen until revalidation — so the sweep is its own edit, matching
 * the server's delete-where-auto in a single dispatch.
 */
type SweepOptimisticAuto = (keep?: ReadonlySet<string>) => void;

/**
 * "Keep all auto". Its own edit rather than a loop of `keep` for the sweep's
 * reason: forty dispatches to say one thing, and each one a fresh scan of the
 * list. The server's write is a single statement, and so is this.
 */
type KeepAllOptimisticAuto = () => void;

type DeckEdit =
  | { kind: "add"; card: DeckDetailCard }
  | { kind: "remove"; oracleId: string }
  | { kind: "keep"; oracleId: string }
  | { kind: "keepAll" }
  | { kind: "sweep"; keep: ReadonlySet<string> };

/**
 * A failed removal has nowhere to draw itself: the prediction has already taken
 * the row out of the deck-wide list, so the row is unmounted by the time its own
 * `useDeckMutation` has a message, and it remounts clean when the transition
 * reverts. The reason has to be handed to something that outlives the row.
 */
type ReportRemoveFailure = (cardName: string) => void;

/** Putting a card to an unresolved line: the line goes, the card joins the 99. */
type ResolveOptimisticRow = (rowId: string, card: DeckDetailCard) => void;
type DeleteOptimisticRow = (rowId: string) => void;

type DeckEdits = {
  add: AddOptimisticCard;
  remove: RemoveOptimisticCard;
  markSpent: MarkSlotSpent;
  announceUndo: AnnounceUndo;
  reportRemoveFailure: ReportRemoveFailure;
  resolveRow: ResolveOptimisticRow;
  deleteRow: DeleteOptimisticRow;
  keep: KeepOptimisticCard;
  undo?: UndoSpentSlot;
};

const DeckEditContext = createContext<DeckEdits | null>(null);

/**
 * Unresolved rows come through here rather than straight off the server props
 * so the builder has one card list and one unresolved count, from one place.
 * `total` is derived from both, and a count sourced separately from the list it
 * describes is exactly the mid-mutation disagreement deckCounts exists to
 * prevent.
 */
export function useOptimisticDeckCards(
  serverCards: DeckDetailCard[],
  serverUnresolvedRows: DeckUnresolvedRow[] = [],
) {
  const [cards, applyEdit] = useOptimistic(
    serverCards,
    (current, edit: DeckEdit) => {
      // `keep` is the deck's LOCKED cards (Locked, L3): the server's sweep never cuts one, so the
      // prediction must not either, or a locked card vanishes until the revalidation puts it back.
      // Passed in rather than read off `c.locked`, because a lock pressed on this visit lives in
      // the shell's override (`useCardLocks`), above this list.
      if (edit.kind === "sweep") return current.filter((c) => !c.auto || edit.keep.has(c.oracleId));
      if (edit.kind === "keepAll")
        return current.map((c) => (c.auto ? { ...c, auto: false } : c));
      if (edit.kind === "keep") {
        const at = current.findIndex((c) => c.oracleId === edit.oracleId);
        if (at === -1) return current;
        const next = [...current];
        next[at] = { ...next[at], auto: false };
        return next;
      }
      if (edit.kind === "remove") {
        // One click removes one copy: the server decrements while more than one
        // remains and only deletes the row on the last. Predicting the whole
        // stack would drop a deck from 99 to 90 and snap back on revalidation.
        const at = current.findIndex((c) => c.oracleId === edit.oracleId);
        if (at === -1) return current;
        if (current[at].quantity <= 1) return current.filter((_, i) => i !== at);
        const next = [...current];
        next[at] = { ...next[at], quantity: next[at].quantity - 1 };
        return next;
      }
      const { card } = edit;
      const at = current.findIndex((c) => c.oracleId === card.oracleId);
      if (at === -1) return [...current, card];
      // Mirrors the server, which increments quantity for the multi-copy
      // exception and no-ops for everything else. Predicting a second copy the
      // server won't write would show a count it never reaches.
      if (!isBasicLand(card.typeLine)) return current;
      const next = [...current];
      next[at] = { ...next[at], quantity: next[at].quantity + card.quantity };
      return next;
    },
  );
  // Resolve and delete both end with the line gone, so one edit covers both; a
  // resolve adds its card through the card reducer above in the same dispatch.
  const [unresolvedRows, dropRow] = useOptimistic(
    serverUnresolvedRows,
    (current, rowId: string) => current.filter((r) => r.id !== rowId),
  );

  const addOptimisticCard: AddOptimisticCard = (card) => applyEdit({ kind: "add", card });
  const removeOptimisticCard = (oracleId: string) => applyEdit({ kind: "remove", oracleId });
  const resolveOptimisticRow: ResolveOptimisticRow = (rowId, card) => {
    dropRow(rowId);
    applyEdit({ kind: "add", card });
  };
  const deleteOptimisticRow: DeleteOptimisticRow = (rowId) => dropRow(rowId);
  const keepOptimisticCard: KeepOptimisticCard = (oracleId) =>
    applyEdit({ kind: "keep", oracleId });
  const keepAllOptimisticAuto: KeepAllOptimisticAuto = () => applyEdit({ kind: "keepAll" });
  const sweepOptimisticAuto: SweepOptimisticAuto = (keep = NO_IDS) => applyEdit({ kind: "sweep", keep });

  return {
    cards,
    unresolvedRows,
    unresolvedCount: unresolvedCardCount(unresolvedRows),
    addOptimisticCard,
    removeOptimisticCard,
    resolveOptimisticRow,
    deleteOptimisticRow,
    keepOptimisticCard,
    keepAllOptimisticAuto,
    sweepOptimisticAuto,
  };
}

export function AddOptimisticCardProvider({
  value,
  children,
}: {
  value: DeckEdits;
  children: React.ReactNode;
}) {
  return <DeckEditContext.Provider value={value}>{children}</DeckEditContext.Provider>;
}

/**
 * Returns a no-op outside a provider. Add and remove controls render in
 * surfaces that have no deck list to update (and in tests that mount a row
 * alone) — those should still mutate, just without a local prediction.
 */
export function useAddOptimisticCard(): AddOptimisticCard {
  return useContext(DeckEditContext)?.add ?? noop;
}

export function useRemoveOptimisticCard(): RemoveOptimisticCard {
  return useContext(DeckEditContext)?.remove ?? noop;
}

export function useMarkSlotSpent(): MarkSlotSpent {
  return useContext(DeckEditContext)?.markSpent ?? noop;
}

export function useAnnounceUndo(): AnnounceUndo {
  return useContext(DeckEditContext)?.announceUndo ?? noop;
}

export function useResolveOptimisticRow(): ResolveOptimisticRow {
  return useContext(DeckEditContext)?.resolveRow ?? noop;
}

export function useDeleteOptimisticRow(): DeleteOptimisticRow {
  return useContext(DeckEditContext)?.deleteRow ?? noop;
}

export function useKeepOptimisticCard(): KeepOptimisticCard {
  return useContext(DeckEditContext)?.keep ?? noop;
}

/**
 * Null outside a provider, and the row reads that as "no one else will say it".
 * A no-op would be indistinguishable from a shell that took the message, and
 * the row would then swallow a failure nothing else was going to report.
 */
export function useReportRemoveFailure(): ReportRemoveFailure | null {
  return useContext(DeckEditContext)?.reportRemoveFailure ?? null;
}

/** Null outside a provider: a receipt with no shell to own its refusal waits on the server. */
export function useUndoSpentSlot(): UndoSpentSlot | null {
  return useContext(DeckEditContext)?.undo ?? null;
}

function noop() {}

const NO_IDS: ReadonlySet<string> = new Set();
