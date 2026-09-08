"use client";

import { useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { deleteDeck } from "../../app/decks/actions";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { refreshCopy } from "../../lib/copy/refresh";
import { RenameForm } from "./rename-form";

interface DeckCardOverflowProps {
  deckId: string;
  deckName: string;
  /** Cards in the deck. At zero there is nothing to diff, so the update entry
   *  is absent rather than disabled — #277 state 3. */
  built: number;
}

/**
 * "⋯" overflow menu for a deck card.
 * Opens a popover with "Rename" and "Delete" actions.
 * Rendered as a `relative z-10` sibling to the absolute-inset Link overlay
 * so clicks here do NOT navigate.
 */
export function DeckCardOverflow({ deckId, deckName, built }: DeckCardOverflowProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "rename">("menu");
  const [isPending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Every deck card renders one of these, so the id has to be per-instance.
  const panelId = useId();

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen((o) => !o);
    setMode("menu");
  }

  function handleRename(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMode("rename");
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${deckName}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteDeck(deckId);
    });
  }

  function handleClose() {
    setOpen(false);
    setMode("menu");
    buttonRef.current?.focus();
  }

  return (
    // z-10 so this sits above the absolute-inset Link overlay. Placed against
    // the art header's top-right corner rather than flowed, because the tile's
    // body is a grid of figures and this is not one of them.
    <div className="absolute top-[8px] right-[8px] z-10 sm:top-[10px] sm:right-[10px]">
      {/* §Deck card — "⋯" overflow button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        // Names the deck it acts on. "Deck options" said the same thing for
        // every tile on the page, so a reader tabbing the grid heard one label
        // repeated as many times as there were decks.
        aria-label={refreshCopy.decks.menu.trigger(deckName)}
        // No aria-haspopup at all. Every value it takes names a pattern this
        // panel does not implement — ARIA defines "true" as equivalent to
        // "menu", and a menu means role="menu" with menuitem children and
        // arrow-key navigation, which `sort-menu` and `account-menu` provide
        // and this does not. Its second mode is a rename form, so it is not a
        // menu under any reading. aria-expanded plus aria-controls state the
        // relationship truthfully and claim nothing further.
        aria-expanded={open}
        // Omitted while closed: the panel is unmounted at rest, and a reference
        // to an absent id is worse than no reference at all.
        aria-controls={open ? panelId : undefined}
        // 44px square on phone so the control clears the touch-target floor,
        // and bare there — the drawn plate is desktop-only, where the control
        // is 26px and needs the ground to stay legible over art.
        // The open state is a class, not an inline style: an inline background
        // outranks the hover: utilities beside it and the control stops
        // highlighting the moment the panel is open.
        className={`flex h-[44px] w-[44px] cursor-pointer items-center justify-center border-0 p-0 font-mono text-[13px] transition-colors sm:h-[26px] sm:w-[26px] sm:rounded-[7px] sm:text-[11px] ${
          open
            ? "rounded-[7px] border border-[color:var(--border-strong)] bg-[color:var(--elevated)] text-[color:var(--fg)] sm:text-[color:var(--fg)]"
            : "text-[color:var(--fg)] sm:bg-[color-mix(in_srgb,var(--bg)_70%,transparent)] sm:text-[color:var(--fg-body)]"
        }`}
      >
        …
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 top-full mt-[6px] z-20 min-w-[180px] rounded-[10px] shadow-lg"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
          }}
          // Propagation only: the deck-card Link overlay beneath fires on
          // bubbling, so stopping the bubble is the whole fix. preventDefault
          // here would also cancel the browser default for clicks inside the
          // panel, which is what cmd/ctrl- and middle-clicking the Update link
          // rely on to open a new tab.
          onClick={(e) => e.stopPropagation()}
        >
          {mode === "menu" ? (
            <div className="p-[8px] flex flex-col gap-[4px]">
              {built > 0 && (
                <Link
                  href={`/decks/${deckId}/import`}
                  aria-label={deckImportCopy.update.entryAria(deckName)}
                  className="w-full text-left rounded-[6px] px-[12px] py-[9px] text-[13px] font-sans transition-colors no-underline hover:bg-[color:var(--elevated)] text-[color:var(--fg)]"
                >
                  {refreshCopy.decks.menu.updateFromList}
                </Link>
              )}
              <button
                type="button"
                onClick={handleRename}
                // bg/border as utilities, not inline: an inline background
                // outranks hover: and the row never highlights.
                className="w-full text-left rounded-[6px] px-[12px] py-[9px] text-[13px] font-sans transition-colors bg-transparent border-none cursor-pointer hover:bg-[color:var(--elevated)] text-[color:var(--fg)]"
              >
                {refreshCopy.decks.menu.rename}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="w-full text-left rounded-[6px] px-[12px] py-[9px] text-[13px] font-sans transition-colors bg-transparent border-none hover:bg-[color:var(--elevated)] text-[color:var(--danger)]"
                style={{ cursor: isPending ? "default" : "pointer" }}
              >
                {isPending ? "Deleting…" : refreshCopy.decks.menu.delete}
              </button>
            </div>
          ) : (
            <div className="p-[12px]">
              <RenameForm
                deckId={deckId}
                currentName={deckName}
                onDone={handleClose}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
