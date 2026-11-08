"use client";

// The cards a role count opens (small items 11, item 1, `Role-Cards.dc.html`). A role tile at or over its target
// and a role-overage row in What we counted both open it: the pass sheet's frame (a sheet at 390, a modal from md)
// over the cards the strip counts in that role, A to Z.
//
// THE LIST IS THE COUNT. Its members are `roleMembers`, the fold `RoleCounterStrip` counts with, so the copies
// listed sum to the figure that was pressed, and a card doing two jobs is in both roles' lists. It is not the deck
// list's By role grouping, which reads the single `card.role`.
//
// ITS ROWS ARE THE LIST'S OWN `DecklistRow` (never a copy: pass-sheet.tsx), mounted inside the deck page's
// providers. The cards are read off the OPTIMISTIC list, so a row's ✕ takes it out and the title, the strip and
// the list recount in one paint. A removed card's slot (`spentSlots`) draws the shipped undo row at the list's
// head until it is undone or removed again; an undo puts the card back and the slot steps aside for the row.

import { printedNameOf } from "../../lib/collection/browse";
import { roleCardsCopy } from "../../lib/copy/decks-builder";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { JobRowsByCard } from "../../lib/decks/job-tally";
import { roleMembers } from "../../lib/decks/label-role-counts";
import type { MixRole } from "../../lib/decks/mix";
import { DecklistRow } from "./decklist-row";
import { HoverPreviewProvider } from "./hover-preview";
import { SheetFrame } from "./pass-sheet";

const byName = (a: DeckDetailCard, b: DeckDetailCard) => printedNameOf(a).localeCompare(printedNameOf(b));

/** What the sheet draws for a role, from the optimistic list: the members A to Z, and the removed cards of the
 *  role whose slots still hold an undo row. The shell uses it too, to close the sheet once both are empty. */
export function roleCardsOf(
  role: MixRole,
  cards: DeckDetailCard[],
  spentSlots: DeckDetailCard[],
  labelRows: JobRowsByCard | null | undefined,
) {
  const members = roleMembers(cards, labelRows, role).sort(byName);
  const spent = roleMembers(
    spentSlots.filter((s) => !cards.some((c) => c.oracleId === s.oracleId)),
    labelRows,
    role,
  ).sort(byName);
  return { members, spent, count: members.reduce((n, c) => n + c.quantity, 0) };
}

export function RoleCardsSheet({
  role,
  label,
  target,
  deckId,
  cards,
  spentSlots,
  labelRows,
  newestAsOf,
  onClose,
}: {
  role: MixRole;
  /** The role's name as the strip draws it. */
  label: string;
  target: number;
  deckId: string;
  /** The optimistic card list. */
  cards: DeckDetailCard[];
  spentSlots: DeckDetailCard[];
  labelRows: JobRowsByCard | null | undefined;
  newestAsOf: Date | null;
  onClose: () => void;
}) {
  const { members, spent, count } = roleCardsOf(role, cards, spentSlots, labelRows);
  if (members.length === 0 && spent.length === 0) return null;
  const order = members.map((c) => ({ oracleId: c.oracleId, name: printedNameOf(c), imageUri: c.imageUri, foil: c.foil }));
  const eyebrow = roleCardsCopy.eyebrow(label, target);
  return (
    <SheetFrame
      eyebrow={eyebrow}
      title={roleCardsCopy.title(count)}
      lead={roleCardsCopy.lead(label)}
      closeLabel={roleCardsCopy.closeAria(label)}
      onClose={onClose}
      // The card detail's close reads `← {Role}`, not the eyebrow with its target.
      backLabel={label}
    >
      <HoverPreviewProvider waitForMove className="flex flex-col px-[12px] py-[10px]">
        <div className="flex flex-col gap-[4px]">
          {spent.map((card) => (
            <DecklistRow key={card.oracleId} deckId={deckId} card={card} siblings={order} spent newestAsOf={newestAsOf} />
          ))}
          {members.map((card) => (
            <DecklistRow key={card.oracleId} deckId={deckId} card={card} siblings={order} newestAsOf={newestAsOf} />
          ))}
        </div>
      </HoverPreviewProvider>
    </SheetFrame>
  );
}
