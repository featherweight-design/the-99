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
  // Depth/string state for the top-level key scan, carried across chunks.
  let scanDepth = 0;
  let scanStr = false;
  let scanEsc = false;
  let scanFrom = 0;

  let depth = 0;
  let inString = false;
  let escaped = false;
  let element = "";

  const findArrayStart = (): boolean => {
    // TOP-LEVEL ONLY, tracked by depth.
    //
    // An earlier version required the `[` after the key and claimed that handled a nested
    // decoy. It does not: `{"meta":{"variants":[…]},"variants":[…]}` has a nested key that IS
    // followed by `[`, so the scan took the decoy and returned successfully — ingesting the
    // wrong array and reporting a clean run. Requiring the bracket only rules out a nested
    // key holding a STRING, which is the weaker case and the one the old test happened to use.
    //
    // So the scan walks the document counting brace/bracket depth, in string state, and
    // accepts the key only at depth 1 — where the real one lives. `depthScanned` carries that
    // state across chunk boundaries, since the key can arrive in any chunk.
    for (;;) {
      // Advance the depth scan to the next occurrence of the key, so `scanDepth` describes
      // the nesting AT that key rather than at the start of the buffer.
      const k = buf.indexOf(ARRAY_KEY, scanFrom);
      // With no match, stop the depth scan short of the tail we are about to RETAIN, so those
      // characters are counted exactly once — when the next chunk arrives and they are
      // rescanned. Counting them now and again later corrupts the depth by however many
      // braces the tail holds.
      const keep = k === -1 ? Math.min(buf.length - scanFrom, ARRAY_KEY.length - 1) : 0;
      const upto = k === -1 ? buf.length - keep : k;
      for (let i = scanFrom; i < upto; i++) {
        const ch = buf[i];
        if (scanEsc) { scanEsc = false; continue; }
        if (ch === "\\" && scanStr) { scanEsc = true; continue; }
        if (ch === '"') { scanStr = !scanStr; continue; }
        if (scanStr) continue;
        if (ch === "{" || ch === "[") scanDepth++;
        else if (ch === "}" || ch === "]") scanDepth--;
      }
      if (k === -1) {
        buf = buf.slice(upto);
        scanFrom = 0;
        return false;
      }
      const rest = buf.slice(k + ARRAY_KEY.length);
      const m = /^\s*:\s*\[/.exec(rest);
      // Depth 1 is the top level: the document's own `{` opened depth 1, and a key inside a
      // nested object sits at 2 or deeper. A decoy `{"meta":{"variants":[…]}}` is skipped
      // here rather than ingested as the real array.
      if (m && scanDepth === 1 && !scanStr) {
        buf = rest.slice(m[0].length);
        scanFrom = 0;
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
      if (m === null && /^\s*:?\s*$/.test(rest)) {
        // Waiting for the separator. Anchor the scan AT this key so the next entry does not
        // re-count the characters before it — re-counting the document's opening `{` on every
        // chunk is what drove the depth past 1 and lost the array entirely.
        scanFrom = k;
        return false;
      }
      // Step past this occurrence, counting the key's own characters into the depth scan.
      scanFrom = k + ARRAY_KEY.length;
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
