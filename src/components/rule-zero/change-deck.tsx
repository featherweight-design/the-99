"use client";
// `Change deck` (Rule 0 plan §PR 7b; boards S3 and W3): every one of the viewer's own decks, the seated one first,
// then nearest the table, then the ones not in the read. The shipped bottom sheet on the phone and an anchored panel
// from `xl` (the table page's own desktop width), as the game log's seat picker draws both. A press seats the deck
// through the swap (`TableLive`'s, with its toast and Undo); the seated row closes; a deck short of 100 is pressable
// and seats as not ready.

import { useEffect, useRef, useState } from "react";
import { loadDeckChoicesAction } from "../../app/friends/table/actions";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { faceInitials } from "../../lib/social/initials";
import type { DeckChoice } from "../../lib/social/rule-zero-table";
import { BracketChip } from "../decks/bracket-chip";
import { ANCHORED_PANEL_CLASS, useAnchoredPanel } from "../ui/anchored-panel";
import { FadingImg } from "../ui/hydrated-art";
import { Sheet, SheetHeader } from "../ui/sheet";
import { useMinWidth } from "../ui/use-min-width";
import { useSwap } from "./swap";

const copy = ruleZeroCopy.swap;
const PANEL_WIDTH = 420;

export function ChangeDeck({ tableId }: { tableId: string }) {
  const [choices, setChoices] = useState<DeckChoice[] | null>(null);
  const [busy, setBusy] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  async function press() {
    if (busy) return;
    setBusy(true);
    try {
      // Null when the seat grant has lapsed: the page's next check draws the closed table.
      setChoices(await loadDeckChoicesAction(tableId));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-busy={busy || undefined}
        aria-haspopup="dialog"
        onClick={() => (choices ? setChoices(null) : void press())}
        className="inline-flex min-h-[36px] cursor-pointer items-center border-0 bg-transparent p-0 font-sans text-[13px] font-medium text-[color:var(--accent)] underline decoration-[color:color-mix(in_oklab,var(--accent)_50%,transparent)] underline-offset-[4px]"
      >
        {ruleZeroCopy.seat.changeDeck}
      </button>
      {choices && trigger.current ? <Choices anchor={trigger.current} choices={choices} onClose={() => setChoices(null)} /> : null}
    </>
  );
}

function Choices({ anchor, choices, onClose }: { anchor: HTMLElement; choices: DeckChoice[]; onClose: () => void }) {
  const desktop = useMinWidth("(min-width: 1280px)");
  const swap = useSwap();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLElement>(anchor);
  const { at, panelRef: placedRef, triggerRef } = useAnchoredPanel<HTMLElement>({ open: desktop, width: PANEL_WIDTH });
  useEffect(() => {
    triggerRef.current = anchor;
    anchorRef.current = anchor;
  }, [anchor, triggerRef]);
  // The sheet holds the page; the panel does not (it hangs off a control on a page the reader can still see).
  useDialogA11y(desktop ? placedRef : panelRef, onClose, { returnFocusRef: anchorRef, lockScroll: !desktop });
  useEffect(() => {
    if (!desktop) return;
    const away = (e: MouseEvent) => {
      const node = e.target as Node;
      if (placedRef.current?.contains(node) || anchor.contains(node)) return;
      onClose();
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [desktop, anchor, onClose, placedRef]);

  const pick = (c: DeckChoice) => {
    onClose();
    if (!c.seated) swap?.swap(c.deckId);
  };
  const list = (
    <ul aria-label={copy.decksList} className="m-0 flex list-none flex-col gap-[2px] p-0">
      {choices.map((c) => (
        <li key={c.deckId}>
          <Row choice={c} onPick={() => pick(c)} />
        </li>
      ))}
    </ul>
  );

  if (!desktop) {
    return (
      <Sheet open portal onDismiss={onClose} ariaLabel={copy.sheetTitle} panelRef={panelRef} header={<SheetHeader title={copy.sheetTitle} closeLabel={copy.close} onDismiss={onClose} />}>
        <div className="flex flex-col gap-[12px] px-[18px] pb-[18px]">
          <p className="m-0 text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">{copy.sheetSub}</p>
          {list}
        </div>
      </Sheet>
    );
  }
  return (
    <div
      ref={placedRef}
      role="dialog"
      aria-label={copy.sheetTitle}
      className={`${ANCHORED_PANEL_CLASS} fixed flex flex-col p-[8px]`}
      style={{ width: PANEL_WIDTH, maxHeight: "calc(100dvh - 16px)", top: at?.top ?? 0, left: at?.left ?? 0, visibility: at ? "visible" : "hidden" }}
    >
      <div className="flex items-center justify-between px-[8px] pb-[8px] pt-[6px] font-mono text-[10.5px] uppercase tracking-[.14em] text-[color:var(--fg-faint)]">
        <span>{copy.sheetTitle}</span>
        <span>{copy.nearestFirst}</span>
      </div>
      <div className="min-h-0 overflow-y-auto">{list}</div>
    </div>
  );
}

function Row({ choice: c, onPick }: { choice: DeckChoice; onPick: () => void }) {
  const sub = c.ready ? c.commanderName : c.cards !== 100 ? copy.notRead(c.cards) : copy.notReadYet;
  return (
    <button
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
      {c.ready ? <BracketChip permits={c.ready.permits} answered={c.ready.answered} /> : null}
      {c.seated ? <span className="ml-[6px] flex-none font-mono text-[10px] text-[color:var(--fg-faint)]">{copy.seatedTag}</span> : null}
    </button>
  );
}
