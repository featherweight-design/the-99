"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collectionEditCopy } from "../../../lib/copy/collection-edit";
import type { ScanGuess, ScanMode } from "./scan-view";
import { ScannerView } from "./scanner-view";
import { useFrameReader } from "./frame-reader";
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
  listed,
  deps,
  onAdd,
  onClose,
  onNoneOfThese,
}: {
  layout: "phone" | "desk";
  /** Copies on the sheet's list as the scanner opens. */
  listed: ReadonlyMap<string, number>;
  /** Test seams; the detector and embedder are the scanner's own, loaded and released with it. */
  deps?: Partial<CardScanDeps>;
  onAdd: (guess: ScanGuess, mode: ScanMode) => Promise<boolean>;
  onClose: () => void;
  /** PR 4's search by name; until then None of these only reads on. */
  onNoneOfThese?: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const onProblem = useCallback((kind: "failed" | "refused" | "notAdded") => {
    if (kind === "notAdded") return setNotice(collectionEditCopy.add.printingsFailed);
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    // A refusal (signed out, switch off) and a failure read the same to a player: the card was not checked.
    setNotice(offline ? copy.offlineBody : copy.lookupFailed);
  }, []);
  // Focus moves into the scanner as it opens (its ✕, or Stop on the desktop), so a keyboard and a screen reader start
  // there rather than on a press it covers or one that went away.
  useEffect(() => {
    document.querySelector<HTMLElement>("[data-testid=scanner] [data-scan-close]")?.focus();
  }, []);
  // The detector and embedder live and die with the scanner, so closing it releases the models' memory.
  const readFrame = useFrameReader();
  const scanDeps = useMemo(() => ({ readFrame, ...deps }), [readFrame, deps]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(t);
  }, [notice]);
  const { screen, mode, torch, count, flipTo, attachVideo, setMode, toggleTorch, hold, add, cancelHold, pick, dismiss } = useCardScan(true, scanDeps, onAdd, onProblem, listed);
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
      onNoneOfThese={() => {
        dismiss();
        onNoneOfThese?.();
      }}
    />
  );
}
