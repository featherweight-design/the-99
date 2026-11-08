/**
 * The launch panel's check before it sends: the same shape the server's `isEmailShape` (`lib/invites/rules.ts`) holds an
 * address to, restated here because a public page may not reach `lib/invites/` (`check:public-reads`). `email-shape.test.ts`
 * pins the two together on a table of addresses, so they cannot drift. The server's check is the one that decides.
 */
export function looksLikeEmail(raw: string): boolean {
  const s = raw.trim();
  return s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
