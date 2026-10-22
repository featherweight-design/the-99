"use client";

import { useEffect, useState } from "react";
import {
  IMPORTED_PARAM,
  PRECON_ADDED_PARAM,
  PRECON_ARRIVAL_PARAM,
  PRINTINGS_PARAM,
  UPDATED_PARAM,
  type ArrivalPrintings,
  type UpdateArrivalState,
} from "../../lib/decks/arrival";
import type { ImportAddReceipt } from "../../lib/decks/import-add-receipt";
import type { PreconArrival } from "../../lib/precons/arrival-read";
import type { PreconAddReceipt } from "../../lib/precons/add-receipt-read";
import { mirrorUrl } from "../../lib/url/mirror";

/** What the page's one navigation said: the five receipts it may carry, each already read on the server. */
export type VisitReceipts = {
  fromImport: boolean;
  printings: ArrivalPrintings | null;
  importAdd: ImportAddReceipt | null;
  precon: PreconArrival | null;
  preconAdd: PreconAddReceipt | null;
  update: UpdateArrivalState | null;
};

const KEYS: (keyof VisitReceipts)[] = ["fromImport", "printings", "importAdd", "precon", "preconAdd", "update"];

/** Whether the navigation carried a receipt at all. */
export const hasReceipt = (r: VisitReceipts) => r.fromImport || r.precon !== null || r.update !== null;

const sameReceipts = (a: VisitReceipts, b: VisitReceipts) => KEYS.every((k) => a[k] === b[k]);

/** The URL parameters a receipt rides on. All of them leave the address once the page has read them. */
const RECEIPT_PARAMS = [IMPORTED_PARAM, PRINTINGS_PARAM, PRECON_ARRIVAL_PARAM, PRECON_ADDED_PARAM, UPDATED_PARAM];

/**
 * A receipt lasts the visit it arrived with (deck messages A10, A12, A13): the page reads the parameters once, the
 * shell holds what they said, and `dismiss` hides it for the visit. Nothing is stored. A later server refresh arrives
 * with the parameters gone, so it brings no receipt and the held one stands; a NEW arrival on the same mounted page
 * (different figures) replaces it and brings it back.
 */
export function useVisitReceipts(incoming: VisitReceipts) {
  const [held, setHeld] = useState(incoming);
  const [dismissed, setDismissed] = useState(false);
  // Adjusted during render, so a new arrival never paints the old receipt once.
  if (hasReceipt(incoming) && !sameReceipts(incoming, held)) {
    setHeld(incoming);
    setDismissed(false);
  }
  // Spent once the page has seen it, whether or not it drew anything: a reload must not repeat a receipt.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!RECEIPT_PARAMS.some((p) => url.searchParams.has(p))) return;
    for (const p of RECEIPT_PARAMS) url.searchParams.delete(p);
    mirrorUrl(url);
  }, [incoming]);
  return { held, shown: hasReceipt(held) && !dismissed, dismiss: () => setDismissed(true) };
}
