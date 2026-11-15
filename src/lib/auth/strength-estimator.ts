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

import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import { adjacencyGraphs, dictionary as commonDictionary } from "@zxcvbn-ts/language-common";
import { MIN_PASSWORD, hasNumberOrSymbol, passwordLength, unscored, type Strength, type StrengthReading } from "./password";
import { hasDate, hasPlayerWord, hasRecentYear, isMostlyCommonPassword } from "./strength-patterns";

/** zxcvbn's `maxLength`: `check` scores only the first 256 UTF-16 units, so every check here reads the same prefix. */
const MAX_LENGTH = 256;

type Estimator = { z: ZxcvbnFactory; common: ReadonlySet<string>; longest: number };
let estimator: Estimator | "failed" | null = null;
/**
 * Built on the first estimate, not at import: building the dictionaries' index is the costly part. A build that fails is
 * remembered, so a broken chunk is not rebuilt on every keystroke; the panel stays on `unscored`.
 *
 * The common pack only (its password list, diceware words and keyboard graphs), as Clerk's own browser check uses. Dropping
 * the English pack cut the bundled module from 824KB to 234KB gzipped (esbuild, minified, 2026-11-15) and agreed with Clerk
 * exactly as often. With no translations a warning is its key (`commonPassword`), which is all the third guide reads: is
 * there one.
 */
function build(): Estimator | null {
  if (estimator === "failed") return null;
  if (estimator) return estimator;
  try {
    const passwords = commonDictionary["passwords-common"].map((w) => String(w).toLowerCase());
    estimator = {
      z: new ZxcvbnFactory({ graphs: adjacencyGraphs, dictionary: commonDictionary }),
      common: new Set(passwords),
      longest: passwords.reduce((n, w) => Math.max(n, w.length), 0),
    };
    return estimator;
  } catch {
    estimator = "failed";
    return null;
  }
}

/**
 * The player's own words, for the estimator's user-input dictionary and the name check: each input as given, an email's
 * local part, and each part of that local part split on `.`, `+`, `_` and `-` (READINESS clarification 4), so `colin1994`
 * reads the name in `colin@example.com` on K5 as it does on Q1, and `smith` is read in `colin.smith@example.com`.
 */
export function userInputs(inputs: readonly string[]): string[] {
  const out = new Set<string>();
  for (const raw of inputs) {
    const input = raw.trim();
    if (!input) continue;
    out.add(input);
    const at = input.indexOf("@");
    if (at <= 0) continue;
    const local = input.slice(0, at);
    out.add(local);
    for (const part of local.split(/[.+_-]/)) if (part.length >= 3) out.add(part);
  }
  return [...out];
}

/** Clerk's line sits at 2: below it is Weak, 2 and 3 are Good, 4 is Strong. */
export const strengthOf = (score: number): Exclude<Strength, "short"> => (score >= 4 ? "strong" : score >= 2 ? "good" : "weak");

/** zxcvbn's own truncation, without splitting a surrogate pair. */
function reduced(pw: string): string {
  let end = MAX_LENGTH;
  const code = pw.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end -= 1;
  return pw.slice(0, end);
}

/**
 * The meter's reading for a password. The third guide ticks only at 8+ characters, when the estimator raises no warning
 * (READINESS clarification 1) and none of these hold it open (orchestrator rulings, 2026-11-15): a date or a recent year, the
 * player's own name or address (3+ characters), or a common password making up half of it. There is no plain
 * dictionary-word rule, so a passphrase of words (`copper fox casts ninety`) still ticks it.
 */
export function estimate(pw: string, inputs: readonly string[] = []): StrengthReading {
  const length = passwordLength(pw) >= MIN_PASSWORD;
  const numberOrSymbol = hasNumberOrSymbol(pw);
  if (!length) return { strength: "short", commonOk: false, guides: { length, numberOrSymbol, common: false } };
  const e = build();
  if (!e) return unscored(pw);
  try {
    const p = reduced(pw);
    const words = userInputs(inputs);
    const result = e.z.check(p, words);
    const held = hasDate(p) || hasRecentYear(p) || hasPlayerWord(p, words) || isMostlyCommonPassword(p, e.common, e.longest);
    const common = !result.feedback.warning && !held;
    return { strength: strengthOf(result.score), commonOk: common, guides: { length, numberOrSymbol, common } };
  } catch {
    return unscored(pw);
  }
}
