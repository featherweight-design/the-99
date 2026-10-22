import { requireUserId } from "../auth";
import { requestSwitchEnv } from "../switches/request";
import { commandersPlaceEnabled } from "./place-flag";

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

/**
 * Where a retired route sends the reader: the tab's address with the query kept, when
 * `COMMANDERS_PLACE_ENABLED` is on for them; `null` otherwise, and the route answers in place as shipped.
 * Read per reader (`requestSwitchEnv`). A temporary redirect, never a permanent one: the switch can go back off.
 */
export async function placeRedirect(path: string, raw: RawQuery): Promise<string | null> {
  const env = await requestSwitchEnv(await requireUserId());
  return commandersPlaceEnabled(env) ? pathWithQuery(path, raw) : null;
}
