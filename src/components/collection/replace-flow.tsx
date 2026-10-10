"use client";
// ReplaceFlow — steps 1 → 2 → 3 for the destructive replace path.
// Step 1: UploadEntry (Task 7). On success advances to step 2.
// Step 2: ReviewScreen (Task 8). Continue → step 3, or, on a FIRST import (nothing to
//         replace), straight to confirmUpload() with no step 3.
// Step 3: ConfirmModal (Task 9). Confirm → confirmUpload() → the receipt.

import { useEffect, useLayoutEffect, useState } from "react";
import { confirmUpload, previewUploadChange, type UploadChangePreview, type UploadMode, type UploadPreview } from "../../app/collection/actions";
import { UploadEntry } from "./upload-entry";
import { ReviewScreen } from "./review-screen";
import type { ReviewChange } from "./replace-review-detail";
import { UploadChoice } from "./upload-choice";
import { GhostButton } from "../ui/button";
import { ConfirmModal } from "./confirm-modal";
import { replaceCopy } from "../../lib/copy/replace";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import type { ShortDeck } from "../../lib/collection/write";
import { usePendingPush } from "../shell/pending-push";

export function ReplaceFlow({
  currentCardCount,
  embedded,
  entry,
  onReviewing,
  onAddByHand,
  deckCheck = false,
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
  /** First run's `Add cards by hand`, drawn beside Paste. Absent: no button. */
  onAddByHand?: React.ComponentProps<typeof UploadEntry>["onAddByHand"];
  /** Collection editing is on: a confirm checks the decks first, and can answer with §E. */
  deckCheck?: boolean;
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
  // §E: the decks this replace would leave short, as the server last said. `fresh` marks the
  // ones the previous answer did not name; `changed` is set when this answer replaced one.
  const [warning, setWarning] = useState<{ decks: ShortDeck[]; fresh: Set<string>; changed: boolean } | null>(null);

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

  // The ledger path's read of this upload in BOTH modes, taken together because the choice quotes
  // each card's after-figure before anything is picked (A1). Absent (a first import, or the switch
  // off), there is no choice: the review is the shipped Replace one and the confirm is the dialog.
  // Keyed on the upload and the attempt, so a new upload or a retry reads as "not read yet" by
  // derivation, with nothing to reset in an effect.
  const [read, setRead] = useState<{
    key: string;
    datas: Record<UploadMode, UploadChangePreview> | null;
    error: string | null;
    /** The server answered "nothing to compare" (confirmed elsewhere): the shipped review and dialog stand. */
    noRead: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Which card the reader has picked (never preselected), and whether the review is open.
  const [picked, setPicked] = useState<UploadMode | null>(null);
  const [reviewing, setReviewing] = useState(false);
  // The review's state for the picked mode: the decks as last said, and a failed write's notice.
  const [change, setChange] = useState<ReviewChange | null>(null);
  const previewedId = preview?.uploadId ?? null;
  const readKey = `${previewedId}:${attempt}`;
  const current = read?.key === readKey ? read : null;
  const datas = current?.datas ?? null;
  const prepareError = current?.error ?? null;
  const choosing = deckCheck && !firstImport && previewedId !== null && !current?.noRead;
  const resetChoice = () => {
    setPicked(null);
    setReviewing(false);
    setChange(null);
  };
  useEffect(() => {
    if (!deckCheck || !previewedId || firstImport) return;
    let live = true;
    const key = readKey;
    const settle = (r: { datas: Record<UploadMode, UploadChangePreview> | null; error: string | null; noRead: boolean }) => {
      if (live) setRead({ key, ...r });
    };
    Promise.all([previewUploadChange(previewedId, "replace"), previewUploadChange(previewedId, "add")])
      .then(([replace, add]) => {
        // Either one answering "confirmed elsewhere" ends the comparison: the other read cannot be acted on.
        if (!replace || !add) return settle({ datas: null, error: null, noRead: true });
        const missing = [replace, add].find((r) => r && "missingCard" in r);
        if (missing && "missingCard" in missing)
          return settle({ datas: null, error: collectionEditCopy.shortWarning.catalogFailure(missing.missingCard), noRead: false });
        if (replace && "detail" in replace && add && "detail" in add) return settle({ datas: { replace, add }, error: null, noRead: false });
        return settle({ datas: null, error: collectionEditCopy.upload.prepareFailed, noRead: false });
      })
      .catch(() => settle({ datas: null, error: collectionEditCopy.upload.prepareFailed, noRead: false }));
    return () => {
      live = false;
    };
  }, [deckCheck, previewedId, firstImport, readKey]);

  function openReview(mode: UploadMode) {
    if (!datas || pending) return;
    const data = datas[mode];
    setPicked(mode);
    setChange({ data, decks: data.decks, fresh: new Set(), changed: false, failure: null });
    setReviewing(true);
  }

  async function onConfirm(confirmShort?: ShortDeck[]) {
    if (!preview || pending) return;
    setPending(true);
    setConfirmError(null);
    // The review answers a press on its own bar; a confirm made inside the dialog (a first import
    // that found a collection after all, or the fallback) is answered by the dialog.
    const review = confirming ? null : change;
    try {
      // `firstImport` is read off the preview, which a server refusal corrects before the
      // modal opens, so a confirm from that modal is no longer "first". A retry after a
      // FAILED first import keeps the claim, and with it the server's guard (Copilot, #1097).
      const outcome = await confirmUpload(preview.uploadId, { firstImport, confirmShort, mode: choosing ? (picked ?? "replace") : undefined });
      if (outcome && "needsConfirm" in outcome) {
        // The preview was drawn at 0 cards and the modal reads its variant off that figure,
        // so it would ask for IMPORT over a write that replaces a collection. Correct it first.
        setPreview({ ...preview, currentCollectionCount: outcome.currentCollectionCount });
        setKnownCount(outcome.currentCollectionCount);
        setConfirming(true);
        return;
      }
      // A ledger refusal wrote nothing: a deck it would leave short opens §E, and a card the
      // catalog dropped is named in the confirm's own error slot.
      if (review && outcome && "wouldShort" in outcome) {
        // The decks moved since the review drew them: redraw the same section with a notice and
        // `new` on the ones that were not there, and wait for another press (E6).
        const was = new Set(review.decks.map((d) => d.deckId));
        setChange({
          ...review,
          decks: outcome.wouldShort,
          fresh: new Set(outcome.wouldShort.map((d) => d.deckId).filter((id) => !was.has(id))),
          changed: true,
          failure: null,
        });
        return;
      }
      if (review && outcome && "missingCard" in outcome) {
        setChange({ ...review, failure: { body: collectionEditCopy.shortWarning.catalogFailure(outcome.missingCard) } });
        return;
      }
      if (outcome && "wouldShort" in outcome) {
        const before = new Set(warning?.decks.map((d) => d.deckId));
        const fresh = warning ? new Set(outcome.wouldShort.map((d) => d.deckId).filter((id) => !before.has(id))) : new Set<string>();
        setWarning({ decks: outcome.wouldShort, fresh, changed: warning !== null });
        setConfirming(true);
        return;
      }
      if (outcome && "missingCard" in outcome) {
        setWarning(null);
        setConfirmError(collectionEditCopy.shortWarning.catalogFailure(outcome.missingCard));
        setConfirming(true);
        return;
      }
      // The receipt, not the collection. A collection replace is the most destructive action
      // in the app and was the only one with no receipt; the summary route is keyed on the
      // upload id, so it survives a reload and stays linkable.
      nav.go(`/collection/replace/summary/${preview.uploadId}`);
    } catch (e) {
      // A throw is not proof that nothing was written: the write commits before its cache
      // invalidation and its receipt, and either can fail after it. The preview of an upload that
      // is already confirmed answers null, so ask it before claiming the collection is unchanged.
      // A read that fails too is INDETERMINATE: the write may have landed and the answer been lost,
      // so it must not claim the collection is unchanged either.
      const landed = choosing ? await previewUploadChange(preview.uploadId, picked ?? "replace").then((r) => (r === null ? "yes" : "no"), () => "unknown" as const) : "no";
      if (landed === "yes") {
        nav.go(`/collection/replace/summary/${preview.uploadId}`);
        return;
      }
      if (landed === "unknown") {
        if (review) setChange({ ...review, failure: { body: collectionEditCopy.upload.unconfirmed } });
        else setConfirmError(collectionEditCopy.upload.unconfirmed);
        return;
      }
      if (review) {
        // Nothing was written and the review stays (A5).
        setChange({ ...review, failure: { body: collectionEditCopy.upload.failedBody } });
        return;
      }
      setConfirmError(e instanceof Error ? e.message : "Confirm failed");
      // A skipped confirm has no surface of its own to say it failed, so it opens the modal,
      // whose error slot is where a failed confirm has always been reported. A press from the
      // §E warning fails in the warning's own slot instead, with nothing opened over it.
      if (!warning) setConfirming(true);
    } finally {
      setPending(false);
    }
  }

  // With editing on the page takes a file to replace or add, so "Replace collection" would misname it.
  const pageTitle = deckCheck && knownCount > 0 ? collectionEditCopy.head.upload : replaceCopy.pageTitle(knownCount);

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
              <h1 className="font-display font-semibold text-[19px]" style={{ color: "var(--fg)" }}>{pageTitle}</h1>
            </div>
            <div className="hidden md:block md:mx-auto md:w-full md:max-w-[760px] md:p-[28px_48px_0]">
              <a href="/collection" className="font-mono text-[11px] tracking-[0.06em] text-[color:var(--fg-faint)]">‹ Collection</a>
              <h1 className="font-display font-bold text-[30px] mt-[8px]" style={{ color: "var(--fg)" }}>{pageTitle}</h1>
            </div>
          </>
        )}
        {/* The phone's gutter (H6): the entry's own column pads itself from `md` only, so on
            the route it ran edge to edge under a header inset 18px. The same 18px here, and none
            when embedded, where the first-run card around it already pads. */}
        <div className={embedded ? undefined : "px-[18px] pt-[16px] pb-[24px] md:p-0"}>
          <UploadEntry
            currentCardCount={knownCount}
            choice={deckCheck}
            entry={entry}
            onAddByHand={onAddByHand}
            onPreview={(p) => {
              setConfirmError(null);
              setConfirming(false);
              resetChoice();
              setPreview(p);
              setKnownCount(p.currentCollectionCount);
            }}
          />
        </div>
      </>
    );
  }

  // A confirm made inside the dialog (a first import that found a collection after all) is the
  // dialog's to answer: the choice never replaces it.
  if (choosing && !reviewing && !confirming) {
    const cancel = () => {
      if (pending) return;
      setConfirming(false);
      setPreview(null);
    };
    if (!datas) {
      return (
        <section className="flex flex-col gap-[14px] p-[20px_18px] md:max-w-[1280px] md:p-[36px_56px]">
          <p className="m-0 font-mono text-[11px] tracking-[0.06em] text-[color:var(--fg-faint)]">
            {collectionEditCopy.upload.step(2, 4)} · {preview.filename}
          </p>
          {prepareError ? (
            <div role="alert" className="rounded-[10px] border border-[color:var(--border-strong)] border-l-[3px] border-l-[color:var(--danger)] bg-[color:var(--surface)] p-[12px_14px]">
              <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{prepareError}</p>
              <button
                type="button"
                onClick={() => setAttempt((a) => a + 1)}
                className="mt-[6px] min-h-[44px] text-[13.5px] text-[color:var(--accent)] underline underline-offset-2"
              >
                {collectionEditCopy.upload.retry}
              </button>
            </div>
          ) : (
            <p role="status" className="m-0 text-[13px] text-[color:var(--fg-muted)]">
              {collectionEditCopy.upload.preparing}
            </p>
          )}
          <div>
            <GhostButton type="button" onClick={cancel} className="h-[44px] px-[20px] text-[14px]">
              {collectionEditCopy.upload.cancel}
            </GhostButton>
          </div>
        </section>
      );
    }
    return (
      <UploadChoice
        filename={preview.filename}
        rows={preview.rowCount}
        replaceBefore={datas.replace.detail.copiesBefore}
        addBefore={datas.add.detail.copiesBefore}
        replaceAfter={datas.replace.detail.copiesAfter}
        addAfter={datas.add.detail.copiesAfter}
        facts={datas.replace}
        overlap={datas.add.detail.overlap}
        picked={picked}
        onPick={setPicked}
        onContinue={() => picked && openReview(picked)}
        onCancel={cancel}
      />
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
          // With the choice, a review's Cancel steps back to it; without, to the upload step.
          if (choosing) {
            setChange(null);
            setReviewing(false);
          } else setPreview(null);
        }}
        onContinue={() => {
          if (firstImport) void onConfirm();
          else if (change) void onConfirm(change.decks);
          else setConfirming(true);
        }}
        pending={pending && !confirming}
        embedded={embedded}
        change={change}
        mode={choosing ? (picked ?? "replace") : "replace"}
        step={choosing ? collectionEditCopy.upload.step(3, 4) : undefined}
        // Not while a confirm is in flight: the pick and the review would move to Replace under a write that is still an Add.
        onSwitchToReplace={choosing && !pending ? () => openReview("replace") : undefined}
        onRetry={change ? () => void onConfirm(change.decks) : undefined}
      />
      {confirming && (
        <ConfirmModal
          preview={preview}
          pending={pending}
          error={confirmError}
          onClose={() => {
            // Also Cancel on the warning (E7): it writes nothing, and the review is still here.
            setConfirming(false);
            setWarning(null);
            setConfirmError(null);
          }}
          onConfirm={() => onConfirm()}
          checking={deckCheck}
          warning={warning ? { ...warning, onConfirm: () => onConfirm(warning.decks) } : undefined}
        />
      )}
    </>
  );
}
