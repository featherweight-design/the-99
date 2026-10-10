"use client";

// The five collection-edit figures (About U1 to U5). Each mounts the app's own component with
// fixture props, as every figure here does. The Add and Edit sheets load catalog search on open
// and are not mounted: their `AddLine` is (handoff E4), with the save bar's words from the same
// copy file the sheets read.

import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { entryTitle } from "../../lib/collection/history-view";
import {
  ADD_CARDS_LINES,
  EDIT_COPIES_LINES,
  HISTORY_ENTRIES,
  HISTORY_OPEN_ROWS,
  REMOVE_CARD_DECKS,
  UPLOAD_CHOICE,
} from "../../lib/about/fixtures";
import { AddLine } from "../collection/add-line";
import { HistoryEntryItem } from "../collection/history-list";
import { ShortDeckWarning } from "../collection/short-deck-warning";
import { UploadChoice } from "../collection/upload-choice";

const noop = () => {};

function SaveBar({ summary, save }: { summary: string; save: string }) {
  return (
    <div className="flex items-center gap-[12px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] px-[16px] py-[12px]">
      <span className="flex-1 text-[12px] text-[color:var(--fg-muted)]">{summary}</span>
      <span className="rounded-[8px] bg-[color:var(--accent)] px-[16px] py-[8px] text-[14px] font-semibold text-[color:var(--bg)]">{save}</span>
    </div>
  );
}

const lineProps = {
  picking: false,
  collapsed: false,
  pulse: null,
  phone: false,
  disabled: false,
  onOpenPicker: noop,
  onChoose: noop,
  onFinish: noop,
  onQuantity: noop,
  onRemove: noop,
};

export function CollectionAddFigureBody() {
  const c = collectionEditCopy.add;
  return (
    <div className="flex flex-col gap-[10px]">
      <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
        {ADD_CARDS_LINES.map((line) => (
          <AddLine key={line.id} {...lineProps} line={line} />
        ))}
      </ul>
      <SaveBar summary={c.summary(3, 4)} save={c.save(4)} />
    </div>
  );
}

export function EditCopiesFigureBody() {
  const c = collectionEditCopy.copies;
  return (
    <div className="flex flex-col gap-[10px]">
      <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
        {EDIT_COPIES_LINES.map(({ note, ...line }) => (
          <AddLine key={line.id} {...lineProps} line={line} note={note} />
        ))}
      </ul>
      <SaveBar summary="+1 · −1" save={c.save} />
    </div>
  );
}

export function UploadChoiceFigureBody() {
  // The choice is a whole page (`min-h` of the viewport at desktop); a figure is a plate.
  return (
    <div className="[&_section]:!min-h-0">
      <UploadChoice {...UPLOAD_CHOICE} picked="replace" onPick={noop} onContinue={noop} onCancel={noop} />
    </div>
  );
}

export function RemoveCardFigureBody() {
  return <ShortDeckWarning source="remove" cardName="Sol Ring" titleId="about-remove-card" decks={REMOVE_CARD_DECKS} pending={false} onCancel={noop} onConfirm={noop} />;
}

export function CollectionHistoryFigureBody() {
  const byId = new Map(HISTORY_ENTRIES.map((e) => [e.id, e]));
  const reachesBack = new Date("2026-07-11T00:00:00.000Z");
  return (
    <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
      {HISTORY_ENTRIES.map((e) => (
        <HistoryEntryItem
          key={e.id}
          e={e}
          title={entryTitle(e, byId, reachesBack)}
          revertedByEntry={e.revertedBy ? byId.get(e.revertedBy) : undefined}
          isOpen={e.id === "about-h1"}
          detail={e.id === "about-h1" ? { ...e, rows: HISTORY_OPEN_ROWS } : undefined}
          onToggle={noop}
          onRevert={noop}
          onRetry={noop}
          anchor={false}
        />
      ))}
    </ul>
  );
}
