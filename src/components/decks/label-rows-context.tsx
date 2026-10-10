"use client";

// The deck page's label rows, for the components that count roles. With
// `LABEL_ROLE_COUNTS_ENABLED` on the page provides the map the Jobs card reads, and every role count
// below it goes through `jobTally` on it; with the switch off, or the read failed, the value is null and
// `useRoleCounter` is `computeRoleCounts` exactly as before.

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { JobRowsByCard } from "../../lib/decks/job-tally";
import { roleCounterFor, type RoleCounter } from "../../lib/decks/label-role-counts";

const LabelRowsContext = createContext<JobRowsByCard | null>(null);

export function LabelRowsProvider({ value, children }: { value: JobRowsByCard | null | undefined; children: ReactNode }) {
  return <LabelRowsContext.Provider value={value ?? null}>{children}</LabelRowsContext.Provider>;
}

export function useLabelRows(): JobRowsByCard | null {
  return useContext(LabelRowsContext);
}

/** One counter for a component, so its figures and the strip's are one fold. */
export function useRoleCounter(): RoleCounter {
  const byCard = useLabelRows();
  return useMemo(() => roleCounterFor(byCard), [byCard]);
}
