/**
 * A reader for the `window.__NUXT__` payload magic.wizards.com server-renders into every page.
 *
 * The payload is not JSON: it is a minified IIFE, `(function(a,b,…){return {…}}(arg0,arg1,…))`,
 * whose object literal names repeated values by parameter (`category:o`, `publishedAt:a`). It is
 * never executed here — it is third-party script — so this module reads it as text: the parameter
 * list, the argument list (primitives only), and the object literal, resolving a parameter
 * reference to its argument.
 */

/** A value read out of the object literal. `ref` is a parameter name, already resolved where it can be. */
export type NuxtValue =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "null" }
  | { kind: "object"; start: number; end: number }
  | { kind: "array"; start: number; end: number }
  | { kind: "unresolved"; text: string };

export type NuxtPayload = {
  /** The page source the spans below index into. */
  source: string;
  /** Start of the returned object literal (its `{`). */
  root: number;
  bindings: Map<string, NuxtValue>;
};

const SIMPLE_ESCAPES: Record<string, string> = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", "0": "\0" };

/** The end (exclusive) of the JS string literal opening at `start`, or -1 when it never closes. */
function stringEnd(s: string, start: number): number {
  const quote = s[start];
  for (let i = start + 1; i < s.length; i++) {
    if (s[i] === "\\") { i++; continue; }
    if (s[i] === quote) return i + 1;
  }
  return -1;
}

/** Decodes the JS string literal `s[start, end)` (quotes included). */
export function decodeJsString(literal: string): string {
  const body = literal.slice(1, -1);
  let out = "";
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c !== "\\") { out += c; continue; }
    const n = body[++i];
    if (n === "u") {
      if (body[i + 1] === "{") {
        // A malformed `\u{…}` (no closing brace, non-hex digits, past U+10FFFF) stays as written.
        const braced = /^\{([0-9a-fA-F]{1,6})\}/.exec(body.slice(i + 1));
        const code = braced ? parseInt(braced[1], 16) : -1;
        if (code < 0 || code > 0x10ffff) { out += "\\u"; continue; }
        out += String.fromCodePoint(code);
        i += braced![0].length;
      } else {
        out += String.fromCharCode(parseInt(body.slice(i + 1, i + 5), 16));
        i += 4;
      }
    } else if (n === "x") {
      out += String.fromCharCode(parseInt(body.slice(i + 1, i + 3), 16));
      i += 2;
    } else if (n === "\n") {
      // a line continuation adds nothing
    } else {
      out += SIMPLE_ESCAPES[n] ?? n;
    }
  }
  return out;
}

/** The end (exclusive) of the bracketed span opening at `start` (`{` or `[`), skipping string contents. */
function bracketEnd(s: string, start: number): number {
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") {
      const end = stringEnd(s, i);
      if (end < 0) return -1;
      i = end - 1;
    } else if (c === "{" || c === "[") {
      depth++;
    } else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

const skipSpace = (s: string, i: number) => {
  while (i < s.length && /\s/.test(s[i])) i++;
  return i;
};

/** A bare token (identifier, number, keyword) running from `i` to the next `,` `}` `]` or `)`. */
function bareToken(s: string, i: number): { text: string; end: number } {
  let j = i;
  while (j < s.length && !",}])".includes(s[j])) j++;
  return { text: s.slice(i, j).trim(), end: j };
}

function primitive(text: string): NuxtValue | null {
  if (text === "true" || text === "!0") return { kind: "boolean", value: true };
  if (text === "false" || text === "!1") return { kind: "boolean", value: false };
  if (text === "null" || text === "void 0" || text === "undefined") return { kind: "null" };
  if (/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(text)) return { kind: "number", value: Number(text) };
  return null;
}

