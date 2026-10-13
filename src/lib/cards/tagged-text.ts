/**
 * Free text with card tags in it, resolved for a prompt (SERVER-ONLY: it reads the catalog).
 *
 * A box that can name a card sends its body as `[[<oracle id>|<name>]]` (`notes-body.ts`). Nothing in
 * that form is trusted: the id is looked up, and the tag becomes the CATALOG's name for it, never the
 * name the client sent. An id the catalog does not hold degrades to its stored name as plain words,
 * so a forged tag can name no card. `commanderLegalOnly` also degrades a card banned in Commander, for a box where a tag becomes a requirement (a banned card can have no deck). What comes back is plain text with the names in it, which a
 * caller sends through `playerText` like any other words, and the ids that resolved.
 */
import { currentLegalNames, currentNames } from "../decks/notes-store";
import { formatTag, parseBody, plainText, tagCount } from "../decks/notes-body";
import { countCharacters } from "../copy/deck-tuning";

export type TaggedText = {
  /** The words with each resolved tag as its catalog name. */
  text: string;
  /** The same, with the resolved tags kept as tags (canonical names), for an address or a stored body. */
  body: string;
  /** The cards that resolved, once each, in the order they were first tagged. */
  tagged: { oracleId: string; name: string }[];
};

export async function resolveTaggedText(raw: string, opts: { commanderLegalOnly?: boolean } = {}): Promise<TaggedText> {
  const segments = parseBody(raw);
  const ids = [...new Set(segments.flatMap((s) => (s.kind === "tag" ? [s.oracleId] : [])))];
  const names = await (opts.commanderLegalOnly ? currentLegalNames(ids) : currentNames(ids));
  const tagged: TaggedText["tagged"] = [];
  const seen = new Set<string>();
  let text = "";
  let body = "";
  for (const s of segments) {
    if (s.kind === "text") {
      text += s.text;
      body += s.text;
      continue;
    }
    const name = names.get(s.oracleId);
    if (!name) {
      // Unknown to the catalog: plain words, as the stored name.
      text += s.name;
      body += s.name;
      continue;
    }
    text += name;
    body += formatTag(s.oracleId, name);
    if (!seen.has(s.oracleId)) {
      seen.add(s.oracleId);
      tagged.push({ oracleId: s.oracleId, name });
    }
  }
  return { text, body, tagged };
}

/** Longest raw body worth scanning for a box with this cap: a drawn character is at most two UTF-16 units, and a tag adds its 41-unit wrapper. */
export const boxRawMax = (cap: number, maxTags: number) => cap * 2 + maxTags * 41;

/**
 * The words a box that can name a card puts on the wire, checked and resolved at the server: the raw body is
 * bounded BEFORE anything scans it, a body holds at most `maxTags` tags and at most `cap` drawn code points,
 * each tag becomes the catalog's name (a card banned in Commander, or an unknown id, becomes the name it
 * carried as plain words), and the cap is checked again on the resolved words because a catalog name can be
 * longer than the one the client sent. `text` is trimmed; "" is a blank box.
 */
export async function resolveBoxText(raw: string, o: { cap: number; maxTags: number }): Promise<{ ok: true; text: string } | { ok: false }> {
  if (raw.length > boxRawMax(o.cap, o.maxTags)) return { ok: false };
  const body = raw.trim();
  if (tagCount(body) > o.maxTags || countCharacters(plainText(body)) > o.cap) return { ok: false };
  const text = (await resolveTaggedText(body, { commanderLegalOnly: true })).text.trim();
  return countCharacters(text) > o.cap ? { ok: false } : { ok: true, text };
}
