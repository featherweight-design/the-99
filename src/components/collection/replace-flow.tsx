"use client";
// ReplaceFlow — steps 1 → 2 → 3 for the destructive replace path.
// Step 1: UploadEntry (Task 7). On success advances to step 2.
// Step 2: ReviewScreen (Task 8). Continue → step 3, or, on a FIRST import (nothing to
//         replace), straight to confirmUpload() with no step 3.
// Step 3: ConfirmModal (Task 9). Confirm → confirmUpload() → the receipt.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  confirmUpload,
  previewUploadChange,
  type UploadChangePreview,
  type UploadMode,
  type UploadPreview,
  type UploadSyncPreview,
} from "../../app/collection/actions";
import { UploadEntry } from "./upload-entry";
import { importReviewCopy } from "../../lib/copy/import-review";
import { ReviewScreen } from "./review-screen";
import type { ReviewChange } from "./replace-review-detail";
import { UploadChoice, type SyncChoice } from "./upload-choice";
import { effectivePick, followUpShown, syncNext, syncNote } from "./sync-choice-view";
import type { SyncConflictsHandle, SyncReviewControls } from "./sync-review";
import type { SyncAnswers, SyncPick } from "../../lib/collection/sync";
import { GhostButton } from "../ui/button";
import { ConfirmModal } from "./confirm-modal";
import { replaceCopy } from "../../lib/copy/replace";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import type { ShortDeck } from "../../lib/collection/write";
import { usePendingPush } from "../shell/pending-push";

/** A sync dry run: the whole preview, with its Sync extras. */
type SyncRead = UploadChangePreview & { sync: UploadSyncPreview };

/** The choice's dry runs. `sync` is the plain Sync's, or null when Sync is off or its read failed (the card is then not drawn). */
type ChoiceReads = Record<"replace" | "add", UploadChangePreview> & { sync: SyncRead | null };

/** A sync dry run under one follow-up pick: the read, or `failed`. */
type PickRead = SyncRead | "failed";

/** How long the Sync review waits after an answer before re-reading, so a fast run of presses reads once. */
const SYNC_REREAD_MS = 150;

const isSyncRead = (r: unknown): r is SyncRead =>
  typeof r === "object" && r !== null && "detail" in r && "sync" in r && (r as SyncRead).sync !== undefined;

