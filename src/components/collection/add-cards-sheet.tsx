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
import { useBackDismiss, useDialogA11y } from "../../lib/a11y/dialog";
import {
  canSave, choosePrinting, openLine, removeLine, setFinish, setQuantity, summarize, toPayload,
  type AddLineState,
} from "../../lib/collection/add-lines";
import { cssUrl } from "../../lib/collection/browse";
import { identityGradient } from "../../lib/collection/gradients";
import type { CatalogCardResult, PrintingChoice } from "../../lib/collection/catalog-read";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { PendingReporter } from "../shell/pending-reporter";
import { PRIMARY } from "../ui/button";
import { useSheetHost } from "../ui/sheet-host";
import { SearchField } from "../ui/text-field";
import { escapeDismisses } from "../../lib/ui/search-dismiss";
import { useIsDesktop } from "../ui/use-is-desktop";
import { AddedReceipt, type WentInputs } from "./added-receipt";
import { AddLine } from "./add-line";
import { ReplaceIcon } from "./replace-icon";
import { EditCopiesSheet, type EditResult } from "./edit-copies-sheet";
import { SHEET_PANEL_CLASS } from "./sheet-frame";
import type { EditCard } from "../../lib/collection/edit-lines";

const copy = collectionEditCopy.add;
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
}: Extract<AddCardsSheetProps, { mode: "add" }>) {
  // The size when the sheet opened: the head re-reads its figure after a save, and the saved state
  // reports the move from the old one.
  const [baseline, setBaseline] = useState(totalCardsNow);
  const phone = !useIsDesktop();
  const host = useSheetHost(true);
  useInertPage(host, true);

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
  const [phase, setPhase] = useState<Phase>("editing");
  // `went`: what the block is built from, so its foot can follow each row's Change (`whereItWent`).
  const [saved, setSaved] = useState<{ copies: number; cards: number; entryId: string; went: WentInputs | null } | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [loadingCard, setLoadingCard] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; kind: "combined" | "error" } | null>(null);
  const [announce, setAnnounce] = useState("");
  const [pulse, setPulse] = useState<{ id: string; n: number } | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogCardResult[]>([]);
  const [searched, setSearched] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  // A failed search is not an empty one: it must not tell the player the card does not exist.
  const [searchFailed, setSearchFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const ticket = useRef(0);

  const choosing = lines.find((l) => l.printing === null) ?? null;
  const blocked = choosing !== null || loadingCard !== null;
  const saving = phase === "saving";
  const searchDisabled = blocked || saving;
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

  const dirty = lines.length > 0 && phase !== "saved";
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
    setPickerFor(null);
    // A line that never got its printing goes; a reopened one keeps the printing it had.
    setLines((ls) => ls.filter((l) => l.printing !== null));
  }, []);

  // Escape and the close button share one answer, in order: the question, the picker, the list.
  const requestClose = useCallback(() => {
    // A write in flight cannot be called back, so it cannot be discarded either.
    if (saving) return;
    if (discarding) return setDiscarding(false);
    if (pickerFor !== null) return cancelPicker();
    if (dirty) return setDiscarding(true);
    onClose();
  }, [saving, discarding, pickerFor, cancelPicker, dirty, onClose]);

  useDialogA11y(panelRef, requestClose, { initialFocusRef: searchRef, lockScroll: false, returnFocusRef });
  // `lockScroll: false` also turns the hook's Back handling off; Back still has to ask before
  // it throws away an unsaved list.
  useBackDismiss(true, requestClose);

  async function pick(card: CatalogCardResult) {
    // Rows from an earlier query stay drawn while the next is pending: they are not this search.
    if (searchDisabled || searched !== trimmed) return;
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
      finish(choosePrinting(openLine(lines, base), id, choices[0]), id, card.name);
      return;
    }
    setLines(openLine(lines, base));
    setPickerFor(id);
    setAnnounce(copy.announceChoose(card.name, choices.length));
  }

  function finish(r: ReturnType<typeof choosePrinting>, id: string, name: string) {
    setLines(r.lines);
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

  async function save() {
    if (!canSave(lines) || saving) return;
    setPhase("saving");
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
    setLines([]);
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

  const dialog = (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={SHEET_PANEL_CLASS}
    >
      <div inert={discarding || undefined} className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-[12px] px-[18px] pb-[12px] pt-[16px] md:px-[22px] md:pb-[14px] md:pt-[20px]">
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

        {phase !== "saved" && (
          <div className={`px-[18px] md:px-[22px] ${frozen}`} style={{ opacity: blocked ? 0.4 : undefined }}>
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
              containerClassName="h-[48px] py-0 md:h-[46px]"
              className="text-[16px] md:text-[14px]"
            />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-[18px] py-[12px] md:px-[22px]">
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
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-[10px] pb-[6px] pt-[6px]">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.listHeading(lines.length)}</span>
                <span className="ml-auto hidden text-[10px] text-[color:var(--fg-locked)] md:inline">{copy.newestFirst}</span>
              </div>
              <ul className={`m-0 flex list-none flex-col gap-[8px] p-0 ${frozen}`}>
                {lines.map((l) => (
                  <AddLine
                    key={l.id}
                    line={l}
                    picking={pickerFor === l.id}
                    collapsed={choosing !== null && choosing.id !== l.id}
                    pulse={pulse?.id === l.id ? pulse.n : null}
                    phone={phone}
                    disabled={saving}
                    onOpenPicker={() => setPickerFor(pickerFor === l.id ? null : l.id)}
                    onChoose={(p) => finish(choosePrinting(lines, l.id, p), l.id, l.name)}
                    onFinish={(f) => {
                      const r = setFinish(lines, l.id, f);
                      setLines(r.lines);
                      if (r.merged) finish(r, l.id, l.name);
                    }}
                    onQuantity={(q) => setLines(setQuantity(lines, l.id, q))}
                    onRemove={() => {
                      setLines(removeLine(lines, l.id));
                      if (pickerFor === l.id) setPickerFor(null);
                    }}
                  />
                ))}
              </ul>
            </>
          )}
          {loadingCard !== null && <p className="m-0 pt-[8px] text-[12.5px] text-[color:var(--fg-muted)]">{copy.choosePrinting}{"…"}</p>}
        </div>

        {phase !== "saved" && (
          <div className="flex items-center gap-[12px] border-0 border-t border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] px-[18px] pb-[14px] pt-[12px] md:px-[22px] md:pb-[18px] md:pt-[14px]">
            <span className="flex-1 text-[12px] text-[color:var(--fg-muted)]">
              {choosing ? copy.needsPrinting(choosing.name) : lines.length > 0 ? copy.summary(stats.lines, stats.copies) : copy.nothingYet}
            </span>
            <button
              type="button"
              disabled={!canSave(lines) || saving}
              onClick={() => void save()}
              className={`h-[46px] cursor-pointer rounded-[10px] px-[22px] text-[15px] font-semibold disabled:cursor-default disabled:opacity-40 md:h-auto md:rounded-[8px] md:px-[20px] md:py-[11px] md:text-[14px] ${PRIMARY}`}
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
        className="h-[45px] w-[32px] shrink-0 rounded-[4px]"
        style={result.imageUri ? { backgroundImage: cssUrl(result.imageUri), backgroundSize: "cover", backgroundPosition: "center" } : { background: identityGradient([]) }}
      />
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
