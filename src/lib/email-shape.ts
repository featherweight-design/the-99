/**
 * An address's SHAPE only: one `@`, something either side, a dot in the domain, no space, at most 254 characters. No lookup.
 * The one rule, in a module with no imports, so the invite and launch-list paths (`lib/invites/rules.ts`, which re-exports it)
 * and the public landing's panel (which may not reach `lib/invites/`) all hold an address to the same shape.
 */
export function isEmailShape(raw: string): boolean {
  const s = raw.trim();
  return s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
