/**
 * An incremental reader for Commander Spellbook's `variants.json`.
 *
 * WHY NOT `streamBulkEntries`. Scryfall's bulk is JSONL — one complete object per line — so
 * that helper reads lines. Spellbook's bulk is ONE JSON DOCUMENT with a `variants` array,
 * 656 MB of it, about 90% image URLs this ingest discards. `JSON.parse` on the whole thing
 * needs the entire document resident as a string first; a line reader finds no lines. So the
 * array is walked element by element and each element parsed on its own.
 *
 * The parser tracks depth, string state and escapes, because all three are reachable in this
 * data: oracle text carries `{T}`, `[sic]` and stray braces, card names carry escaped quotes,
 * and a Windows-style path would end a string with an escaped backslash. It also decodes the
 * byte stream incrementally (`TextDecoder` with `stream: true`), so a multi-byte character
 * split across a chunk boundary is not corrupted.
 *
 * TRUNCATION THROWS. The publish that consumes this clears its tables first, so a download
 * cut short must not read as a short-but-complete ingest — that is wholesale data loss behind
 * a green job.
 */

const ARRAY_KEY = '"variants"';

export async function* streamVariants(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buf = "";
  let started = false; // have we reached `"variants": [` yet
  let done = false; // have we seen the array's closing `]`

  // Parser state for the element currently being accumulated.
  let depth = 0;
  let inString = false;
  let escaped = false;
  let element = "";

  const findArrayStart = (): boolean => {
    // The key can appear inside a nested object before the real one (a `meta` block naming
    // it, say), so require the `[` that follows it rather than the key alone.
    let from = 0;
    for (;;) {
      const k = buf.indexOf(ARRAY_KEY, from);
      if (k === -1) {
        // Keep only a tail long enough to re-match a key split across chunks.
        if (buf.length > ARRAY_KEY.length) buf = buf.slice(-ARRAY_KEY.length);
        return false;
      }
      const rest = buf.slice(k + ARRAY_KEY.length);
      const m = /^\s*:\s*\[/.exec(rest);
      if (m) {
        buf = rest.slice(m[0].length);
        return true;
      }
      // Not followed by `: [`. Two cases, and conflating them loses the document.
      //
      // The separator may still be IN FLIGHT — the key landed at the end of a chunk and its
      // `: [` is in the next one. A fixed character budget cannot tell that from a genuinely
      // different key: an earlier version allowed 7 characters, so a document formatted with
      // more whitespace than that between the key and its bracket fell through to the rescan
      // below, found no second occurrence, and had the key trimmed out of the buffer
      // permanently — `{"variants"          :          [ … ]}` threw "no variants array" at
      // every chunk size. So the test is what the text IS, not how long it is: while every
      // character after the key is still a legal prefix of `: [`, wait for more.
      if (/^\s*:?\s*$/.test(rest)) return false;
      from = k + 1;
    }
  };

  for (;;) {
    const { value, done: streamDone } = await reader.read();
    if (value) buf += decoder.decode(value, { stream: true });
    else if (streamDone) buf += decoder.decode();

    if (!started) {
      started = findArrayStart();
      if (!started) {
        if (streamDone) throw new Error("spellbook bulk: no `variants` array in the document");
        continue;
      }
    }

    // Walk what we have, emitting each complete element.
    let i = 0;
    while (i < buf.length) {
      const ch = buf[i];

      if (depth === 0) {
        // Between elements: skip whitespace and commas, and stop at the array's end.
        if (ch === "]") {
          done = true;
          break;
        }
        if (ch === "{") {
          depth = 1;
          element = "{";
          i++;
          continue;
        }
        i++;
        continue;
      }

      element += ch;
      i++;

      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\" && inString) {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (ch === "{" || ch === "[") depth++;
      else if (ch === "}" || ch === "]") {
        depth--;
        if (depth === 0) {
          yield JSON.parse(element) as Record<string, unknown>;
          element = "";
        }
      }
    }

    buf = done ? "" : buf.slice(i);

    if (done) return;
    if (streamDone) {
      // The stream ended without the array's `]`. Mid-element or not, this is a cut download.
      throw new Error("spellbook bulk: stream ended mid-array — download was truncated");
    }
  }
}
