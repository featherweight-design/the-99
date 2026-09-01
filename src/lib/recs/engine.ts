import { frontFaceOracle } from "./faces";

/**
 * How soon a commander delivers its value. #215 needs this because overlap and
 * theme fit both rank Ghoulcaller Gisa perfectly in her own deck while neither
 * can see that she costs {3}{B}{B} and does nothing until she has survived a
 * turn cycle — the complaint that motivated the feature.
 */
export type CommanderEngine =
  | "etb"        // value on entering the battlefield
  | "triggered"  // free trigger; works the turn it lands
  | "activated"  // a cost but no {T} — usable immediately, repeatable
  | "tap"        // every route requires {T} — must survive a turn cycle
  | "static";    // fallback: rules text, but no gated ability detected

const ETB = /\bwhen (this|[^.]{0,40}?) enters\b/;
const TRIGGERED = /\b(whenever|at the beginning of)\b/;
// An activation cost is "<cost>: <effect>" on one line. Requiring a colon keeps
// this from matching the colons in flavour-shaped sentences elsewhere.
const ACTIVATED = /^[^\n:]{1,80}:\s/m;
const TAP_SYMBOL = /\{t\}/;

/**
 * Strips parenthetical reminder text before matching. Overgrown Tomb's entire
 * oracle text is "({T}: Add {B} or {G}.)" — reminder text describes what the
 * card already does, so reading it as a distinct ability double-counts.
 */
const stripReminders = (s: string) => s.replace(/\([^)]*\)/g, "");

/**
 * Precedence is least-restrictive-wins: what a commander actually gives you is
 * the cheapest route it offers, not the dearest. Ayara, First of Locthwain has
 * both a free drain trigger and a {T} ability; most-restrictive would call her
 * "tap" and claim she needs a turn cycle, which is false.
 *
 * `static` is a fallback rather than a matched category on purpose. Yawgmoth,
 * Thran Physician opens with "Protection from Humans" — a static keyword that
 * has nothing to do with why he is played.
 *
 * This is a heuristic and will be imperfect; that was accepted at intake. It is
 * one of three separately-reported axes, never a ranking input.
 */
export function classifyEngine(card: { oracleText: string | null }): CommanderEngine | null {
  const raw = frontFaceOracle(card.oracleText).trim();
  if (raw === "") return null;

  const text = stripReminders(raw).toLowerCase();
  if (ETB.test(text)) return "etb";
  if (TRIGGERED.test(text)) return "triggered";

  const activationLines = text.split("\n").filter((line) => ACTIVATED.test(line));
  if (activationLines.length > 0) {
    // "tap" only when every activation route is gated behind {T}. One untapped
    // route is enough to make the commander usable the turn it lands.
    const untapped = activationLines.filter((line) => !TAP_SYMBOL.test(line.split(":")[0]));
    return untapped.length > 0 ? "activated" : "tap";
  }

  return "static";
}
