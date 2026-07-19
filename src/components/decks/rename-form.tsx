"use client";

import { useRef, useState, useTransition } from "react";
import { renameDeck } from "../../app/decks/actions";

interface RenameFormProps {
  deckId: string;
  currentName: string;
  onDone: () => void;
}

/**
 * Inline rename form — used by the DeckCardOverflow menu (list page) and the
 * builder spine (Task 6). Wraps the `renameDeck` server action.
 */
export function RenameForm({ deckId, currentName, onDone }: RenameFormProps) {
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > 120) {
      setError("Name must be 1–120 characters.");
      return;
    }
    startTransition(async () => {
      try {
        await renameDeck(deckId, trimmed);
        onDone();
      } catch {
        setError("Rename failed. Try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[8px]">
      <input
        ref={inputRef}
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={120}
        disabled={isPending}
        aria-label="Deck name"
        className="w-full rounded-[6px] px-[10px] py-[7px] text-[13px] font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
        style={{
          background: "#14110E",
          border: "1px solid #3A3229",
          color: "#EDE6D8",
        }}
      />
      {error && (
        <p className="font-mono text-[11px]" style={{ color: "#C6533F" }}>
          {error}
        </p>
      )}
      <div className="flex gap-[8px]">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-[6px] py-[7px] text-[13px] font-sans font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
          style={{
            background: "#C9A24B",
            color: "#14110E",
            border: "none",
            cursor: isPending ? "default" : "pointer",
          }}
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={isPending}
          className="rounded-[6px] px-[12px] py-[7px] text-[13px] font-sans transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
          style={{
            background: "transparent",
            border: "1px solid #3A3229",
            color: "#A89B84",
            cursor: isPending ? "default" : "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
