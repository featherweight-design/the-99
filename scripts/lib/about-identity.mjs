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
 *   `forbidden`: strings no text or label may still carry (the name, the email, its local part, and `extra`);
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
  const forbidden = [...new Set([named ? real.name : "", real.email, local, ...extra].filter((s) => s && s.length > 0))];
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
 * Which kinds of the account's identity a page still carries, by kind only (never the value: the log is not a place
 * for it). `page` is `{ text, attrs, chips }`: the body's text, every aria-label/title/alt joined, and the chips' text.
 */
export function identityLeftovers(plan, page) {
  const left = [];
  for (const f of plan.forbidden) {
    if (page.text.includes(f)) left.push("text");
    if (page.attrs.includes(f)) left.push("label");
  }
  if (plan.initials && page.chips.some((c) => c.trim() === plan.initials)) left.push("initials");
  return [...new Set(left)];
}
