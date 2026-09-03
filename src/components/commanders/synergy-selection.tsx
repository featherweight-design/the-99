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

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { SynergyPanel } from "./synergy-panel";
import type { SynergyCard } from "../../lib/commanders/synergy-cards";

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

  const toggle = useCallback((oracleId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(oracleId)) next.delete(oracleId);
      else next.add(oracleId);
      return next;
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
}: {
  cards: SynergyCard[];
  ownedCount: number;
  edhrecTotal: number;
  width: "desktop" | "phone";
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
    />
  );
}
