// The identity `capture:about` puts over the signed-in account's in every frame (the shots ship publicly, under
// public/). The account control renders what `accountIdentity` (`src/lib/shell/identity.ts`) derives from Clerk: the
// full name when there is one, else the email, and initials from the structured name, else the full name, else the
// email's local part. So the rewrite must know ALL of those, not the email alone: an account named "Ana Ruiz" shows
// "Ana Ruiz", "Account: Ana Ruiz" and an "AR" chip, none of which contains the address.
//
// `identityOf` mirrors `accountIdentity` (a plain-node script cannot import the TS module; the test holds the two
// equal). `identityPlan` says what to replace, and `identityLeftovers` whether a page's text, labels and chips are clean.
// Both are pure: the page applies the plan and hands back its strings.

export const STAND_IN = Object.freeze({ name: "Sam", email: "sam@example.com", initials: "S" });
/** `shellCopy.accountMenu.fallbackName`: the name a control shows with neither a full name nor an email. */
const FALLBACK_NAME = "your account";

function firstLetter(value) {
  const match = value?.match(/\p{L}/u);
  return match ? match[0].toUpperCase() : "";
}

/** `accountIdentity`, restated: `{ name, email, initials }` from Clerk's `{ firstName, lastName, fullName, email }`. */
export function identityOf(source) {
  const email = source.email?.trim() ?? "";
  const fullName = source.fullName?.trim() ?? "";
  const name = fullName || email || FALLBACK_NAME;
  let initials = firstLetter(source.firstName) + firstLetter(source.lastName);
  if (!initials) {
    const words = fullName.split(/\s+/).filter((w) => firstLetter(w));
    initials = words.length > 1 ? firstLetter(words[0]) + firstLetter(words[words.length - 1]) : firstLetter(words[0]);
  }
  if (!initials) initials = firstLetter(email.split("@")[0]);
  return { name, email, initials: initials || "?" };
}

/**
 * What to replace, as JSON the page applies:
 *   `nameNode`: a text node that IS the account's name (the element a menu is labelled by) becomes the stand-in name;
 *   `text`: substrings replaced in every other text node, the name (when it is a real name, not the email) then the email;
 *   `label`: substrings replaced in every `aria-label` and `title`, the name (the email, when that is the name: the
 *     control's label names the account, so it reads "Account: Sam" either way) then the email;
 *   `chip`: an initials chip reading the real initials reads the stand-in's;
 *   `forbidden`: strings no text or label may still carry, as whole tokens (the name, its first word, the email, its
 *     local part, and `extra`);
 *   `initials`: what no chip may still read (null when it is the stand-in's own, which no check can tell apart).
 */
export function identityPlan(real, extra = [], standIn = STAND_IN) {
  const named = Boolean(real.name) && real.name !== real.email && real.name !== FALLBACK_NAME;
  const pairs = [];
  if (named) pairs.push([real.name, standIn.name]);
  if (real.email) pairs.push([real.email, standIn.email]);
  const labelPairs = [];
  if (real.name && real.name !== FALLBACK_NAME) labelPairs.push([real.name, standIn.name]);
  if (real.email) labelPairs.push([real.email, standIn.email]);
  const local = real.email ? real.email.split("@")[0] : "";
  // The first name alone, which a page may draw without the rest (a greeting): never rewritten, so a frame carrying it
  // fails rather than ships.
  const first = named ? (real.name.split(/\s+/).find((w) => firstLetter(w)) ?? "") : "";
  const forbidden = [...new Set([named ? real.name : "", first, real.email, local, ...extra].filter((s) => s && s.length > 0))];
  const initials = real.initials && real.initials !== "?" && real.initials !== standIn.initials ? real.initials : null;
  return {
    nameNode: real.name && real.name !== FALLBACK_NAME ? [real.name, standIn.name] : null,
    text: pairs,
    label: labelPairs,
    chip: initials ? [initials, standIn.initials] : null,
    forbidden,
    initials,
    trigger: `Account: ${real.name}`,
  };
}

/** Applies `pairs` to one string, in order. */
export function applyPairs(value, pairs) {
  let out = value;
  for (const [from, to] of pairs) if (from) out = out.split(from).join(to);
  return out;
}

/**
 * Characters a value's match may not run into: a value inside a longer word is not the value. An `@` before it makes
 * it part of an address's domain; an `@` or `+` after it still matches (the local part of an address is the account's).
 */
const WORD = String.raw`[\p{L}\p{N}_]`;
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * True when `haystack` carries `value` as a whole token, ignoring case: not inside a longer word ("ana" is not in
 * "Mana Balance", "sa" is not in "sam@example.com"). A `.` or `-` joins a token only when a word
 * character follows it, so "Ana Ruiz." at a sentence's end still matches and "ana.ruiz" does not match "ana".
 */
export function hasToken(haystack, value) {
  const re = new RegExp(
    String.raw`(?<!${WORD}|@|${WORD}[.-])${escape(value)}(?!${WORD}|[.-]${WORD})`,
    "iu",
  );
  return re.test(haystack);
}

/** The stand-in's own values, lower-cased: a leftover that IS one of these is the rewrite, not the account. */
function standInValues(standIn) {
  return new Set([standIn.name, standIn.email, standIn.email.split("@")[0], standIn.initials].map((v) => v.toLowerCase()));
}

/**
 * Which kinds of the account's identity a page still carries, by kind only (never the value: the log is not a place
 * for it). `page` is `{ text, attrs, chips }`: the body's text, every aria-label/title/alt joined, and the chips' text.
 *
 * Each forbidden value is matched as a whole token, ignoring case (`hasToken`). A value that is the stand-in's own (a
 * real account named Sam, an address that is sam@example.com) counts as clean: no check can tell it from the rewrite.
 * A value of one letter is not looked for in text or labels: one letter is initials, and initials are checked in the
 * chip alone, where a stray "S" or "A" in prose cannot be mistaken for them.
 */
export function identityLeftovers(plan, page, standIn = STAND_IN) {
  const own = standInValues(standIn);
  const left = [];
  for (const f of plan.forbidden) {
    if (own.has(f.toLowerCase()) || [...f.matchAll(/[\p{L}\p{N}]/gu)].length < 2) continue;
    if (hasToken(page.text, f)) left.push("text");
    if (hasToken(page.attrs, f)) left.push("label");
  }
  if (plan.initials && plan.initials !== standIn.initials && page.chips.some((c) => c.trim() === plan.initials)) {
    left.push("initials");
  }
  return [...new Set(left)];
}
