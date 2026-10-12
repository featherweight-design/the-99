"use client";

import type { ReactNode } from "react";
import { NO_NOTES, type DeckNotesView } from "../../../lib/decks/notes-types";
import { useDeckPanel } from "../deck-panel";
import { GroupToggle } from "../group-toggle";
import { HoverPreviewProvider } from "../hover-preview";
import { DeckNotesPanel } from "./deck-notes-panel";
import type { DeckCardOption } from "./note-field";

/**
 * Notes on a deck whose list is empty (a commander and no cards, or the last card just removed). The
 * deck list is not drawn then, so its All / Shopping / Notes control is not either, and Notes would be
 * out of reach: a commander-only deck could not take a note, and notes already kept would hide until a
 * card came back. This draws the SAME `GroupToggle`, at zero, above the empty state; choosing Notes
 * swaps the empty state for the panel, and All swaps it back. The panel's choice is the builder's
 * (`useDeckPanel`), as on the list.
 */
export function EmptyDeckNotes({
  enabled, deckId, notes, deckCards, children,
}: {
  /** `DECK_NOTES_ENABLED`: off draws the empty state alone, as before notes existed. */
  enabled: boolean;
  deckId: string;
  notes: DeckNotesView | null;
  /** The commanders: the picker's "In this deck" group, since the deck holds nothing else. */
  deckCards: readonly DeckCardOption[];
  /** The empty state, drawn while the list is chosen. */
  children: ReactNode;
}) {
  const [panel, choose] = useDeckPanel();
  if (!enabled) return <>{children}</>;
  const open = panel === "notes";
  return (
    <>
      <GroupToggle
        allCount={0}
        shoppingCount={0}
        filter="all"
        grouping="type"
        // All and Shopping both mean "the list" here: nothing is shopped for at zero, so the filter stays at All.
        onFilterChange={() => choose("list")}
        onGroupingChange={() => {}}
        view="list"
        onViewChange={() => {}}
        shoppingCards={[]}
        sort={{ key: "name", direction: "asc" }}
        onSortChange={() => {}}
        notes={{ open, count: notes?.open.length ?? 0, onChange: (next) => choose(next ? "notes" : "list") }}
      />
      {open ? (
        <HoverPreviewProvider>
          <DeckNotesPanel deckId={deckId} notes={notes ?? NO_NOTES} deckCards={deckCards} />
        </HoverPreviewProvider>
      ) : children}
    </>
  );
}
