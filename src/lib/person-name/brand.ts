// Another reader's name, as a type (PersonName plan, PR A). PostHog's autocapture records a clicked element's text
// and attributes, and `ph-no-capture` on the element or any DOM ancestor drops the event; a name that reaches the page
// unmarked is a name in the analytics. A field-name list cannot be proven complete (a name is renamed to a generic
// `name`, spliced into copy, computed into an aria-label), so the name is a TYPE that does not convert to a string:
// JSX will not draw it, an attribute will not take it, and `check:third-party-names` fails a template, `String()`,
// `.toString()` or `+` that would. It is drawn only by `<PersonName>`, `<PersonText>` and `personAttrs()`
// (`person-name.tsx`), which mark what they draw.
//
// Minted by `named()` (`mint.ts`) ONLY inside `src/lib/social/`, the cross-user read layer, and read back to a string by
// `reveal()` (`reveal.ts`) only in the files `check:third-party-names` allows. Both are enforced by that check and by
// ESLint's `no-restricted-imports`.

declare const thirdParty: unique symbol;

/**
 * Another reader's name. OPAQUE: an object type no value can be written as, so it is never assignable to `string`
 * (`string & brand` would be, and a template or aria-label would compile). At runtime it is a plain object,
 * `{ $tp: string }`, so it survives RSC props, a server action's answer and JSON.
 */
export type ThirdPartyName = { readonly [thirdParty]: true };

/** Copy that names a third party: plain runs and names, in reading order. Built by `personText`. */
export type PersonParts = ReadonlyArray<string | ThirdPartyName>;

/** True for a branded name, also one that arrived through JSON. A plain string (the reader's own name) is not one. */
export function isThirdPartyName(value: unknown): value is ThirdPartyName {
  return typeof value === "object" && value !== null && typeof (value as { $tp?: unknown }).$tp === "string";
}

/** True when the copy names a third party, so whatever draws it must be marked. */
export function namesSomeone(text: string | PersonParts): boolean {
  return typeof text !== "string" && text.some(isThirdPartyName);
}

/**
 * A copy template that may name someone: `` personText`You and ${name} are friends.` ``. A plain string or number
 * joins the text around it, and another line's parts are spliced in; a name stays a name, so the result is drawn by `<PersonText>` and never becomes a string
 * on the way. A name that is the reader's own (a plain string) yields copy that names nobody.
 */
export function personText(strings: TemplateStringsArray, ...values: ReadonlyArray<string | number | ThirdPartyName | PersonParts>): PersonParts {
  const out: Array<string | ThirdPartyName> = [];
  const push = (piece: string | ThirdPartyName) => {
    if (typeof piece === "string") {
      if (piece === "") return;
      const last = out.length - 1;
      if (last >= 0 && typeof out[last] === "string") out[last] = `${out[last]}${piece}`;
      else out.push(piece);
    } else out.push(piece);
  };
  strings.forEach((s, i) => {
    push(s);
    if (i < values.length) {
      const v = values[i];
      if (typeof v === "number") push(String(v));
      else if (typeof v === "string" || isThirdPartyName(v)) push(v);
      else v.forEach(push);
    }
  });
  return out;
}

/** Names joined by `sep` as parts: each name stays a name, so the list is drawn by `<PersonText>`. */
export function joinNames(names: ReadonlyArray<string | ThirdPartyName>, sep = ", "): PersonParts {
  return names.flatMap((n, i) => (i === 0 ? [n] : [sep, n]));
}
