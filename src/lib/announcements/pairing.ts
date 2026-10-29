/**
 * Whether a deck list's second line is a commander too, and if so whether it is the first line's
 * partner or an alternate (ruling, 2026-10-29). A list's first line is its commander
 * (`decklists.ts`); the second is a co-commander only when the two can legally pair:
 *
 * - Partner (both), or Partner—<group> with the same group (Survivors, Father & son…);
 * - Partner with <the other card>;
 * - Friends forever (both);
 * - Choose a Background + a Background;
 * - Doctor's companion + a Time Lord Doctor.
 *
 * Otherwise a second line that could itself be a commander (a legendary creature, Vehicle or Spacecraft, or a card that
 * says it can be your commander) is the alternate commander (Star Trek's Captain Janeway), and any
 * other second line (Foundations' `Always Watching`) is just a card.
 */

export type CommanderFacts = { name: string; typeLine: string; oracleText: string | null };

export type SecondLine = "co-commander" | "alternate" | null;

const text = (c: CommanderFacts) => c.oracleText ?? "";
const front = (s: string) => s.split(" // ")[0];
const lineStarts = (c: CommanderFacts, pattern: RegExp) => text(c).split("\n").some((l) => pattern.test(l.trim()));

export function isCommanderEligible(c: CommanderFacts): boolean {
  const type = front(c.typeLine);
  // A legendary Vehicle or Spacecraft may lead a deck (rule 903.3a as amended; `isCommanderCandidate` in recs/score.ts).
  if (!/\blegendary\b/i.test(type)) return /can be your commander/i.test(text(c));
  // A legendary card that is a creature off the battlefield (Grist, the Hunger Tide) is a legendary creature in the command zone.
  return /\b(?:creature|vehicle|spacecraft)\b/i.test(type) || /can be your commander/i.test(text(c)) || /isn't on the battlefield, it's an? [^.]*\bcreature\b/i.test(text(c));
}

/** `Partner—Survivors` → `survivors`; plain `Partner` → `""`; no partner ability → null. Not `Partner with`. */
function partnerGroup(c: CommanderFacts): string | null {
  for (const raw of text(c).split("\n")) {
    const line = raw.trim();
    if (/^partner with\b/i.test(line)) continue;
    const m = /^partner(?:\s*[—–-]\s*([^(]+?))?\s*(?:\(|$)/i.exec(line);
    if (m) return (m[1] ?? "").trim().toLowerCase();
  }
  return null;
}

function partnersWith(a: CommanderFacts, b: CommanderFacts): boolean {
  const names = [b.name, front(b.name)].map((n) => n.toLowerCase());
  return text(a)
    .split("\n")
    .some((l) => {
      const m = /^partner with\s+(.+?)(?:\s*\(|$)/i.exec(l.trim());
      return m !== null && names.includes(m[1].trim().toLowerCase());
    });
}

const hasBackgroundChoice = (c: CommanderFacts) => lineStarts(c, /^choose a background\b/i);
const isBackground = (c: CommanderFacts) => /\bbackground\b/i.test(front(c.typeLine)) && /\benchantment\b/i.test(front(c.typeLine));
const isCompanionOfDoctor = (c: CommanderFacts) => lineStarts(c, /^doctor['’]s companion\b/i);
const isDoctor = (c: CommanderFacts) => /\btime lord doctor\b/i.test(front(c.typeLine));

export function canPair(a: CommanderFacts, b: CommanderFacts): boolean {
  const ga = partnerGroup(a);
  const gb = partnerGroup(b);
  if (ga !== null && ga === gb) return true;
  if (partnersWith(a, b) || partnersWith(b, a)) return true;
  if (lineStarts(a, /^friends forever\b/i) && lineStarts(b, /^friends forever\b/i)) return true;
  if ((hasBackgroundChoice(a) && isBackground(b)) || (hasBackgroundChoice(b) && isBackground(a))) return true;
  if ((isCompanionOfDoctor(a) && isDoctor(b)) || (isCompanionOfDoctor(b) && isDoctor(a))) return true;
  return false;
}

/** What a list's second line is, given the catalog facts of both lines (null when either is unmatched). */
export function secondLineRole(first: CommanderFacts | null, second: CommanderFacts | null): SecondLine {
  if (!first || !second) return null;
  if (canPair(first, second)) return "co-commander";
  return isCommanderEligible(second) ? "alternate" : null;
}
