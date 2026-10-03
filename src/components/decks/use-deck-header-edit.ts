"use client";

import { useCallback, useState, useTransition } from "react";
import { renameDeck } from "../../app/decks/actions";
import { saveDeckDescription } from "../../app/decks/tuning-actions";
import { renameCopy } from "../../lib/copy/decks-builder";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { countCharacters } from "../../lib/copy/deck-tuning";
import { DECK_NAME_MAX, hasControlChars } from "../../lib/decks/deck-name";

const descriptionCopy = deckDescriptionCopy.description;

/**
 * The deck header's pencil (H35, STATES-deck-description.md §2, §3): the name and the
 * description as ONE editor, one commit. A separate hook from `use-deck-rename` rather than a
 * widening of it — `RenameForm` (the decks-list menu) keeps the name-only shape untouched, and
 * this one is free to carry a second field without adding a branch to a hook three call sites
 * already share.
 *
 * ONE commit for both fields: Enter in the name field moves to the description field; Enter in
 * the description field saves both; Escape cancels both. Blur commits only when focus leaves the
 * PAIR — call `onBlur` from a wrapper around both fields and their buttons, checking
 * `e.currentTarget.contains(e.relatedTarget)`, never from either field alone.
 */
export function useDeckHeaderEdit(
  deckId: string,
  currentName: string,
  currentDescription: string | null,
  onDone: () => void,
) {
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // A field follows the page's new value while it is UNEDITED, independently of the other
  // field (pre-open review): both widths mount this hook, so saving at one and resizing opens
  // the other with the field's old value, and a description saved through the empty-state
  // field left the pencil's own draft stale until the next remount. Adjusted during render,
  // never in an effect, so the stale value never paints.
  const [seenName, setSeenName] = useState(currentName);
  if (seenName !== currentName) {
    const unedited = name.trim() === seenName.trim();
    setSeenName(currentName);
    if (unedited) setName(currentName);
  }
  const [seenDescription, setSeenDescription] = useState(currentDescription ?? null);
  if (seenDescription !== currentDescription) {
    const unedited = description.trim() === (seenDescription ?? "").trim();
    setSeenDescription(currentDescription ?? null);
    if (unedited) setDescription(currentDescription ?? "");
  }

  const trimmedName = name.trim();
  const changed = trimmedName !== currentName.trim() || description.trim() !== (currentDescription ?? "").trim();
  const canSave = !isPending && trimmedName.length > 0 && changed;

  const cancel = useCallback(() => {
    setName(currentName);
    setDescription(currentDescription ?? "");
    setError(null);
    onDone();
  }, [currentDescription, currentName, onDone]);

  const commit = useCallback(() => {
    if (!canSave) return;
    if (trimmedName.length > DECK_NAME_MAX) {
      setError(renameCopy.errorLength);
      return;
    }
    if (hasControlChars(trimmedName)) {
      setError(renameCopy.errorControl);
      return;
    }
    if (countCharacters(description) > descriptionCopy.maxLength) {
      setError(descriptionCopy.tooLong);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        // Two writes, one commit from the reader's point of view: the name through its own
        // action, the description through its own, both awaited before the editor closes. A
        // name that saved and a description that refused still reports the refusal, which is
        // the shipped `MutationError` contract every save on this page already follows.
        await renameDeck(deckId, trimmedName);
        const form = new FormData();
        form.set("intent", description.trim());
        const result = await saveDeckDescription(deckId, form);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        onDone();
      } catch {
        setError(renameCopy.errorFailed);
      }
    });
  }, [canSave, deckId, description, onDone, trimmedName]);

  const onNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, descriptionField: HTMLTextAreaElement | HTMLInputElement | null) => {
      if (e.key === "Enter") {
        e.preventDefault();
        descriptionField?.focus();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    },
    [cancel],
  );

  const onDescriptionKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    },
    [cancel, commit],
  );

  // Blur commits only when focus leaves the PAIR — a wrapper's own onBlur, never either field's.
  const onPairBlur = useCallback(
    (e: React.FocusEvent<HTMLElement>) => {
      if (isPending || error) return;
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      if (!changed || trimmedName.length === 0) {
        cancel();
        return;
      }
      commit();
    },
    [cancel, changed, commit, error, isPending, trimmedName],
  );

  return {
    name,
    setName,
    description,
    setDescription,
    error,
    isPending,
    canSave,
    commit,
    cancel,
    onNameKeyDown,
    onDescriptionKeyDown,
    onPairBlur,
  };
}
