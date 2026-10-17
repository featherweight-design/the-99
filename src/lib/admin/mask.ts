// How /admin names a person (Admin R3, D1, D2, D4): masked on the server, so a page payload never carries a whole
// name or address. Raw values are read only in `accounts.ts`, for a logged reveal.

import { adminMaskCopy } from "../copy/admin";
import type { Account } from "./accounts";

/** The fields of a Clerk user the masked name is made from. */
export type NameSource = { id: string; firstName: string | null; lastName: string | null; username: string | null };

const clean = (s: string | null): string | null => (s && s.trim() ? s.trim() : null);
const firstLetter = (s: string): string => Array.from(s)[0] ?? "";

/**
 * D1: the first name and the last name's initial (`Colin R.`); with no first name, the username as it is (a last name
 * alone is never shown, even shortened); with neither, `Account ·<last four of the id>`, which is not a name.
 */
export function maskName(u: NameSource): { name: string; named: boolean } {
  const first = clean(u.firstName);
  const last = clean(u.lastName);
  if (first) return { name: last ? `${first} ${firstLetter(last).toLocaleUpperCase("en-US")}.` : first, named: true };
  const username = clean(u.username);
  if (username) return { name: username, named: true };
  return { name: adminMaskCopy.noName(u.id.slice(-4)), named: false };
}

/**
 * D2: the mailbox's first letter, `•••`, `@`, the domain's first letter, `•••`, then the domain from its last dot
 * (`c•••@g•••.com`). Case-folded first, so the letters kept are the same however the address was typed.
 */
export function maskEmail(email: string): string {
  const folded = email.trim().toLocaleLowerCase("en-US");
  const at = folded.lastIndexOf("@");
  const mailbox = at < 0 ? folded : folded.slice(0, at);
  const domain = at < 0 ? "" : folded.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${firstLetter(mailbox)}•••@${firstLetter(domain)}•••${tld}`;
}

/**
 * D4: initials from the masked name, so they show no letter the name does not: two words give each first letter
 * (`CR`), one word its first two (`CH`). Null for an account with no name, which draws the diamond instead.
 */
export function maskInitials(name: string, named: boolean): string | null {
  if (!named) return null;
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words.slice(0, 2).map(firstLetter) : Array.from(words[0] ?? "").slice(0, 2);
  return letters.join("").toLocaleUpperCase("en-US");
}

/** An account known only by its id (Clerk did not list it, or Clerk is down): masked like one with no name. */
export const unlistedAccount = (id: string): Account => ({ id, ...maskName({ id, firstName: null, lastName: null, username: null }), email: null });
