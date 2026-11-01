"use client";
// `Change deck` (Rule 0 plan §PR 7b; boards S3 and W3; revisions handoff 2 + 3): every one of the viewer's own decks,
// the seated one first, then nearest the table, then the ones not in the read. The shipped bottom sheet on the phone,
// which loads first and then opens; from `md` a `ModalChrome` (480, fit) that opens at once on the press with a
// compact `SheetLoading`, then the list inside, a failed load said inside it with `Try again`. A press seats the deck
// through the swap (`TableLive`'s, with its toast and Undo); the seated row closes; a deck short of 100 is pressable
// and seats as not ready. Every row with a chip holds a fixed slot left of it for the `seated` tag, so every chip ends on
// one edge.

import { useEffect, useRef, useState, type Ref } from "react";
import { loadDeckChoicesAction } from "../../app/friends/table/actions";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { faceInitials } from "../../lib/names/initials";
import type { DeckChoice } from "../../lib/social/rule-zero-table";
import { ModalChrome } from "../decks/receipt-modal";
import { GhostButton } from "../ui/button";
import { FadingImg } from "../ui/hydrated-art";
import { Sheet, SheetHeader } from "../ui/sheet";
import { SheetLoading } from "../ui/sheet-loading";
import { TOUCH_HIT } from "../ui/touch-hit";
import { useMinWidth } from "../ui/use-min-width";
import { DeckRowChip, useSwap } from "./swap";

const copy = ruleZeroCopy.swap;

export function ChangeDeck({ tableId }: { tableId: string }) {
  const wide = useMinWidth("(min-width: 768px)");
  const [choices, setChoices] = useState<DeckChoice[] | null>(null);
  const [busy, setBusy] = useState(false);
  // A list that did not arrive (a network or database failure). On the phone it is said beside the link it is retried
  // from; from `md` it is said inside the open modal. A lapsed grant is not this: it answers null and the page's next
  // check draws the closed table.
  const [failed, setFailed] = useState(false);
  // How the press opened it: from `md` a modal that is open from the press while the list is still on its way, below it a
  // sheet that opens when the list arrives. A viewport that crosses 768px while it is open shows neither, so a late answer
  // never opens the other kind and a failure is always said where the press was.
  const [mode, setMode] = useState<"modal" | "sheet" | null>(null);
  // The pressed link, held as state (not a ref read during render) for the sheet to return focus to.
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // Only the newest press may land: a modal closed mid-load must not be reopened by its late answer.
  const latest = useRef(0);
  async function load() {
    const mine = ++latest.current;
    setBusy(true);
    setFailed(false);
    try {
      // Null when the seat grant has lapsed: the page's next check draws the closed table.
      const got = await loadDeckChoicesAction(tableId);
      if (mine !== latest.current) return;
      setChoices(got);
      if (got === null) setMode(null);
    } catch {
      if (mine === latest.current) setFailed(true);
    } finally {
      if (mine === latest.current) setBusy(false);
    }
  }
  function press(at: HTMLElement) {
    if (busy) return;
    setAnchor(at);
    setChoices(null);
    setMode(wide ? "modal" : "sheet");
    void load();
  }
  function close() {
    latest.current += 1;
    setBusy(false);
    setFailed(false);
    setMode(null);
    setChoices(null);
  }
  const modalOpen = mode === "modal" && wide;
  const sheetOpen = mode === "sheet" && !wide && choices !== null && anchor !== null;
  return (
    <>
      <button
        type="button"
        aria-busy={(busy && !wide) || undefined}
        aria-haspopup="dialog"
        onClick={(e) => (sheetOpen ? close() : press(e.currentTarget))}
        // Drawn at 36px; a coarse pointer gets TOUCH_HIT's 44px past it (the 2026-10-18 phone sweep measured 76x36).
        className={`${TOUCH_HIT} inline-flex min-h-[36px] cursor-pointer items-center border-0 bg-transparent p-0 font-sans text-[13px] font-medium text-[color:var(--accent-text)] underline decoration-[color:color-mix(in_oklab,var(--accent)_50%,transparent)] underline-offset-[4px]`}
      >
        {ruleZeroCopy.seat.changeDeck}
      </button>
      {failed && mode === "sheet" && !wide ? (
        <span role="alert" className="text-[12.5px] text-[color:var(--fg-muted)]">
          {copy.loadFailed}
        </span>
      ) : null}
      {modalOpen ? <ChoicesModal choices={choices} failed={failed} onRetry={() => void load()} onClose={close} /> : null}
      {sheetOpen ? <ChoicesSheet anchor={anchor} choices={choices} onClose={close} /> : null}
    </>
  );
}

