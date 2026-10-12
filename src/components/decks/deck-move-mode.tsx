"use client";

// The deck menu's third mode (STATES §4). Filing and unfiling are ONE control,
// because `moveDeck` takes `null` for exactly that — there is no separate
// `Unfile` anywhere in the app.
//
// A FILLED ROUND MARK on the current destination, never a square tick: this is
// one-of-many, and `filter-panel.tsx:519` rules that a square tick promises you
// can have two.
//
// A PICKER, NOT A WRITER. The move itself is the view's (`DecksView`), which
// files the deck optimistically on the press, announces it, and takes it back if
// the action refuses, so every door that moves a deck shares one prediction
// and one set of outcomes, and none of them waits on the round trip.

import { useEffect, useRef } from "react";
import { folderCopy } from "../../lib/copy/folders";

const ROW =
  "flex min-h-[38px] w-full cursor-pointer items-center gap-[9px] border-x-0 border-b-0 border-t "
  + "border-solid border-t-[color:var(--elevated)] bg-transparent px-[13px] text-left font-sans "
  // No `transition-colors`: this round draws no motion at all (decision 27,
  // errata E12), and a hover that eases is motion.
  + "text-[13px] text-[color:var(--fg)] hover:bg-[color:var(--elevated)]";

export function MoveMode({
  deckName,
  folders,
  currentId,
  onMove,
  onCreate,
}: {
  deckName: string;
  folders: readonly { id: string; name: string }[];
  currentId: string | null;
  /** The chosen destination. The panel closes on it; the view does the move. */
  onMove: (next: { id: string | null; name: string | null }) => void;
  /** `New folder…`, the last row: the destination can be made from the act. */
  onCreate: () => void;
}) {
  const first = useRef<HTMLButtonElement>(null);
  // A SYNCHRONOUS guard. The panel closes on the first choice, but two taps
  // dispatched before that commit would start two moves whose order decides the
  // final shelf.
  const chosen = useRef(false);

  // Entering this mode replaces the focused menu row, so without this the
  // keyboard reader is dropped on the body with the destinations unreachable by
  // Tab. The CURRENT destination takes focus where there is one, because that is
  // where the reader already is in the list.
  useEffect(() => {
    first.current?.focus();
  }, []);

  function move(id: string | null, name: string | null) {
    if (chosen.current) return;
    chosen.current = true;
    onMove({ id, name });
  }

  const destinations: { id: string | null; name: string | null; label: string }[] = [
    { id: null, name: null, label: folderCopy.shelves.unfiled },
    ...folders.map((f) => ({ id: f.id, name: f.name, label: f.name })),
  ];

  return (
    <div>
      <p className="m-0 px-[13px] pt-[10px] pb-[6px] font-mono text-[10px] tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">
        {folderCopy.move.heading}
      </p>

      {destinations.map((destination, index) => {
        const current = destination.id === currentId;
        return (
          <button
            key={destination.id ?? "unfiled"}
            ref={current || (currentId === null && index === 0) ? first : undefined}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (current) return;
              move(destination.id, destination.name);
            }}
            aria-label={folderCopy.move.optionAria(destination.label, current)}
            className={ROW}
          >
            <span
              aria-hidden
              className={`h-[12px] w-[12px] flex-none rounded-full border border-solid ${
                current
                  ? "border-[color:var(--accent)] bg-[color:var(--accent)]"
                  : "border-[color:var(--border-dashed)] bg-transparent"
              }`}
            />
            <span className="truncate" title={destination.label}>
              {destination.label}
            </span>
          </button>
        );
      })}

      {/* The destination can be made from the act (STATES M3/M4): with no
          folders at all this and `Unfiled` are the whole list. */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Guarded: a same-tick click lands before the panel closes, and a
          // move and a create both started from one panel is the state this
          // prevents.
          if (chosen.current) return;
          onCreate();
        }}
        className={ROW}
      >
        <span aria-hidden className="h-[12px] w-[12px] flex-none" />
        <span>{folderCopy.create.actionFromMove}</span>
      </button>

      <span className="sr-only">{deckName}</span>
    </div>
  );
}
