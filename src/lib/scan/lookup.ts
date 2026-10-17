// The phone's half of `POST /api/card-scan/match` (served by `src/app/api/card-scan/match`) (plan `2026-10-16-card-scan.md`): it sends the card's embedding,
// never the frame, once per stable card (`stable-card.ts`), and turns the answer into what a scanner shows. A failure
// that may pass (the network, a server error, an index not yet loaded) is retried with a backoff while the scanner
// says it is unsure and retrying; one that will not pass (signed out, the switch off, a model the server does not
// hold, a body it cannot read) is not.
import type { Guess as ServerGuess } from "../card-scan/match";

export type LookupResult =
  | { kind: "match"; index: string; guesses: ServerGuess[]; margin: number | null; sure: boolean }
  | { kind: "refused"; reason: "signedOut" | "off" | "model" | "badEmbedding" | "unavailable" }
  | { kind: "failed" };

/** Retries after the first try, and the wait before each (ms). */
export const LOOKUP_BACKOFF_MS = [500, 1500] as const;

/** The embedding as the route reads it: base64 of its float32 values, little-endian. */
export function encodeEmbedding(v: Float32Array): string {
  const bytes = new Uint8Array(v.length * 4);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < v.length; i++) view.setFloat32(i * 4, v[i], true);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/**
 * The sure gate (d9 for Hugh, 2026-10-16): the top guess is the card only when it clears the runner-up by
 * `SURE_MARGIN`. Under it the scanner never adds by itself and shows the guesses to pick from (Not sure). Measured on
 * the lab's 360 real phone photos with a known card: at 0.02, 94% were sure and 2.4% of those named the wrong card; at
 * 0.10, 83% were sure and none was wrong. On its cadence logs, 26 of 80 frames between 0.02 and 0.10 were wrong. A lone
 * guess (an index of one card) is sure.
 */
export const SURE_MARGIN = 0.1;

export function marginClears(margin: number | null): boolean {
  return margin === null || margin >= SURE_MARGIN;
}

type Fetch = (url: string, init: RequestInit) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;
type Deps = { fetch: Fetch; wait: (ms: number) => Promise<void>; onRetry?: (attempt: number) => void; signal?: AbortSignal };

const REFUSED: Record<number, "signedOut" | "off" | "badEmbedding" | "model"> = { 400: "badEmbedding", 401: "signedOut", 404: "off", 409: "model" };

/** A refusal the ROUTE wrote is JSON; the proxy's own answer to a signed-out request (its 404) is not, and is unavailable. */
async function refusalOf(res: { status: number; json(): Promise<unknown> }): Promise<LookupResult | null> {
  const reason = REFUSED[res.status];
  if (!reason) return null;
  const isJson = await res.json().then(() => true, () => false);
  return { kind: "refused", reason: isJson ? reason : "unavailable" };
}

/** One lookup, with its retries. `onRetry` fires before each retry, so the scanner can say it is retrying. */
export async function lookupCard(embedding: Float32Array, model: string, deps: Deps): Promise<LookupResult> {
  const body = JSON.stringify({ model, embedding: encodeEmbedding(embedding) });
  for (let attempt = 0; ; attempt++) {
    if (deps.signal?.aborted) return { kind: "failed" };
    try {
      const res = await deps.fetch("/api/card-scan/match", {
        method: "POST", headers: { "content-type": "application/json" }, body, cache: "no-store", signal: deps.signal,
      });
      // A signed-out request never reaches the route: the proxy answers it with Clerk's own redirect (followed here, to
      // a page that is not JSON) or its 404. So only the route's own JSON is read as an answer; a success that is not
      // it is unavailable, never retried.
      const refused = await refusalOf(res);
      if (refused) return refused;
      if (res.ok) {
        const body = (await res.json().catch(() => null)) as { index?: unknown; guesses?: unknown; margin?: unknown } | null;
        if (!body || typeof body.index !== "string" || !Array.isArray(body.guesses)) return { kind: "refused", reason: "unavailable" };
        const guesses = body.guesses as ServerGuess[];
        const margin = typeof body.margin === "number" ? body.margin : null;
        return { kind: "match", index: body.index, guesses, margin, sure: guesses.length > 0 && marginClears(margin) };
      }
    } catch {
      // the network, or an answer that was not JSON: retried like a server error
    }
    if (attempt >= LOOKUP_BACKOFF_MS.length || deps.signal?.aborted) return { kind: "failed" };
    deps.onRetry?.(attempt + 1);
    await deps.wait(LOOKUP_BACKOFF_MS[attempt]);
  }
}
