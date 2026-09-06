"use client";

import { useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { deleteDeck } from "../../app/decks/actions";
import { deckImportCopy } from "../../lib/copy/deck-import";
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
    // relative z-10 so this sits above the absolute-inset Link overlay
    <div className="relative z-10 shrink-0">
      {/* §Deck card — "⋯" overflow button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label="Deck options"
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
        // 44px square on phone so the control clears the touch-target floor;
        // desktop keeps the drawn 13px-tall pill, sized against the card's top
        // row rather than the desktop-only action row it used to sit in.
        className="inline-flex items-center justify-center rounded-[8px] transition-colors text-[color:var(--fg-muted)] bg-transparent border border-[color:var(--border)] min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 p-0 md:p-[9px_13px]"
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 500,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        ⋯
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
                  {deckImportCopy.update.entryLabel}
                </Link>
              )}
              <button
                type="button"
                onClick={handleRename}
                // bg/border as utilities, not inline: an inline background
                // outranks hover: and the row never highlights.
                className="w-full text-left rounded-[6px] px-[12px] py-[9px] text-[13px] font-sans transition-colors bg-transparent border-none cursor-pointer hover:bg-[color:var(--elevated)] text-[color:var(--fg)]"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="w-full text-left rounded-[6px] px-[12px] py-[9px] text-[13px] font-sans transition-colors bg-transparent border-none hover:bg-[color:var(--elevated)] text-[color:var(--danger)]"
                style={{ cursor: isPending ? "default" : "pointer" }}
              >
                {isPending ? "Deleting…" : "Delete"}
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
