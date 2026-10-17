// Card scanning's server match (plan `2026-10-16-card-scan.md` PR 1): the phone sends the embedder's fingerprint of
// a card, and this answers with up to three guesses, one per card, and the margin between the first two. Its
// contract, which PR 2's client is built against:
//   - the reader comes from the Clerk session. A signed-out request is turned away by the proxy's `auth.protect()`
//     before it arrives (this path is not public), so a client reads ANY non-JSON answer as signed out; the 401
//     below is the handler not trusting that, as `/api/card-detail`'s is;
//   - `CARD_SCAN_ENABLED` is re-checked for that reader, and off answers 404, as a route that is not there;
//   - the body is `{ model, embedding }`, the embedding base64 of 256 little-endian float32 at unit length; anything
//     else is 400 before anything is read;
//   - a model other than the index's is 409, naming both, and an empty or unreadable index is 503;
//   - every answer is `private, no-store`, and each request is counted in the observe-only `card-scan` bucket.
// A route rather than a server action because the scanner asks in the background while the camera runs: Next runs a
// page's actions one at a time, and a lookup queued as an action would wait on, and delay, the reader's adds.
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { cardScanEnabled } from "../../../../lib/card-scan/flag";
import { readCapped } from "../../../../lib/http/read-capped";
import { lookupGuesses } from "../../../../lib/card-scan/lookup";
import { decodeEmbedding } from "../../../../lib/card-scan/match";
import { observeHit } from "../../../../lib/rate/observe";
import { requestSwitchEnv } from "../../../../lib/switches/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Content-Type": "application/json", "Cache-Control": "private, no-store" };

/** The largest body a fingerprint request can be: the base64 (1,368 chars) and the model string, with room. */
const MAX_BODY = 4096;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(null, { status: 401, headers: HEADERS });
  if (!cardScanEnabled(await requestSwitchEnv(userId))) return NextResponse.json(null, { status: 404, headers: HEADERS });
  await observeHit(userId, "card-scan");
  // Read as a stream and abandoned at the cap, so an oversized or chunked body is never buffered whole.
  const text = await readCapped(req, MAX_BODY);
  let body: unknown = null;
  if (text !== null) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  const { model, embedding } = (body ?? {}) as { model?: unknown; embedding?: unknown };
  const vec = decodeEmbedding(embedding);
  if (typeof model !== "string" || !vec) {
    return NextResponse.json({ error: "bad-embedding" }, { status: 400, headers: HEADERS });
  }
  let result;
  try {
    result = await lookupGuesses(vec, model);
  } catch (err) {
    console.error("[card-scan] lookup failed", err instanceof Error ? err.message : "unknown");
    // A database without the migration, or with pgvector missing, has no index to read: `no-index`, which the scanner
    // says as not ready and never retries. Anything else (the lock an ingest holds while it republishes, a dropped
    // connection) may pass, so it is `unavailable`, which the scanner retries.
    const error = missingIndex(err) ? "no-index" : "unavailable";
    return NextResponse.json({ error }, { status: 503, headers: HEADERS });
  }
  if (result.kind === "no-index") return NextResponse.json({ error: "no-index" }, { status: 503, headers: HEADERS });
  if (result.kind === "model") {
    return NextResponse.json({ error: "model", index: result.index.version, model: result.index.model }, { status: 409, headers: HEADERS });
  }
  return NextResponse.json({ index: result.index, guesses: result.answer.guesses, margin: result.answer.margin }, { headers: HEADERS });
}

/** Postgres's undefined table (42P01) or undefined object (42704, a `halfvec` type pgvector never installed), on the
 * error or the cause the driver wrapped it in. */
function missingIndex(err: unknown): boolean {
  for (let e: unknown = err, i = 0; e && i < 3; e = (e as { cause?: unknown }).cause, i++) {
    const code = (e as { code?: unknown }).code;
    if (code === "42P01" || code === "42704") return true;
  }
  return false;
}
