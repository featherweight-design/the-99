"use client";

// The deck menu's third mode (STATES §4). Filing and unfiling are ONE control,
// because `moveDeck` takes `null` for exactly that — there is no separate
// `Unfile` anywhere in the app.
//
// A FILLED ROUND MARK on the current destination, never a square tick: this is
// one-of-many, and `filter-panel.tsx:519` rules that a square tick promises you
// can have two.
//
// `false` from the action means "not yours, or gone" (M6). It is not a crash and
// it is not a success: the row reverts to the shelf it named, and nothing is
// announced.

import { useEffect, useRef, useTransition } from "react";
import { moveDeckAction } from "../../app/decks/folder-actions";
import { folderCopy } from "../../lib/copy/folders";

const ROW =
  "flex min-h-[38px] w-full cursor-pointer items-center gap-[9px] border-x-0 border-b-0 border-t "
  + "border-solid border-t-[color:var(--elevated)] bg-transparent px-[13px] text-left font-sans "
  // No `transition-colors`: this round draws no motion at all (decision 27,
  // errata E12), and a hover that eases is motion.
  + "text-[13px] text-[color:var(--fg)] hover:bg-[color:var(--elevated)]";

export function MoveMode({
  deckId,
  deckName,
  folders,
  currentId,
  onMoved,
  onCreate,
  say,
  onRefused,
}: {
  deckId: string;
  deckName: string;
  folders: readonly { id: string; name: string }[];
  currentId: string | null;
  onMoved: (next: { id: string | null; name: string | null }) => void;
  /** `New folder…`, the last row: the destination can be made from the act. */
  onCreate: () => void;
  /**
   * The announcement goes to a region that OUTLIVES this mode — the panel
   * switches back to its menu on a successful move, and a region unmounted in
   * the same commit as its text is never read.
   */
  say: (announcement: string) => void;
  /** A refused move: refresh, because what this list shows is what went stale. */
  onRefused: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const first = useRef<HTMLButtonElement>(null);
  // A SYNCHRONOUS guard as well as `disabled`. A transition does not re-render
  // before the next click lands, so two quick taps would start two moves whose
  // order decides the final shelf.
  const inFlight = useRef(false);

  // Entering this mode replaces the focused menu row, so without this the
  // keyboard reader is dropped on the body with the destinations unreachable by
  // Tab. The CURRENT destination takes focus where there is one, because that is
  // where the reader already is in the list.
  useEffect(() => {
    first.current?.focus();
  }, []);

  function move(id: string | null, name: string | null) {
    if (inFlight.current) return;
    inFlight.current = true;
    startTransition(async () => {
      // A THROWN ACTION IS HANDLED HERE, not left to reject. The action layer
      // lets an unexpected database error travel deliberately, and an
      // unhandled rejection inside a transition would leave this list open with
      // nothing said and nothing reverted. It is treated as the refusal it is
      // from the reader's side: nothing moved.
      const ok = await moveDeckAction(deckId, id).catch(() => false);
      // `false` is "not yours, or gone" — the action revalidates for exactly
      // that reason, and the list this reader is looking at is the stale one.
      // Refreshed, and nothing announced: nothing moved.
      inFlight.current = false;
      if (!ok) {
        onRefused();
        return;
      }
      say(name ? folderCopy.move.announceFiled(name) : folderCopy.move.announceUnfiled);
      onMoved({ id, name });
    });
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
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (current) return;
              move(destination.id, destination.name);
            }}
            aria-label={folderCopy.move.optionAria(destination.label, current)}
            className={ROW}
            style={{ cursor: pending ? "default" : "pointer" }}
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
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Guarded as well as disabled: a same-tick click lands before the
          // transition's re-render, and two flows open at once is the state
          // this prevents.
          if (pending || inFlight.current) return;
          onCreate();
        }}
        className={ROW}
        style={{ cursor: pending ? "default" : "pointer" }}
      >
        <span aria-hidden className="h-[12px] w-[12px] flex-none" />
        <span>{folderCopy.create.actionFromMove}</span>
      </button>

      <span className="sr-only">{deckName}</span>
    </div>
  );
}
