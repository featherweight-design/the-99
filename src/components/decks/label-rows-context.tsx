"use client";

// The deck page's label rows, for the components that count roles. With
// `LABEL_ROLE_COUNTS_ENABLED` on the page provides the map the Jobs card reads, and every role count
// below it goes through `jobTally` on it; with the switch off, or the read failed, the value is null and
// `useRoleCounter` is `computeRoleCounts` exactly as before.

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { JobRowsByCard } from "../../lib/decks/job-tally";
import { roleCounterFor, type RoleCounter } from "../../lib/decks/label-role-counts";

const LabelRowsContext = createContext<JobRowsByCard | null>(null);

const LabelQueriedContext = createContext<ReadonlySet<string> | null>(null);

/** `queried` is the ids the page's label read covered: the map is sparse (an unlabeled card has no
 *  entry), so only this set tells a card with no label from one the page never asked about. */
export function LabelRowsProvider({ value, queried, children }: {
  value: JobRowsByCard | null | undefined;
  queried?: readonly string[] | null;
  children: ReactNode;
}) {
  const set = useMemo(() => (queried ? new Set(queried) : null), [queried]);
  return (
    <LabelRowsContext.Provider value={value ?? null}>
      <LabelQueriedContext.Provider value={set}>{children}</LabelQueriedContext.Provider>
    </LabelRowsContext.Provider>
  );
}

export function useLabelQueried(): ReadonlySet<string> | null {
  return useContext(LabelQueriedContext);
}

export function useLabelRows(): JobRowsByCard | null {
  return useContext(LabelRowsContext);
}

/** One counter for a component, so its figures and the strip's are one fold. */
export function useRoleCounter(): RoleCounter {
  const byCard = useLabelRows();
  return useMemo(() => roleCounterFor(byCard), [byCard]);
}
