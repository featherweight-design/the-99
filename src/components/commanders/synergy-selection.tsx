"use client";
// The commander page's synergy selection — the oracle ids the player has picked
// out of the synergy panel.
//
// It lives in a provider rather than in detail.tsx's own state so that
// detail.tsx stays a server component: that file imports from
// src/lib/collection/browse.ts, whose own first import is drizzle-orm, and
// resting a page on tree-shaking to keep the ORM out of the browser is thinner
// than it looks. The pattern here follows card-detail-provider.tsx, which
// already solves the same problem for the card modal.
//
// Task 7's promise line, Clear-selection control and Build href read the same
// state through `useSynergySelection` as siblings of the panel, which is why the
// state is context and not a prop threaded down one branch.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { deckBodySize } from "../../lib/decks/deck-size";
import { MAX_SELECTION } from "../../lib/decks/selection-param";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { SynergyPanel } from "./synergy-panel";
import type { SynergyCard } from "../../lib/commanders/synergy-cards";
import { PendingReporter } from "../shell/pending-reporter";

type SynergySelectionValue = {
  /** Oracle ids currently picked. */
  selected: Set<string>;
  /** Add the id when it is absent, drop it when it is present. */
  toggle: (oracleId: string) => void;
  /** Drop every pick. */
  clear: () => void;
};

const SynergySelectionContext = createContext<SynergySelectionValue | null>(null);

export function useSynergySelection(): SynergySelectionValue {
  const ctx = useContext(SynergySelectionContext);
  if (!ctx) {
    throw new Error("useSynergySelection must be used inside a SynergySelectionProvider");
  }
  return ctx;
}

