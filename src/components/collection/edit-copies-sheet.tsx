"use client";
// The Add cards sheet in edit mode (collection edit R2 §C/§D; collection screens plan, PR 7): the
// same 480px side sheet as adding, scoped to ONE card, with a line per holding. Lines are staged
// locally and one Save is ONE ledger entry under an action id kept across retries. A printing
// fixed by re-picking is the old holding to zero and the new one up, in that one entry.
//
// Raising saves directly. A lowering can leave a committed deck short, and the server answers
// `wouldShort` with the decks: §E draws IN this sheet (an alertdialog over it, the way the discard
// question is), because a second `useDialogA11y` dialog would add a history entry and the sheet
// would be inert beneath it. The same action id is resent with those decks as `confirmShort`.
//
// Removal is every holding at zero: `Remove from collection` stages it, and Save reads
// `Remove N copies` (an elevated secondary, never the accent).

import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { editCollection, loadEditSheet } from "../../app/collection/edit-actions";
import { useBackDismiss, useDialogA11y } from "../../lib/a11y/dialog";
import { useInertPage } from "../../lib/a11y/inert-page";
import { removeLine } from "../../lib/collection/add-lines";
import type { CardHolding, PrintingChoice } from "../../lib/collection/catalog-read";
import {
  diffParts, diffRows, editChoosePrinting, editSetFinish, editSetQuantity, holdingKey, lineNote, linesFromHoldings, openNewLine, printingLabel, summarizeEdit,
  type EditCard, type EditLineState,
} from "../../lib/collection/edit-lines";
import type { ShortDeck } from "../../lib/collection/write";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { PRIMARY } from "../ui/button";
import { useSheetHost } from "../ui/sheet-host";
import { useIsDesktop } from "../ui/use-is-desktop";
import { AddLine } from "./add-line";
import { SHEET_FOOT_CLASS, SHEET_PANEL_CLASS } from "./sheet-frame";
import { ShortDeckWarning } from "./short-deck-warning";

const c = collectionEditCopy.copies;
const r = collectionEditCopy.remove;

/** What a sheet that wrote tells its host, so the host can reopen the card and offer Undo. */
export type EditResult = {
  saved: { entryId: string; removed: boolean; total: number; copiesRemoved: number } | null;
};

type Loaded = { choices: PrintingChoice[]; holdings: CardHolding[] };
type Read = { k: "loading" } | { k: "failed" } | ({ k: "ready" } & Loaded);
type Phase = "editing" | "saving" | "failed";
type Warning = { decks: ShortDeck[]; fresh: ReadonlySet<string>; changed: boolean };

