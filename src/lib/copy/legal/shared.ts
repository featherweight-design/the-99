// The text of /privacy and /terms is data: sections of blocks, drawn by `LegalPage` (launch epic B1). Every number the text
// states is built from the constant the code uses (see `facts.test.ts`), so a changed limit changes the page.
// Voice: prose-pass D, no jokes. US English, no em dashes. Hugh's draft: boards/b1-privacy-terms-draft-2026-10-18.md.

import { creditsPageCopy } from "../credits-page";

/** One paragraph, or a bulleted list. A `lead` is the bold run-in label before the text. `{email}` draws the support address as a mailto link. */
export type LegalBlock =
  | { kind: "p"; text: string; lead?: string }
  | { kind: "list"; items: readonly { text: string; lead?: string }[] };

export type LegalSection = { id: string; title: string; blocks: readonly LegalBlock[] };

export type LegalDoc = {
  title: string;
  /** The effective date, written out; a change to the terms moves it. */
  updated: string;
  intro: readonly LegalBlock[];
  sections: readonly LegalSection[];
};

export const EMAIL_TOKEN = "{email}";
export const LEGAL_EMAIL = creditsPageCopy.supportEmail;

/** The day both pages shipped. A terms change moves it and owes a What's new note in About. */
export const LEGAL_UPDATED = "November 1, 2026";

export const ENTITY = "Featherweight Design, LLC";

export const legalCopy = {
  privacyTitle: "Privacy",
  termsTitle: "Terms",
  lastUpdated: (date: string) => `Last updated ${date}`,
  onThisPage: "On this page",
  signIn: "Sign in",
  homeLabel: "The 99, home",
  links: "Legal",
} as const;
