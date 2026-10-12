// The line's sentence (plan `plan-added-copy-2026-10-12`). Pure, so the words are tested apart from
// the row that draws them. ONE reading of where the copies went (`Destination`), said in two forms:
// the summary's short form, whose card is the row's own first column, and Add Cards' long form,
// which names the card itself.
import { addedCopyCopy as copy } from "../copy/added-copy";
import type { WentRow } from "./arrivals";
import type { ContestedCard } from "./summary-read";

/** Where a card's new copies are: decks holding them, a deck the player picked, or brews reading one. */
export type Destination =
  | { kind: "held"; decks: { name: string; copies: number; picked: boolean }[] }
  | { kind: "picked"; deck: string }
  | { kind: "soft"; brews: string[] };

/** As the write froze it. Null when no deck took or read a copy, or a deck's frozen name is gone. */
export function wentDestination(went: WentRow, deckNames: Record<string, string>): Destination | null {
  const names = went.decks.map((d) => deckNames[d.deckId] ?? "");
  if (went.decks.length === 0 || names.some((name) => name === "")) return null;
  if (went.kind === "soft") return { kind: "soft", brews: names };
  if (went.kind !== "held") return null;
  return { kind: "held", decks: went.decks.map((d, i) => ({ name: names[i], copies: d.copies, picked: d.picked })) };
}

/**
 * As the card the chooser's last write read back (the design table's `live` row): the frozen
 * reading is true only until the first write, and after a pick is cleared it can name a pick that
 * no longer exists.
 *
 * The new copies are the import's, capped at the live surplus over `ownedBefore`: `arrived` is
 * frozen and `owned` is live, so copies removed in another tab since are not named. A pick takes
 * new copies first, up to what the player gave it; the rest are where seniority puts them: the
 * spare first (copies no deck holds), then the junior-most committed holders. Every destination is
 * named, and `picked` only when the pick is the sole one. A spare that brews read is soft. Null
 * when no deck holds or reads a new copy any more.
 */
export function liveDestination(card: ContestedCard): Destination | null {
  let left = Math.min(card.arrived, Math.max(card.owned - card.ownedBefore, 0));
  const took = new Map<string, { name: string; copies: number; picked: boolean }>();
  for (const c of card.claimants.filter((x) => x.granted > 0)) {
    const t = Math.min(c.granted, left);
    if (t > 0) took.set(c.deckId, { name: c.deckName, copies: t, picked: true });
    left -= t;
  }
  // EVERY committed deck is in the queue, a picked one included: what it holds beyond its grant
  // is seniority's, and leaving it out names a deck one copy short (A=2 with a one-copy grant read
  // as A=1). Its queue share merges with its picked one.
  const committed = card.claimants.filter((c) => !c.brew);
  const held = card.claimants.filter((c) => !c.brew || c.granted > 0).reduce((n, c) => n + c.allocated, 0);
  const spare = Math.max(card.owned - held, 0);
  let fromQueue = Math.max(left - spare, 0);
  for (const c of [...committed].reverse()) {
    if (fromQueue <= 0) break;
    const t = Math.min(Math.max(c.allocated - c.granted, 0), fromQueue);
    if (t > 0) {
      const had = took.get(c.deckId);
      took.set(c.deckId, had ? { ...had, copies: had.copies + t } : { name: c.deckName, copies: t, picked: false });
    }
    fromQueue -= t;
  }
  const decks = card.claimants.flatMap((c) => took.get(c.deckId) ?? []);
  if (decks.length === 1 && decks[0].picked) return { kind: "picked", deck: decks[0].name };
  if (decks.length === 1) return { kind: "held", decks: [{ ...decks[0], picked: false }] };
  if (decks.length > 1) return { kind: "held", decks: decks.map((d) => ({ ...d, picked: false })) };
  const brews = card.claimants.filter((c) => c.brew && !(c.granted > 0) && c.allocated > 0).map((c) => c.deckName);
  return brews.length > 0 ? { kind: "soft", brews } : null;
}