const signed = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n)}`;
const GHOST =
  "cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg)] disabled:cursor-default disabled:opacity-40";

export function EditCopiesSheet({
  card,
  onClose,
  returnFocusRef,
}: {
  card: EditCard;
  onClose: (result: EditResult) => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const phone = !useIsDesktop();
  const host = useSheetHost(true);
  useInertPage(host, true);

  const titleId = useId();
  const warnId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const failedRef = useRef<HTMLParagraphElement>(null);

  const [read, setRead] = useState<Read>({ k: "loading" });
  const [reload, setReload] = useState(0);
  const [lines, setLines] = useState<EditLineState[]>([]);
  const [removing, setRemoving] = useState(false);
  const [phase, setPhase] = useState<Phase>("editing");
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [warning, setWarning] = useState<Warning | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const [notice, setNotice] = useState<{ text: string; kind: "status" | "alert" } | null>(null);
  const [announce, setAnnounce] = useState("");
  const [pulse, setPulse] = useState<{ id: string; n: number } | null>(null);
  // The id belongs to ONE payload: a retry of the same rows reuses it (the first try may have
  // committed with its response lost), an edited list gets a fresh one.
  const attempt = useRef<{ id: string; payload: string } | null>(null);

  const loaded = read.k === "ready" ? read : null;
  const holdings = useMemo(() => loaded?.holdings ?? [], [loaded]);

  // Read the card's holdings and every catalog printing together, and build the lines from them.
  // A stale answer reads again (`reload`), dropping whatever was staged: it was staged against
  // counts that are no longer true.
  useEffect(() => {
    let live = true;
    loadEditSheet(card.oracleId)
      .then((out) => {
        if (!live) return;
        if (!out) return setRead({ k: "failed" });
        setRead({ k: "ready", ...out });
        const held = linesFromHoldings(card, out.choices, out.holdings);
        if (out.holdings.length === 0) {
          // A card the player does not own: the sheet opens on the required printing step.
          const id = crypto.randomUUID();
          setLines(openNewLine([], id, card, out.choices, out.holdings));
          setPickerFor(id);
        } else {
          setLines(held);
          setPickerFor(null);
        }
        setRemoving(false);
        setPhase("editing");
        setWarning(null);
        attempt.current = null;
      })
      .catch(() => live && setRead({ k: "failed" }));
    return () => {
      live = false;
    };
  }, [card, reload]);

  const choosing = lines.find((l) => l.printing === null) ?? null;
  const saving = phase === "saving";
  const sum = useMemo(() => summarizeEdit(card.oracleId, holdings, lines, removing), [card.oracleId, holdings, lines, removing]);
  const isRemoval = removing || sum.removes;
  const owned = holdings.length > 0;
  const canSave = loaded !== null && sum.changed && choosing === null && !saving;

  const dirty = sum.changed && !saving;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (discarding) keepRef.current?.focus();
  }, [discarding]);
  useEffect(() => {
    if (phase === "failed" && warning === null) failedRef.current?.focus();
  }, [phase, warning]);

  const cancelPicker = useCallback(() => {
    setPickerFor(null);
    // A line that never got its printing goes; a held line keeps the one it had.
    setLines((ls) => ls.filter((l) => l.printing !== null));
  }, []);

  // Escape, the close button and Back share one answer, in order: the deck question, the discard
  // question, the picker, the staged changes, the sheet.
  const requestClose = useCallback(() => {
    if (saving) return;
    if (warning) return setWarning(null);
    if (discarding) return setDiscarding(false);
    if (pickerFor !== null) return cancelPicker();
    if (dirty) return setDiscarding(true);
    onClose({ saved: null });
  }, [saving, warning, discarding, pickerFor, cancelPicker, dirty, onClose]);

  useDialogA11y(panelRef, requestClose, { initialFocusRef: addRef, lockScroll: false, returnFocusRef });
  useBackDismiss(true, requestClose);

  function afterChoose(res: { lines: EditLineState[]; merged: EditLineState | null }) {
    setLines(res.lines);
    setPickerFor(null);
    if (res.merged) {
      setPulse({ id: res.merged.id, n: (pulse?.n ?? 0) + 1 });
      setNotice({ text: collectionEditCopy.add.combined(res.merged.name, res.merged.quantity), kind: "status" });
      setAnnounce("");
    } else {
      setNotice(null);
    }
  }

  function addPrinting() {
    if (!loaded || choosing || saving) return;
    const id = crypto.randomUUID();
    setLines(openNewLine(lines, id, card, loaded.choices, loaded.holdings));
    setPickerFor(id);
    setNotice(null);
    setAnnounce(collectionEditCopy.add.announceChoose(card.name, loaded.choices.length));
  }

  async function save(confirmShort?: ShortDeck[]) {
    if (!canSave) return;
    setPhase("saving");
    setNotice(null);
    const rows = diffRows(card.oracleId, holdings, lines, removing);
    const json = JSON.stringify(rows);
    if (attempt.current?.payload !== json) attempt.current = { id: crypto.randomUUID(), payload: json };
    try {
      // `seen` is every holding the sheet drew: one added elsewhere since answers `stale`.
      const seen = holdings.map((h) => ({ oracleId: card.oracleId, setCode: h.setCode, collectorNumber: h.collectorNumber, finish: h.finish }));
      const out = await editCollection(attempt.current.id, rows, confirmShort, seen);
      if ("applied" in out) {
        onClose({ saved: { entryId: out.applied.id, removed: isRemoval, total: sum.total, copiesRemoved: sum.held } });
        return;
      }
      if ("unchanged" in out) return onClose({ saved: null });
      if ("wouldShort" in out) {
        const was = new Set(warning?.decks.map((d) => d.deckId) ?? []);
        setWarning({
          decks: out.wouldShort,
          // A confirm that comes back with a different answer redraws the same dialog, saying so.
          fresh: new Set(warning ? out.wouldShort.map((d) => d.deckId).filter((id) => !was.has(id)) : []),
          changed: warning !== null,
        });
        setPhase("editing");
        return;
      }
      if ("stale" in out) {
        setWarning(null);
        // The write is over: a reload that fails must not leave the sheet closed to Escape and Back.
        setPhase("editing");
        setNotice({ text: c.stale, kind: "alert" });
        setRead({ k: "loading" });
        setReload((n) => n + 1);
        return;
      }
    } catch {
      // Falls through to the failed state: the staged lines stay, and the same id is retried.
    }
    setPhase("failed");
  }

  const frozen = saving ? "pointer-events-none opacity-60" : "";
  const title = owned || read.k === "loading" ? c.sheetTitle : c.addToCollection;
  const sub = !loaded ? null : owned
    ? c.sheetSub(card.name, sum.held, holdings.length)
    : c.sheetSubNone(card.name);
  const parts = diffParts(sum);
  const diffText = !parts
    ? null
    : "moved" in parts
      ? c.printingChanged(parts.moved)
      : [parts.up > 0 ? `+${parts.up}` : null, parts.down > 0 ? `−${parts.down}` : null].filter(Boolean).join(" · ");
  const footNote = choosing
    ? c.newPrintingFirst
    : removing
      ? r.leaves(card.name)
      : sum.removes && owned
        ? c.lastCopy(card.name)
        : null;
  const saveLabel = saving
    ? sum.lowers || isRemoval ? collectionEditCopy.shortWarning.checking : c.saving
    : phase === "failed" ? c.retry
    : isRemoval ? r.confirm(sum.held)
    : c.save;

  const dialog = (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={SHEET_PANEL_CLASS}
    >
      <div inert={discarding || warning !== null || undefined} className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-start gap-[12px] px-[18px] pb-[12px] pt-[16px] md:px-[22px] md:pb-[14px] md:pt-[20px]">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="m-0 font-display text-[19px] font-bold md:text-[21px]">{title}</h2>
            {sub ? <p className="m-0 mt-[2px] truncate text-[12.5px] text-[color:var(--fg-muted)]">{sub}</p> : null}
          </div>
          <button
            type="button"
            aria-label={collectionEditCopy.add.closeAria}
            disabled={saving}
            onClick={requestClose}
            className="flex h-[44px] w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-[color:var(--elevated)] text-[color:var(--fg-muted)] md:h-[34px] md:w-[34px] md:rounded-[8px]"
          >
            {"✕"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-[18px] py-[12px] md:px-[22px]">
          {notice ? (
            <p
              role={notice.kind === "alert" ? "alert" : "status"}
              className="mx-0 mb-[10px] mt-0 rounded-[8px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)] px-[12px] py-[10px] text-[13px] text-[color:var(--fg-body)]"
            >
              {notice.text}
            </p>
          ) : null}
          {phase === "failed" ? (
            <p
              ref={failedRef}
              tabIndex={-1}
              role="alert"
              className="mx-0 mb-[10px] mt-0 rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] px-[12px] py-[10px] text-[13px] text-[color:var(--fg-body)] outline-none"
            >
              {c.failed}
            </p>
          ) : null}

          {read.k === "loading" ? (
            <p role="status" className="m-0 py-[16px] text-[13.5px] text-[color:var(--fg-muted)]">{c.loading}</p>
          ) : read.k === "failed" ? (
            <div role="alert" className="flex flex-col items-start gap-[10px] py-[16px]">
              <span className="text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{c.loadFailed}</span>
              <button
                type="button"
                onClick={() => { setRead({ k: "loading" }); setReload((n) => n + 1); }}
                className={`min-h-[44px] px-[16px] text-[14px] md:min-h-[38px] ${GHOST}`}
              >
                {c.retry}
              </button>
            </div>
          ) : removing ? (
            <ul aria-label={r.action} className="m-0 flex list-none flex-col gap-[8px] p-0">
              {holdings.map((h) => {
                const key = holdingKey(card.oracleId, h);
                const set = read.choices.find((p) => p.setCode === h.setCode && p.collectorNumber === h.collectorNumber)?.setName;
                const label = h.setCode === "" && h.collectorNumber === "" ? c.noPrinting : printingLabel(h);
                return (
                  <li key={key} className="flex items-center gap-[12px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--bg)] p-[12px] text-[13px]">
                    <span className="min-w-0 flex-1 truncate">{[set, label, h.finish === "nonfoil" ? null : collectionEditCopy.add[h.finish]].filter(Boolean).join(" · ")}</span>
                    <span className="font-mono text-[12px] text-[color:var(--fg-muted)]">{`×${h.quantity} → 0`}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <>
              <ul className={`m-0 flex list-none flex-col gap-[8px] p-0 ${frozen}`}>
                {lines.map((l) => {
                  const note = lineNote(card.oracleId, holdings, l);
                  return (
                    <AddLine
                      key={l.id}
                      line={l}
                      picking={pickerFor === l.id}
                      // The other lines fold to one row while a picker is open, a fix's as well as a new line's.
                      collapsed={pickerFor !== null && pickerFor !== l.id}
                      pulse={pulse?.id === l.id ? pulse.n : null}
                      phone={phone}
                      disabled={saving}
                      title={l.origins.length === 0 ? c.newPrinting : undefined}
                      intro={l.origins.length > 0 ? c.fixIntro(l.choices.length) : undefined}
                      note={
                        note === null ? null
                        : note.kind === "delta" ? { text: signed(note.delta), tone: note.delta > 0 ? "up" : "down" }
                        : { text: `${c.was(note.from === "" ? c.noPrinting : note.from)} · ${c.goesWith(note.copies)}`, tone: "plain" }
                      }
                      onOpenPicker={() => setPickerFor(pickerFor === l.id ? null : l.id)}
                      onChoose={(p) => afterChoose(editChoosePrinting(lines, l.id, p))}
                      onFinish={(f) => {
                        const res = editSetFinish(lines, l.id, f);
                        if (res.merged) afterChoose(res);
                        else setLines(res.lines);
                      }}
                      onQuantity={(q) => setLines(editSetQuantity(lines, l.id, q))}
                      onRemove={() => {
                        setLines(removeLine(lines, l.id));
                        if (pickerFor === l.id) setPickerFor(null);
                      }}
                    />
                  );
                })}
              </ul>
              {loaded ? (
                <button
                  ref={addRef}
                  type="button"
                  disabled={choosing !== null || saving}
                  onClick={addPrinting}
                  className={`mt-[12px] min-h-[44px] w-full px-[14px] text-left text-[14px] md:min-h-[38px] ${GHOST} border-dashed`}
                >
                  {"+ "}{c.addPrinting}
                </button>
              ) : null}
            </>
          )}
        </div>

        {loaded ? (
          <div className={SHEET_FOOT_CLASS}>
            {removing ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => setRemoving(false)}
                className={`order-2 min-h-[44px] shrink-0 whitespace-nowrap px-[14px] text-[14px] md:order-1 md:min-h-[38px] ${GHOST}`}
              >
                {r.keep}
              </button>
            ) : (
              <button
                type="button"
                disabled={!owned || saving || choosing !== null}
                onClick={() => { setRemoving(true); setNotice(null); }}
                className={`order-2 min-h-[44px] shrink-0 whitespace-nowrap px-[14px] text-[14px] md:order-1 md:min-h-[38px] ${GHOST}`}
              >
                {r.action}
              </button>
            )}
            <span
              aria-live="polite"
              className="order-1 w-full text-right text-[12px] text-[color:var(--fg-muted)] md:order-2 md:ml-auto md:w-auto"
            >
              {footNote ?? diffText}
            </span>
            <button
              type="button"
              disabled={!canSave}
              onClick={() => void save()}
              className={`order-3 ml-auto h-[46px] shrink-0 cursor-pointer whitespace-nowrap rounded-[10px] px-[22px] text-[15px] font-semibold disabled:cursor-default disabled:opacity-40 md:ml-0 md:h-auto md:rounded-[8px] md:px-[20px] md:py-[11px] md:text-[14px] ${
                isRemoval
                  ? "border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] text-[color:var(--fg)]"
                  : PRIMARY
              } ${saving ? "opacity-60" : ""}`}
            >
              {saveLabel}
            </button>
          </div>
        ) : null}
      </div>

      {warning ? (
        <div className="absolute inset-0 z-10 flex items-end justify-center bg-[color-mix(in_oklab,var(--bg)_72%,transparent)] md:items-center">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={warnId}
            className="max-h-[88%] w-full overflow-y-auto rounded-t-[16px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] p-[20px] md:w-[400px] md:rounded-[12px]"
          >
            <ShortDeckWarning
              titleId={warnId}
              source={isRemoval ? "remove" : "save"}
              cardName={card.name}
              decks={warning.decks}
              pending={saving}
              error={phase === "failed" ? c.failed : null}
              notice={warning.changed}
              freshDeckIds={warning.fresh}
              onCancel={() => setWarning(null)}
              onConfirm={() => void save(warning.decks)}
            />
          </div>
        </div>
      ) : null}

      {discarding ? (
        <div className="absolute inset-0 z-10 flex items-end justify-center bg-[color-mix(in_oklab,var(--bg)_72%,transparent)] md:items-center">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-discard`}
            aria-describedby={`${titleId}-discard-body`}
            className="w-full rounded-t-[16px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] p-[20px] md:w-[360px] md:rounded-[12px]"
          >
            <p id={`${titleId}-discard`} className="m-0 font-display text-[17px] font-semibold">{c.discardTitle}</p>
            <p id={`${titleId}-discard-body`} className="mb-0 mt-[8px] text-[13.5px] text-[color:var(--fg-body)]">{c.discardBody}</p>
            <div className="mt-[16px] flex gap-[10px]">
              <button type="button" onClick={() => onClose({ saved: null })} className={`min-h-[44px] flex-1 text-[14px] ${GHOST}`}>
                {c.discard}
              </button>
              <button ref={keepRef} type="button" onClick={() => setDiscarding(false)} className={`min-h-[44px] flex-1 cursor-pointer rounded-[8px] text-[14px] font-semibold ${PRIMARY}`}>
                {c.keep}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <p role="status" aria-live="polite" className="sr-only">{announce}</p>
    </div>
  );

  return host ? createPortal(dialog, host) : null;
}
