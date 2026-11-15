// The checks that hold the third guide (*Not a common word, name or date*) open even when the estimator raises no warning
// (live password strength R1c). Pure, and reached only through `strength-estimator.ts`, which is loaded lazily.
//
// The date and recent-year checks mirror @zxcvbn-ts/core 4.3.0's own matchers (`matcher/date/matching`, `REGEXEN.recentYear`)
// rather than reading its TypeScript-private `getMatches`, so nothing here depends on an internal and nothing runs the
// matcher a second time per keystroke.

/** zxcvbn's `REGEXEN.recentYear`. */
export const hasRecentYear = (pw: string): boolean => /19\d\d|20\d\d/.test(pw);

const DATE_MIN_YEAR = 1000;
const DATE_MAX_YEAR = 2099;
/** zxcvbn's `DATE_SPLITS`: where a run of 4 to 8 digits may split into day, month and year. */
const DATE_SPLITS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  4: [[1, 2], [2, 3]],
  5: [[1, 3], [2, 3], [2, 4]],
  6: [[1, 2], [2, 4], [4, 5]],
  7: [[1, 3], [2, 3], [4, 5], [4, 6]],
  8: [[2, 4], [4, 6]],
};

const dayMonth = ([a, b]: readonly number[]): boolean =>
  (a >= 1 && a <= 31 && b >= 1 && b <= 12) || (b >= 1 && b <= 31 && a >= 1 && a <= 12);

/** zxcvbn's `mapIntegersToDayMonthYear`, reduced to whether a day, month and year exist. */
function isDayMonthYear(ints: readonly number[]): boolean {
  if (ints[1] > 31 || ints[1] <= 0) return false;
  let over12 = 0;
  let over31 = 0;
  let under1 = 0;
  for (const n of ints) {
    if ((n > 99 && n < DATE_MIN_YEAR) || n > DATE_MAX_YEAR) return false;
    if (n > 31) over31++;
    if (n > 12) over12++;
    if (n <= 0) under1++;
  }
  if (over31 >= 2 || over12 === 3 || under1 >= 2) return false;
  const splits: Array<readonly [number, readonly number[]]> = [
    [ints[2], ints.slice(0, 2)],
    [ints[0], ints.slice(1, 3)],
  ];
  for (const [y, rest] of splits) {
    if (y >= DATE_MIN_YEAR && y <= DATE_MAX_YEAR) return dayMonth(rest); // a four-digit year decides it
  }
  return splits.some(([, rest]) => dayMonth(rest));
}

/** zxcvbn's date matcher: a day, month and year with no separator (`1205`, `120594`) or with one repeated (`12/05/1994`). */
export function hasDate(pw: string): boolean {
  for (let i = 0; i < pw.length; i++) {
    for (let j = i + 3; j <= i + 7 && j < pw.length; j++) {
      const token = pw.slice(i, j + 1);
      if (!/^\d{4,8}$/.test(token)) continue;
      for (const [k, l] of DATE_SPLITS[token.length]) {
        if (isDayMonthYear([+token.slice(0, k), +token.slice(k, l), +token.slice(l)])) return true;
      }
    }
    for (let j = i + 5; j <= i + 9 && j < pw.length; j++) {
      const m = /^(\d{1,4})([\s/\\_.-])(\d{1,2})\2(\d{1,4})$/.exec(pw.slice(i, j + 1));
      if (m && isDayMonthYear([+m[1], +m[3], +m[4]])) return true;
    }
  }
  return false;
}

/** The player's own words (3 or more characters) anywhere in the password, ignoring case. */
export const hasPlayerWord = (pw: string, words: readonly string[]): boolean => {
  const lower = pw.toLowerCase();
  return words.some((w) => w.length >= 3 && lower.includes(w.toLowerCase()));
};

const LEET: Record<string, string> = { "4": "a", "@": "a", "3": "e", "0": "o", "5": "s", $: "s", "7": "t", "!": "i" };
const unleet = (s: string, one: string) => s.replace(/[4@305$7!1]/g, (c) => (c === "1" ? one : LEET[c]));

/** Common-password tokens shorter than this never count: the list holds `abc`, `123` and the like. */
export const COMMON_TOKEN_MIN = 4;

/**
 * Whether one common password (from zxcvbn's `passwords` list, lowercased, with l33t undone) makes up at least half the
 * password (orchestrator ruling, 2026-11-15). The list holds nearly every English word (`copper` ranks above `strawberry`),
 * so any match at all would hold the guide open on every passphrase; half is where `Strawberry!123` is a common password
 * with a suffix and `copper fox casts ninety` is a phrase that contains one.
 */
export function isMostlyCommonPassword(pw: string, common: ReadonlySet<string>, longest: number): boolean {
  const lower = pw.toLowerCase();
  const need = Math.max(COMMON_TOKEN_MIN, Math.ceil(lower.length / 2));
  for (const variant of new Set([lower, unleet(lower, "i"), unleet(lower, "l")])) {
    for (let len = Math.min(longest, variant.length); len >= need; len--) {
      for (let i = 0; i + len <= variant.length; i++) {
        if (common.has(variant.slice(i, i + len))) return true;
      }
    }
  }
  return false;
}
