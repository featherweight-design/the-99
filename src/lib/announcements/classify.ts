/**
 * Which of three kinds an Announcements post is, by rules alone (no model call).
 *
 * The category field does not help: every post under `/en/news/announcements/` carries
 * `category: "announcements"`. The signals are the title, the slug and the parsed deck lists.
 *
 * Precedence, first match wins:
 * 1. Commander decklists — the post carries at least one commander deck (a 100-card list with a
 *    commander, see `decklists.ts`), OR its title names both "Commander" and "Decklist(s)". The
 *    title arm keeps a decklist post whose lists have not been published yet (or whose format the
 *    parser cannot read) in this kind, so its empty parse is an alert rather than a quiet "Other".
 *    A title with "Commander Decks" but no "decklist" (`Updated Release Timing for Warhammer 40,000
 *    Commander Decks`) is not enough on its own.
 * 2. Secret Lair — "Secret Lair" in the title or `secret-lair` in the slug.
 * 3. Other — everything else, Welcome Deck and Starter Kit lists included (their lists are 30, 40
 *    or 60 cards, so they carry no commander).
 *
 * A Secret Lair Commander Deck post (`Secret Lair Commander Deck: Odds and Ends Decklist`) meets
 * both 1 and 2 and is Commander decklists by this order: see the lane report for the ruling.
 */
import type { ParsedDeck } from "./decklists";

export type AnnouncementKind = "secret-lair" | "commander-decklists" | "other";

export type ClassifyInput = {
  title: string;
  /** The post URL or its slug. */
  url: string;
  decks: readonly ParsedDeck[];
};

const slugOf = (url: string) => url.replace(/[?#].*$/, "").replace(/\/$/, "").split("/").pop() ?? "";

export function isCommanderDecklistTitle(title: string): boolean {
  return /\bcommander\b/i.test(title) && /\bdeck\s?lists?\b/i.test(title);
}

export function isSecretLair(title: string, url: string): boolean {
  return /\bsecret\s+lair\b/i.test(title) || /(^|-)secret-lair(-|$)/i.test(slugOf(url));
}

export function classifyAnnouncement({ title, url, decks }: ClassifyInput): AnnouncementKind {
  if (decks.some((d) => d.commanders.length > 0) || isCommanderDecklistTitle(title)) return "commander-decklists";
  if (isSecretLair(title, url)) return "secret-lair";
  return "other";
}
