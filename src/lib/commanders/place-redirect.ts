type RawQuery = Record<string, string | string[] | undefined>;

/** `path` with the request's query string kept, repeated parameters included. */
export function pathWithQuery(path: string, raw: RawQuery): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) for (const v of value) qs.append(key, v);
    else if (value !== undefined) qs.append(key, value);
  }
  const query = qs.toString();
  return query ? `${path}?${query}` : path;
}
