import { askCopy } from "../copy/card-search";
import { showcaseCopy } from "../copy/discovery";
import { TOOLS, type Tool, type ToolId } from "./tools";

/**
 * Ask, in the card search (tool discovery D, handoff README 5 "Matching"): which tools a typed question answers. No model:
 * each tool carries a phrase list, a query of two or more words that hits a list draws that tool, and one word answers
 * only when it is a tool's own name. Pure, so the search runs it on every key and it works offline once loaded.
 *
 * The phrase lists live here, keyed by tool, rather than on `tools.ts`'s entries (58's file, which D never edits). The
 * record is exhaustive over `ToolId`, so a tool added to the registry fails typecheck until it has phrases.
 */

/** A phrase hits when every one of its words is among the query's words, in any order ("make my deck better" hits "make
 *  deck better"). Words are compared with a trailing plural `s` dropped. */
export const ASK_PHRASES: Record<ToolId, readonly string[]> = {
  "help-me-choose": [
    "choose commander", "pick commander", "which commander", "what commander", "new commander", "find commander",
    "commander for", "recommend commander", "start deck", "new deck", "what can build", "build with card",
  ],
  precons: [
    "precon", "preconstructed", "prebuilt", "pre-built", "ready made", "starter deck", "buy deck", "cheap deck",
    "what can build", "build with card",
  ],
  "top-off": ["top off", "fill deck", "fill slot", "open slot", "finish deck", "complete deck", "add card to deck", "card to add", "what to add"],
  "proposed-cuts": ["cut", "what to cut", "trim deck", "too many card", "deck too big", "over 100", "run long", "remove card", "which card to cut"],
  "suggested-changes": [
    "make deck better", "better deck", "improve deck", "upgrade deck", "suggest", "swap", "what to change",
    "change deck", "tune deck", "tuning", "deck weak", "fix deck",
  ],
  "mana-balance": ["mana", "mana base", "mana problem", "land", "too many land", "not enough land", "color source", "color screw", "color balance"],
  "stand-ins": ["cheaper", "cheap version", "stand-in", "stand in", "substitute", "budget", "too expensive", "price limit", "save money", "buy"],
  "friend-spares": ["friend spare", "borrow", "borrow card", "friend have", "friend card", "spare from friend", "buy"],
  "find-a-deck": [
    "spare card", "spare", "extra card", "extra copy", "not in deck", "in no deck", "no deck", "unused card",
    "card not used", "where card go", "which deck fit", "use my card", "what deck for card",
  ],
  wishlist: ["wishlist", "wish list", "card want", "want to buy", "buy next", "what should buy", "what to buy", "save for later", "need to buy", "buy"],
  "collection-sync": ["upload", "new file", "import", "export", "csv", "sync", "update collection", "merge file", "re-upload", "reupload"],
  matchups: ["matchup", "win rate", "winrate", "who beat", "lose to", "against commander", "play against", "game against", "beat"],
  lineup: ["stat", "last played", "which deck play", "deck stat", "play most", "compare deck", "all my deck", "how my deck do"],
  friends: ["friend", "pod", "add friend", "play with", "playgroup", "invite"],
};

/** One word that is a tool's own name (or its plain short form), the only way a single word answers (README: typing a
 *  name stays a card lookup). A tool's full name, as shipped, always answers too. */
const NAME_WORDS: Partial<Record<ToolId, readonly string[]>> = {
  precons: ["precons", "precon"],
  wishlist: ["wishlist"],
  matchups: ["matchups", "matchup"],
  friends: ["friends"],
  "collection-sync": ["sync"],
  lineup: ["stats"],
};

/** How many tools answer a question at most. */
export const ASK_MAX_TOOLS = 3;

const stem = (w: string) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

/** Lower-cased words with punctuation dropped (an apostrophe or a hyphen joins, so `stand-in` stays one word). */
export function askWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .split(/[^a-z0-9-]+/)
    .filter(Boolean)
    .map(stem);
}

/** A hyphenated phrase word also counts as its parts, so "stand in" and "stand-in" hit the same query either way. */
function phraseHits(words: ReadonlySet<string>, phrase: string): boolean {
  return askWords(phrase.replace(/-/g, " ")).every((w) => words.has(w));
}

/** The registry's name for a tool, in the form a query would spell it (`Cheaper stand-ins` -> `cheaper stand ins`). */
function nameKey(text: string): string {
  return askWords(text.replace(/-/g, " ")).join(" ");
}

/**
 * The tools a typed question answers, best first, at most three. A tool whose switch is off for the reader never
 * answers (`on` is the reader's resolved switches, by tool). Registry order breaks a tie.
 */
export function matchTools(query: string, on: (id: ToolId) => boolean): ToolId[] {
  const raw = askWords(query);
  if (raw.length === 0) return [];
  const words = new Set(raw.flatMap((w) => (w.includes("-") ? [w, ...w.split("-").filter(Boolean)] : [w])));
  const key = raw.join(" ");
  const tools: readonly Tool[] = TOOLS;
  const scored: { id: ToolId; score: number; order: number }[] = [];
  tools.forEach((t, order) => {
    const id = t.id as ToolId;
    if (!on(id)) return;
    let score = 0;
    if (key === nameKey(showcaseCopy.tools[id].name) || (raw.length === 1 && (NAME_WORDS[id] ?? []).includes(raw[0]))) score = 100;
    // A question needs two words to hit a phrase, so typing one word stays a card lookup.
    else if (raw.length >= 2) {
      for (const phrase of ASK_PHRASES[id]) if (phraseHits(words, phrase)) score += askWords(phrase.replace(/-/g, " ")).length;
    }
    if (score > 0) scored.push({ id, score, order });
  });
  return scored
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, ASK_MAX_TOOLS)
    .map((s) => s.id);
}

/**
 * The starters this reader sees (Y6): one whose answers are all off for the reader, or whose only answer is Find a deck
 * while the reader has no deck, is left out and the row closes up. `hasDecks` null (not read yet, or offline) keeps all.
 */
export function startersFor(on: (id: ToolId) => boolean, hasDecks: boolean | null): string[] {
  return askCopy.starters.questions.filter((q) => {
    const answers = matchTools(q, on);
    if (answers.length === 0) return false;
    return !(hasDecks === false && answers.every((id) => id === "find-a-deck"));
  });
}

/** About's index (its Tools tab redirects there, `legacy-href.ts`): where `Every tool, in About` goes. */
export const ABOUT_TOOLS_HREF = "/about";
