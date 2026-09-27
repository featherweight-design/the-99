/**
 * Plain data for the data cache, which stores JSON: a `Date` travels as `{ "$date": "<ISO>" }`
 * and a `Map` as `{ "$map": [[key, value], ...] }`, and both come back as themselves.
 *
 * Tagged generically rather than revived field by field, because a page payload is assembled
 * from a dozen loaders and a field added to any of them later would otherwise come back a
 * string, or `{}`, with nothing noticing until a reader called `.getTime()` on it. The card
 * detail wire (`src/lib/cards/card-detail-wire.ts`) learned that the hard way.
 */
const DATE = "$date";
const MAP = "$map";

export function encodePlain(value: unknown): string {
  // `this[key]` is the value BEFORE its own `toJSON`, which is the only place a Date is still one.
  return JSON.stringify(value, function (this: Record<string, unknown>, key, v) {
    const raw = this[key];
    if (raw instanceof Date) return { [DATE]: raw.toISOString() };
    if (raw instanceof Map) return { [MAP]: [...raw.entries()] };
    return v;
  });
}

export function decodePlain<T>(text: string): T {
  return JSON.parse(text, (_key, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const keys = Object.keys(v);
      if (keys.length === 1 && keys[0] === DATE && typeof v[DATE] === "string") return new Date(v[DATE]);
      if (keys.length === 1 && keys[0] === MAP && Array.isArray(v[MAP])) return new Map(v[MAP]);
    }
    return v;
  }) as T;
}
