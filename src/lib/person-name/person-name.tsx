// The only places a `ThirdPartyName` is drawn. Each marks what it draws with `ph-no-capture`, PostHog's opt-out
// class: a click on the marked element (or inside it) is never autocaptured, and a marked span nested in a clicked
// button or link is left out of the event's text. The class goes on the element holding the name ITSELF, never only
// on an ancestor: posthog-js walks DOM parents, so a React ancestor's class does not reach a child rendered through a
// portal (`autocapture.test.tsx` pins both).
//
// A plain string (the reader's own name, a deck, a pod that is the reader's) is drawn plainly, so a shared component
// takes `string | ThirdPartyName` and is marked only where it names someone else.
import { faceInitials } from "../social/initials";
import { isThirdPartyName, namesSomeone, type PersonParts, type ThirdPartyName } from "./brand";
import { reveal } from "./reveal";

/** PostHog's opt-out class (posthog-js `ph-no-capture`). */
export const NO_CAPTURE = "ph-no-capture";

const textOf = (text: string | PersonParts): string =>
  typeof text === "string" ? text : text.map((p) => (typeof p === "string" ? p : reveal(p))).join("");

/** A name, marked when it is someone else's. */
export function PersonName({ n }: { n: string | ThirdPartyName }) {
  return isThirdPartyName(n) ? <span className={NO_CAPTURE}>{reveal(n)}</span> : <>{n}</>;
}

/** A face's two letters (`faceInitials`), marked when the face is someone else's: initials are part of the name. */
export function PersonInitials({ n }: { n: string | ThirdPartyName }) {
  return isThirdPartyName(n) ? <span className={NO_CAPTURE}>{faceInitials(reveal(n))}</span> : <>{faceInitials(n)}</>;
}

/**
 * Copy that may name someone (`personText`). One text node: in a marked span when it names a third party, plain
 * otherwise, so a sentence reads, wraps and is found by its text exactly as the plain string was.
 */
export function PersonText({ text }: { text: string | PersonParts }) {
  return namesSomeone(text) ? <span className={NO_CAPTURE}>{textOf(text)}</span> : <>{textOf(text)}</>;
}

/**
 * Attributes that may name someone, spread on the element that carries them: `<div {...personAttrs({ "aria-label":
 * copy.cardAria(name) }, "rounded")}>`. The element is marked whenever any value names a third party, so an attribute
 * can never be computed from a name without marking its element. `className` is the element's own classes.
 */
export function personAttrs<K extends string>(
  attrs: Record<K, string | PersonParts>,
  className?: string,
): Record<K, string> & { className?: string } {
  const out = {} as Record<K, string>;
  let marked = false;
  for (const key of Object.keys(attrs) as K[]) {
    out[key] = textOf(attrs[key]);
    marked ||= namesSomeone(attrs[key]);
  }
  const classes = [className, marked ? NO_CAPTURE : undefined].filter(Boolean).join(" ");
  return classes ? { ...out, className: classes } : out;
}
