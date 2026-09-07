import { parseLaneParams, serializeLaneParams } from "../../lib/commanders/lane-params";

// The legacy `scope` toggle became two routes. A bookmark keeps its colours,
// its search, its match mode and its ranking; availability is dropped silently
// on the play redirect because the discover lane no longer has that control.
//
// The legacy keys need no handling here: `parseLaneParams` reads `join`,
// `avail` and `sort` as fallbacks, and `serializeLaneParams` writes only the
// new ones, so the redirect emits a clean URL from a legacy one.
export function scopeRedirectTarget(sp: URLSearchParams): string | null {
  const scope = sp.get("scope");
  if (scope !== "play" && scope !== "own") return null;
  const lane = scope === "play" ? "discover" : "owned";
  const params = parseLaneParams(sp, lane);
  return `${lane === "discover" ? "/discover" : "/commanders"}${serializeLaneParams(params, lane)}`;
}
