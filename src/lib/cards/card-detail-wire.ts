/**
 * The card detail payload on the wire, `GET /api/card-detail`. JSON, with one addition: a `Date`
 * travels as `{ "$date": "<ISO>" }` and comes back a `Date`.
 *
 * The server action (`getCardDetail`, the press's read) is serialized in React's own format,
 * which keeps a `Date` a `Date`. Plain JSON does not, and the route's first build sent it: a price fact's `asOf` arrived as a string, and the modal's
 * `asOf.getTime()` threw and took the page down on the first press. Tagging every `Date`, rather
 * than reviving the two fields that hold one today, is what keeps a third field added later from
 * doing the same.
 */
const TAG = "$date";

export function encodeCardDetail(value: unknown): string {
  // `this[key]` is the value BEFORE its own `toJSON`, which is the only place a Date is still one.
  return JSON.stringify(value, function (this: Record<string, unknown>, key, v) {
    const raw = this[key];
    return raw instanceof Date ? { [TAG]: raw.toISOString() } : v;
  });
}

export function decodeCardDetail<T>(text: string): T {
  return JSON.parse(text, (_key, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const keys = Object.keys(v);
      if (keys.length === 1 && keys[0] === TAG && typeof v[TAG] === "string") return new Date(v[TAG]);
    }
    return v;
  }) as T;
}