/** The summary's short form: the card is the row's first column. */
export function shortSentence(d: Destination): string {
  if (d.kind === "picked") return copy.row.goesToPicked(d.deck);
  if (d.kind === "soft") return d.brews.length === 1 ? copy.row.freeForBrew(d.brews[0]) : copy.row.freeForBrews(d.brews.length);
  const names = d.decks.map((x) => x.name);
  if (d.decks.length === 1) return d.decks[0].picked ? copy.row.goesToEarlier(names[0]) : copy.row.goesTo(names[0]);
  return d.decks.every((x) => x.copies === 1) ? copy.row.goesToMany(names) : copy.row.goesToManyUneven(names);
}

/** Add Cards' long form: the sentence names the card. */
export function longSentence(d: Destination, card: string): string {
  const l = copy.line;
  if (d.kind === "picked") return l.goesToPicked(card, d.deck);
  if (d.kind === "soft") return d.brews.length === 1 ? l.freeForBrew(card, d.brews[0]) : l.freeForBrews(card, d.brews.length);
  const names = d.decks.map((x) => x.name);
  const copies = d.decks.reduce((n, x) => n + x.copies, 0);
  if (d.decks.length === 1) {
    if (d.decks[0].picked) return l.goesToEarlier(card, names[0]);
    // `which needs one` is a single copy's sentence: a deck that took more is told the count.
    return copies === 1 ? l.goesTo(card, names[0]) : l.goesToManyUneven(card, copies, names);
  }
  return d.decks.every((x) => x.copies === 1) ? l.goesToMany(card, copies, names) : l.goesToManyUneven(card, copies, names);
}

/** The summary's frozen sentence, or null when there is nothing to say. */
export function wentSentence(went: WentRow, deckNames: Record<string, string>): string | null {
  const d = wentDestination(went, deckNames);
  return d ? shortSentence(d) : null;
}

/** The summary's sentence after a chooser write, or null when no deck holds or reads a new copy. */
export function liveSentence(card: ContestedCard): string | null {
  const d = liveDestination(card);
  return d ? shortSentence(d) : null;
}

/** The deck names a destination's sentence prints, which the line form draws in `--fg`. */
export function destinationDecks(d: Destination): string[] {
  if (d.kind === "picked") return [d.deck];
  if (d.kind === "soft") return d.brews.length === 1 ? d.brews : [];
  return d.decks.map((x) => x.name);
}

/** A run of a sentence: plain, or a name the line form emphasizes. */
export type SentencePart = { text: string; em?: "card" | "deck" };

/**
 * A sentence cut at the names it prints, for Add Cards' emphasis (design table, CopyLine): the
 * card `--fg` 600, each deck `--fg`, the rest `--fg-body`. Each step takes the earliest name, the
 * longer one at a tie, so a deck named inside another's name is never split out of it.
 */
export function emphasize(sentence: string, card: string, decks: readonly string[]): SentencePart[] {
  const names = [{ text: card, em: "card" as const }, ...decks.map((text) => ({ text, em: "deck" as const }))]
    .filter((n) => n.text !== "");
  const parts: SentencePart[] = [];
  let at = 0;
  while (at < sentence.length) {
    let best: { i: number; text: string; em: "card" | "deck" } | null = null;
    for (const n of names) {
      const i = sentence.indexOf(n.text, at);
      if (i < 0) continue;
      if (!best || i < best.i || (i === best.i && n.text.length > best.text.length)) best = { i, ...n };
    }
    if (!best) break;
    if (best.i > at) parts.push({ text: sentence.slice(at, best.i) });
    parts.push({ text: best.text, em: best.em });
    at = best.i + best.text.length;
  }
  if (at < sentence.length) parts.push({ text: sentence.slice(at) });
  return parts;
}
