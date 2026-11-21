"use client";
// The Change door on card details (Move a copy, #2980, calls 1 to 3): at the end of the `In your decks` heading, when
// every copy the reader owns is spoken for. It opens the shipped chooser over the card modal and reads the card LIVE on
// open, through a server action, never with card details: the page that drew this card may be older than the decks.
//
// A pick among the listed decks is the chooser's own write (`assignCopy`). A pick in Other decks adds the card to that
// deck's draft and waits for its commit (`pickOtherDeck`); one choice spans both groups, so each clears the other.
// The chooser (z-[70]) sits above the card modal (z-50) at both widths, and focus goes back to this button on close.

import { useCallback, useRef, useState, useTransition } from "react";
import type { ContestedCard } from "../../lib/collection/summary-read";
import { cardAssignmentsCopy } from "../../lib/copy/card-assignments";
import { gotItCopy } from "../../lib/copy/i-got-it";
import { moveCopyCopy } from "../../lib/copy/move-copy";
import type { OtherDecks } from "../../lib/decks/other-decks-read";
import { dropOtherDeckPick, openMoveCopy, pickOtherDeck, type PickOtherResult } from "../../app/decks/move-copy-actions";
import { CopyChooserDialog } from "../decks/copy-chooser-dialog";
import { OtherDecksDisclosure } from "../decks/other-decks-disclosure";
import { RECEIPT_LINK_CLASS } from "./card-modal-shared";
import { useCardDetailIfAny } from "./card-detail-context";

const contested = cardAssignmentsCopy.contested;

type View = { card: ContestedCard; other: OtherDecks };

function refusalFor(r: Extract<PickOtherResult, { ok: false }>, deck: string, card: ContestedCard | null, cardName: string): string | null {
  switch (r.cause) {
    case "not-your-deck": return null;
    case "no-supply-left": {
      const holder = card?.claimants.find((x) => x.allocated > 0)?.deckName ?? "";
      return contested.refusedNoSupplyOwned(holder, card?.owned ?? 0, deck);
    }
    case "target-is-commander": return contested.refusedIsCommander(cardName, deck);
    // Every copy that can move is picked already (several picks): the row's own all-picked line.
    case "all-picked": {
      const held = card?.claimants.reduce((n, x) => n + (x.brew ? 0 : x.commanderCopies), 0) ?? 0;
      return contested.allPicked(Math.max((card?.owned ?? 0) - held, 0));
    }
    case "deck-already-lists-it": return moveCopyCopy.refused.listsIt(deck, cardName);
    case "deck-not-committed": return moveCopyCopy.refused.notCommitted(deck);
    default: return moveCopyCopy.refused.couldNot(deck, cardName);
  }
}

