/**
 * The notes field's text, which is NOT the stored body. The player sees and edits `[[Name]]`; the stored
 * form is `[[<oracle uuid>|Name]]` (`notes-body.ts`). The field keeps a small map of the names it was
 * given a card for (`picked`: a pick from the picker, or a tag loaded for edit), and only those names
 * become tags when the note is saved. A `[[Name]]` typed by hand, or one whose name the map does not hold,
 * stays plain text, which is the K8 rule: a name typed without picking it from the list is plain.
 *
 * Pure, so the whole rule is testable without a browser.
 */
import { formatTag, parseBody } from "./notes-body";

/** Name -> oracle id, for the tags this field holds. Matching is by the exact name that was picked. */
export type Picked = ReadonlyMap<string, string>;

const OPEN_TAG = /\[\[([^\[\]]*)$/;
const WHOLE_TAG = /\[\[([^\[\]|]{1,200})\]\]/g;

/** What the caret is inside, when it is inside an open `[[`: where the tag starts and the letters after it. */
export function openTagAt(text: string, caret: number): { start: number; query: string } | null {
  const m = OPEN_TAG.exec(text.slice(0, caret));
  if (!m) return null;
  return { start: caret - m[0].length, query: m[1] };
}

/** Replace the open `[[query` (from `start` to `caret`) with a finished tag and one trailing space. */
export function insertPick(text: string, start: number, caret: number, name: string): { text: string; caret: number } {
  const clean = name.replace(/[\[\]|]/g, "").trim();
  const tag = `[[${clean}]] `;
  return { text: text.slice(0, start) + tag + text.slice(caret), caret: start + tag.length };
}

/** `[[]]` at the caret with the caret between, the `[[ ]]` button's insert. */
export function insertOpenTag(text: string, caret: number): { text: string; caret: number } {
  return { text: `${text.slice(0, caret)}[[]]${text.slice(caret)}`, caret: caret + 2 };
}

/** The stored body for the field's text: each `[[Name]]` the map holds becomes `[[id|Name]]`. */
export function serialize(text: string, picked: Picked): string {
  return text.replace(WHOLE_TAG, (whole, name: string) => {
    const id = picked.get(name);
    return id ? formatTag(id, name) : whole;
  });
}

/** Characters counted toward the 140 cap: a picked tag counts as its name, so its brackets are free. */
export function fieldCount(text: string, picked: Picked): number {
  return [...text.replace(WHOLE_TAG, (whole, name: string) => (picked.has(name) ? name : whole))].length;
}

/** A stored body as the field shows it, with the map of its tags, for edit. */
export function toField(body: string): { text: string; picked: Map<string, string> } {
  const picked = new Map<string, string>();
  const text = parseBody(body)
    .map((s) => {
      if (s.kind === "text") return s.text;
      picked.set(s.name, s.oracleId);
      return `[[${s.name}]]`;
    })
    .join("");
  return { text, picked };
}
