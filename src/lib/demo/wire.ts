// The demo's data on disk: JSON that keeps what JSON cannot. The loaders' results hold `Date`s (`asOf`, `analyzedAt`,
// `startedAt`), `Map`s (a ranking by slug, the ledger's availability) and `Set`s (locked cards), none of which survive
// `JSON.stringify`. `encodeDemo` writes each as a tagged object and `decodeDemo` reads it back, so the drawing halves get
// the same shapes the signed-in pages give them. Pure: the exporter encodes, the demo decodes.

const DATE = "$date";
const MAP = "$map";
const SET = "$set";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** `value` as plain JSON, with every Date, Map and Set tagged. Throws on a function, a symbol or a non-finite number. */
export function encodeDemo(value: unknown): Json {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (value === undefined) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`encodeDemo: a non-finite number (${value}) cannot be stored`);
    return value;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error("encodeDemo: an invalid Date cannot be stored");
    return { [DATE]: value.toISOString() };
  }
  if (value instanceof Map) return { [MAP]: [...value].map(([k, v]) => [encodeDemo(k), encodeDemo(v)]) };
  if (value instanceof Set) return { [SET]: [...value].map(encodeDemo) };
  if (Array.isArray(value)) return value.map(encodeDemo);
  if (typeof value === "object") {
    const out: { [key: string]: Json } = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) if (v !== undefined) out[k] = encodeDemo(v);
    return out;
  }
  throw new Error(`encodeDemo: a ${typeof value} cannot be stored`);
}

/** The inverse of `encodeDemo`: the tagged objects become Dates, Maps and Sets again; everything else is as it was. */
export function decodeDemo<T = unknown>(json: unknown): T {
  return decode(json) as T;
}

function decode(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(decode);
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length === 1) {
      if (keys[0] === DATE && typeof o[DATE] === "string") return new Date(o[DATE]);
      if (keys[0] === MAP && Array.isArray(o[MAP])) return new Map((o[MAP] as unknown[][]).map(([k, v]) => [decode(k), decode(v)]));
      if (keys[0] === SET && Array.isArray(o[SET])) return new Set((o[SET] as unknown[]).map(decode));
    }
    return Object.fromEntries(keys.map((k) => [k, decode(o[k])]));
  }
  return node;
}
