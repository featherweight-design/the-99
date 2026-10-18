"use client";
// The game log's table prefill (Rule 0 PR 8) as `BuilderShell` holds it: across the Games panel's remounts (a tab
// change), until a save or a Cancel spends it.

import { useCallback, useState } from "react";
import type { TablePrefill } from "../../lib/social/rule-zero-log";

/**
 * Only a save or a Cancel ends the offer. A refresh drawn without one (any revalidation of the page after `table`
 * left the address, such as deleting a game while the prefilled form is open) is not a spend: the mounted form still
 * holds the table's seats, and its save must still carry the table. A fresh prefill (a new arrival) is adopted during
 * render, so the old one never paints once more.
 */
export function useHeldPrefill(drawn: TablePrefill | null): [TablePrefill | null, () => void] {
  const [offered, setOffered] = useState(drawn);
  const [seen, setSeen] = useState(drawn);
  if (drawn !== seen) {
    setSeen(drawn);
    if (drawn !== null) setOffered(drawn);
  }
  const spend = useCallback(() => setOffered(null), []);
  return [offered, spend];
}
