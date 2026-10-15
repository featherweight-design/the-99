/**
 * The social rules a client may run too, so nothing here imports Node or the database: the name caps
 * (E14), the friend link's address (E7) and its QR code (E13). `rules.ts` re-exports the caps for the
 * server side.
 */
import { encode } from "uqr";

// --- Name caps -------------------------------------------------------------------------------------
// Counted the way the database counts them. An HTML `maxLength` counts UTF-16 units, so it refuses a valid
// name holding an emoji (one code point, two units) and is never used for these.

export const DISPLAY_NAME_MAX = 30;
export const POD_NAME_MAX = 40;

/** The most friends one Add batch may name: a pod is a table, not a mailing list. `addMembers` refuses more. */
export const ADD_MEMBERS_MAX = 32;

/** Code points, which is what `cleanName` and the columns' `char_length` checks count. */
export function codePointLength(s: string): number {
  return [...s].length;
}

/** The length `cleanName` measures: NFC, whitespace runs collapsed to one space, trimmed. */
function cleanLength(s: string): number {
  return codePointLength(s.normalize("NFC").replace(/\s+/gu, " ").trim());
}

/**
 * What a name field keeps of `value` as it is typed: the value itself while its cleaned form (what
 * `cleanName` will store, so collapsed spaces and trimmed ends do not count) fits in `max` code points, else
 * its leading whole characters whose cleaned form fits. Cut by grapheme, so a composed emoji is kept whole
 * or dropped whole, never left as a stray half.
 */
export function capName(value: string, max: number): string {
  if (cleanLength(value) <= max) return value;
  let kept = "";
  for (const { segment } of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value.normalize("NFC"))) {
    if (cleanLength(kept + segment) > max) break;
    kept += segment;
  }
  return kept;
}

// --- The friend link -------------------------------------------------------------------------------
// The origin is the request's own, so a link made on staging, on a preview or on localhost points back
// where it was made, never at a hard-coded host.

/** The shape `newInviteToken` makes: 128 bits as base64url, 22 characters. Anything else names no link. */
export function isInviteToken(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{22}$/.test(v);
}

/** The path a friend link opens. */
export function invitePath(token: string): string {
  return `/friend/${token}`;
}

const first = (v: string | null) => v?.split(",")[0]?.trim() || null;

/**
 * `https://host[:port]` from a request's headers: the forwarded host and protocol a proxy (Vercel) sets,
 * else `host`. Null when no host is given or it is not a bare host name, so a malformed header can never
 * put a path, a userinfo part or a second scheme into a link a player will send on.
 */
export function originFrom(h: { get(name: string): string | null }): string | null {
  const host = first(h.get("x-forwarded-host")) ?? first(h.get("host"));
  if (!host || !/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)) return null;
  const forwarded = first(h.get("x-forwarded-proto"));
  const local = /^(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(host);
  const proto = forwarded === "http" || forwarded === "https" ? forwarded : local ? "http" : "https";
  return `${proto}://${host}`;
}

// --- Its QR code -----------------------------------------------------------------------------------
// From `uqr` (MIT, no dependencies): pure arithmetic over the text it is given, so it draws on the server
// or in the browser and makes no network call. One `M x y h1 v1 h-1 z` square per dark module, on a grid
// `size` modules wide with the quiet zone (`border` modules) included.

export type QrPath = { size: number; d: string };

export function qrPath(text: string, border = 2): QrPath {
  const { data, size } = encode(text, { ecc: "M", border });
  const parts: string[] = [];
  data.forEach((row, y) => row.forEach((dark, x) => {
    if (dark) parts.push(`M${x} ${y}h1v1h-1z`);
  }));
  return { size, d: parts.join("") };
}

// --- The receipt after Accept (E10) ----------------------------------------------------------------
// Accept on `/friend/[token]` lands on `/friends` carrying the new friend's `publicId`, never a name or a
// Clerk id; `/friends` resolves it through the reader's own `listFriends`, so a forged or stale id draws no
// receipt at all.

export const ACCEPTED_PARAM = "accepted";

/** Where an accepted request lands: `/friends`, with the new friend's receipt resolved by `publicId` (E10). */
export function friendsReceiptPath(publicId: string): string {
  return `/friends?${ACCEPTED_PARAM}=${encodeURIComponent(publicId)}`;
}

/** The most cards one spares read asks about (`GET /api/friend-spares`): a request past it is refused rather than cut. */
export const MAX_SPARES_BATCH = 200;
