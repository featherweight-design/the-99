"use client";

// The pass sheet (deck messages PR 3, `Pass Sheet.dc.html`, Hugh's ruling 10). `Show these N` in the
// provenance ledger and `N in other drafts too` in the to-do card's foot open it: a sheet at 390 and
// a modal at 1300, on the shipped `ModalChrome`.
//
// ITS ROWS ARE THE LIST'S OWN ROWS. `DecklistRow` in the All view, with the props `DecklistGroup`
// gives it, mounted inside the deck page's providers (the shell mounts this sheet inside them and
// adds the two the list takes from out there: the pending change and the locks). Never a copy and
// never a trimmed row: card rows have drifted before (Hugh, 2026-10-22), and
// `docs/superpowers/inventories/pass-sheet.json` holds the import for `pnpm check:shared`.
//
// The cards are read off the OPTIMISTIC list, so a row's ✕ takes the row out of the sheet and the
// count in the head drops in the same paint, exactly as the list loses it. A row's press opens the
// card detail stacked on the sheet (`ModalChrome` registers it), whose close reads `← {eyebrow}`.

import { availabilityCopy } from "../../lib/copy/availability";
import { topOffCopy } from "../../lib/copy/top-off";
import { printedNameOf } from "../../lib/collection/browse";
import { availabilityState, type DeckClaim } from "../../lib/decks/availability";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { FillPassSummary } from "../../lib/decks/fill-passes";
import { GhostButton, PrimaryButton } from "../ui/button";
import { DecklistGroupHeader } from "./decklist-group-header";
import { DecklistRow } from "./decklist-row";
import { HoverPreviewProvider } from "./hover-preview";
import { MutationError } from "./mutation-error";
import { lineSentence, passBuyCount, usePassUndo } from "./provenance-line";
import { ModalChrome } from "./receipt-modal";

const ledger = topOffCopy.ledger;

/** Which form is open: one pass's cards, or the cards other drafts want too. */
export type PassSheetTarget = { kind: "pass"; passId: string } | { kind: "drafts" };

type Common = {
  deckId: string;
  /** The optimistic card list. */
  cards: DeckDetailCard[];
  newestAsOf: Date | null;
  onClose: () => void;
};

export function PassSheet({
  target,
  passes,
  bodySize,
  onAnnounce,
  ...common
}: Common & {
  target: PassSheetTarget;
  passes: FillPassSummary[];
  bodySize: number;
  onAnnounce: (message: string) => void;
}) {
  if (target.kind === "drafts") return <DraftsSheet {...common} />;
  // A pass the server no longer lists (an undo, a sweep, a keep-all) has nothing left to show; the
  // shell closes the sheet in the same render.
  const pass = passes.find((p) => p.id === target.passId);
  if (!pass) return null;
  return <OnePassSheet pass={pass} bodySize={bodySize} onAnnounce={onAnnounce} {...common} />;
}

