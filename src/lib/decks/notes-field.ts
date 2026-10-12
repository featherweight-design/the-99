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

/**
 * Name -> the card and HOW MANY occurrences of `[[Name]]` in the field came from the picker (or a tag loaded
 * for edit). A count and not a flag: the player can delete a picked tag and type the same bracketed name by
 * hand, or keep a real tag beside a literal one, and only as many occurrences as were picked become tags.
 */
export type Picked = ReadonlyMap<string, { id: string; n: number }>;

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

/** Walk the field's `[[Name]]` occurrences in order, telling each whether the picker made it (the first `n` of its name). */
function mapTags(text: string, picked: Picked, f: (whole: string, name: string, id: string | null) => string): string {
  const used = new Map<string, number>();
  return text.replace(WHOLE_TAG, (whole, name: string) => {
    const entry = picked.get(name);
    const seen = used.get(name) ?? 0;
    used.set(name, seen + 1);
    return f(whole, name, entry && seen < entry.n ? entry.id : null);
  });
}

/** The stored body for the field's text: each `[[Name]]` the picker made becomes `[[id|Name]]`. */
export function serialize(text: string, picked: Picked): string {
  return mapTags(text, picked, (whole, name, id) => (id ? formatTag(id, name) : whole));
}

/** Characters counted toward the 140 cap: a picked tag counts as its name, so its brackets are free. */
export function fieldCount(text: string, picked: Picked): number {
  return [...mapTags(text, picked, (whole, name, id) => (id ? name : whole))].length;
}

/** `picked` with every count cut to the occurrences the text still holds, and a name no longer in it dropped. */
export function prunePicked(text: string, picked: Picked): Picked {
  const held = new Map<string, number>();
  for (const m of text.matchAll(WHOLE_TAG)) held.set(m[1], (held.get(m[1]) ?? 0) + 1);
  const next = new Map<string, { id: string; n: number }>();
  for (const [name, entry] of picked) {
    const n = Math.min(entry.n, held.get(name) ?? 0);
    if (n > 0) next.set(name, { id: entry.id, n });
  }
  return next;
}

/** `picked` plus one more occurrence of this card. */
export function withPick(picked: Picked, name: string, id: string): Picked {
  const next = new Map(picked);
  next.set(name, { id, n: (picked.get(name)?.n ?? 0) + 1 });
  return next;
}

/** A stored body as the field shows it, with the map of its tags, for edit. */
export function toField(body: string): { text: string; picked: Map<string, { id: string; n: number }> } {
  const picked = new Map<string, { id: string; n: number }>();
  const text = parseBody(body)
    .map((s) => {
      if (s.kind === "text") return s.text;
      picked.set(s.name, { id: s.oracleId, n: (picked.get(s.name)?.n ?? 0) + 1 });
      return `[[${s.name}]]`;
    })
    .join("");
  return { text, picked };
}
