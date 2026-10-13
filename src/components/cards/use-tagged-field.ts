"use client";

import { useState, type RefObject } from "react";
import { serialize, toField } from "../../lib/decks/notes-field";
import type { NoteCardHit } from "../../lib/decks/notes-store";
import { useCardTagPicker } from "./card-tag-picker";

/**
 * A textarea that can name a card, for a box whose owner holds a BODY string (a tag as `[[id|Name]]`, see
 * `notes-body.ts`) and wants to count, save or send it as one value. The box shows names; the owner sees the body.
 *
 * The box keeps its own text and picks beside the owner's body: serializing and parsing back is not an identity
 * for text being edited (a `[[Name]]` whose name is mid-edit loses its mark), so a body the box itself just sent up
 * is not parsed back over what the player is typing. A body that did not come from here (Escape, a save landing, the
 * owner resetting it) replaces the box's text, adjusted during render.
 *
 * Spread `picker.fieldProps` on the textarea with `value={field.text}` and `onChange={(e) => picker.typed(...)}`,
 * draw `<CardTagList {...picker.list} />` where the dropdown goes, and call `picker.insertTag` from the `[[ ]]` button.
 */
export function useTaggedField(o: {
  value: string;
  onChange: (body: string) => void;
  search: (query: string) => Promise<NoteCardHit[] | null>;
  /** The cap on what the box DRAWS, in code points. */
  max: number;
  maxTags: number;
  field: RefObject<HTMLTextAreaElement | null>;
}) {
  const { value, onChange } = o;
  const [field, setField] = useState(() => toField(value));
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== serialize(field.text, field.picked)) setField(toField(value));
  }
  const picker = useCardTagPicker({
    value: field.text, picked: field.picked, search: o.search, max: o.max, maxTags: o.maxTags, field: o.field,
    onChange: (text, picked) => { setField({ text, picked: new Map(picked) }); onChange(serialize(text, picked)); },
  });
  return { field, picker };
}
