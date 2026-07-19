"use client";

import { useRef, useState, useTransition } from "react";
import { deleteDeck } from "../../app/decks/actions";
import { RenameForm } from "./rename-form";

interface DeckCardOverflowProps {
  deckId: string;
  deckName: string;
}

/**
 * Desktop-only "⋯" overflow menu for a deck card.
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
    <div className="relative z-10 hidden md:block">
      {/* §Deck card — "⋯" overflow button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label="Deck options"
        aria-expanded={open}
        aria-haspopup="menu"
        className="rounded-[8px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 500,
          fontSize: 13,
          color: "#A89B84",
          background: "transparent",
          border: "1px solid #2A241D",
          padding: "9px 13px",
          cursor: "pointer",
        }}
      >
        ⋯
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-[6px] z-20 min-w-[180px] rounded-[10px] shadow-lg"
          style={{
            background: "#1E1A15",
            border: "1px solid #3A3229",
          }}
          // stop click propagation so the Link overlay beneath doesn't fire
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          {mode === "menu" ? (
            <div role="menu" className="p-[8px] flex flex-col gap-[4px]">
              <button
                role="menuitem"
                type="button"
                onClick={handleRename}
                className="w-full text-left rounded-[6px] px-[12px] py-[9px] text-[13px] font-sans transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B] hover:bg-[#2A241D]"
                style={{ color: "#EDE6D8", background: "transparent", border: "none", cursor: "pointer" }}
              >
                Rename
              </button>
              <button
                role="menuitem"
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="w-full text-left rounded-[6px] px-[12px] py-[9px] text-[13px] font-sans transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B] hover:bg-[#2A241D]"
                style={{ color: "#C6533F", background: "transparent", border: "none", cursor: isPending ? "default" : "pointer" }}
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