export function SynergySelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // The picker honours the same bound the build does. `sanitizeSelection` caps
  // the URL at MAX_SELECTION, so a longer selection would show a pick count and
  // a promise the build could not keep, and would carry the surplus in a Build
  // href long enough to be refused before it arrived. Removing always works;
  // only adding past the bound is refused.
  const toggle = useCallback((oracleId: string) => {
    setSelected((prev) => {
      if (prev.has(oracleId)) {
        const next = new Set(prev);
        next.delete(oracleId);
        return next;
      }
      if (prev.size >= MAX_SELECTION) return prev;
      return new Set(prev).add(oracleId);
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const value = useMemo<SynergySelectionValue>(
    () => ({ selected, toggle, clear }),
    [selected, toggle, clear],
  );

  return (
    <SynergySelectionContext.Provider value={value}>{children}</SynergySelectionContext.Provider>
  );
}

// ─── SynergySelection — promise line + clear control ─────────────────────────
//
// Pure over its props; no provider dependency. Returns null at zero selection
// so the locked zero-selection copy (stickyPromise, seedNote) stands alone.

type SelectedCardRef = { oracleId: string; owned: boolean };

type SynergySelectionProps = {
  selectedCards: SelectedCardRef[];
  onClear: () => void;
  width: "desktop" | "phone";
};

export function SynergySelection({ selectedCards, onClear, width }: SynergySelectionProps) {
  const picked = selectedCards.length;
  if (picked === 0) return null;

  // `createDeck` places the selection first and fills what is left under the 99,
  // so the baseline is a ceiling on the fill rather than a fixed part of it: at
  // 40 picks the fill places 59, not 68. Reading it as fixed both overstated the
  // filled figure and made the clamp line — "your picks fill the 99 on their
  // own" — fire at 31 picks, where the fill is still placing most of the deck.
  //
  // Single-commander throughout: this page is one commander's, and a partner is
  // chosen later in the create picker, against a deck that does not exist yet.
  // The fill reaches the whole body now, so what it fills is simply what the picks left.
  // `fillBaselineTotal` existed to say "68 of 99" and equalled `deckBodySize` by the time it
  // was deleted — a helper whose whole content was a second name for another function.
  const filled = Math.max(0, deckBodySize(false) - picked);
  const total = picked + filled;
  const unownedCount = selectedCards.filter((c) => !c.owned).length;
  const full = filled === 0;

  const totalStr = String(total);
  const promiseFontSize = width === "phone" ? 12 : 10.5;

  // Build a React node for the promise line that highlights {total} in --fg.
  // The promiseFull and clamp cases do not contain the total figure, so they
  // render as plain strings. The non-full cases embed the total literal in the
  // string — split on it and inject a highlighted span.
  let promiseNode: React.ReactNode;
  if (full) {
    promiseNode = synergyCopy.select.promiseFull(String(picked));
  } else {
    const raw =
      width === "phone"
        ? synergyCopy.select.promiseMobile(String(filled), String(picked), totalStr)
        : synergyCopy.select.promise(String(filled), String(picked), totalStr);
    const idx = raw.indexOf(totalStr);
    if (idx === -1) {
      promiseNode = raw;
    } else {
      promiseNode = (
        <>
          {raw.slice(0, idx)}
          <span style={{ color: "var(--fg)" }}>{totalStr}</span>
          {raw.slice(idx + totalStr.length)}
        </>
      );
    }
  }

  return (
    <div
      className="flex flex-col"
      style={{ marginTop: width === "phone" ? 0 : 12 }}
    >
      <span
        className="font-mono text-center text-[color:var(--fg-body)]"
        style={{ fontSize: promiseFontSize, lineHeight: 1.5 }}
      >
        {promiseNode}
      </span>
      {unownedCount > 0 && (
        <span
          className="font-mono text-center text-[var(--warning)]"
          style={{ fontSize: promiseFontSize, lineHeight: 1.5 }}
        >
          {synergyCopy.select.promiseUnowned(String(unownedCount))}
        </span>
      )}
      <button
        type="button"
        aria-label={synergyCopy.select.clearAria(String(picked))}
        onClick={onClear}
        className="font-mono text-center bg-transparent border-0 p-0 cursor-pointer text-[color:var(--accent)] text-[11px]"
        style={{ marginTop: 8 }}
      >
        {synergyCopy.select.clear(String(picked))}
      </button>
    </div>
  );
}

// ─── SelectableSynergySelection — bridge from provider to the UI ──────────────
//
// Reads selection state from the provider and passes it as props to
// SynergySelection. The card list is needed to reconstruct the owned flags on
// the selected ids (only the oracle id is in the Set).

export function SelectableSynergySelection({
  cards,
  width,
}: {
  cards: SynergyCard[];
  width: "desktop" | "phone";
}) {
  const { selected, clear } = useSynergySelection();
  const selectedCards = cards.filter((c) => selected.has(c.oracleId));
  return <SynergySelection selectedCards={selectedCards} onClear={clear} width={width} />;
}

// ─── SelectableBuildButton — dynamic Build href from provider ─────────────────
//
// Renders the "Build this deck →" link whose href carries the selected oracle
// ids. At zero selection the href is byte-identical to what detail.tsx shipped.
// The className prop lets the caller match the existing PrimaryButton styles.

export function SelectableBuildButton({
  oracleId,
  className,
}: {
  oracleId: string;
  className?: string;
}) {
  const { selected } = useSynergySelection();
  // Encoded rather than interpolated raw: both values are oracle ids today, but
  // a query string built by concatenation is one upstream id-format change away
  // from breaking, and the redirect path already encodes.
  const params = new URLSearchParams({ commander: oracleId });
  if (selected.size > 0) params.set("select", [...selected].join(","));
  const buildHref = `/decks?${params}`;
  return (
    <Link href={buildHref} className={className}>
      Build this deck →
      <PendingReporter href={buildHref} />
    </Link>
  );
}

// ─── SelectableLiveAnnouncer — debounced ARIA live region ─────────────────────
//
// One region for the whole page; announces the pick count on settle.
// Placed once in the provider tree (detail.tsx mounts it once).

export function SelectableLiveAnnouncer({ cards }: { cards: SynergyCard[] }) {
  const { selected } = useSynergySelection();
  const picked = cards.filter((c) => selected.has(c.oracleId)).length;
  const total = deckBodySize(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const next = picked;
    debounceRef.current = setTimeout(() => {
      // At zero picks, clear the region so an assistive technology that replays
      // live regions on focus doesn't repeat a stale count.
      setAnnouncement(
        next === 0 ? "" : synergyCopy.select.announce(String(next), String(total)),
      );
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [picked, total]);

  return (
    <span className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement}
    </span>
  );
}

/**
 * The thin bridge a server component mounts. SynergyPanel itself stays
 * prop-driven — it takes `selected` and `onToggle` and can be unit-tested with
 * no provider at all — and this is the only place that reads them from context.
 */
export function SelectableSynergyPanel({
  cards,
  ownedCount,
  edhrecTotal,
  width,
  newestAsOf,
}: {
  cards: SynergyCard[];
  ownedCount: number;
  edhrecTotal: number;
  width: "desktop" | "phone";
  /**
   * REQUIRED, with no default, on purpose.
   *
   * It defaulted to null and one of the two call sites in `detail.tsx` was never
   * given it — so the desktop panel priced nothing at all: `priceState(price,
   * null)` is `absent`, every row drew a bare `buy`, and the accessible name said
   * "available to buy" over a card with a live figure. The phone was correct, so
   * a diff review saw a threaded prop and the component tests, which hand it
   * straight to `SynergyRow`, never rendered the wiring that was missing.
   *
   * A default turns a missing prop into a wrong price. No default turns it into
   * a type error.
   */
  newestAsOf: Date | null;
}) {
  const { selected, toggle } = useSynergySelection();
  return (
    <SynergyPanel
      cards={cards}
      ownedCount={ownedCount}
      edhrecTotal={edhrecTotal}
      selected={selected}
      onToggle={toggle}
      width={width}
      newestAsOf={newestAsOf}
    />
  );
}
