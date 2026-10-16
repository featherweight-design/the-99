"use client";

import { useCallback, useEffect, useState } from "react";
import { collectionEditCopy } from "../../../lib/copy/collection-edit";
import type { ScanGuess, ScanMode } from "./scan-view";
import { ScannerView } from "./scanner-view";
import { useCardScan, type CardScanDeps } from "./use-card-scan";

const copy = collectionEditCopy.scan;

/** How long a transient problem stays over the feed. */
export const NOTICE_MS = 3000;

/**
 * The scanner as the Add cards sheet mounts it (card-scan PR 3): `useCardScan` drawn by `ScannerView`, with the
 * camera's `<video>` as its feed and a problem said for a moment then gone. Each add goes to `onAdd`; Review and ✕
 * both close it, back to the sheet's list, which holds every card added.
 */
export function CardScanner({
  layout,
  deps,
  onAdd,
  onClose,
  onNoneOfThese,
}: {
  layout: "phone" | "desk";
  deps: CardScanDeps;
  onAdd: (guess: ScanGuess, mode: ScanMode) => void;
  onClose: () => void;
  onNoneOfThese: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const onProblem = useCallback((kind: "failed" | "refused") => {
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    // A refusal (signed out, switch off) and a failure read the same to a player: the card was not checked.
    void kind;
    setNotice(offline ? copy.offlineBody : copy.lookupFailed);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(t);
  }, [notice]);
  const { screen, mode, torch, count, flipTo, attachVideo, setMode, toggleTorch, hold, add, cancelHold, pick } = useCardScan(true, deps, onAdd, onProblem);
  return (
    <ScannerView
      layout={layout}
      screen={screen}
      mode={mode}
      torch={torch}
      count={count}
      flipTo={flipTo}
      notice={notice}
      feed={<video ref={attachVideo} muted playsInline className="h-full w-full object-cover" />}
      onMode={setMode}
      onTorch={toggleTorch}
      onClose={onClose}
      onReview={onClose}
      onHold={hold}
      onAdd={add}
      onCancelHold={cancelHold}
      onPick={pick}
      onNoneOfThese={onNoneOfThese}
    />
  );
}
