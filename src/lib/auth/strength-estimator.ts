// The password estimator behind the live strength meter (Small items 11, live password strength R1c, gap G1). The ONLY
// module that imports @zxcvbn-ts, and it is only ever reached through a dynamic `import()`, so the dictionaries stay out of
// the `/sign-in` and `/sign-up` first load (`strength-lazy.test.ts` fails on a static import of either).
//
// Clerk is the judge. Its dev and production instances both enforce `min_zxcvbn_strength` 2 (read from the public
// `/v1/environment` on 2026-11-15), so the meter maps the estimator's score onto that line: 0 and 1 are Weak (Clerk
// refuses), 2 and 3 are Good, 4 is Strong. Agreement with Clerk is pinned against recorded answers in
// `strength-fixture.json` (`strength-estimator.test.ts`). Any estimator failure reads as not loaded (`unscored`): it errs weak.
//
// A password never leaves this module: nothing here logs, reports or stores it.

import { ZxcvbnFactory, type MatchExtended, type ZxcvbnResult } from "@zxcvbn-ts/core";
import { adjacencyGraphs, dictionary as commonDictionary } from "@zxcvbn-ts/language-common";
import { dictionary as enDictionary, translations } from "@zxcvbn-ts/language-en";
import { MIN_PASSWORD, hasNumberOrSymbol, passwordLength, unscored, type Strength, type StrengthReading } from "./password";

let factory: ZxcvbnFactory | null = null;
/** Built on the first estimate, not at import: building the dictionaries' index is the costly part. */
const zxcvbn = (): ZxcvbnFactory =>
  (factory ??= new ZxcvbnFactory({
    translations,
    graphs: adjacencyGraphs,
    dictionary: { ...commonDictionary, ...enDictionary },
  }));

/**
 * The player's own words, for the estimator's user-input dictionary: each input as given, and an email's local part as well
 * (READINESS clarification 4), so `colin1994` reads the name in `colin@example.com` on K5 as it does on Q1.
 */
export function userInputs(inputs: readonly string[]): string[] {
  const out = new Set<string>();
  for (const raw of inputs) {
    const input = raw.trim();
    if (!input) continue;
    out.add(input);
    const at = input.indexOf("@");
    if (at > 0) out.add(input.slice(0, at));
  }
  return [...out];
}

/** Clerk's line sits at 2: below it is Weak, 2 and 3 are Good, 4 is Strong. */
export const strengthOf = (score: number): Exclude<Strength, "short"> => (score >= 4 ? "strong" : score >= 2 ? "good" : "weak");

/**
 * What keeps the third guide open even when the estimator raises no warning: a date or a recent year anywhere in the password
 * (orchestrator ruling, 2026-11-15: `Summer2024!`), or the player's own name or address (`colin@example` scores 2 with no
 * warning, its `colin@` read as a l33t surname). A user-input match shorter than 3 characters is ignored, so a two-letter
 * first name does not hold the guide open on every word that contains it.
 */
const holdsCommonOpen = (m: MatchExtended): boolean =>
  m.pattern === "date" ||
  (m.pattern === "regex" && m.regexName === "recentYear") ||
  (m.pattern === "dictionary" && m.dictionaryName === "userInputs" && m.token.length >= 3);

/**
 * Every match the estimator found, not only the cheapest sequence it scored. `Summer2024!` scores its `2024!` as brute force,
 * so its sequence holds no year; the year is still among the matches. `getMatches` is TypeScript-private in 4.3.0 (pinned
 * exactly); when it is missing the scored sequence stands in, and the agreement tests fail on the difference.
 */
function allMatches(z: ZxcvbnFactory, pw: string, inputs: string[], result: ZxcvbnResult): readonly MatchExtended[] {
  const get = (z as unknown as { getMatches?: (pw: string, inputs: string[]) => MatchExtended[] | Promise<MatchExtended[]> }).getMatches;
  const matches = typeof get === "function" ? get.call(z, pw, inputs) : null;
  return Array.isArray(matches) ? matches : result.sequence;
}

/**
 * The meter's reading for a password. The third guide ticks only at 8+ characters, when the estimator raises no warning
 * (READINESS clarification 1) and `holdsCommonOpen` finds nothing. There is no dictionary-word rule, so a passphrase of plain
 * words still ticks it.
 */
export function estimate(pw: string, inputs: readonly string[] = []): StrengthReading {
  const length = passwordLength(pw) >= MIN_PASSWORD;
  const numberOrSymbol = hasNumberOrSymbol(pw);
  if (!length) return { strength: "short", commonOk: false, guides: { length, numberOrSymbol, common: false } };
  try {
    const z = zxcvbn();
    const words = userInputs(inputs);
    const result = z.check(pw, words);
    const held = allMatches(z, pw, words, result).some(holdsCommonOpen);
    const common = !result.feedback.warning && !held;
    return { strength: strengthOf(result.score), commonOk: common, guides: { length, numberOrSymbol, common } };
  } catch {
    return unscored(pw);
  }
}