function OnePassSheet({
  pass,
  bodySize,
  onAnnounce,
  deckId,
  cards,
  newestAsOf,
  onClose,
}: Common & { pass: FillPassSummary; bodySize: number; onAnnounce: (message: string) => void }) {
  const { pending, error, undo } = usePassUndo({ deckId, pass, bodySize, onAnnounce, onDone: onClose });
  const byId = new Map(cards.map((c) => [c.oracleId, c]));
  // The pass's LIVE cards: those still in the deck AND still auto, the copies it placed and no more.
  // A card the player kept (its `auto` cleared, the row staying) is no longer the pass's: Undo
  // preserves it, so it leaves the sheet and counts as kept.
  const placed = pass.liveCards.flatMap((lc) => {
    const card = byId.get(lc.oracleId);
    return card ? [{ card, copies: Math.min(lc.quantity, card.quantity) }] : [];
  });
  const live = placed.filter((l) => l.card.auto);
  const kept = placed.reduce((n, l) => (l.card.auto ? n : n + l.copies), 0);
  const label = ledger.sheetLabel(pass);
  // One figure for the title, the lead and the Undo: the cards the sheet draws, so a ✕ in flight
  // moves all three together rather than splitting them.
  const count = live.reduce((n, l) => n + l.copies, 0);
  // What the server has not counted yet goes to kept or removed, so `placed` (live + kept + removed)
  // holds still and the lead keeps saying what the pass placed. Buy counts the remaining live copies.
  const shown: FillPassSummary = {
    ...pass,
    live: count,
    kept: pass.kept + kept,
    removed: pass.removed + Math.max(0, pass.live - count - kept),
    liveCards: live.map((l) => ({ oracleId: l.card.oracleId, quantity: l.copies })),
  };
  const n = String(count);
  const rows = live.map((l) => l.card);

  return (
    <SheetFrame
      eyebrow={label}
      title={ledger.sheetTitle(count)}
      lead={lineSentence(shown, passBuyCount(shown, cards))}
      closeLabel={ledger.sheetCloseAria(label)}
      onClose={onClose}
      // The seed has no Undo in the ledger either, so its sheet offers Done only, and says how it IS reversed in
      // Undo's place (the ledger's own words; a line, never a press).
      note={pass.kind === "seed" ? ledger.seedReversal : undefined}
      undo={pass.kind === "seed" ? undefined : (
        <>
          {error && <div className="w-full"><MutationError message={error} /></div>}
          <GhostButton
            onClick={undo}
            disabled={pending}
            aria-label={ledger.undoAria(n, label)}
            className={FOOT_BUTTON}
          >
            {pending ? ledger.undoInFlight(n) : count === 1 ? ledger.undoOne : ledger.undo(n)}
          </GhostButton>
        </>
      )}
    >
      <RowsBody>
        <Rows deckId={deckId} cards={rows} siblings={rows} newestAsOf={newestAsOf} />
      </RowsBody>
    </SheetFrame>
  );
}

/** A draft that still WANTS a copy: unsleeved, and asking for more than it was granted. Soft is
 *  graded by `quantity - granted` (`availability-query.ts`), so a partly granted ask is still here. */
function wantsCopy(c: Pick<DeckClaim, "mature" | "quantity"> & { granted?: number }): boolean {
  return !c.mature && c.quantity - (c.granted ?? 0) > 0;
}

function DraftsSheet({ deckId, cards, newestAsOf, onClose }: Common) {
  // Every card here some other draft also wants (`availabilityState`'s soft, from this deck's own
  // vantage, as the foot's count reads it), under each draft that wants it: a claim that holds no
  // copy (`holdsCopy`) is a draft's.
  const groups = new Map<string, { name: string; cards: DeckDetailCard[] }>();
  const soft: DeckDetailCard[] = [];
  for (const card of cards) {
    const a = card.availability;
    if (!a || availabilityState(a, { selfExcluded: true }) !== "soft") continue;
    soft.push(card);
    for (const claim of a.claims) {
      if (!wantsCopy(claim)) continue;
      const group = groups.get(claim.id) ?? { name: claim.name, cards: [] };
      if (!group.cards.includes(card)) group.cards.push(card);
      groups.set(claim.id, group);
    }
  }
  // The draft wanting most first, then by name, so the order holds still between visits.
  const ordered = [...groups.values()].sort((x, y) => y.cards.length - x.cards.length || x.name.localeCompare(y.name));
  const siblings = [...new Set(ordered.flatMap((g) => g.cards))];

  return (
    <SheetFrame
      eyebrow={availabilityCopy.deckRollup.sheetEyebrow}
      title={ledger.sheetTitle(soft.length)}
      lead={availabilityCopy.deckRollup.softBody}
      closeLabel={availabilityCopy.deckRollup.sheetCloseAria}
      onClose={onClose}
    >
      <RowsBody>
        {ordered.map((g, i) => (
          <div key={g.name + i} className={i > 0 ? "mt-[8px]" : undefined}>
            <DecklistGroupHeader label={g.name} count={g.cards.length} />
            <Rows deckId={deckId} cards={g.cards} siblings={siblings} newestAsOf={newestAsOf} />
          </div>
        ))}
      </RowsBody>
    </SheetFrame>
  );
}

