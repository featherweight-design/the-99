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
  if (scope === null) return null;
  // Any value that is not `play` is the owned lane, which is what the parameter
  // meant while it existed: the control wrote `play` and deleted the key for
  // owned, so `owned`, an empty value and a hand-edited one all resolved the
  // same way. Redirecting on the key's presence rather than on a pair of
  // spellings is what lets every legacy URL shed it on the first visit.
  const lane = scope === "play" ? "discover" : "owned";
  const params = parseLaneParams(sp, lane);
  const qs = new URLSearchParams(serializeLaneParams(params, lane).slice(1));
  // An explicit `a=all` (or legacy `avail=all`) wins over the reader's saved mode, so it survives
  // the redirect. Serialized against the default `all` it would vanish, and a reader whose saved
  // mode is `free` would land in Free under a link that asked for All.
  if (lane === "owned" && (sp.get("a") ?? sp.get("avail")) === "all") qs.set("a", "all");
  const query = qs.toString();
  return `${lane === "discover" ? "/discover" : "/commanders"}${query ? `?${query}` : ""}`;
}
