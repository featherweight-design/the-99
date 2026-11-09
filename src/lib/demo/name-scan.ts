// The landing demo's name scan (plan 2026-11-08-public-landing-demo.md, "The demo's data"): the exported data is committed
// and shown to every visitor, so it must name no real person. A person can reach it three ways, and each has its own rule:
//
//   1. An ADDRESS: an email, an `@handle`, a Clerk or user id, a profile or social URL. None is ever allowed.
//   2. A PERSON FIELD: a key the exporter marks as a person's name (`player`, `friends`, `opponents`, `author`, ...). Its
//      value must be one of the fixture's invented names (`scripts/lib/fictional-fixture/names.ts`).
//   3. Free text elsewhere (a deck name, a note, a pod): drawn from the fixture's own lists; the test passes those lists in.
//
// Catalog card names are exempt by construction: they are never in a person field, and free text is checked against the
// fixture's lists rather than against a name dictionary (a dictionary would flag "Tyrant" and miss a surname).

export type ScanRules = {
  /** Keys whose string (or string-array) value is a person's name. */
  personKeys: readonly string[];
  /** The invented names a person field may hold. */
  people: readonly string[];
  /** Keys whose string (or string-array) value is the fixture's own free text (deck names, notes, pods) and the lists it may come from. */
  freeText?: Readonly<Record<string, readonly string[]>>;
};

export type ScanFinding = { path: string; why: string; value: string };

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/;
const HANDLE = /(?:^|[\s(])@[A-Za-z0-9_]{2,}/;
const ID = /\b(?:user|org|sess|usr)_[A-Za-z0-9]{8,}\b/;
const PROFILE_URL = /https?:\/\/(?:www\.)?(?:(?:twitter|x|facebook|instagram|linkedin|github|tiktok)\.com\/[A-Za-z0-9_.-]+|reddit\.com\/(?:u|user)\/[A-Za-z0-9_-]+|(?:moxfield|archidekt|tappedout)\.com\/(?:users|user|u)\/[A-Za-z0-9_.-]+|discord\.(?:gg|com)\/[A-Za-z0-9_\/-]+)/i;

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  return [];
}

/** Every finding in `tree` under `rules`: an empty list means the data names no one it should not. */
export function scanNames(tree: unknown, rules: ScanRules): ScanFinding[] {
  const out: ScanFinding[] = [];
  const people = new Set(rules.people);
  const visit = (node: unknown, path: string, key: string | null) => {
    if (typeof node === "string") {
      if (EMAIL.test(node)) out.push({ path, why: "an email address", value: node });
      else if (HANDLE.test(node)) out.push({ path, why: "an @handle", value: node });
      if (ID.test(node)) out.push({ path, why: "an account id", value: node });
      if (PROFILE_URL.test(node)) out.push({ path, why: "a profile or social URL", value: node });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((n, i) => visit(n, `${path}[${i}]`, key));
      return;
    }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        const here = path === "" ? k : `${path}.${k}`;
        if (rules.personKeys.includes(k)) {
          for (const s of strings(v)) if (!people.has(s)) out.push({ path: here, why: "a person who is not in the fixture's invented names", value: s });
        }
        const allowed = rules.freeText?.[k];
        if (allowed) {
          for (const s of strings(v)) if (!allowed.includes(s)) out.push({ path: here, why: `text that is not in the fixture's ${k} list`, value: s });
        }
        visit(v, here, k);
      }
    }
  };
  visit(tree, "", null);
  return out;
}
