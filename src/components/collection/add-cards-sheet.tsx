"use client";
// The Add cards sheet, add mode (collection edit R1 §B; collection screens plan, PR 2).
//
// A 480px side sheet on desktop with no scrim (the collection behind it is how a player checks
// "did I already enter that?"), full height on the phone. The page behind is `inert` rather than
// scrimmed (`useInertPage`). The list is local until Save, and Save is ONE ledger entry under the
// action id minted when the sheet opened and kept across retries, so a retry after a dropped
// response cannot add the cards twice.
//
// Adding never lowers a count, so there is no deck check and no `Checking decks` phase (B7).

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { addToCollection, loadPrintingChoices, searchCollectionCards } from "../../app/collection/edit-actions";
import { useInertPage } from "../../lib/a11y/inert-page";
import { leaveDialogsForNavigation, useBackDismiss, useDialogA11y } from "../../lib/a11y/dialog";
import { PICK_FROM_COLLECTION_HREF } from "../../lib/precons/pick";
import {
  canSave, choosePrinting, openLine, removeLine, setFinish, setQuantity, summarize, swapScannedCard, toPayload,
  type AddLineState,
} from "../../lib/collection/add-lines";
import { identityGradient } from "../../lib/cards/gradients";
import type { CatalogCardResult, PrintingChoice } from "../../lib/collection/catalog-read";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { PendingReporter } from "../shell/pending-reporter";
import { usePendingPush } from "../shell/pending-push";
import { PRIMARY } from "../ui/button";
import { useSheetHost } from "../ui/sheet-host";
import { SearchField } from "../ui/text-field";
import { escapeDismisses } from "../../lib/ui/search-dismiss";
import { useIsDesktop } from "../ui/use-is-desktop";
import { AddedReceipt, type WentInputs } from "./added-receipt";
import { AddLine } from "./add-line";
import { ReplaceIcon } from "./replace-icon";
import { EditCopiesSheet, type EditResult } from "./edit-copies-sheet";
import { useVisualViewportFrame } from "../ui/visual-viewport";
import { SHEET_PANEL_CLASS } from "./sheet-frame";
import { CardScanner } from "./scan/card-scanner";
import type { AddOutcome, ScanCapture, ScanPicked } from "./scan/use-card-scan";
import type { ScanGuess, ScanMode } from "./scan/scan-view";
import { matchedPrinting } from "../../lib/scan/printing-order";
import type { EditCard } from "../../lib/collection/edit-lines";
import { ArtLayer } from "../ui/art-layer";
import { ArrivalOrder } from "../ui/arrival-queue";
import { useMomentHold } from "../../lib/moments/hold";

const copy = collectionEditCopy.add;
const scanCopy = collectionEditCopy.scan;

/** A precon box, 16px, in the row's accent (S18). */
function BoxIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  );
}
const SEARCH_DEBOUNCE_MS = 150;

type Phase = "editing" | "saving" | "failed" | "saved";

export type AddCardsSheetProps =
  | {
      mode: "add";
      onClose: () => void;
      /** Called once with the copies a save added, so the head can re-read its figures. */
      onSaved?: (copiesAdded: number) => void;
      returnFocusRef?: RefObject<HTMLElement | null>;
      /** The collection's size before this session, for the saved state's `4,492 → 4,500`. */
      totalCards?: number;
      /**
       * The way into Precons I own (no-collection entry S18): a row in the empty state, at both widths. The host decides
       * it from `PRECONS_ENABLED` and the line's own switch; absent, the empty state is as shipped.
       */
      preconPick?: boolean;
      /** `CARD_SCAN_ENABLED`, decided by the host: the Scan press beside the search (card-scan PR 3). Absent, as shipped. */
      scan?: boolean;
    }
  | {
      /** One card's holdings, one line each (collection edit R2 §C). */
      mode: "edit";
      card: EditCard;
      /** Called once, with the saved entry when the sheet wrote one. */
      onClose: (result: EditResult) => void;
      returnFocusRef?: RefObject<HTMLElement | null>;
    };

/** Add mode and edit mode are one sheet to a caller; each mode keeps its own state below. */
export function AddCardsSheet(props: AddCardsSheetProps) {
  return props.mode === "edit" ? <EditCopiesSheet {...props} /> : <AddMode {...props} />;
}

