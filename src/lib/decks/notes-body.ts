/**
 * A deck note's body: the player's text with card tags in it.
 *
 * A tag is STORED as `[[<oracle uuid>|<name it had then>]]` (lock 2): the id the player picked and the
 * name at that moment, never a name matched later. The note DRAWS the card's current catalog name and
 * falls back to the stored one when the card cannot be found. A name typed by hand with no id (`[[Sol
 * Ring]]`) does not match the tag shape and stays plain text.
 *
 * So the stored body is longer than what draws. `renderedLength` is the one definition of the cap the
 * action enforces (140 code points, a tag counted as its name); the column's check is only a loose
 * backstop.
 */
import { NOTE_MAX } from "../copy/deck-notes";

export type NoteSegment =
  | { kind: "text"; text: string }
  | { kind: "tag"; oracleId: string; name: string };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
/** The stored name may hold neither bracket nor the separator, so a tag cannot be closed early. */
const TAG = new RegExp(`\\[\\[(${UUID})\\|([^\\[\\]|]{1,200})\\]\\]`, "gi");

/** The stored form of one tag. A name with a bracket or bar in it loses them rather than breaking the tag. */
export function formatTag(oracleId: string, name: string): string {
  const clean = name.replace(/[\[\]|]/g, "").trim();
  return `[[${oracleId.toLowerCase()}|${clean}]]`;
}

export function parseBody(body: string): NoteSegment[] {
  const out: NoteSegment[] = [];
  let at = 0;
  for (const m of body.matchAll(TAG)) {
    const start = m.index ?? 0;
    if (start > at) out.push({ kind: "text", text: body.slice(at, start) });
    out.push({ kind: "tag", oracleId: m[1].toLowerCase(), name: m[2] });
    at = start + m[0].length;
  }
  if (at < body.length) out.push({ kind: "text", text: body.slice(at) });
  return out;
}

export function tagIds(body: string): string[] {
  return [...new Set(parseBody(body).flatMap((s) => (s.kind === "tag" ? [s.oracleId] : [])))];
}

/** Code points, not `.length`: the column and the game log count the same way. */
export function renderedLength(body: string): number {
  return parseBody(body).reduce((n, s) => n + [...(s.kind === "tag" ? s.name : s.text)].length, 0);
}

/**
 * One line: every run of whitespace, line breaks included, becomes one space, and the ends are trimmed.
 * A note is a single line by ruling, and a pasted paragraph must not become several.
 */
export function oneLine(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** Rewrite every tag's stored name to the name the catalog gives now, for the ids that resolved. */
export function withCurrentNames(body: string, names: ReadonlyMap<string, string>): string {
  return parseBody(body)
    .map((s) => (s.kind === "text" ? s.text : formatTag(s.oracleId, names.get(s.oracleId) ?? s.name)))
    .join("");
}

/** The body as plain words: each tag drawn as its stored name. What a box that is not a note shows and sends. */
export function plainText(body: string): string {
  return parseBody(body).map((s) => (s.kind === "text" ? s.text : s.name)).join("");
}

/**
 * The body cut to `max` RENDERED characters (a tag counts as its name), never through the middle of a tag: a
 * tag that would cross the cap is dropped whole, with everything after it. Code points, as `renderedLength`.
 */
export function capBody(body: string, max: number): string {
  let used = 0;
  let out = "";
  for (const s of parseBody(body)) {
    if (s.kind === "tag") {
      const n = [...s.name].length;
      if (used + n > max) return out;
      used += n;
      out += formatTag(s.oracleId, s.name);
    } else {
      const room = max - used;
      const chars = [...s.text];
      if (chars.length > room) return out + chars.slice(0, room).join("");
      used += chars.length;
      out += s.text;
    }
  }
  return out;
}

export type BodyCheck = { ok: true; body: string } | { ok: false; reason: "empty" | "too-long" };

/** The shared shape rule: one line, not empty, within the rendered cap. Tag ids are checked by the caller. */
export function checkBody(raw: unknown): BodyCheck {
  if (typeof raw !== "string") return { ok: false, reason: "empty" };
  // The raw cap BEFORE any scanning: this is a public endpoint, and folding whitespace walks the whole
  // string, so a huge padded payload must be refused by its length alone.
  if (raw.length > 1000) return { ok: false, reason: "too-long" };
  const body = oneLine(raw);
  if (body.length === 0) return { ok: false, reason: "empty" };
  if (renderedLength(body) > NOTE_MAX) return { ok: false, reason: "too-long" };
  return { ok: true, body };
}
