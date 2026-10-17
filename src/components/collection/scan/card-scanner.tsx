"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collectionEditCopy } from "../../../lib/copy/collection-edit";
import type { ScanGuess, ScanMode } from "./scan-view";
import { loadPrintingChoices } from "../../../app/collection/edit-actions";
import { ScannerView } from "./scanner-view";
import { createOutlineStore } from "../../../lib/scan/outline";
import { useFrameReader } from "./frame-reader";
import { PhotoList } from "./photo-list";
import { usePhotoReader, type PhotoReaderDeps } from "./photo-reader";
import { nextFrame, useCardScan, type AddOutcome, type CardScanDeps, type ScanCapture, type ScanPicked } from "./use-card-scan";
import { scanTimer, type ScanTimer } from "../../../lib/scan/timing";

const copy = collectionEditCopy.scan;

/** How long a transient problem stays over the feed. */
export const NOTICE_MS = 3000;

/**
 * The scanner as the Add cards sheet mounts it (card-scan PR 3): `useCardScan` drawn by `ScannerView`, with the
 * camera's `<video>` as its feed and a problem said for a moment then gone. Each add goes to `onAdd`; Review and ✕
 * both close it, back to the sheet's list, which holds every card added. Where the camera is blocked (or there is
 * none), Choose photos opens the file picker, and the photos chosen replace the blocked screen (PR 5, W4).
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
  deps?: Partial<CardScanDeps> & Pick<PhotoReaderDeps, "decode" | "thumb">;
  onAdd: (guess: ScanGuess, mode: ScanMode, scan: ScanCapture, picked?: ScanPicked) => AddOutcome | Promise<AddOutcome>;
  onClose: () => void;
  /** None of these (V6): the scan is turned down and the sheet's search by name takes over. */
  onNoneOfThese: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const onProblem = useCallback((kind: "failed" | "refused" | "notReady" | "notAdded" | "noStart" | "photoFailed" | "removed", name?: string) => {
    if (kind === "notAdded") return setNotice(collectionEditCopy.add.printingsFailed);
    // This database has no scan index yet: no card can be checked, and saying it failed would be untrue.
    if (kind === "notReady") return setNotice(copy.notReady);
    if (kind === "removed") return setNotice(copy.view.removed(name ?? ""));
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (kind === "noStart") return setNotice(offline ? copy.offlineBody : copy.noStart);
    if (kind === "photoFailed") return setNotice(offline ? copy.offlineBody : copy.photos.lookupFailed);
    // A refusal (signed out, switch off) and a failure read the same to a player: the card was not checked.
    setNotice(offline ? copy.offlineBody : copy.lookupFailed);
  }, []);
  // The detector and embedder live and die with the scanner, so closing it releases the models' memory.
  const [outline] = useState(createOutlineStore);
  const readFrame = useFrameReader(outline);
  // The session's timing row: kept from open to close, and posted once the sheet's list is drawn behind it.
  const [timer] = useState(() => scanTimer(layout));
  // One mount follows the 768px line (the sheet keeps it across a turn), so a session can span both layouts.
  useEffect(() => timer.relayout(layout), [timer, layout]);
  const reviewAt = useRef<number | null>(null);
  const post = deps?.fetch ?? (typeof fetch === "function" ? fetch : null);
  const postRef = useRef(post);
  useEffect(() => {
    postRef.current = post;
  });
  useEffect(() => () => void sendTiming(timer, reviewAt, postRef.current), [timer]);
  const scanDeps = useMemo(() => ({ readFrame, loadChoices: loadPrintingChoices, timer, ...deps }), [readFrame, timer, deps]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(t);
  }, [notice]);
  const { screen, mode, torch, count, flipTo, attachVideo, setMode, toggleTorch, hold, add, cancelHold, pick, dismiss, choosePrinting, notThis } =
    useCardScan(true, scanDeps, onAdd, onProblem, listed);
  const photos = usePhotoReader(scanDeps, onAdd, mode, onProblem);
  const picker = useRef<HTMLInputElement>(null);
  const choosePhotos = () => picker.current?.click();
  // The picker itself: several photos, one card in each. Emptied after each choice, so the same photo can be chosen again.
  const input = (
    <input
      ref={picker}
      type="file"
      accept="image/*"
      multiple
      hidden
      data-testid="scan-photos-input"
      onChange={(e) => {
        const files = [...(e.currentTarget.files ?? [])];
        e.currentTarget.value = "";
        photos.choose(files);
      }}
    />
  );
  // Focus moves into the scanner as it opens (its ✕, or Stop on the desktop), so a keyboard and a screen reader start
  // there rather than on a press it covers. After that, when the press holding focus goes (a keyboard Add, a pick, the
  // blocked screen replacing the feed), focus falls to the page and the ✕ takes it back. Only focus the scanner held:
  // a press elsewhere, the desktop sheet's own controls included, is left alone.
  const focusInside = useRef(true);
  useEffect(() => {
    const track = (e: FocusEvent) => {
      const root = document.querySelector("[data-testid=scanner]");
      focusInside.current = !!root && e.target instanceof Node && root.contains(e.target);
    };
    document.addEventListener("focusin", track);
    return () => document.removeEventListener("focusin", track);
  }, []);
  // Turned onto a phone, the scanner covers the sheet and every control beneath it goes inert: focus held there
  // (a desktop sheet control beside the scanner) would be lost, so it moves to the ✕.
  const drawnAs = useRef(layout);
  useEffect(() => {
    const turned = drawnAs.current !== layout;
    drawnAs.current = layout;
    if (!turned || layout !== "phone" || focusInside.current) return;
    document.querySelector<HTMLElement>("[data-testid=scanner] [data-scan-close]")?.focus();
  }, [layout]);
  const opened = useRef(false);
  useEffect(() => {
    const active = document.activeElement;
    if (opened.current && (!focusInside.current || (active && active !== document.body))) return;
    opened.current = true;
    document.querySelector<HTMLElement>("[data-testid=scanner] [data-scan-close]")?.focus();
  });
  if (photos.rows.length > 0) {
    return (
      <>
        {input}
        <PhotoList
          layout={layout}
          rows={photos.rows}
          mode={mode}
          notice={notice}
          busy={photos.busy}
          onMode={setMode}
          onClose={onClose}
          onAddSure={() => void photos.addSure()}
          onPick={(id, oracleId) => void photos.pick(id, oracleId)}
          onChooseMore={choosePhotos}
        />
      </>
    );
  }
  return (
    <>
      {input}
      <ScannerView
        layout={layout}
        screen={screen}
        outline={outline}
        mode={mode}
        torch={torch}
        count={count}
        flipTo={flipTo}
        notice={notice}
        feed={<video ref={attachVideo} muted playsInline className="h-full w-full object-cover" />}
        onMode={setMode}
        onTorch={toggleTorch}
        onClose={onClose}
        onReview={() => {
          reviewAt.current = performance.now();
          onClose();
        }}
        onHold={hold}
        onAdd={add}
        onCancelHold={cancelHold}
        onPick={pick}
        onNoneOfThese={() => {
          dismiss();
          onNoneOfThese();
        }}
        onChoosePrinting={choosePrinting}
        onNotThis={notThis}
        onChoosePhotos={choosePhotos}
      />
    </>
  );
}

/**
 * Posts the session's timing row (`POST /api/card-scan/timing`, which logs it only while `SCAN_LAB_ENABLED` is on for the
 * reader), two frames after the scanner closed: by then the sheet's list is drawn, which is where Review's wait
 * ends. A scanner that read no frame posts nothing, and a post that fails is dropped.
 */
async function sendTiming(timer: ScanTimer, reviewAt: { current: number | null }, post: typeof fetch | null) {
  await nextFrame();
  await nextFrame();
  if (reviewAt.current !== null) timer.reviewed(performance.now() - reviewAt.current);
  const row = timer.row();
  if (!row || !post) return;
  try {
    await post("/api/card-scan/timing", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(row), keepalive: true,
    });
  } catch {
    // a timing row is never worth a retry
  }
}
