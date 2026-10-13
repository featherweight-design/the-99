"use client";

import { useCallback, useState, useTransition } from "react";
import { saveDeckHeader } from "../../app/decks/tuning-actions";
import { renameCopy } from "../../lib/copy/decks-builder";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { countCharacters } from "../../lib/copy/deck-tuning";
import { DECK_NAME_MAX, hasControlChars } from "../../lib/decks/deck-name";
import { plainText } from "../../lib/decks/notes-body";

const descriptionCopy = deckDescriptionCopy.description;

/**
 * What the description draws, trimmed: the draft is a BODY (a card tag as `[[id|Name]]`, card-tags plan PR 3) and the
 * server stores each tag as the catalog's name, so "changed", "unedited" and the cap all read the drawn words.
 */
const drawn = (body: string) => plainText(body).trim();

/**
 * The deck header's pencil (H35, STATES-deck-description.md §2, §3): the name and the
 * description as ONE editor, one commit. A separate hook from `use-deck-rename` rather than a
 * widening of it — `RenameForm` (the decks-list menu) keeps the name-only shape untouched, and
 * this one is free to carry a second field without adding a branch to a hook three call sites
 * already share.
 *
 * ONE ATOMIC WRITE (pre-open review round 2): both fields go to `saveDeckHeader` in a single
 * update, so a description refusal can never leave a renamed deck with no way for Cancel to
 * undo it — there is nothing partial to undo. Only the fields that actually changed when THIS
 * commit began are sent; a field untouched here is never overwritten with a stale closure
 * value if something else (the empty-state door) saved it first.
 *
 * ONE commit for both fields: Enter in the name field moves to the description field; Enter in
 * the description field saves both; Escape cancels both — neither fires while an IME composition
 * is in progress, so composing Japanese/Chinese/Korean text can use Enter to confirm a character
 * without saving an unfinished line. Blur commits only when focus leaves the PAIR — call
 * `onBlur` from a wrapper around both fields and their buttons, checking
 * `e.currentTarget.contains(e.relatedTarget)`, never from either field alone, and never from a
 * wrapper wider than the editor's own controls (a header row also holding unrelated focusable
 * controls, such as a partner's card-details trigger, must not count as "inside the pair").
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
  // Round 5: the retired single-field editor announced a successful save; this one closed
  // silently. A status region OUTSIDE the editor (rendered regardless of `renaming`) is what
  // lets the announcement survive `onDone()` unmounting the fields that triggered it.
  const [announced, setAnnounced] = useState("");
  const [isPending, startTransition] = useTransition();

  // A field follows the page's new value while it is UNEDITED, independently of the other
  // field: both widths mount this hook, so saving at one and resizing opens the other with the
  // field's old value, and a description saved through the empty-state field left the pencil's
  // own draft stale until the next remount. Adjusted during render, never in an effect, so the
  // stale value never paints.
  const [seenName, setSeenName] = useState(currentName);
  if (seenName !== currentName) {
    const unedited = name.trim() === seenName.trim();
    setSeenName(currentName);
    if (unedited) setName(currentName);
  }
  const [seenDescription, setSeenDescription] = useState(currentDescription ?? null);
  if (seenDescription !== currentDescription) {
    const unedited = drawn(description) === (seenDescription ?? "").trim();
    setSeenDescription(currentDescription ?? null);
    if (unedited) setDescription(currentDescription ?? "");
  }

  const trimmedName = name.trim();
  const nameChanged = trimmedName !== currentName.trim();
  const descriptionChanged = drawn(description) !== (currentDescription ?? "").trim();
  const changed = nameChanged || descriptionChanged;
  const canSave = !isPending && trimmedName.length > 0 && changed;

  const cancel = useCallback(() => {
    setName(currentName);
    setDescription(currentDescription ?? "");
    setError(null);
    setAnnounced("");
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
    if (countCharacters(plainText(description)) > descriptionCopy.maxLength) {
      setError(descriptionCopy.tooLong);
      return;
    }
    setError(null);
    setAnnounced("");
    // Captured NOW, at the moment the commit began — not re-read inside the transition, where a
    // concurrent save of the field this commit left untouched could otherwise be clobbered by
    // this closure's older value of it.
    const fields: { name?: string; description?: string } = {};
    if (nameChanged) fields.name = trimmedName;
    if (descriptionChanged) fields.description = description.trim();
    const savedDescription = descriptionChanged;
    startTransition(async () => {
      try {
        const result = await saveDeckHeader(deckId, fields);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        // Including clearing it to empty — still a save, and the tagline row disappearing is
        // exactly the change a sighted reader sees happen.
        if (savedDescription) setAnnounced(deckDescriptionCopy.announce.descriptionSaved);
        onDone();
      } catch {
        setError(renameCopy.errorFailed);
      }
    });
  }, [canSave, deckId, description, descriptionChanged, nameChanged, onDone, trimmedName]);

  const onNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, descriptionField: HTMLTextAreaElement | HTMLInputElement | null) => {
      if (e.nativeEvent.isComposing) return;
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
      if (e.nativeEvent.isComposing) return;
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

  /**
   * Blur commits only when focus leaves the PAIR. `extraBoundary` is for a caller whose editor
   * is NOT one contiguous DOM subtree — the fields and the Save/Cancel pair can sit in separate
   * flex columns of a wider row that also holds unrelated focusable controls (a partner's
   * card-details trigger, say), so `e.currentTarget.contains()` alone cannot be trusted to mean
   * "still inside the editor". Pass every OTHER node that belongs to this same editor; focus
   * landing in any of them, or in `e.currentTarget`, counts as staying inside the pair.
   */
  const onPairBlur = useCallback(
    (e: React.FocusEvent<HTMLElement>, ...extraBoundary: readonly (Element | null)[]) => {
      if (isPending || error) return;
      const related = e.relatedTarget as Node | null;
      if (e.currentTarget.contains(related) || extraBoundary.some((node) => node?.contains(related))) return;
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
    announced,
    isPending,
    canSave,
    commit,
    cancel,
    onNameKeyDown,
    onDescriptionKeyDown,
    onPairBlur,
  };
}
