"use client";

import { useRef, useState, useTransition } from "react";
import { renameDeck } from "../../app/decks/actions";
import { PrimaryButton } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

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
      <TextField
        ref={inputRef}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={120}
        disabled={isPending}
        aria-label="Deck name"
        className="w-full rounded-[6px] px-[10px] py-[7px] text-[13px] font-sans bg-[color:var(--bg)]"
      />
      {error && (
        <p className="font-mono text-[11px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <div className="flex gap-[8px]">
        {/* §rename-form — Save: PRIMARY submit — rounded-[6px] overrides primitive's rounded-lg */}
        <PrimaryButton
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-[6px] py-[7px] text-[13px]"
        >
          {isPending ? "Saving…" : "Save"}
        </PrimaryButton>
        <button
          type="button"
          onClick={onDone}
          disabled={isPending}
          className="rounded-[6px] px-[12px] py-[7px] text-[13px] font-sans transition-colors"
          style={{
            background: "transparent",
            border: "1px solid var(--border-strong)",
            color: "var(--fg-muted)",
            cursor: isPending ? "default" : "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
