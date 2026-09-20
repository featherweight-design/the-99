import { describe, expect, it } from "vitest";

import { streamVariants } from "./bulk";

/**
 * Feeds a string to the parser in fixed-size chunks, as a Web ReadableStream of bytes —
 * the shape `fetch().body` gives. The chunk size is a parameter because a record straddling
 * a chunk boundary is one of the two things that defeats a naive scanner, and a test that
 * always hands over the whole document in one piece cannot see it.
 */
function chunked(text: string, size = 8): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  let i = 0;
  return new ReadableStream({
    pull(c) {
      if (i >= bytes.length) return void c.close();
      c.enqueue(bytes.slice(i, i + size));
      i += size;
    },
  });
}

async function collect(text: string, size?: number): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for await (const v of streamVariants(chunked(text, size))) out.push(v);
  return out;
}

const doc = (inner: string) => `{"timestamp":"x","version":"6.5.0","variants":[${inner}]}`;

describe("streamVariants", () => {
  it("yields each variant object once", async () => {
    const got = await collect(doc(`{"id":"a"},{"id":"b"},{"id":"c"}`));
    expect(got.map((v) => v.id)).toEqual(["a", "b", "c"]);
  });

  // Oracle text is full of braces and brackets, and the parser counts depth. A scanner that
  // does not track string state closes the object early and then parses garbage.
  it("survives braces and brackets inside strings", async () => {
    const got = await collect(doc(`{"id":"a","t":"{T}: Add {G}{G}. [sic] }}}"},{"id":"b"}`));
    expect(got.map((v) => v.id)).toEqual(["a", "b"]);
    expect(got[0].t).toBe("{T}: Add {G}{G}. [sic] }}}");
  });

  it("survives escaped quotes inside strings", async () => {
    const got = await collect(doc(`{"id":"a","n":"say \\"hi\\" }"},{"id":"b"}`));
    expect(got.map((v) => v.id)).toEqual(["a", "b"]);
    expect(got[0].n).toBe('say "hi" }');
  });

  // An escaped BACKSLASH must not escape the quote that follows it. `"a\\"` is a complete
  // string whose content is one backslash; a parser that treats the `\"` as escaped runs on
  // and swallows the rest of the document.
  it("survives a trailing escaped backslash before the closing quote", async () => {
    const got = await collect(doc(`{"id":"a","p":"C:\\\\"},{"id":"b"}`));
    expect(got.map((v) => v.id)).toEqual(["a", "b"]);
    expect(got[0].p).toBe("C:\\");
  });

  it("survives an object split across chunk boundaries", async () => {
    const got = await collect(doc(`{"id":"a","deep":{"x":[1,2,{"y":"z"}]}},{"id":"b"}`), 3);
    expect(got.map((v) => v.id)).toEqual(["a", "b"]);
  });

  // A multi-byte character split down the middle by a chunk boundary must not corrupt.
  // Spellbook escapes most of these, but the decoder has to be streaming regardless.
  it("survives a multi-byte character split across chunks", async () => {
    const got = await collect(doc(`{"id":"a","n":"Æther Vial — ✦"},{"id":"b"}`), 5);
    expect(got[0].n).toBe("Æther Vial — ✦");
    expect(got.map((v) => v.id)).toEqual(["a", "b"]);
  });

  // A fixed character budget between the key and its `[` cannot tell "the separator is still
  // in flight" from "this is a different key". The first version allowed seven characters, so
  // a document with more whitespace than that had the key trimmed out of the buffer and threw
  // "no variants array" at every chunk size.
  it("survives arbitrary whitespace between the key and its bracket", async () => {
    const got = await collect(`{"variants"${" ".repeat(40)}:${" ".repeat(40)}[{"id":"a"}]}`, 3);
    expect(got.map((v) => v.id)).toEqual(["a"]);
  });

  it("survives a newline-formatted separator", async () => {
    const got = await collect(`{\n  "variants"\n    :\n  [\n    {"id":"a"}\n  ]\n}`, 5);
    expect(got.map((v) => v.id)).toEqual(["a"]);
  });

  it("ignores keys before the variants array", async () => {
    const got = await collect(
      `{"timestamp":"2026-01-01","meta":{"variants":"not the array","n":[{"id":"decoy"}]},` +
        `"variants":[{"id":"real"}]}`,
    );
    expect(got.map((v) => v.id)).toEqual(["real"]);
  });

  // The decoy that defeated the previous version. Requiring the `[` after the key rules out a
  // nested key holding a STRING — which is all the old test used — but a nested key holding a
  // real ARRAY passes that check, and the scan took it and reported a clean run over the
  // wrong data. Depth is what tells them apart.
  it("ignores a nested variants ARRAY and takes the top-level one", async () => {
    const got = await collect(
      `{"meta":{"variants":[{"id":"decoy"}]},"variants":[{"id":"real"}]}`,
    );
    expect(got.map((v) => v.id)).toEqual(["real"]);
  });

  it("ignores a nested decoy split across chunks", async () => {
    const got = await collect(
      `{"meta":{"nested":{"variants":[{"id":"decoy"},{"id":"decoy2"}]}},"variants":[{"id":"real"}]}`,
      4,
    );
    expect(got.map((v) => v.id)).toEqual(["real"]);
  });

  it("yields nothing for an empty variants array", async () => {
    expect(await collect(doc(""))).toEqual([]);
  });

  // A truncated download must not look like a short-but-complete ingest. The publish that
  // consumes this clears the table first, so a silent partial is a wholesale data loss.
  it("throws on truncated input rather than yielding a partial", async () => {
    await expect(collect(`{"variants":[{"id":"a"},{"id":"b`)).rejects.toThrow(/truncated/i);
  });

  it("throws when the document has no variants array at all", async () => {
    await expect(collect(`{"timestamp":"x"}`)).rejects.toThrow(/variants/i);
  });
});