function useChoiceList(choices: DeckChoice[], onClose: () => void, firstRow?: Ref<HTMLButtonElement>) {
  const swap = useSwap();
  const pick = (c: DeckChoice) => {
    onClose();
    if (!c.seated) swap?.swap(c.deckId);
  };
  return (
    <ul aria-label={copy.decksList} className="m-0 flex list-none flex-col gap-[2px] p-0">
      {choices.map((c, i) => (
        <li key={c.deckId}>
          <Row choice={c} onPick={() => pick(c)} buttonRef={i === 0 ? firstRow : undefined} />
        </li>
      ))}
    </ul>
  );
}

function ChoicesSheet({ anchor, choices, onClose }: { anchor: HTMLElement; choices: DeckChoice[]; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLElement>(anchor);
  const firstRow = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    anchorRef.current = anchor;
  }, [anchor]);
  useDialogA11y(panelRef, onClose, { initialFocusRef: firstRow, returnFocusRef: anchorRef, lockScroll: true });
  const list = useChoiceList(choices, onClose, firstRow);
  return (
    <Sheet open portal onDismiss={onClose} ariaLabel={copy.sheetTitle} panelRef={panelRef} header={<SheetHeader title={copy.sheetTitle} closeLabel={copy.close} onDismiss={onClose} />}>
      <div className="flex flex-col gap-[12px] px-[18px] pb-[18px]">
        <p className="m-0 text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">{copy.sheetSub}</p>
        {list}
      </div>
    </Sheet>
  );
}

function ChoicesModal({ choices, failed, onRetry, onClose }: { choices: DeckChoice[] | null; failed: boolean; onRetry: () => void; onClose: () => void }) {
  const list = useChoiceList(choices ?? [], onClose);
  return (
    <ModalChrome
      title={copy.sheetTitle}
      lead={<span className="block text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">{copy.sheetSub}</span>}
      closeLabel={copy.close}
      onClose={onClose}
      width={480}
      fit
    >
      <div className="flex flex-col px-[12px] pb-[14px] pt-[12px]">
        {failed ? (
          <div className="flex flex-col items-start gap-[12px] px-[8px] pb-[6px] pt-[14px]">
            <p role="alert" className="m-0 text-[13.5px] text-[color:var(--fg-body)]">
              {copy.loadFailed}
            </p>
            <GhostButton onClick={onRetry} className="min-h-[36px] rounded-[8px] px-[13px] text-[13px] font-semibold">
              {copy.retry}
            </GhostButton>
          </div>
        ) : choices ? (
          list
        ) : (
          <SheetLoading heading={copy.finding} compact />
        )}
      </div>
    </ModalChrome>
  );
}

function Row({ choice: c, onPick, buttonRef }: { choice: DeckChoice; onPick: () => void; buttonRef?: Ref<HTMLButtonElement> }) {
  const sub = c.ready ? c.commanderName : c.cards !== 100 ? copy.notRead(c.cards) : copy.notReadYet;
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-pressed={c.seated}
      onClick={onPick}
      className={`flex min-h-[60px] w-full cursor-pointer items-center gap-[12px] rounded-[9px] border-0 bg-transparent px-[8px] py-[6px] text-left text-[color:var(--fg)] aria-pressed:bg-[color:var(--elevated)] ${c.ready ? "" : "opacity-[.45]"}`}
    >
      <span aria-hidden className="relative flex h-[42px] w-[58px] flex-none items-center justify-center overflow-hidden rounded-[7px] bg-[color:var(--elevated)] font-mono text-[12px] font-semibold text-[color:var(--fg-muted)]">
        {c.artCropUri ? <FadingImg src={c.artCropUri} alt="" className="block h-full w-full object-cover" /> : faceInitials(c.name)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <b className="truncate whitespace-nowrap text-[14px] font-semibold">{c.name}</b>
        <span className="truncate whitespace-nowrap font-mono text-[10.5px] text-[color:var(--fg-faint)]">{sub}</span>
      </span>
      {c.ready || c.seated ? (
        <span className="w-[38px] flex-none text-right font-mono text-[10px] text-[color:var(--fg-faint)]">{c.seated ? copy.seatedTag : null}</span>
      ) : null}
      {c.ready ? <DeckRowChip permits={c.ready.permits} answered={c.ready.answered} /> : null}
    </button>
  );
}
