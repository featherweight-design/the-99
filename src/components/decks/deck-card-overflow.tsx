"use client";

import { useRef, useState, useTransition } from "react";
import { deleteDeck } from "../../app/decks/actions";
import { RenameForm } from "./rename-form";

interface DeckCardOverflowProps {
  deckId: string;
  deckName: string;
}

/**
 * "⋯" overflow menu for a deck card.
 * Opens a popover with "Rename" and "Delete" actions.
 * Rendered as a `relative z-10` sibling to the absolute-inset Link overlay
 * so clicks here do NOT navigate.
 */
export function DeckCardOverflow({ deckId, deckName }: DeckCardOverflowProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "rename">("menu");
  const [isPending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);

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
        aria-expanded={open}
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
          className="absolute right-0 top-full mt-[6px] z-20 min-w-[180px] rounded-[10px] shadow-lg"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
          }}
          // stop click propagation so the Link overlay beneath doesn't fire
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          {mode === "menu" ? (
            <div className="p-[8px] flex flex-col gap-[4px]">
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
