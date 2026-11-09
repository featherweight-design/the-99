"use client";
// What the demo's drawing halves need around them, and nothing that writes. The deck wiring is the explicit inert one
// (`INERT_ROW_WIRING`, #2723): every write refuses or does nothing and the per-player parts draw nothing. The card details
// context is the demo's own: a press asks the frame to open the card, read-only, from the fixture's data (`DemoCardHost`), and
// the value reports the frame's open card and its close truthfully, so a trigger's state and a surface that reads the open card
// are right; nothing else about a signed-in session exists here. A control that wrote anywhere would be a bug the
// nothing-saved probe catches.

import { createContext, useCallback, useContext, useMemo, useRef, type MouseEvent, type ReactNode } from "react";

import { CardDetailContext, siblingCards, type CardDetailContextValue, type SiblingCard } from "../../cards/card-detail-context";
import { DeckRowWiringProvider, INERT_ROW_WIRING } from "../../decks/deck-row-wiring";
import { HoverPreviewProvider } from "../../decks/hover-preview";
import type { DemoDeckRole } from "./demo-detail";

const NO_IDS: ReadonlySet<string> = new Set();
const noop = () => {};
const noopRelease = () => noop;

/**
 * What the frame does for a press: the card, the list it pages (as the opener passed it), the control to give focus back to and the
 * deck the press came from (`DemoDeckScope`; null with no deck).
 */
export type DemoCardWiring = {
  onOpen: (oracleId: string, siblings: readonly SiblingCard[], opener: HTMLElement | null, role: DemoDeckRole | null) => void;
  onClose: () => void;
  openOracleId: string | null;
};

/**
 * The context value of a surface with no modal state of its own: `open` hands the card to the frame, which opens it only when
 * the fixture holds its details (a card without them opens nothing). `openOracleId` and `close` are the frame's, so
 * `sessionActive` is true exactly while a card is open; no read is ever pending.
 */
export function demoCardDetail({ onOpen, onClose, openOracleId }: DemoCardWiring, role: DemoDeckRole | null = null): CardDetailContextValue {
  return {
    deckId: null,
    deckOracleIds: NO_IDS,
    open: (oracleId, siblings, _atPrinting, opts) => onOpen(oracleId, siblings ? siblingCards(siblings) : [], opts?.opener ?? null, role),
    pendingOracleId: null,
    openOracleId,
    sessionActive: openOracleId !== null,
    revealing: false,
    setSiblings: noop,
    evict: noop,
    close: onClose,
    prefetch: () => undefined,
    registerSheet: noopRelease,
    registerDoor: noopRelease,
    registerReceiptLink: noopRelease,
  };
}

const WiringContext = createContext<DemoCardWiring | null>(null);

/**
 * A step's deck: every card pressed inside is opened with this deck's role (`detailFor`). It re-provides the card details context
 * with the same wiring and the role, so a row or a name inside needs no change to say which deck it is in. The role changes what opens: `detailFor`
 * lays that deck's own combos over the card (`deckCombos`), as the deck page reads them against its deck.
 */
export function DemoDeckScope({ role, children }: { role: DemoDeckRole | null; children: ReactNode }) {
  const wiring = useContext(WiringContext);
  const value = useMemo(() => (wiring ? demoCardDetail(wiring, role) : null), [wiring, role]);
  return value ? <CardDetailContext.Provider value={value}>{children}</CardDetailContext.Provider> : <>{children}</>;
}

export function DemoProviders({ onOpen, onClose, openOracleId, children }: DemoCardWiring & { children: ReactNode }) {
  const wiring = useMemo<DemoCardWiring>(() => ({ onOpen, onClose, openOracleId }), [onOpen, onClose, openOracleId]);
  const value = useMemo(() => demoCardDetail(wiring), [wiring]);
  return (
    <DeckRowWiringProvider value={INERT_ROW_WIRING}>
      <WiringContext.Provider value={wiring}>
        <CardDetailContext.Provider value={value}>
          <HoverPreviewProvider className="contents">{children}</HoverPreviewProvider>
        </CardDetailContext.Provider>
      </WiringContext.Provider>
    </DeckRowWiringProvider>
  );
}

/**
 * For a shared view whose `onOpen` hands back only the card (the collection's `GridView`, Which deck's `FitsViewDrawing`): the
 * control that was pressed, so the modal gives focus back to it. A press's capture phase runs before the control's own click, so
 * `capture` (on a wrapper) notes the pressed control and `open` reads it. Safari and touch leave `document.activeElement` on the
 * body after a button press, so the frame's guess at the focused element is no stand-in.
 */
export function usePressedOpener(onOpenCard: (oracleId: string, opener: HTMLElement | null) => void): { capture: (event: MouseEvent<HTMLElement>) => void; open: (oracleId: string) => void } {
  const pressed = useRef<HTMLElement | null>(null);
  const capture = useCallback((event: MouseEvent<HTMLElement>) => {
    const target = event.target;
    pressed.current = target instanceof Element ? target.closest<HTMLElement>("button, a, [role='button']") : null;
  }, []);
  const open = useCallback(
    (oracleId: string) => {
      const opener = pressed.current;
      pressed.current = null;
      onOpenCard(oracleId, opener);
    },
    [onOpenCard],
  );
  return { capture, open };
}
