"use client";

import { useRef } from "react";
import { renameCopy } from "../../lib/copy/decks-builder";
import { PrimaryButton } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useDeckRename } from "./use-deck-rename";
import { DECK_NAME_MAX } from "../../lib/decks/deck-name";

interface RenameFormProps {
  deckId: string;
  currentName: string;
  onDone: () => void;
}

/**
 * Inline rename form — the DeckCardOverflow menu's stacked layout. The builder
 * spine renders the same behaviour in its own two layouts; all three share
 * `useDeckRename`.
 *
 * No `onBlur`. Blur-commit is a ruling about the deck header's title-in-place,
 * not about this form, and wiring it here would double-submit: blur lands before
 * the Save button's click.
 */
export function RenameForm({ deckId, currentName, onDone }: RenameFormProps) {
  const { value, setValue, error, isPending, canSave, commit, cancel, onKeyDown } = useDeckRename(
    deckId,
    currentName,
    onDone,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        commit();
      }}
      className="flex flex-col gap-[8px]"
    >
      <TextField
        ref={inputRef}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        maxLength={DECK_NAME_MAX}
        // readOnly, never disabled: a disabled input blurs, and the header's
        // layout commits on blur.
        readOnly={isPending}
        aria-label={renameCopy.fieldAria}
        className="w-full rounded-[6px] px-[10px] py-[7px] text-[16px] [@media(pointer:fine)]:text-[13px] font-sans bg-[color:var(--bg)]"
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
          disabled={!canSave}
          className="flex-1 rounded-[6px] py-[7px] text-[13px]"
        >
          {isPending ? renameCopy.saving : error ? renameCopy.retry : renameCopy.save}
        </PrimaryButton>
        <button
          type="button"
          onClick={cancel}
          // Guards the blur-then-click order the header's layout depends on.
          onMouseDown={(e) => e.preventDefault()}
          disabled={isPending}
          className="rounded-[6px] px-[12px] py-[7px] text-[13px] font-sans transition-colors bg-transparent border border-[color:var(--border-strong)] text-[color:var(--fg-muted)]"
          style={{ cursor: isPending ? "default" : "pointer" }}
        >
          {renameCopy.cancel}
        </button>
      </div>
    </form>
  );
}
