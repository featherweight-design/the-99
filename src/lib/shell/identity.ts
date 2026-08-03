// Derives the three strings the account menu renders from whatever Clerk has.
// The handoff draws only the "AR" initials case; every other shape below is an
// eng-side resolution of design-table ambiguity 15 (avatar fallback rules).

import { shellCopy } from "../copy/shell";

export type AccountIdentitySource = {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email?: string | null;
};

export type AccountIdentity = {
  name: string;
  email: string;
  initials: string;
};

function firstLetter(value: string | null | undefined): string {
  const match = value?.match(/\p{L}/u);
  return match ? match[0].toUpperCase() : "";
}

export function accountIdentity(source: AccountIdentitySource): AccountIdentity {
  const email = source.email?.trim() ?? "";
  const fullName = source.fullName?.trim() ?? "";
  const name = fullName || email || shellCopy.accountMenu.fallbackName;

  // Structured names beat splitting fullName: "Ana de la Cruz" has to yield AD,
  // not AC, and only Clerk knows where the surname starts.
  let initials = firstLetter(source.firstName) + firstLetter(source.lastName);
  if (!initials) {
    const words = fullName.split(/\s+/).filter((w) => firstLetter(w));
    initials =
      words.length > 1
        ? firstLetter(words[0]) + firstLetter(words[words.length - 1])
        : firstLetter(words[0]);
  }
  // Local part only — an initial taken from the domain would be the same
  // letter for every user on that domain.
  if (!initials) initials = firstLetter(email.split("@")[0]);

  return { name, email, initials: initials || "?" };
}
