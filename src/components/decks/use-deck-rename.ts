"use client";

import { useCallback, useState, useTransition } from "react";
import { renameDeck } from "../../app/decks/actions";
import { renameCopy } from "../../lib/copy/decks-builder";

const MAX_NAME = 120;
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

/**
 * The rename state machine, with no layout of its own. The builder spine renders
 * the field and its buttons in two different DOM slots per breakpoint and the
 * decks-list menu renders them stacked; all three share this.
 *
 * Blur commits. That is deliberate — the field is a title in place, not a form,
 * and clicking away from a title you just edited means you meant the edit. It is
 * also why any Cancel control must `preventDefault` on mousedown: otherwise the
 * blur lands first and saves the edit the click was refusing.
 */
export function useDeckRename(deckId: string, currentName: string, onDone: () => void) {
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmed = value.trim();
  const changed = trimmed !== currentName.trim();
  // Length is not part of `canSave`: an over-length name is a name the reader typed
  // and can be told about, so it takes the error row. Empty and unchanged are the
  // only two cases §F draws as an inert Save.
  const canSave = !isPending && trimmed.length > 0 && changed;

  const cancel = useCallback(() => {
    setValue(currentName);
    setError(null);
    onDone();
  }, [currentName, onDone]);

  // Inert rather than an error when there is nothing to save. §F draws the
  // empty and unchanged cases as a disabled Save, not as a validation failure,
  // so Enter on either does nothing at all and the field stays open.
  const commit = useCallback(() => {
    if (!canSave) return;
    if (trimmed.length > MAX_NAME) {
      setError(renameCopy.errorLength);
      return;
    }
    if (CONTROL_CHARS.test(trimmed)) {
      setError(renameCopy.errorControl);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await renameDeck(deckId, trimmed);
        onDone();
      } catch {
        setError(renameCopy.errorFailed);
      }
    });
  }, [canSave, deckId, onDone, trimmed]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    },
    [cancel, commit],
  );

  // A blur while the error is showing must not re-fire the request that failed:
  // the reader is looking at the message, and re-submitting on the way out would
  // replace it with a second identical failure they never asked for.
  const onBlur = useCallback(() => {
    if (isPending || error) return;
    if (!changed) {
      cancel();
      return;
    }
    commit();
  }, [cancel, changed, commit, error, isPending]);

  return { value, setValue, error, isPending, canSave, commit, cancel, onKeyDown, onBlur };
}
