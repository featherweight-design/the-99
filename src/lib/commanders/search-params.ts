/**
 * A route's `searchParams` as the `URLSearchParams` every parser in this
 * codebase reads.
 *
 * Not a cast: Next hands a repeated key back as an array, and casting the record
 * to `Record<string, string>` would stringify `["b", "g"]` to `"b,g"` — a value
 * the parsers accept and the reader never wrote. Each occurrence is appended, so
 * a repeated key resolves to its first value, exactly as it does on the client
 * where `useSearchParams().get` reads the same URL.
 */
export function searchParamsToQuery(sp: {
  [key: string]: string | string[] | undefined;
}): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value == null) continue;
    for (const v of Array.isArray(value) ? value : [value]) out.append(key, v);
  }
  return out;
}
