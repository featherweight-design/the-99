"use client";
// One card-detail modal for the whole builder (#127, #91). Every deck surface — decklist row,
// suggestion, search result, commander thumb — opens through this context, so there is one
// piece of modal state on the page rather than one per row.
//
// The card is fetched on click because deck surfaces carry only an oracle id; shipping 99
// cards' printings with the page to open one of them is the alternative.

import {
  createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode,
} from "react";
import type { BrowseCard } from "../../lib/collection/browse";
import { getCardDetail } from "../../app/decks/[id]/card-detail-action";
import { CardModal } from "../collection/card-modal";

export const cardDetailCopy = {
  triggerAria: (name: string) => `View details for ${name}`,
  loading: "Loading card details…",
  unavailable: "Card details are unavailable.",
};

type CardDetailContextValue = {
  /**
   * Open the modal for `oracleId`. `siblings` is the ordered oracle-id list the card belongs
   * to, which is what Prev/Next page through; omit it where there is no list (the commander,
   * a suggestion) and the modal renders "1 of 1" with both arrows disabled.
   */
  open: (oracleId: string, siblings?: string[]) => void;
  /** The id whose fetch is in flight, so its trigger can show the click landed. */
  pendingOracleId: string | null;
};

const CardDetailContext = createContext<CardDetailContextValue | null>(null);

export function useCardDetail(): CardDetailContextValue {
  const ctx = useContext(CardDetailContext);
  if (!ctx) throw new Error("useCardDetail must be used inside a CardDetailProvider");
  return ctx;
}

/**
 * The click target every deck surface wraps its card name (or art) in. Deliberately never
 * `disabled` while the fetch runs: disabling the focused element blurs it, and the modal's
 * focus-return would then have nothing to hand focus back to on close.
 */
export function CardDetailTrigger({
  oracleId, name, siblings, className, style, title, ariaLabel, children,
}: {
  oracleId: string;
  name: string;
  siblings?: string[];
  className?: string;
  style?: React.CSSProperties;
  /** Hover tooltip, where the surface truncates the name it wraps. */
  title?: string;
  /** Override the default accessible name. When omitted, falls back to
   *  `cardDetailCopy.triggerAria(name)`. Chips pass a richer label that
   *  includes the EDHREC inclusion figure. */
  ariaLabel?: string;
  children: ReactNode;
}) {
  const { open, pendingOracleId } = useCardDetail();
  const pending = pendingOracleId === oracleId;
  return (
    <button
      type="button"
      onClick={() => open(oracleId, siblings)}
      aria-label={ariaLabel ?? cardDetailCopy.triggerAria(name)}
      aria-busy={pending}
      title={title}
      className={className}
      style={{ cursor: "pointer", opacity: pending ? 0.55 : undefined, ...style }}
    >
      {children}
    </button>
  );
}

export function CardDetailProvider({
  children,
  // Injected for tests; production always uses the server action.
  fetchCard = getCardDetail,
}: {
  children: ReactNode;
  fetchCard?: (oracleId: string) => Promise<BrowseCard | null>;
}) {
  const [card, setCard] = useState<BrowseCard | null>(null);
  const [siblings, setSiblings] = useState<string[]>([]);
  const [pendingOracleId, setPendingOracleId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Clicks can overlap — a slow first fetch must not land on top of the card the user
  // actually asked for second.
  const latest = useRef(0);

  const load = useCallback(
    async (oracleId: string, list?: string[]) => {
      const request = ++latest.current;
      setPendingOracleId(oracleId);
      setFailed(false);
      if (list !== undefined) setSiblings(list);
      try {
        const next = await fetchCard(oracleId);
        if (latest.current !== request) return;
        setCard(next);
        setFailed(next === null);
      } catch {
        if (latest.current !== request) return;
        setFailed(true);
      } finally {
        if (latest.current === request) setPendingOracleId(null);
      }
    },
    [fetchCard],
  );

  const open = useCallback(
    (oracleId: string, list?: string[]) => {
      void load(oracleId, list ?? []);
    },
    [load],
  );

  const value = useMemo<CardDetailContextValue>(
    () => ({ open, pendingOracleId }),
    [open, pendingOracleId],
  );

  const index = card ? siblings.indexOf(card.oracleId) : -1;
  const paging = index >= 0 && siblings.length > 1;

  return (
    <CardDetailContext.Provider value={value}>
      {children}
      {/* The fetch is invisible until the modal mounts, so the wait is announced here. */}
      <div aria-live="polite" className="sr-only">
        {pendingOracleId ? cardDetailCopy.loading : failed ? cardDetailCopy.unavailable : ""}
      </div>
      {card && (
        <CardModal
          // Paging must not carry the previous card's expanded printing region or its
          // optimistic art pick across — same reason the collection browser remounts.
          key={card.oracleId}
          card={card}
          position={paging ? index + 1 : 1}
          total={paging ? siblings.length : 1}
          onClose={() => setCard(null)}
          onPrev={paging && index > 0 ? () => void load(siblings[index - 1]) : null}
          onNext={
            paging && index < siblings.length - 1 ? () => void load(siblings[index + 1]) : null
          }
        />
      )}
    </CardDetailContext.Provider>
  );
}
