"use client";

// An answer to a Tuning row (Cut, Keep, Apply, Reject, Undo, Show it again) flips the row AT ONCE
// (Hugh, 2026-10-12): the server action runs behind it, and a refusal rolls the row back with its
// own refusal copy. The repo's pattern for a write whose reply carries no fresh rows
// (`lock-cards.tsx`): a local override drawn over the server's value until the server's value
// moves, never `useOptimistic`, whose value is dropped the moment the action's transition ends and
// would snap the row back before the panel's re-read lands.

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { DeckMutationResult } from "../../lib/decks/mutation-result";

export type RowVerdict = "pending" | "accepted" | "dismissed";

/**
 * A panel's view of its rows' flips, so its counts (answered, applied, the lead) read the same
 * answer the rows draw, as `lock-cards.tsx` lays its overrides over the whole list. Rows report;
 * the panel reads, for its counts only: a row is always handed the server's own verdict.
 */
type Report = (id: string, verdict: RowVerdict | null) => void;
type Overrides = { report: Report; map: ReadonlyMap<string, RowVerdict> };
const OverridesContext = createContext<Overrides | null>(null);
export const VerdictOverridesProvider = OverridesContext.Provider;

/** For a panel's other parts (a bulk control): each item's verdict as its row draws it, and whether
 *  any row is mid-answer, so a bulk press never races a row's own. */
export function useVerdictOverrideView() {
  const ctx = useContext(OverridesContext);
  const map = ctx?.map;
  return {
    verdictOf: (item: { id: string; verdict: RowVerdict }) => map?.get(item.id) ?? item.verdict,
    anyFlipped: !!map && map.size > 0,
  };
}

/** For a panel: the value its provider hands down, and each item's verdict as its row draws it. */
export function useVerdictOverrides() {
  const [map, setMap] = useState<ReadonlyMap<string, RowVerdict>>(() => new Map());
  const report = useCallback<Report>((id, verdict) => {
    setMap((m) => {
      if ((m.get(id) ?? null) === verdict) return m;
      const next = new Map(m);
      if (verdict === null) next.delete(id);
      else next.set(id, verdict);
      return next;
    });
  }, []);
  const verdictOf = (item: { id: string; verdict: RowVerdict }) => map.get(item.id) ?? item.verdict;
  const value = useMemo<Overrides>(() => ({ report, map }), [report, map]);
  return { report, verdictOf, value };
}

export function useOptimisticVerdict(server: RowVerdict, id?: string) {
  // The verdict pressed, and the server verdict it was pressed over: once the server's moves off
  // that (the re-read landed, or something else changed it), the server's is the truth again.
  const [shown, setShown] = useState<{ verdict: RowVerdict; from: RowVerdict } | null>(null);
  if (shown && server !== shown.from) setShown(null);
  const [inFlight, setInFlight] = useState(false);
  // Synchronous: two presses in one frame must not both reach the server.
  const busy = useRef(false);

  /** Flip to `target`, run the action, roll back on a refusal. Resolves with the action's answer. */
  async function press(
    target: RowVerdict,
    action: () => Promise<DeckMutationResult>,
    refusal = "",
  ): Promise<DeckMutationResult | null> {
    if (busy.current) return null;
    busy.current = true;
    setInFlight(true);
    setShown({ verdict: target, from: server });
    const result = await action().catch((): DeckMutationResult => ({ ok: false, message: refusal }));
    busy.current = false;
    setInFlight(false);
    if (!result.ok) setShown(null);
    return result;
  }

  /** The re-read after an answer has landed: from now the server's verdict is the truth, moved or not. */
  const release = () => setShown(null);

  const flipped = shown && server === shown.from ? shown.verdict : null;
  // Tell the panel, so its counts read this row as it is drawn; and forget it when the row goes.
  // Before paint, so the row and the panel's counts never show two answers in one frame.
  const report = useContext(OverridesContext)?.report;
  useLayoutEffect(() => {
    if (!id || !report) return;
    report(id, flipped);
  }, [id, report, flipped]);
  useLayoutEffect(() => (id && report ? () => report(id, null) : undefined), [id, report]);

  return { verdict: flipped ?? server, inFlight, press, release };
}
