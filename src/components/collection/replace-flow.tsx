"use client";
// ReplaceFlow — steps 1 → 2 → 3 for the destructive replace path.
// Step 1: UploadEntry (Task 7). On success advances to step 2.
// Step 2: ReviewScreen (Task 8). Continue → step 3, or, on a FIRST import (nothing to
//         replace), straight to confirmUpload() with no step 3.
// Step 3: ConfirmModal (Task 9). Confirm → confirmUpload() → the receipt.

import { useLayoutEffect, useState } from "react";
import { confirmUpload, type UploadPreview } from "../../app/collection/actions";
import { UploadEntry } from "./upload-entry";
import { ReviewScreen } from "./review-screen";
import { ConfirmModal } from "./confirm-modal";
import { replaceCopy } from "../../lib/copy/replace";
import { usePendingPush } from "../shell/pending-push";

export function ReplaceFlow({
  currentCardCount,
  embedded,
  entry,
  onReviewing,
}: {
  currentCardCount: number;
  embedded?: boolean;
  /**
   * Told when a review opens and closes, with the file and its row count. First run's step-1
   * card reads it to hide its fan and name what is under review (D11, 5a); nothing else needs it.
   */
  onReviewing?: (reviewing: { file: string; rows: number } | null) => void;
  // Pass-through to step 1. Held here rather than letting a caller render
  // UploadEntry itself, because steps 2 and 3 are this component's to own and a
  // caller reaching past it for step 1 would have to re-implement them.
  entry?: React.ComponentProps<typeof UploadEntry>["entry"];
}) {
  const nav = usePendingPush();
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // The collection's size as the flow last learned it. The prop is the page's read, and a
  // preview or a server refusal (another tab imported, #1097) can report a newer one; the upload
  // step a Cancel returns to must draw that one, or a collection that exists reads as empty.
  const [knownCount, setKnownCount] = useState(currentCardCount);

  // Keyed on the upload, not on the preview object: a server refusal re-sets the preview with a
  // corrected count (#1097), and that is the same review still open.
  const reviewId = preview?.uploadId ?? null;
  const reviewFile = preview?.filename;
  const reviewRows = preview?.rowCount;
  // A LAYOUT effect: the parent's card changes shape with the review (the fan steps aside, the
  // padding goes), so its state has to land before the frame paints, or the review opens once
  // in the rest-state card and closes once in the reviewing one.
  useLayoutEffect(() => {
    onReviewing?.(reviewId && reviewFile !== undefined && reviewRows !== undefined ? { file: reviewFile, rows: reviewRows } : null);
  }, [onReviewing, reviewId, reviewFile, reviewRows]);

  // A FIRST import goes straight through: with no collection there is nothing to replace,
  // so the Replace modal would only ask the player to confirm losing nothing (prod walk
  // 2026-09-28, item 5a). "First" is the count the server read when it built the preview,
  // not a caller's prop (first run passes a literal 0). The server re-checks at the confirm,
  // and when a collection turns out to exist after all it writes nothing and this opens the
  // modal instead.
  const firstImport = preview?.currentCollectionCount === 0;

  async function onConfirm() {
    if (!preview || pending) return;
    setPending(true);
    setConfirmError(null);
    try {
      // `firstImport` is read off the preview, which a server refusal corrects before the
      // modal opens, so a confirm from that modal is no longer "first". A retry after a
      // FAILED first import keeps the claim, and with it the server's guard (Copilot, #1097).
      const outcome = await confirmUpload(preview.uploadId, { firstImport });
      if (outcome && "needsConfirm" in outcome) {
        // The preview was drawn at 0 cards and the modal reads its variant off that figure,
        // so it would ask for IMPORT over a write that replaces a collection. Correct it first.
        setPreview({ ...preview, currentCollectionCount: outcome.currentCollectionCount });
        setKnownCount(outcome.currentCollectionCount);
        setConfirming(true);
        return;
      }
      // A ledger refusal (a deck it would leave short, a card the catalog dropped) wrote nothing.
      // Its own screens arrive with the collection-edit handoff; until then it reads as the
      // failed confirm it is, in the slot a failed confirm has always used.
      if (outcome) {
        setConfirmError("Confirm failed");
        setConfirming(true);
        return;
      }
      // The receipt, not the collection. A collection replace is the most destructive action
      // in the app and was the only one with no receipt; the summary route is keyed on the
      // upload id, so it survives a reload and stays linkable.
      nav.go(`/collection/replace/summary/${preview.uploadId}`);
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Confirm failed");
      // A skipped confirm has no surface of its own to say it failed, so it opens the modal,
      // whose error slot is where a failed confirm has always been reported.
      setConfirming(true);
    } finally {
      setPending(false);
    }
  }

  if (!preview) {
    return (
      <>
        {/* The entry's own column, and the heading centred with it — see the note on the page.
            Hidden on the phone, where the page's back-chevron bar carries the title instead.
            AND NOT WHEN EMBEDDED: `FirstRunChecklist` mounts this flow inside its own step-1
            card, which already has a Welcome heading and is not the collection route — a second
            `Replace collection` title and a `‹ Collection` link back would both be wrong there. */}
        {embedded ? null : (
          <>
            {/* The phone's page header, the upload step's alone: the review draws its own. */}
            <div className="md:hidden flex items-center gap-[12px] p-[20px_18px_14px]" style={{ borderBottom: "1px solid var(--border)" }}>
              <a href="/collection" aria-label="Back to Collection" className="text-[20px] text-[color:var(--accent)]">‹</a>
              <h1 className="font-display font-semibold text-[19px]" style={{ color: "var(--fg)" }}>{replaceCopy.pageTitle(knownCount)}</h1>
            </div>
            <div className="hidden md:block md:mx-auto md:w-full md:max-w-[760px] md:p-[28px_48px_0]">
              <a href="/collection" className="font-mono text-[11px] tracking-[0.06em] text-[color:var(--fg-faint)]">‹ Collection</a>
              <h1 className="font-display font-bold text-[30px] mt-[8px]" style={{ color: "var(--fg)" }}>{replaceCopy.pageTitle(knownCount)}</h1>
            </div>
          </>
        )}
        {/* The phone's gutter (H6): the entry's own column pads itself from `md` only, so on
            the route it ran edge to edge under a header inset 18px. The same 18px here, and none
            when embedded, where the first-run card around it already pads. */}
        <div className={embedded ? undefined : "px-[18px] pt-[16px] pb-[24px] md:p-0"}>
          <UploadEntry
            currentCardCount={knownCount}
            entry={entry}
            onPreview={(p) => {
              setConfirmError(null);
              setConfirming(false);
              setPreview(p);
              setKnownCount(p.currentCollectionCount);
            }}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <ReviewScreen
        preview={preview}
        onCancel={() => {
          // A press that lands while the write is in flight is ignored, as the disabled
          // controls say: the confirm would still land and still open its receipt.
          if (pending) return;
          setConfirming(false);
          setPreview(null);
        }}
        onContinue={() => (firstImport ? void onConfirm() : setConfirming(true))}
        pending={pending && !confirming}
        embedded={embedded}
      />
      {confirming && (
        <ConfirmModal
          preview={preview}
          pending={pending}
          error={confirmError}
          onClose={() => {
            setConfirming(false);
            setConfirmError(null);
          }}
          onConfirm={onConfirm}
        />
      )}
    </>
  );
}
