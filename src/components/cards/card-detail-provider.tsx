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
import { twMerge } from "tailwind-merge";
import type { BrowseCard } from "../../lib/collection/browse";
import { getCardDetail } from "../../app/card-detail-action";
import { CardModal } from "./card-modal";

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
  /**
   * The id of the card the modal is currently showing, or null when it is closed.
   * A surface that mirrors the open card into the URL reads it from here rather
   * than tracking its own copy, which would drift from the modal on Prev/Next.
   */
  openOracleId: string | null;
  /**
   * Replace the ordered list Prev/Next pages through, without touching the open
   * card. A surface whose list is a live filter of something larger re-files it
   * here when that filter moves; otherwise the modal keeps paging the order that
   * happened to be on screen at the moment it was opened.
   */
  setSiblings: (list: string[]) => void;
  /**
   * Drop `oracleId` from the cache, so the next open has nothing to paint before its
   * fetch answers. A surface that writes something the card carries — the art pick is
   * the one that exists — calls this, or the reader reopens the card and is shown the
   * change they just made being undone before the re-read corrects it.
   */
  evict: (oracleId: string) => void;
  /** Close the modal, and abandon any fetch still in flight for it. */
  close: () => void;
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
  oracleId, name, siblings, className, style, title, ariaLabel, describedBy, children,
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
  /** Id of an element whose text a screen reader should read after this
   *  button's own name. For text that qualifies the card in its row rather
   *  than renaming the trigger: the ledger's mark uses it, so a reader
   *  tabbing through the decklist hears which pass placed the card. Sibling
   *  visually-hidden text alone is reachable only in browse mode. */
  describedBy?: string;
  children: ReactNode;
}) {
  const { open, pendingOracleId } = useCardDetail();
  const pending = pendingOracleId === oracleId;
  return (
    <button
      type="button"
      onClick={() => open(oracleId, siblings)}
      aria-label={ariaLabel ?? cardDetailCopy.triggerAria(name)}
      aria-describedby={describedBy}
      aria-busy={pending}
      title={title}
      // The chrome reset lives here rather than at each call site: every surface
      // wraps its own already-styled content, so a UA's default button border,
      // padding and background is never what any of them wants. twMerge puts a
      // caller's own bg-/border- utility ahead of the reset; an inline style
      // from a caller outranks both. The reset is border-0 rather than
      // border-none: border-none sets --tw-border-style, which a caller's own
      // `border` reads, so it would give them a 1px border styled `none`.
      className={twMerge("bg-transparent border-0", className)}
      style={{
        cursor: "pointer",
        padding: 0,
        opacity: pending ? 0.55 : undefined,
        ...style,
      }}
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
  // Cards already fetched this visit, so reopening one paints with no wait. A ref
  // rather than state because it is read in the click handler and never during render.
  //
  // A cached card is shown and then checked, never shown and trusted: a card carries
  // its availability, and the deck builder keeps this provider mounted while adding
  // and removing cards changes exactly that. Those mutations revalidate on the server
  // and send no signal a client cache could listen for, so the only honest way to hold
  // a card across them is to re-ask and correct what is already on screen.
  const cache = useRef(new Map<string, BrowseCard>());
  // How many times each card has been evicted. A read that started before an eviction
  // answers with what the write it raced has not replaced yet, so the count taken when
  // the read starts is compared against the count when it lands: a read from the wrong
  // side of a write is dropped rather than filed as the current answer.
  const evictions = useRef(new Map<string, number>());

  const load = useCallback(
    async (oracleId: string, list?: string[]) => {
      const request = ++latest.current;
      if (list !== undefined) setSiblings(list);
      // A hit lands in the same pass as the click, so no pending state is ever set and
      // the trigger never flashes a busy affordance for a wait that does not happen.
      const hit = cache.current.get(oracleId);
      const evictedAtStart = evictions.current.get(oracleId) ?? 0;
      if (hit) {
        setPendingOracleId(null);
        setFailed(false);
        setCard(hit);
      } else {
        setPendingOracleId(oracleId);
        setFailed(false);
      }
      try {
        const next = await fetchCard(oracleId);
        if (latest.current !== request) return;
        // An eviction landed while this read was out, so the read is from the wrong side
        // of the write that caused it. Nothing is filed and nothing is painted — the
        // reader is looking at the change they just made, which is what they should see,
        // and the next open re-reads from a settled world.
        if ((evictions.current.get(oracleId) ?? 0) !== evictedAtStart) return;
        if (next) {
          cache.current.set(oracleId, next);
          setCard(next);
        } else {
          // A card the server could not find is the one result not worth keeping: it is
          // rare, and filing it would keep the card missing for the rest of the visit.
          cache.current.delete(oracleId);
          // On a hit the reader is already looking at the card, and a card that has gone
          // missing between two opens is not worth yanking the modal out from under them.
          if (!hit) {
            setCard(null);
            setFailed(true);
          }
        }
      } catch {
        if (latest.current !== request) return;
        // Same reasoning: a failed re-ask leaves what is on screen alone.
        if (!hit) setFailed(true);
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

  // Bumping `latest` is what abandons an in-flight fetch: without it, a card
  // requested before the close lands afterwards and re-opens the modal.
  // `failed` is cleared too, or the live region keeps announcing a failure the
  // reader has already dismissed.
  const close = useCallback(() => {
    latest.current++;
    setCard(null);
    setPendingOracleId(null);
    setFailed(false);
  }, []);

  const evict = useCallback((oracleId: string) => {
    cache.current.delete(oracleId);
    evictions.current.set(oracleId, (evictions.current.get(oracleId) ?? 0) + 1);
  }, []);

  const value = useMemo<CardDetailContextValue>(
    () => ({
      open,
      pendingOracleId,
      openOracleId: card?.oracleId ?? null,
      setSiblings,
      evict,
      close,
    }),
    [open, pendingOracleId, card, evict, close],
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
          onArtChange={() => evict(card.oracleId)}
          position={paging ? index + 1 : 1}
          total={paging ? siblings.length : 1}
          onClose={close}
          onPrev={paging && index > 0 ? () => void load(siblings[index - 1]) : null}
          onNext={
            paging && index < siblings.length - 1 ? () => void load(siblings[index + 1]) : null
          }
        />
      )}
    </CardDetailContext.Provider>
  );
}