// `.sf`: two even presses on the phone at the 44px floor; at 1300 Undo left, Done right, 38px tall.
const FOOT_BUTTON_BASE =
  "inline-flex items-center justify-center h-[44px] md:h-[38px] rounded-[9px] px-[18px] font-sans text-[13.5px] font-semibold whitespace-nowrap";
const FOOT_BUTTON = `flex-1 md:flex-none ${FOOT_BUTTON_BASE}`;

/**
 * The pass sheet's frame (`Pass Sheet.dc.html` `.bs`/`.md`): `ModalChrome` with the `.hd2` head
 * (eyebrow, title, lead), the body as given, and the `.sf` foot (an optional Undo or note, then
 * Done). Shared with the combos-one-piece-away list (`combos-close-sheet.tsx`), which adds the 900
 * modal and the phone sheet that sizes to its rows; the pass sheet's own props leave both unset.
 */
export function SheetFrame({
  eyebrow,
  title,
  lead,
  closeLabel,
  onClose,
  undo,
  note,
  width = 600,
  fit = false,
  doneLabel = ledger.sheetDone,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  closeLabel: string;
  onClose: () => void;
  undo?: React.ReactNode;
  /** A line of words in Undo's place when the sheet has no Undo: centred above Done at 390, at the left where Undo
   *  stands from md. Not a press. */
  note?: string;
  width?: 600 | 900;
  /** The phone sheet sizes to its rows (`ModalChrome`'s `fit`). */
  fit?: boolean;
  doneLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <ModalChrome
      eyebrow={eyebrow}
      title={title}
      lead={lead}
      // Fixed on the eyebrow: a title that moved with the count would re-register the sheet under
      // an open card. The card's close reads `← 1st top-off` at both widths.
      backLabel={eyebrow}
      closeLabel={closeLabel}
      onClose={onClose}
      width={width}
      fit={fit}
      ground="var(--surface)"
      foot={
        <div
          className={`flex items-center gap-[8px] px-[14px] pt-[12px] pb-[26px] md:px-[16px] md:pb-[14px] [border-top:1px_solid_var(--border)] ${
            note ? "flex-col md:flex-row" : "flex-wrap"
          }`}
        >
          {undo}
          {note ? <p className="m-0 text-center font-mono text-[11px] text-[color:var(--fg-faint)] md:text-left">{note}</p> : null}
          <PrimaryButton onClick={onClose} className={`${note ? "w-full md:w-auto" : "flex-1 md:flex-none"} ${FOOT_BUTTON_BASE} md:ml-auto`}>
            {doneLabel}
          </PrimaryButton>
        </div>
      }
    >
      {children}
    </ModalChrome>
  );
}

/** `.sr`. The preview waits for the pointer to move: the sheet opens under a resting one. */
function RowsBody({ children }: { children: React.ReactNode }) {
  return (
    <HoverPreviewProvider waitForMove className="flex flex-col px-[12px] py-[10px]">
      {children}
    </HoverPreviewProvider>
  );
}

/** The list's own rows, All view, with the props `DecklistGroup` gives them. */
function Rows({
  deckId,
  cards,
  siblings,
  newestAsOf,
}: {
  deckId: string;
  cards: DeckDetailCard[];
  siblings: DeckDetailCard[];
  newestAsOf: Date | null;
}) {
  const order = siblings.map((c) => ({ oracleId: c.oracleId, name: printedNameOf(c), imageUri: c.imageUri, foil: c.foil }));
  return (
    <div className="flex flex-col gap-[4px]">
      {cards.map((card) => (
        <DecklistRow key={card.oracleId} deckId={deckId} card={card} siblings={order} newestAsOf={newestAsOf} />
      ))}
    </div>
  );
}