/** Reads one value at `i`: a string, a bracketed span, or a bare token. */
function readValue(s: string, i: number): { value: NuxtValue; end: number } | null {
  i = skipSpace(s, i);
  const c = s[i];
  if (c === '"' || c === "'") {
    const end = stringEnd(s, i);
    if (end < 0) return null;
    return { value: { kind: "string", value: decodeJsString(s.slice(i, end)) }, end };
  }
  if (c === "{" || c === "[") {
    const end = bracketEnd(s, i);
    if (end < 0) return null;
    return { value: { kind: c === "{" ? "object" : "array", start: i, end }, end };
  }
  const { text, end } = bareToken(s, i);
  if (!text) return null;
  return { value: primitive(text) ?? { kind: "unresolved", text }, end };
}

/**
 * Finds the payload in a page. Null when the page carries no `window.__NUXT__` IIFE, or when its
 * parameter and argument lists cannot be read.
 */
export function readNuxtPayload(html: string): NuxtPayload | null {
  const head = /window\.__NUXT__\s*=\s*\(function\(([^)]*)\)\s*\{\s*return\s*/.exec(html);
  if (!head) return null;
  const params = head[1].split(",").map((p) => p.trim()).filter(Boolean);
  const root = head.index + head[0].length;
  if (html[root] !== "{") return null;
  const rootEnd = bracketEnd(html, root);
  if (rootEnd < 0) return null;
  // `return {…}}(args))`: the function body's closing brace, then the call.
  let i = skipSpace(html, rootEnd);
  if (html[i] === ";") i = skipSpace(html, i + 1);
  if (html[i] !== "}") return null;
  i = skipSpace(html, i + 1);
  if (html[i] !== "(") return null;
  i++;
  const args: NuxtValue[] = [];
  for (;;) {
    i = skipSpace(html, i);
    if (html[i] === ")") break;
    const read = readValue(html, i);
    if (!read) return null;
    args.push(read.value);
    i = skipSpace(html, read.end);
    if (html[i] === ",") i++;
    else if (html[i] !== ")") return null;
  }
  const bindings = new Map<string, NuxtValue>();
  params.forEach((p, k) => bindings.set(p, args[k] ?? { kind: "null" }));
  return { source: html, root, bindings };
}

/**
 * The properties of the object literal opening at `start`, parameter references resolved. Null when
 * `start` is not an object literal or the literal is malformed.
 */
export function readObject(payload: NuxtPayload, start: number): Map<string, NuxtValue> | null {
  const s = payload.source;
  if (s[start] !== "{") return null;
  const props = new Map<string, NuxtValue>();
  let i = start + 1;
  for (;;) {
    i = skipSpace(s, i);
    if (s[i] === "}") return props;
    let key: string;
    if (s[i] === '"' || s[i] === "'") {
      const end = stringEnd(s, i);
      if (end < 0) return null;
      key = decodeJsString(s.slice(i, end));
      i = end;
    } else {
      const m = /^[A-Za-z_$][\w$]*/.exec(s.slice(i, i + 200));
      if (!m) return null;
      key = m[0];
      i += key.length;
    }
    i = skipSpace(s, i);
    if (s[i] !== ":") return null;
    const read = readValue(s, i + 1);
    if (!read) return null;
    const v = read.value;
    props.set(key, v.kind === "unresolved" ? (payload.bindings.get(v.text) ?? v) : v);
    i = skipSpace(s, read.end);
    if (s[i] === ",") i++;
    else if (s[i] !== "}") return null;
  }
}

/** Follows a path of property names from `start` through nested objects. */
export function readPath(payload: NuxtPayload, start: number, path: readonly string[]): NuxtValue | null {
  let value: NuxtValue = { kind: "object", start, end: -1 };
  for (const key of path) {
    if (value.kind !== "object") return null;
    const next: NuxtValue | undefined = readObject(payload, value.start)?.get(key);
    if (!next) return null;
    value = next;
  }
  return value;
}

export const asString = (v: NuxtValue | null | undefined): string | null =>
  v?.kind === "string" ? v.value : null;
