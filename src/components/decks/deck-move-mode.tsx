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

import { useState, useTransition } from "react";
import { moveDeckAction } from "../../app/decks/folder-actions";
import { folderCopy } from "../../lib/copy/folders";

const ROW =
  "flex min-h-[38px] w-full cursor-pointer items-center gap-[9px] border-x-0 border-b-0 border-t "
  + "border-solid border-t-[color:var(--elevated)] bg-transparent px-[13px] text-left font-sans "
  + "text-[13px] text-[color:var(--fg)] transition-colors hover:bg-[color:var(--elevated)]";

export function MoveMode({
  deckId,
  deckName,
  folders,
  currentId,
  onMoved,
}: {
  deckId: string;
  deckName: string;
  folders: readonly { id: string; name: string }[];
  currentId: string | null;
  onMoved: (next: { id: string | null; name: string | null }) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [announcement, setAnnouncement] = useState("");

  function move(id: string | null, name: string | null) {
    startTransition(async () => {
      const ok = await moveDeckAction(deckId, id);
      if (!ok) return;
      setAnnouncement(name ? folderCopy.move.announceFiled(name) : folderCopy.move.announceUnfiled);
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

      {destinations.map((destination) => {
        const current = destination.id === currentId;
        return (
          <button
            key={destination.id ?? "unfiled"}
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

      {/* The deck menu's own region. The shelf line's announcement is a
          different surface, and this one has to speak from inside the panel the
          reader is standing in. */}
      <p aria-live="polite" aria-atomic="true" className="sr-only m-0">
        {announcement}
      </p>
      <span className="sr-only">{deckName}</span>
    </div>
  );
}