export function ReplaceFlow({
  currentCardCount,
  embedded,
  entry,
  onReviewing,
  onAddByHand,
  deckCheck = false,
  history = false,
  sync = false,
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
  /** Collection editing is on without the deck check (first run): a replace it finds still lands in History. */
  history?: boolean;
  /** Collection Sync is on for the reader (`collectionSyncEnabled`, resolved by the page): the choice draws a third card. */
  sync?: boolean;
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
  // `sync` marks the Sync review's own dialog (Confirm X1): it opens over the review before the shortage is
  // acknowledged, and the review, not the dialog, answers every refusal but a changed set of decks.
  const [warning, setWarning] = useState<{ decks: ShortDeck[]; fresh: Set<string>; changed: boolean; sync?: boolean } | null>(null);

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
    datas: ChoiceReads | null;
    error: string | null;
    /** The server answered "nothing to compare" (confirmed elsewhere): the shipped review and dialog stand. */
    noRead: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Which card the reader has picked (never preselected), and whether the review is open.
  const [picked, setPicked] = useState<UploadMode | null>(null);
  // Sync's follow-up pick under an older-looking file (Only what it adds is picked when it first appears),
  // and the conflict answers. Both are the reader's, so they survive Back, a failure
  // and a retry (K4), and reset only with a new upload.
  const [followPick, setFollowPick] = useState<SyncPick>("additions");
  const [answers, setAnswers] = useState<SyncAnswers>({});
  // Each follow-up pick's own dry run (G8), cached per pick for this upload and attempt as the mode reads are.
  // Keyed `<readKey>:<pick>`, so a read lands in its own entry whatever is selected by then, and a new upload or
  // attempt reads as uncached by derivation.
  const [pickReads, setPickReads] = useState<Record<string, PickRead>>({});
  // The reads issued and not yet landed, by the same key: never issued twice.
  const inFlight = useRef(new Set<string>());
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
    setFollowPick("additions");
    setAnswers({});
  };
  const syncBase = datas?.sync ?? null;
  const pickNow: SyncPick = syncBase ? effectivePick(syncBase, followPick) : "everything";
  const cachedReads: Partial<Record<SyncPick, PickRead>> = {
    additions: pickReads[`${readKey}:additions`],
    tokens: pickReads[`${readKey}:tokens`],
  };
  // The read Sync's figure, note and digest come from: the plain Sync's, or the pick's own.
  const pickRead: PickRead | undefined = pickNow === "everything" ? (syncBase ?? undefined) : cachedReads[pickNow];
  const planDigest = pickRead && pickRead !== "failed" ? pickRead.sync.planDigest : "";
  const syncUsable = syncBase !== null && syncBase.sync.unavailable === null;
  useEffect(() => {
    if (!deckCheck || !previewedId || firstImport) return;
    let live = true;
    const key = readKey;
    const settle = (r: { datas: ChoiceReads | null; error: string | null; noRead: boolean }) => {
      if (live) setRead({ key, ...r });
    };
    Promise.all([
      previewUploadChange(previewedId, "replace"),
      previewUploadChange(previewedId, "add"),
      // The plain Sync's dry run. A failure here leaves Replace and Add standing: the Sync card is just not drawn.
      sync ? previewUploadChange(previewedId, "sync").catch(() => undefined) : Promise.resolve(undefined),
    ])
      .then(([replace, add, syncRead]) => {
        // Any one answering "confirmed elsewhere" ends the comparison: the others cannot be acted on.
        if (!replace || !add || syncRead === null) return settle({ datas: null, error: null, noRead: true });
        const missing = [replace, add, syncRead].find((r) => r && "missingCard" in r);
        if (missing && "missingCard" in missing)
          return settle({ datas: null, error: collectionEditCopy.shortWarning.catalogFailure(missing.missingCard), noRead: false });
        const syncData = isSyncRead(syncRead) ? syncRead : null;
        if (replace && "detail" in replace && add && "detail" in add)
          return settle({ datas: { replace, add, sync: syncData }, error: null, noRead: false });
        return settle({ datas: null, error: collectionEditCopy.upload.prepareFailed, noRead: false });
      })
      .catch(() => settle({ datas: null, error: collectionEditCopy.upload.prepareFailed, noRead: false }));
    return () => {
      live = false;
    };
  }, [deckCheck, sync, previewedId, firstImport, readKey]);

  // A follow-up pick's own dry run, read once per pick and cached. When the follow-up can appear, both
  // partial picks are read straight away (the pick in force first), because each option's body quotes its
  // own read's figures (G8); Everything's is the plain Sync's. Otherwise only the pick in force, if partial.
  const wanted: SyncPick[] = syncBase && followUpShown(syncBase)
    ? [pickNow, ...(["additions", "tokens"] as const).filter((p) => p !== pickNow)].filter((p) => p !== "everything")
    : pickNow !== "everything" ? [pickNow] : [];
  // The queue is independent of the selection: every wanted pick not cached is issued once, and its result is
  // filed under its own key when it lands, whatever is selected by then. No cleanup discards a pending read.
  const toRead = choosing && syncUsable ? wanted.filter((p) => cachedReads[p] === undefined).join(",") : "";
  useEffect(() => {
    if (!toRead || !previewedId) return;
    for (const pick of toRead.split(",") as SyncPick[]) {
      const key = `${readKey}:${pick}`;
      if (inFlight.current.has(key)) continue;
      inFlight.current.add(key);
      const file = (r: PickRead) => {
        inFlight.current.delete(key);
        setPickReads((was) => ({ ...was, [key]: r }));
      };
      previewUploadChange(previewedId, "sync", { pick })
        .then((r) => file(isSyncRead(r) ? r : "failed"))
        .catch(() => file("failed"));
    }
  }, [toRead, previewedId, readKey]);
  // Retry clears only the failed pick's entry; the effect then reads it again. The selection is untouched.
  const retryPick = (pick: SyncPick) =>
    setPickReads((was) => {
      const key = `${readKey}:${pick}`;
      if (was[key] !== "failed") return was;
      const next = { ...was };
      delete next[key];
      return next;
    });

  // THE SYNC REVIEW. Every figure is the server's: an answer re-reads the dry run with the answers on screen,
  // and the review draws the newest read. `syncDrawn` names the pick, answers and attempt the drawn read was
  // made for; while it differs from what the reader has set, a read is in flight and the confirm is held, so the
  // `planDigest` it sends is always the one for these answers. Each request takes a number and only the newest
  // one's answer is drawn: an older one landing late is dropped.
  const [syncNonce, setSyncNonce] = useState(0);
  const [syncDrawn, setSyncDrawn] = useState<string | null>(null);
  const syncSeq = useRef(0);
  // Set by a `stale` refusal: the read it asks for lands with the notice that the figures moved.
  const syncMoved = useRef(false);
  // Set by an `undecided` refusal: the conflict still open may be one the drawn read never showed, so focus
  // waits for the re-read that refusal asks for to land and draw its rows.
  const focusAfterRead = useRef(false);
  const conflictsRef = useRef<SyncConflictsHandle>(null);
  const syncKey = (answersNow: SyncAnswers, nonce: number) => `${pickNow}|${JSON.stringify(answersNow)}|${nonce}`;
  const syncWant = reviewing && picked === "sync" && change !== null ? syncKey(answers, syncNonce) : null;
  const syncReading = syncWant !== null && syncWant !== syncDrawn;
  const summaryPath = previewedId ? `/collection/replace/summary/${previewedId}` : null;
  useEffect(() => {
    if (!syncReading || !syncWant || !previewedId) return;
    const seq = ++syncSeq.current;
    // A read already sent is dropped once this effect is cleaned up: leaving the review (Cancel, then Replace or
    // Add) or asking again must not let its late answer overwrite whichever review is drawn by then.
    let live = true;
    const want = syncWant;
    const opts = { pick: pickNow, answers };
    const timer = setTimeout(() => {
      previewUploadChange(previewedId, "sync", opts).then(
        (r) => {
          if (!live || seq !== syncSeq.current) return;
          // Confirmed elsewhere since: its receipt is the answer.
          if (r === null) {
            if (summaryPath) nav.go(summaryPath);
            return;
          }
          setSyncDrawn(want);
          if ("missingCard" in r) {
            setChange((was) => was && { ...was, failure: { body: collectionEditCopy.shortWarning.catalogFailure(r.missingCard) } });
            return;
          }
          if (!isSyncRead(r)) {
            setChange((was) => was && { ...was, failure: { body: collectionEditCopy.upload.prepareFailed } });
            return;
          }
          // The base went while the review was open (another tab reverted the anchor): no comparison was made,
          // so nothing here may read as one. Back to the choice, as the confirm's own refusal goes.
          if (r.sync.unavailable !== null) {
            syncUnavailable(r.sync.unavailable);
            return;
          }
          const moved = syncMoved.current;
          syncMoved.current = false;
          setChange((was) => was && { ...was, data: r, decks: r.decks, fresh: new Set(), changed: moved, failure: null });
        },
        () => {
          if (!live || seq !== syncSeq.current) return;
          // The figures on screen are the last read's; a confirm sends that read's digest and, if the plan has
          // moved, is refused as `stale` rather than writing a merge the player did not see.
          setSyncDrawn(want);
          setChange((was) => was && { ...was, failure: { body: collectionEditCopy.upload.prepareFailed } });
        },
      );
    }, SYNC_REREAD_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // `answers` and `pickNow` are in `syncWant`, which is what decides a read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncReading, syncWant, previewedId]);

  // The focus an `undecided` refusal asked for, once its re-read has drawn and the radios are live again.
  useEffect(() => {
    if (!focusAfterRead.current) return;
    if (syncWant === null) {
      focusAfterRead.current = false;
      return;
    }
    if (syncReading || pending) return;
    focusAfterRead.current = false;
    conflictsRef.current?.focusFirstUndecided();
  }, [syncWant, syncReading, pending, change]);

  /** No base to merge against any more: back to the choice, where the Sync card now says why. */
  function syncUnavailable(reason: NonNullable<UploadSyncPreview["unavailable"]>) {
    setRead((was) =>
      was?.datas?.sync ? { ...was, datas: { ...was.datas, sync: { ...was.datas.sync, sync: { ...was.datas.sync.sync, unavailable: reason } } } } : was,
    );
    setPicked(null);
    setReviewing(false);
    setChange(null);
  }

  function openReview(mode: UploadMode) {
    if (!datas || pending) return;
    let data: UploadChangePreview;
    if (mode === "sync") {
      // The pick's own read, drawn with no answers; answers kept from an earlier visit re-read at once.
      if (!pickRead || pickRead === "failed") return;
      data = pickRead;
      setSyncDrawn(syncKey({}, syncNonce));
    } else data = datas[mode];
    setPicked(mode);
    setChange({ data, decks: data.decks, fresh: new Set(), changed: false, failure: null });
    setReviewing(true);
  }

  async function onConfirm(confirmShort?: ShortDeck[]) {
    if (!preview || pending) return;
    // The Sync review's short-deck dialog stays open only to redraw a changed set of decks (E6); every other
    // answer belongs to the review under it.
    const syncDialog = confirming && warning?.sync === true;
    let keepDialog = false;
    setPending(true);
    setConfirmError(null);
    // The review answers a press on its own bar; a confirm made inside the dialog (a first import
    // that found a collection after all, or the fallback) is answered by the dialog.
    const review = confirming && !syncDialog ? null : change;
    try {
      // `firstImport` is read off the preview, which a server refusal corrects before the
      // modal opens, so a confirm from that modal is no longer "first". A retry after a
      // FAILED first import keeps the claim, and with it the server's guard (Copilot, #1097).
      const outcome = await confirmUpload(preview.uploadId, {
        firstImport,
        confirmShort,
        mode: choosing ? (picked ?? "replace") : undefined,
        // Sync carries the reader's pick, answers and the digest of the read drawn for those answers (K4).
        ...(choosing && picked === "sync" ? { pick: pickNow, answers, planDigest: review?.data.sync?.planDigest ?? planDigest } : {}),
      });
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
        const fresh = new Set(outcome.wouldShort.map((d) => d.deckId).filter((id) => !was.has(id)));
        setChange({ ...review, decks: outcome.wouldShort, fresh, changed: true, failure: null });
        // Sync asks in its dialog: the same dialog, redrawn, never a second one (E6).
        if (syncDialog) {
          keepDialog = true;
          setWarning({ decks: outcome.wouldShort, fresh, changed: true, sync: true });
        }
        return;
      }
      // Sync's refusals. Nothing was written in any of them, and the answers stand.
      if (review && outcome && "undecided" in outcome) {
        // Another read, and the reader is taken to what is still open, once the controls are live again.
        setSyncNonce((n) => n + 1);
        focusAfterRead.current = true;
        return;
      }
      if (review && outcome && "stale" in outcome) {
        // The plan moved under the lock: read it again with the same answers and say so.
        syncMoved.current = true;
        setSyncNonce((n) => n + 1);
        return;
      }
      if (review && outcome && "nothingToSync" in outcome) {
        // The read that follows draws `Nothing to sync.` and offers only the way back (call 10).
        setSyncNonce((n) => n + 1);
        return;
      }
      if (outcome && "unavailable" in outcome) {
        syncUnavailable(outcome.unavailable);
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
      const landed = choosing
        ? await previewUploadChange(preview.uploadId, picked ?? "replace", picked === "sync" ? { pick: pickNow, answers } : undefined).then(
            (r) => (r === null ? "yes" : "no"),
            () => "unknown" as const,
          )
        : "no";
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
      setConfirmError(e instanceof Error ? e.message : importReviewCopy.errors.confirmFailed);
      // A skipped confirm has no surface of its own to say it failed, so it opens the modal,
      // whose error slot is where a failed confirm has always been reported. A press from the
      // §E warning fails in the warning's own slot instead, with nothing opened over it.
      if (!warning) setConfirming(true);
    } finally {
      setPending(false);
      if (syncDialog && !keepDialog) {
        setConfirming(false);
        setWarning(null);
      }
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
              <a href="/collection" aria-label={replaceCopy.backAria} className="text-[20px] text-[color:var(--accent)]">‹</a>
              <h1 className="font-display font-semibold text-[19px]" style={{ color: "var(--fg)" }}>{pageTitle}</h1>
            </div>
            <div className="hidden md:block md:mx-auto md:w-full md:max-w-[760px] md:p-[28px_48px_0]">
              <a href="/collection" className="font-mono text-[11px] tracking-[0.06em] text-[color:var(--fg-faint)]">{replaceCopy.backCrumb}</a>
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
    // The Sync card, from the plain Sync's dry run and the pick's own.
    let syncChoice: SyncChoice | undefined;
    if (datas.sync) {
      const base = datas.sync;
      const own = pickRead && pickRead !== "failed" ? pickRead : null;
      const ownOf = (p: SyncPick) => {
        const r = p === "everything" ? base : cachedReads[p];
        return r && r !== "failed" ? r : null;
      };
      const adds = ownOf("additions");
      const tokensOnly = ownOf("tokens");
      syncChoice = {
        unavailable: base.sync.unavailable,
        // Every "since your <date> upload" names the file this one is compared with, never the newest upload.
        anchorAt: base.sync.anchorConfirmedAt,
        figure: own ? { before: own.detail.copiesBefore, after: own.detail.copiesAfter } : pickRead === "failed" ? "failed" : null,
        // The plain Sync's read failing drops the card (see the choice read), so only a partial pick retries here.
        onRetry: pickNow !== "everything" ? () => retryPick(pickNow) : undefined,
        note: own ? syncNote(own, pickNow) : null,
        next: own ? syncNext(own, pickNow) : { kind: "sync" },
        stale:
          base.sync.stale === "older"
            ? { kind: "older", missing: base.sync.missingFromAnchor }
            : base.sync.stale === "noNewer"
              ? // The tokens the plain Sync changes by count, either way: the one token figure the step uses.
                { kind: "noNewer", tokens: base.sync.tokensChanged > 0 ? base.sync.tokensChanged : null }
              : null,
        followUp: followUpShown(base)
          ? {
              pick: followPick,
              // Each option's figures are its own dry run's, tokens included (the tokens that pick changes).
              adds: adds ? { cards: adds.detail.up, tokens: adds.sync.tokensChanged } : null,
              tokens: tokensOnly ? tokensOnly.sync.tokensChanged : null,
              all: { up: base.detail.up, leaving: base.detail.leaving, down: base.detail.down, tokens: base.sync.tokensChanged },
              onPick: setFollowPick,
            }
          : null,
      };
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
        sync={syncChoice}
        picked={picked}
        onPick={(mode) => { if (mode !== "sync" || syncUsable) setPicked(mode); }}
        onContinue={() => picked && openReview(picked)}
        onCancel={cancel}
      />
    );
  }

  const syncControls: SyncReviewControls = {
    answers,
    onAnswers: setAnswers,
    reading: syncReading,
    pending,
    conflictsRef,
    onHeld: () => conflictsRef.current?.focusFirstUndecided(),
    // Change goes back to the choice with the follow-up open (E5); Sync stays picked, and so do the answers.
    onChangePick:
      syncBase && followUpShown(syncBase) && !pending
        ? () => {
            setChange(null);
            setReviewing(false);
          }
        : undefined,
    onLeave: () => nav.go("/collection"),
  };

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
          // Sync's short decks ask in a dialog before the shortage is acknowledged (Confirm X1): Cancel focused.
          else if (change && choosing && picked === "sync" && change.decks.length > 0) {
            setWarning({ decks: change.decks, fresh: new Set(), changed: false, sync: true });
            setConfirming(true);
          } else if (change) void onConfirm(change.decks);
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
        sync={choosing && picked === "sync" ? syncControls : undefined}
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
          history={deckCheck || history}
          warning={warning ? { ...warning, source: warning.sync ? "sync" : "replace", onConfirm: () => onConfirm(warning.decks) } : undefined}
        />
      )}
    </>
  );
}
