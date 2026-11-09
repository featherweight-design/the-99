// The landing demo's name scan (plan 2026-11-08-public-landing-demo.md, "The demo's data"): the exported data is committed
// and shown to every visitor, so it must name no real person. A person can reach it three ways, and each has its own rule:
//
//   1. An ADDRESS: an email, an `@handle`, a Clerk or user id, a profile or social URL. None is ever allowed.
//   2. A PERSON FIELD: a key the exporter marks as a person's name (`player`, `friends`, `opponents`, `author`, ...). Its
//      value must be one of the fixture's invented names (`scripts/lib/fictional-fixture/names.ts`).
//   3. Free text elsewhere (a deck name, a note, a pod): drawn from the fixture's own lists; the test passes those lists in.
//      A key too common to mean free text everywhere (`name`, which is a card's name almost everywhere) is checked only at
//      the paths a rule names (`freeTextAt`): a deck's name in Which deck's lists or a card's claims.
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
  /** Free text found by where it sits rather than by its key alone: a string whose path (`a.b[0].c`, as findings print it)
   *  matches `path` must be one of `allowed`. `what` names the list in the finding. */
  freeTextAt?: readonly { path: RegExp; allowed: readonly string[]; what: string }[];
  /**
   * Text the SOURCE holds that the fixture does not (the exporter passes every deck name its database holds outside the
   * fixture's list): a string equal to one, anywhere and under any key, is a finding, and so is a string CONTAINING one
   * where `containedAt` matches its path (a model's sentence, which can quote a deck by name). Case and outer space are
   * folded.
   */
  forbidden?: { texts: readonly string[]; containedAt?: RegExp; what: string };
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
  const fold = (text: string) => text.trim().toLowerCase();
  const forbidden = (rules.forbidden?.texts ?? []).map(fold).filter((t) => t.length > 0);
  const forbiddenSet = new Set(forbidden);
  const address = (text: string, path: string) => {
    if (EMAIL.test(text)) out.push({ path, why: "an email address", value: text });
    else if (HANDLE.test(text)) out.push({ path, why: "an @handle", value: text });
    if (ID.test(text)) out.push({ path, why: "an account id", value: text });
    if (PROFILE_URL.test(text)) out.push({ path, why: "a profile or social URL", value: text });
  };
  const visit = (node: unknown, path: string) => {
    if (typeof node === "string") {
      address(node, path);
      for (const rule of rules.freeTextAt ?? []) {
        if (rule.path.test(path) && !rule.allowed.includes(node)) out.push({ path, why: `text that is not in the fixture's ${rule.what} list`, value: node });
      }
      if (forbidden.length > 0) {
        const text = fold(node);
        const within = rules.forbidden!.containedAt?.test(path) === true;
        if (forbiddenSet.has(text) || (within && forbidden.some((f) => text.includes(f)))) {
          out.push({ path, why: `a ${rules.forbidden!.what} that is not the fixture's`, value: node });
        }
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((n, i) => visit(n, `${path}[${i}]`));
      return;
    }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        const here = path === "" ? k : `${path}.${k}`;
        // A key can name someone too (a record keyed by a handle or an account id).
        address(k, `${here} (key)`);
        if (rules.personKeys.includes(k)) {
          for (const s of strings(v)) if (!people.has(s)) out.push({ path: here, why: "a person who is not in the fixture's invented names", value: s });
        }
        const allowed = rules.freeText?.[k];
        if (allowed) {
          for (const s of strings(v)) if (!allowed.includes(s)) out.push({ path: here, why: `text that is not in the fixture's ${k} list`, value: s });
        }
        visit(v, here);
      }
    }
  };
  visit(tree, "");
  return out;
}