export function ChangeCopyDoor({ oracleId, cardName, owned, onWritten }: {
  oracleId: string;
  cardName: string;
  owned: number;
  /** Called when the chooser closes after anything was written: History redraws its live line from it. */
  onWritten?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  // Decks whose draft THIS session put the card into: their undo takes it back out.
  const added = useRef(new Set<string>());
  const [busy, setBusy] = useState(false);
  // The newest Other pick's whole round trip, so a drop never overtakes the pick it takes back.
  const inflight = useRef<Promise<unknown>>(Promise.resolve());
  const [refusal, setRefusal] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const button = useRef<HTMLButtonElement>(null);
  const [loading, startLoad] = useTransition();
  const writes = useRef(0);
  // Whether anything was written since the chooser opened: card details re-reads on close, so its list shows the DB.
  const dirty = useRef(false);
  const evict = useCardDetailIfAny()?.evict;

  const close = useCallback(() => {
    setOpen(false);
    if (dirty.current) {
      dirty.current = false;
      evict?.(oracleId);
      onWritten?.();
    }
    // The button never unmounts, but the dialog's inert hold and focus restore are a frame apart: focus it explicitly.
    requestAnimationFrame(() => button.current?.focus());
  }, [evict, oracleId, onWritten]);

  const begin = () => {
    setRefusal(null);
    setAnnounce("");
    startLoad(async () => {
      try {
        const r = await openMoveCopy(oracleId);
        if (!r || !r.card) { setAnnounce(moveCopyCopy.loadFailed); return; }
        setView({ card: r.card, other: r.other });
        // This door makes one Other pick at a time; the oldest stands for any left by an earlier session.
        setPickedId(r.other.pendingDeckIds[0] ?? null);
        setOpen(true);
      } catch {
        // Said once in the button's own live region; the door stays where it was.
        setAnnounce(moveCopyCopy.loadFailed);
      }
    });
  };

  const dropPick = (deckId: string) => {
    dirty.current = true;
    // After any pick still in flight has answered, so its `added` is on record before the drop reads it.
    void inflight.current.then(() => dropOtherDeckPick(oracleId, deckId, added.current.delete(deckId)));
  };

  const onPickOther = (deck: { id: string; name: string }) => {
    if (!view || busy) return;
    setRefusal(null);
    const undo = pickedId === deck.id;
    const previous = pickedId;
    // Sequential server actions: the drop is dispatched first, so it lands before the pick it makes room for.
    if (previous) dropPick(previous);
    if (undo) {
      setPickedId(null);
      setAnnounce(moveCopyCopy.other.announcedUndo(cardName, deck.name));
      return;
    }
    setPickedId(deck.id);
    const mine = ++writes.current;
    setBusy(true);
    inflight.current = pickOtherDeck(oracleId, deck.id).then((r) => {
      dirty.current = true;
      if (r.ok) {
        if (r.added) added.current.add(deck.id);
        if (mine === writes.current) {
          setAnnounce(moveCopyCopy.other.announcedPick(cardName, deck.name));
          if (r.card) setView((v) => (v ? { ...v, card: r.card as ContestedCard } : v));
        }
      } else if (mine === writes.current) {
        setPickedId(null);
        const said = refusalFor(r, deck.name, r.card ?? view.card, cardName);
        setRefusal(said);
        if (said) setAnnounce(said);
        if (r.card) setView((v) => (v ? { ...v, card: r.card as ContestedCard } : v));
      }
    }).catch(() => {
      if (mine === writes.current) {
        setPickedId(null);
        setRefusal(moveCopyCopy.refused.couldNot(deck.name, cardName));
      }
    }).finally(() => { if (mine === writes.current) setBusy(false); });
  };

  const many = (view?.card.owned ?? owned) > 1;
  return (
    <>
      <button
        ref={button}
        type="button"
        data-testid="change-copy-link"
        aria-label={moveCopyCopy.door.aria(cardName)}
        aria-busy={loading || undefined}
        onClick={begin}
        className={RECEIPT_LINK_CLASS}
      >
        {moveCopyCopy.door.label}
      </button>
      <span aria-live="polite" className="sr-only">{open ? "" : announce}</span>
      {open && view ? (
        <CopyChooserDialog
          card={view.card}
          cardName={cardName}
          title={many ? moveCopyCopy.titleMany : undefined}
          sub={gotItCopy.receipt.changeSubOwned(cardName, view.card.owned)}
          externalPick={pickedId !== null}
          // A tap on a listed deck replaces the Other pick: the drop goes first, taking the draft add back out.
          onBeforePick={() => {
            if (!pickedId) return;
            const id = pickedId;
            // An Other pick still in flight no longer draws its answer.
            writes.current += 1;
            setBusy(false);
            setPickedId(null);
            // The pick's announcement no longer holds: say it was withdrawn.
            setAnnounce(moveCopyCopy.other.announcedUndo(cardName, view.other.decks.find((d) => d.id === pickedId)?.name ?? ""));
            dropPick(id);
          }}
          onWrite={() => { dirty.current = true; }}
          onCard={(next) => { if (next) setView((v) => (v ? { ...v, card: next } : v)); }}
          below={
            <OtherDecksDisclosure
              cardName={cardName}
              copies={view.card.owned}
              decks={view.other.decks}
              pickedId={pickedId}
              disabled={busy}
              refusal={refusal}
              announce={announce}
              onPick={onPickOther}
            />
          }
          onClose={close}
        />
      ) : null}
    </>
  );
}