function AddMode({
  onClose,
  onSaved,
  returnFocusRef,
  totalCards: totalCardsNow,
  preconPick = false,
  scan = false,
}: Extract<AddCardsSheetProps, { mode: "add" }>) {
  // The size when the sheet opened: the head re-reads its figure after a save, and the saved state
  // reports the move from the old one.
  const [baseline, setBaseline] = useState(totalCardsNow);
  const phone = !useIsDesktop();
  const host = useSheetHost(true);
  useInertPage(host, true);
  // The precon row's press closes this sheet, which unmounts the row, so a report the row owned would end before
  // the pick arrived: the push runs in the navigation-pending provider instead, as the account menu's does.
  const leave = usePendingPush();

  const titleId = useId();
  const listId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  // Minted once per session of adding, and re-minted by `Add more`: one Save is one entry.
  // The id belongs to ONE payload. A retry of the same list reuses it (the first try may have
  // committed with its response lost); an edited list gets a fresh id, or the server would answer
  // `alreadyApplied` for a write that never carried the edit.
  const attempt = useRef<{ id: string; payload: string } | null>(null);
  const [lines, setLines] = useState<AddLineState[]>([]);
  // Every write to the list goes through `writeLines`, which applies it to the newest list, not the one a render or an
  // await began with: a search pick and a scanned add each finish after a network read, and a write built on the list
  // they started from would drop whatever landed in between.
  const linesRef = useRef<AddLineState[]>([]);
  const writeLines = useCallback((next: AddLineState[] | ((ls: AddLineState[]) => AddLineState[])) => {
    const value = typeof next === "function" ? next(linesRef.current) : next;
    linesRef.current = value;
    setLines(value);
  }, []);
  const [phase, setPhase] = useState<Phase>("editing");
  // The phase as a scanned add's await sees it, which a closure from before the save would not.
  const phaseRef = useRef<Phase>("editing");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  // `went`: what the block is built from, so its foot can follow each row's Change (`whereItWent`).
  const [saved, setSaved] = useState<{ copies: number; cards: number; entryId: string; went: WentInputs | null } | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const [pickerChosen, setPickerFor] = useState<string | null>(null);
  const [loadingCard, setLoadingCard] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; kind: "combined" | "error" } | null>(null);
  const [announce, setAnnounce] = useState("");
  const [pulse, setPulse] = useState<{ id: string; n: number } | null>(null);
  // The scanner over the sheet (phone) or in place of the search (desktop), card-scan PR 3.
  const [scanning, setScanning] = useState(false);
  // Whether the scanner is still up when a scanned add's printings answer: it says its own failures, the sheet the rest.
  const scanningRef = useRef(false);
  useEffect(() => {
    scanningRef.current = scanning;
  }, [scanning]);
  // Scanned adds whose printings are still loading: the printing step waits for them before it asks.
  const [scanPending, setScanPending] = useState(0);
  // The scanned line whose name was pressed, its fix open (card-scan L2): the scan's photo and closest cards.
  const [fixChosen, setFixing] = useState<string | null>(null);
  // A swap waiting on its card's printings: like a scanned add, it builds from the list it started with.
  const [swapping, setSwapping] = useState(false);
  // The line whose printing is being asked for: the one opened, else (Normal mode's scanned lines wait for theirs)
  // the first still without one, once the scanner is closed and every scanned add has landed.
  const pickerFor =
    pickerChosen ?? (!scanning && scanPending === 0 ? (lines.find((l) => l.printing === null && !l.pending)?.id ?? null) : null);

  // The fix is open only while its line is on the list with its scan and nothing else is being asked: a line folded
  // into a twin (by a swap, a printing or a finish) takes its fix with it, a line a search pick joined keeps no scan,
  // and a printing step asked elsewhere shows over it.
  const fixing =
    fixChosen !== null && phase !== "saved" && pickerFor === null && lines.some((l) => l.id === fixChosen && l.scan)
      ? fixChosen
      : null;
  // However the fix closes (Escape, its own name press, a swap that folds the line into another), focus that was in
  // it has nowhere to stand and falls to the page: it goes back to the line's name, or, when the line folded away,
  // to the line it folded into, else the search. Focus already moved on (Search for it instead) is left where it is.
  const fixWas = useRef<string | null>(null);
  useEffect(() => {
    const was = fixWas.current;
    fixWas.current = fixing;
    if (was === null || was === fixing) return;
    const lost = !document.activeElement || document.activeElement === document.body;
    if (!lost) return;
    const target =
      document.querySelector<HTMLElement>(`[aria-controls="scan-fix-${was}"]:not([disabled])`) ??
      (pulse ? document.querySelector<HTMLElement>(`[data-line-id="${pulse.id}"] button:not([disabled])`) : null) ??
      searchRef.current;
    target?.focus();
  }, [fixing, pulse]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogCardResult[]>([]);
  const [searched, setSearched] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  // A failed search is not an empty one: it must not tell the player the card does not exist.
  const [searchFailed, setSearchFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const ticket = useRef(0);

  // A pending line (Auto's scan, its printings still being read) asks nothing: it gets its printing or leaves the list.
  const choosing = lines.find((l) => l.printing === null && !l.pending) ?? null;
  const blocked = choosing !== null || loadingCard !== null;
  const saving = phase === "saving";
  // A scanned card still loading its printings lands on the list later: a search pick in the meantime would build
  // from a list without it, and drop it.
  const searchDisabled = blocked || saving || scanPending > 0 || swapping;
  const trimmed = query.trim();

  // The debounced search. A ticket drops an answer that a newer keystroke has outdated.
  useEffect(() => {
    if (trimmed === "") {
      ticket.current++;
      return;
    }
    const mine = ++ticket.current;
    const t = setTimeout(() => {
      searchCollectionCards(trimmed)
        .then((r) => {
          if (mine !== ticket.current) return;
          setResults(r);
          setSearched(trimmed);
          setSearchFailed(false);
          setActive(0);
        })
        .catch(() => {
          if (mine !== ticket.current) return;
          setResults([]);
          setSearched(trimmed);
          setSearchFailed(true);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [trimmed, retry]);

  // After a required step ends, focus returns to the card search (B4a, step 3).
  const wasBlocked = useRef(false);
  useEffect(() => {
    if (wasBlocked.current && !blocked) searchRef.current?.focus();
    wasBlocked.current = blocked;
  }, [blocked]);

  // A scanned card still loading its printings is on its way to the list: closing now would lose it unasked.
  const dirty = (lines.length > 0 || scanPending > 0) && phase !== "saved";
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (discarding) keepRef.current?.focus();
  }, [discarding]);

  const cancelPicker = useCallback(() => {
    // The line being asked about goes if it never got its printing; a reopened one keeps the printing it had. Only
    // that line: scanned Normal-mode lines still waiting keep their place, and the next is asked for.
    writeLines((ls) => ls.filter((l) => l.printing !== null || l.id !== pickerFor));
    setPickerFor(null);
  }, [pickerFor, writeLines]);

  // Escape and the close button share one answer, in order: the question, the picker, the list.
  // Every way out of the scanner (✕, Review, Escape, Back) puts focus back on the search it was opened beside.
  const closeScanner = useCallback(() => {
    setScanning(false);
    queueMicrotask(() => searchRef.current?.focus());
  }, []);

  const requestClose = useCallback(() => {
    // A write in flight cannot be called back, so it cannot be discarded either.
    if (saving) return;
    // Escape and Back close the scanner first, back to the list it fills.
    if (scanning) return closeScanner();
    if (discarding) return setDiscarding(false);
    // A swap waiting on its printings cannot be called back, as a save cannot: the fix stays until it lands, so focus
    // has a line to come back to.
    if (swapping) return;
    if (fixing !== null) return setFixing(null);
    if (pickerFor !== null) return cancelPicker();
    if (dirty) return setDiscarding(true);
    onClose();
  }, [saving, swapping, scanning, closeScanner, discarding, fixing, pickerFor, cancelPicker, dirty, onClose]);

  useDialogA11y(panelRef, requestClose, { initialFocusRef: searchRef, lockScroll: false, returnFocusRef });
  // The phone sheet is the visible window, which the keyboard shrinks (sheet-frame.ts).
  const visible = useVisualViewportFrame(phone);
  // It locks no scroll, so it holds moments and the tour off itself while it is up (hold.ts).
  useMomentHold(true);
  // `lockScroll: false` also turns the hook's Back handling off; Back still has to ask before
  // it throws away an unsaved list.
  useBackDismiss(true, requestClose);

  async function pick(card: CatalogCardResult) {
    // Rows from an earlier query stay drawn while the next is pending: they are not this search.
    if (searchDisabled || searched !== trimmed) return;
    // A search pick is a new line of its own: an open fix closes rather than coming back once the pick is done.
    setFixing(null);
    setLoadingCard(card.name);
    setNotice(null);
    let choices: PrintingChoice[] = [];
    try {
      choices = await loadPrintingChoices(card.oracleId);
    } catch {
      choices = [];
    }
    setLoadingCard(null);
    if (choices.length === 0) {
      setNotice({ text: copy.printingsFailed, kind: "error" });
      return;
    }
    const id = crypto.randomUUID();
    setQuery("");
    setResults([]);
    setSearched(null);
    const base = { id, oracleId: card.oracleId, name: card.name, imageUri: card.imageUri, choices };
    if (choices.length === 1) {
      // A card with a single printing skips the step: the one printing is the answer.
      finish(choosePrinting(openLine(linesRef.current, base), id, choices[0]), id, card.name);
      return;
    }
    writeLines((ls) => openLine(ls, base));
    setPickerFor(id);
    setAnnounce(copy.announceChoose(card.name, choices.length));
  }

  /**
   * A scanned card onto the list, as a search pick lands (card-scan PR 3). Auto takes its first printing; Normal's pick
   * in the camera brings the printing it chose. The update is functional, because adds arrive faster than this
   * component re-renders.
   *
   * Auto is OPTIMISTIC (Hugh, 2026-10-16): the card goes on the list at once as a pending line, and its printings are
   * read behind the camera. The scanner says Added straight away and reads on; once the printings land the line takes
   * the one the scan matched (`matchedPrinting`), and when they cannot be read the line comes back off and `settled` answers false, so the scanner says
   * so. `scanPending` holds the save, the search and the printing step while a line is pending.
   */
  const listRead = () => phaseRef.current === "saving" || phaseRef.current === "saved";

  async function addScanned(guess: ScanGuess, mode: ScanMode, scan: ScanCapture, picked?: ScanPicked): Promise<AddOutcome> {
    // A save in flight (or done) has already read the list: a card scanned now would land behind it, unsaved.
    if (listRead()) return false;
    if (!picked && mode === "fast") return { settled: addPending(guess, scan) };
    let choices: PrintingChoice[] = picked?.choices ?? [];
    // Normal's pick in the camera brings the printings it chose from; anything else reads them now.
    if (!picked) {
      setScanPending((n) => n + 1);
      try {
        choices = await loadPrintingChoices(guess.oracleId);
      } catch {
        choices = [];
      } finally {
        setScanPending((n) => n - 1);
      }
    }
    if (choices.length === 0 || listRead()) {
      // The scanner says this one, over its own feed, while it is up; once it has closed the sheet says it.
      if (choices.length === 0 && !scanningRef.current) setNotice({ text: copy.printingsFailed, kind: "error" });
      return false;
    }
    const id = crypto.randomUUID();
    // As a search pick does, a scanned card clears the query: its results would cover the printing step it may open.
    setQuery("");
    setResults([]);
    setSearched(null);
    const base = { id, oracleId: guess.oracleId, name: guess.name, imageUri: guess.imageUri, choices, scan };
    const printing = picked?.printing ?? (mode === "fast" || choices.length === 1 ? matchedPrinting(choices, guess.printings ?? []) : null);
    writeLines((ls) => (printing ? choosePrinting(openLine(ls, base), id, printing).lines : openLine(ls, base)));
    return true;
  }


  /** Auto's optimistic add: the line now, its printing when the printings land, or the line off again. */
  function addPending(guess: ScanGuess, scan: ScanCapture): Promise<boolean> {
    const id = crypto.randomUUID();
    setQuery("");
    setResults([]);
    setSearched(null);
    setScanPending((n) => n + 1);
    writeLines((ls) => openLine(ls, { id, oracleId: guess.oracleId, name: guess.name, imageUri: guess.imageUri, choices: [], scan, pending: true }));
    return (async () => {
      let choices: PrintingChoice[] = [];
      try {
        choices = await loadPrintingChoices(guess.oracleId);
      } catch {
        choices = [];
      }
      try {
        // The player took the line off meanwhile: nothing is left to fill or to take back.
        if (!linesRef.current.some((l) => l.id === id)) return true;
        if (choices.length === 0) {
          writeLines((ls) => removeLine(ls, id));
          // The scanner says this one over its feed while it is up; once it has closed the sheet says it.
          if (!scanningRef.current) setNotice({ text: copy.printingsFailed, kind: "error" });
          return false;
        }
        writeLines((ls) => choosePrinting(ls.map((l) => (l.id === id ? { ...l, choices, pending: undefined } : l)), id, matchedPrinting(choices, guess.printings ?? [])!).lines);
        return true;
      } finally {
        setScanPending((n) => n - 1);
      }
    })();
  }

  /** L2: the scanned line becomes another of the cards its scan named, at that card's first printing. */
  async function swapCard(lineId: string, oracleId: string, name: string) {
    if (swapping || scanPending > 0) return;
    setNotice(null);
    setSwapping(true);
    let choices: PrintingChoice[] = [];
    try {
      choices = await loadPrintingChoices(oracleId);
    } catch {
      choices = [];
    } finally {
      setSwapping(false);
    }
    // A save that began meanwhile has read the list: the swap would change a line it already sent.
    if (listRead()) return;
    if (choices.length === 0) return setNotice({ text: copy.printingsFailed, kind: "error" });
    const r = swapScannedCard(linesRef.current, lineId, oracleId, choices);
    // A swap onto a card another line already holds folds into that line, which the fix no longer describes.
    if (r.merged) setFixing(null);
    finish(r, lineId, name);
  }

  /** L2's way out, and V6's None of these: the scan is set aside and the sheet's own search by name takes over. */
  function searchInstead(lineId: string | null) {
    if (lineId !== null) {
      writeLines((ls) => removeLine(ls, lineId));
      setFixing(null);
    }
    closeScanner();
  }


  /** Copies of each card on the list, for the scanner's tray and its "again". */
  const listed = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lines) m.set(l.oracleId, (m.get(l.oracleId) ?? 0) + l.quantity);
    return m;
  }, [lines]);

  function finish(r: ReturnType<typeof choosePrinting>, id: string, name: string) {
    writeLines(r.lines);
    setPickerFor(null);
    if (r.merged) {
      setPulse({ id: r.merged.id, n: (pulse?.n ?? 0) + 1 });
      const text = copy.combined(r.merged.name, r.merged.quantity);
      // The visible banner is itself a live region, so the sr-only one stays quiet.
      setNotice({ text, kind: "combined" });
      setAnnounce("");
    } else {
      setNotice(null);
      setAnnounce(copy.announceAdded(name));
    }
    void id;
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (results.length === 0) return;
      e.preventDefault();
      setActive((i) => Math.max(0, Math.min(results.length - 1, i + (e.key === "ArrowDown" ? 1 : -1))));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Typing past the rows on screen and pressing Enter must not add the previous query's top row.
      if (searched !== trimmed) return;
      const card = results[active];
      if (card) void pick(card);
    } else {
      // The first Escape clears the query; the sheet's own handler never sees it.
      escapeDismisses(e, query !== "", () => setQuery(""));
    }
  }

  const saveHeld = !canSave(lines) || saving || scanPending > 0 || swapping;
  async function save() {
    if (saveHeld) return;
    phaseRef.current = "saving";
    setPhase("saving");
    // The desktop's scanner stays open beside Save; the save takes the sheet to its receipt, and the scanner goes.
    setScanning(false);
    setNotice(null);
    const payload = toPayload(lines);
    const json = JSON.stringify(payload);
    if (attempt.current?.payload !== json) attempt.current = { id: crypto.randomUUID(), payload: json };
    try {
      const out = await addToCollection(attempt.current.id, payload);
      if ("applied" in out) {
        const s = summarize(lines);
        // Where each copy went, when the save said (`ADDED_COPY_ENABLED`): absent, nothing is drawn.
        const placed = out.applied.placed;
        setSaved({ copies: s.copies, cards: s.lines, entryId: out.applied.id, went: placed ? { lines, placed } : null });
        setPhase("saved");
        setAnnounce(copy.announceSaved(s.copies));
        onSaved?.(s.copies);
        return;
      }
    } catch {
      // Falls through to the failed state: the list stays, and the same id is retried.
    }
    setPhase("failed");
  }

  function addMore() {
    attempt.current = null;
    setBaseline((b) => (b === undefined ? undefined : b + (saved?.copies ?? 0)));
    writeLines([]);
    setSaved(null);
    setPhase("editing");
    setNotice(null);
    queueMicrotask(() => searchRef.current?.focus());
  }

  const stats = useMemo(() => summarize(lines), [lines]);
  const showResults = trimmed !== "" && phase !== "saved";
  const failed = showResults && searched === trimmed && searchFailed;
  const noResults = showResults && searched === trimmed && results.length === 0 && !searchFailed;
  const frozen = saving ? "pointer-events-none opacity-60" : "";
  // The phone's scanner covers the sheet: what it covers takes no focus and no press.
  const covered = (scanning && phone) || undefined;

  const dialog = (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={SHEET_PANEL_CLASS}
      style={visible}
    >
      <div inert={discarding || undefined} className="flex min-h-0 flex-1 flex-col">
        <div inert={covered} className="flex items-center gap-[12px] px-[18px] pb-[12px] pt-[16px] md:px-[22px] md:pb-[14px] md:pt-[20px]">
          <h2 id={titleId} className="m-0 flex-1 font-display text-[19px] font-bold md:text-[21px]">
            {copy.title}
          </h2>
          <button
            type="button"
            aria-label={copy.closeAria}
            disabled={saving}
            onClick={requestClose}
            className="flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-[10px] bg-[color:var(--elevated)] text-[color:var(--fg-muted)] md:h-[34px] md:w-[34px] md:rounded-[8px]"
          >
            {"✕"}
          </button>
        </div>

        {/* One place in the tree at every width, so turning a phone across 768px redraws the scanner rather than
            starting it again: its session, its mode and its photos stay. On a phone it covers the sheet, whose own
            controls sit inert beneath it. */}
        {phase !== "saved" && scanning && (
          <CardScanner layout={phone ? "phone" : "desk"} listed={listed} onAdd={addScanned} onClose={closeScanner} onNoneOfThese={() => searchInstead(null)} />
        )}
        {phase !== "saved" && !(scanning && !phone) && (
          <div inert={covered} className={`flex items-center gap-[8px] px-[18px] md:px-[22px] ${frozen}`} style={{ opacity: blocked ? 0.4 : undefined }}>
            <SearchField
              ref={searchRef}
              role="combobox"
              aria-expanded={showResults && results.length > 0}
              aria-controls={showResults && results.length > 0 ? listId : undefined}
              aria-activedescendant={showResults && results.length > 0 ? `${listId}-${active}` : undefined}
              aria-autocomplete="list"
              aria-label={copy.searchAria}
              placeholder={copy.searchPlaceholder}
              autoComplete="off"
              spellCheck={false}
              disabled={searchDisabled}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery("")}
              onKeyDown={onSearchKey}
              containerClassName="h-[48px] min-w-0 flex-1 py-0 md:h-[46px]"
              className="text-[16px] [@media(pointer:fine)]:md:text-[14px]"
            />
            {scan && (
              <button
                type="button"
                disabled={searchDisabled}
                onClick={() => setScanning(true)}
                className="inline-flex h-[48px] flex-none cursor-pointer items-center gap-[8px] rounded-[8px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[14px] text-[15px] font-medium text-[color:var(--fg)] md:h-[46px] md:text-[14px]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
                {scanCopy.press}
              </button>
            )}
          </div>
        )}

        {/* Under the desktop's webcam panel the body starts 10px down (W2/W3's inline padding-top), else 12px. */}
        <div inert={covered} className={`min-h-0 flex-1 overflow-y-auto px-[18px] pb-[12px] md:px-[22px] ${scanning && !phone ? "pt-[10px]" : "pt-[12px]"}`}>
          {notice && (
            <p
              role={notice.kind === "error" ? "alert" : "status"}
              className="mx-0 mb-[10px] mt-0 flex items-center gap-[10px] rounded-[8px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)] px-[12px] py-[10px] text-[13px] text-[color:var(--fg-body)]"
            >
              {notice.kind === "combined" && <span aria-hidden style={{ color: "var(--success)" }}>{"✓"}</span>}
              {notice.text}
            </p>
          )}
          {phase === "failed" && (
            <p role="alert" className="mx-0 mb-[10px] mt-0 rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] px-[12px] py-[10px] text-[13px] text-[color:var(--fg-body)]">
              {copy.failed}
            </p>
          )}

          {phase === "saved" && saved ? (
            <AddedReceipt
              title={copy.savedTitle(saved.copies)}
              body={copy.savedBody(saved.cards)}
              counts={baseline !== undefined ? copy.countsAfter(baseline, baseline + saved.copies) : null}
              went={saved.went}
              historyHref={`/collection/history?entry=${saved.entryId}`}
              historyLabel={copy.seeInHistory}
              onNavigate={onClose}
            >
              <div className="mt-[8px] flex w-full flex-col gap-[8px] md:flex-row">
                <button type="button" onClick={addMore} className="min-h-[44px] cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] px-[16px] text-[14px] md:min-h-[38px]">
                  {copy.addMore}
                </button>
                <button type="button" onClick={onClose} className={`min-h-[44px] cursor-pointer rounded-[8px] px-[18px] text-[14px] font-semibold md:min-h-[38px] ${PRIMARY}`}>
                  {copy.done}
                </button>
              </div>
            </AddedReceipt>
          ) : showResults ? (
            failed ? (
              <div role="alert" className="flex flex-col items-center gap-[10px] py-[26px] text-center">
                <span className="max-w-[300px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.searchFailed}</span>
                <button type="button" onClick={() => { setSearched(null); setSearchFailed(false); setRetry((n) => n + 1); }} className="min-h-[44px] cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] px-[16px] text-[14px] md:min-h-[38px]">
                  {copy.retry}
                </button>
              </div>
            ) : noResults ? (
              <div role="status" className="flex flex-col items-center gap-[8px] px-[0] py-[26px] text-center">
                <span aria-hidden className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-dashed border-[color:var(--border-dashed)] text-[color:var(--fg-faint)]">?</span>
                <span className="font-display text-[17px] font-semibold">{copy.noResultsTitle(trimmed)}</span>
                <span className="max-w-[300px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.noResultsBody}</span>
              </div>
            ) : (
              <ArrivalOrder>
              <ul id={listId} role="listbox" aria-label={copy.resultsAria} className="m-0 flex list-none flex-col gap-[6px] p-0">
                {results.map((r, i) => (
                  <ResultRow
                    key={r.oracleId}
                    id={`${listId}-${i}`}
                    result={r}
                    query={trimmed}
                    active={i === active}
                    onHover={() => setActive(i)}
                    onPick={() => void pick(r)}
                  />
                ))}
              </ul>
              </ArrivalOrder>
            )
          ) : lines.length === 0 ? (
            <div className="flex flex-col gap-[10px] py-[8px]">
              <p className="m-0 hidden text-[14px] leading-[1.6] text-[color:var(--fg-body)] md:block">{copy.emptyBody}</p>
              <p className="m-0 text-[14px] leading-[1.6] text-[color:var(--fg-body)] md:hidden">{copy.emptyBodyPhone}</p>
              <p className="m-0 hidden text-[13px] leading-[1.6] text-[color:var(--fg-muted)] md:block">{copy.emptyNote}</p>
              {/* Phone only: the strip has no room for the upload, so it lives here (Hugh, 2026-10-09). */}
              <Link
                href="/collection/replace"
                className="mt-[4px] flex min-h-[52px] items-center gap-[12px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--bg)] px-[14px] text-[14px] md:hidden"
              >
                <span className="flex text-[color:var(--accent)]"><ReplaceIcon size={16} /></span>
                <span className="flex-1">{copy.uploadLead} <span className="text-[color:var(--accent)]">{copy.uploadInstead}</span></span>
                <span aria-hidden className="text-[color:var(--fg-faint)]">{"›"}</span>
                <PendingReporter href="/collection/replace" />
              </Link>
              {/* S18: the same shape, under the upload on the phone and the only row on desktop, where the upload is in
                  the head. Closes the sheet as it opens the pick, on a navigation in this tab only (`onNavigate`: a
                  modified click opens a new tab and leaves this one as it was); the sheet's history entry stays under
                  the new route. */}
              {preconPick ? (
                <Link
                  href={PICK_FROM_COLLECTION_HREF}
                  onNavigate={(e) => {
                    e.preventDefault();
                    leaveDialogsForNavigation();
                    onClose();
                    leave.go(PICK_FROM_COLLECTION_HREF);
                  }}
                  className="flex min-h-[52px] items-center gap-[12px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--bg)] px-[14px] text-[14px] md:mt-[4px]"
                >
                  <span className="flex text-[color:var(--accent)]"><BoxIcon /></span>
                  <span className="flex-1">{copy.preconLead} <span className="text-[color:var(--accent)]">{copy.preconPress}</span></span>
                  <span aria-hidden className="text-[color:var(--fg-faint)]">{"›"}</span>
                </Link>
              ) : null}
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-[10px] pb-[6px] pt-[6px]">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.listHeading(lines.length)}</span>
                <span className="ml-auto hidden text-[10px] text-[color:var(--fg-locked)] md:inline">{copy.newestFirst}</span>
              </div>
              <ul className={`m-0 flex list-none flex-col gap-[8px] p-0 ${frozen}`}>
                <ArrivalOrder>
                {lines.map((l) => (
                  <AddLine
                    key={l.id}
                    line={l}
                    picking={pickerFor === l.id}
                    collapsed={(choosing !== null && choosing.id !== l.id) || (fixing !== null && fixing !== l.id)}
                    fix={l.scan && choosing === null ? {
                      open: fixing === l.id,
                      onToggle: () => {
                        // The fix and a reopened (optional) printing picker are one question at a time: the fix wins.
                        if (fixing !== l.id) setPickerFor(null);
                        setFixing(fixing === l.id ? null : l.id);
                      },
                      onSwap: (g) => void swapCard(l.id, g.oracleId, g.name),
                      onSearch: () => searchInstead(l.id),
                    } : undefined}
                    pulse={pulse?.id === l.id ? pulse.n : null}
                    phone={phone}
                    disabled={saving || swapping}
                    onOpenPicker={() => setPickerFor(pickerFor === l.id ? null : l.id)}
                    onChoose={(p) => finish(choosePrinting(linesRef.current, l.id, p), l.id, l.name)}
                    onFinish={(f) => {
                      const r = setFinish(linesRef.current, l.id, f);
                      writeLines(r.lines);
                      if (r.merged) finish(r, l.id, l.name);
                    }}
                    onQuantity={(q) => writeLines((ls) => setQuantity(ls, l.id, q))}
                    onRemove={() => {
                      writeLines((ls) => removeLine(ls, l.id));
                      if (pickerFor === l.id) setPickerFor(null);
                      if (fixing === l.id) setFixing(null);
                    }}
                  />
                ))}
                </ArrivalOrder>
              </ul>
            </>
          )}
          {loadingCard !== null && <p className="m-0 pt-[8px] text-[12.5px] text-[color:var(--fg-muted)]">{copy.choosePrinting}{"…"}</p>}
        </div>

        {phase !== "saved" && (
          <div inert={covered} className="flex items-center gap-[12px] border-0 border-t border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] px-[18px] pb-[16px] pt-[12px] md:px-[22px] md:pb-[18px] md:pt-[14px]">
            <span className="flex-1 text-[12px] text-[color:var(--fg-muted)]">
              {choosing ? copy.needsPrinting(choosing.name) : lines.length > 0 ? copy.summary(stats.lines, stats.copies) : copy.nothingYet}
            </span>
            <button
              type="button"
              // A scanned card whose printings are still loading is not on the list yet: Save waits for it. Held is
              // `aria-disabled` (the review table's `.sv.off`), never `disabled`, so Save keeps its place in the tab
              // order; a press while held does nothing.
              aria-disabled={saveHeld || undefined}
              onClick={() => {
                if (!saveHeld) void save();
              }}
              className={`h-[46px] cursor-pointer rounded-[10px] px-[22px] text-[15px] font-semibold aria-disabled:cursor-default aria-disabled:opacity-40 md:h-[40px] md:rounded-[8px] md:text-[14px] ${PRIMARY}`}
            >
              {saving ? copy.saving : phase === "failed" ? copy.retry : copy.save(stats.copies)}
            </button>
          </div>
        )}
      </div>

      {discarding && (
        <div className="absolute inset-0 z-10 flex items-end justify-center bg-[color-mix(in_oklab,var(--bg)_72%,transparent)] md:items-center">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-discard`}
            aria-describedby={`${titleId}-discard-body`}
            className="w-full rounded-t-[16px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] p-[20px] md:w-[360px] md:rounded-[12px]"
          >
            <p id={`${titleId}-discard`} className="m-0 font-display text-[17px] font-semibold">{copy.discardTitle(lines.length)}</p>
            <p id={`${titleId}-discard-body`} className="mb-0 mt-[8px] text-[13.5px] text-[color:var(--fg-body)]">{copy.discardBody}</p>
            <div className="mt-[16px] flex gap-[10px]">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] flex-1 cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] text-[14px]"
              >
                {copy.discard}
              </button>
              <button ref={keepRef} type="button" onClick={() => setDiscarding(false)} className={`min-h-[44px] flex-1 cursor-pointer rounded-[8px] text-[14px] font-semibold ${PRIMARY}`}>
                {copy.keep}
              </button>
            </div>
          </div>
        </div>
      )}

      <p role="status" aria-live="polite" className="sr-only">{announce}</p>
    </div>
  );

  return host ? createPortal(dialog, host) : null;
}

function ResultRow({
  id, result, query, active, onHover, onPick,
}: {
  id: string;
  result: CatalogCardResult;
  query: string;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
}) {
  const name = result.flavorName ? `${result.flavorName} (${result.name})` : result.name;
  const at = name.toLowerCase().indexOf(query.toLowerCase());
  const meta = [result.typeLine, result.owned > 0 ? collectionEditCopy.add.choose.tileOwned(result.owned) : ""].filter(Boolean).join(" · ");
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      onMouseMove={onHover}
      onClick={onPick}
      className="flex min-h-[56px] cursor-pointer items-center gap-[12px] rounded-[9px] border border-solid bg-[color:var(--surface-inset)] px-[12px] py-[6px]"
      style={{ borderColor: active ? "var(--accent)" : "var(--border)" }}
    >
      <span
        aria-hidden
        className="relative h-[45px] w-[32px] shrink-0 overflow-hidden rounded-[4px]"
        style={{ background: identityGradient([]) }}
      >
        {result.imageUri ? <ArtLayer src={result.imageUri} /> : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="truncate text-[14px] font-semibold">
          {at >= 0 ? (
            <>
              {name.slice(0, at)}
              <span style={{ color: "var(--accent)" }}>{name.slice(at, at + query.length)}</span>
              {name.slice(at + query.length)}
            </>
          ) : (
            name
          )}
        </span>
        <span className="truncate text-[10.5px] text-[color:var(--fg-faint)]">{meta}</span>
      </span>
      {active && <span aria-hidden className="text-[11px] text-[color:var(--fg-muted)]">{collectionEditCopy.add.resultAdd}</span>}
    </li>
  );
}
