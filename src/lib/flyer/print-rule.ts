/**
 * The print page's pure rules (flyer trial PR 4c; board `Print.dc.html`): the address a flyer's QR encodes and what a
 * code must be to be printed. No database, no request: the origin is the deployment's own (`siteOrigin`), never a header.
 */
import { qrPath, type QrPath } from "../social/client-rules";

/** Where the board's flyer points when the deployment names no domain (off Vercel). */
export const FLYER_FALLBACK_ORIGIN = "https://the-99.dev";

/** `https://host/join/CODE`: what the QR encodes. */
export function flyerJoinUrl(origin: URL | undefined, code: string): string {
  return `${origin?.origin ?? FLYER_FALLBACK_ORIGIN}/join/${code}`;
}

/** The typed form the flyer prints: the address without its scheme, the code split out to be underlined. */
export function flyerTypedParts(url: string): { prefix: string; code: string } {
  const bare = url.replace(/^https?:\/\//, "");
  const at = bare.lastIndexOf("/") + 1;
  return { prefix: bare.slice(0, at), code: bare.slice(at) };
}

/** Quiet zone of two modules, as the board draws it (its viewBox is the code plus two on every side). */
export function flyerQr(url: string): QrPath {
  return qrPath(url, 2);
}

/** The board draws Print on live and full rows and says revoked codes have none, so a revoked code has no page. */
export function flyerPrintable(code: { revokedAt: Date | null }): boolean {
  return code.revokedAt === null;
}
