import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Navigation pending, PR 2: a press on any `<Link>` into another route has to reach the provider,
// or a slow navigation sits on the old page with nothing said. `useLinkStatus` is only readable
// inside the link, so every `<Link>` carries a reporting child — `PendingPip`, `PendingTrack` or
// the mark-less `PendingReporter` — unless it is named below with the reason it needs none.
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const REPORTERS = new Set(["PendingPip", "PendingTrack", "PendingReporter"]);

// Keyed `file :: href expression`, so a new link in a listed file is not exempted by accident.
// A KEPT route (`/decks/[id]`, `…/changes`, `…/import`, `/decks/new/choose`) keeps its own
// loading.tsx, which commits at press and ends pending before any mark could paint; a same-page
// anchor never navigates.
const KEPT = "a kept route: its own screen commits at press";
const EXEMPT: Record<string, string> = {
  "components/cards/card-modal.tsx :: `/decks/${claim.id}`": KEPT,
  "components/cards/card-modal.tsx :: `/decks/${deck.id}`": KEPT,
  "components/cards/fits-picker.tsx :: `/decks/${deck.id}`": KEPT,
  "components/cards/fits-picker.tsx :: `/decks/${h.id}`": KEPT,
  "components/collection/short-deck-warning.tsx :: `/decks/${row.deckId}`":
    "opens in a new tab, so this page and its warning stay where they are",
  "components/decks/deck-card-overflow.tsx :: `/decks/${deckId}/import`": KEPT,
  "components/decks/deck-card.tsx :: `/decks/${deck.id}`": KEPT,
  "components/decks/deck-card.tsx :: noticesHref(deck.id)": KEPT,
  "components/decks/first-commit-offer.tsx :: `/decks/${deckId}/changes?commit=1`": KEPT,
  "components/decks/pending-banner.tsx :: commitHref(deckId)": KEPT,
  "components/decks/pending-banner.tsx :: reviewHref(deckId)": KEPT,
  "components/decks/proxy-list-view.tsx :: `/decks/${deck.id}`": KEPT,
  "components/decks/review-changes.tsx :: `/decks/${deckId}`": KEPT,
  "components/decks/update-diff-row.tsx :: `/decks/${deck.sourceDeckId}`": KEPT,
  "components/home/resume-decks.tsx :: `/decks/${deck.id}`": KEPT,
  "components/intake/hand-off-answers.tsx :: changeHref": KEPT,
  "components/intake/help-me-choose-door.tsx :: CHOOSE_PATH": KEPT,
  "components/intake/help-me-choose-door.tsx :: qs ? `${CHOOSE_PATH}?${qs}` : CHOOSE_PATH": KEPT,
  "components/intake/narrow-note.tsx :: changeHref": KEPT,
  "components/intake/narrow-note.tsx :: optionHref(o)": KEPT,
  "components/intake/read-as-bar.tsx :: changeHref": KEPT,
  "components/intake/read-as-bar.tsx :: startOverHref": KEPT,
  "components/intake/search-failed.tsx :: changeHref": KEPT,
  "components/ui/availability-marker.tsx :: `/decks/${text.deck.id}`": KEPT,
  "components/shell/account-menu.tsx :: \"/about\"":
    "the press closes the menu and unmounts the link, so AccountMenu reports the transition instead",
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return entry.endsWith(".tsx") && !entry.includes(".test.") ? [full] : [];
  });
}

function links(file: string): { href: string; reports: boolean }[] {
  const text = readFileSync(file, "utf8");
  if (!/from ["']next\/link["']/.test(text)) return [];
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: { href: string; reports: boolean }[] = [];
  // The tag is whatever name this file binds next/link's default export to, never the literal
  // `Link`: `import AppLink from "next/link"` is valid, and a literal match would skip its links.
  const linkName = sf.statements
    .filter(ts.isImportDeclaration)
    .find((d) => ts.isStringLiteral(d.moduleSpecifier) && d.moduleSpecifier.text === "next/link")
    ?.importClause?.name?.getText(sf);
  if (!linkName) return [];
  const tagOf = (n: ts.JsxOpeningLikeElement) => n.tagName.getText(sf);
  const hrefOf = (n: ts.JsxOpeningLikeElement) => {
    const attr = n.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(sf) === "href");
    const init = attr && ts.isJsxAttribute(attr) ? attr.initializer : undefined;
    if (!init) return "(none)";
    return ts.isJsxExpression(init) ? (init.expression?.getText(sf) ?? "") : init.getText(sf);
  };
  const hasReporter = (n: ts.Node): boolean => {
    let hit = false;
    const walk = (c: ts.Node) => {
      if ((ts.isJsxSelfClosingElement(c) || ts.isJsxOpeningElement(c)) && REPORTERS.has(tagOf(c))) hit = true;
      if (!hit) ts.forEachChild(c, walk);
    };
    ts.forEachChild(n, walk);
    return hit;
  };
  const visit = (n: ts.Node) => {
    if (ts.isJsxElement(n) && tagOf(n.openingElement) === linkName) {
      found.push({ href: hrefOf(n.openingElement), reports: hasReporter(n) });
    } else if (ts.isJsxSelfClosingElement(n) && tagOf(n) === linkName) {
      found.push({ href: hrefOf(n), reports: false });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

describe("every Link reports its pending state", () => {
  const all = sourceFiles(SRC).flatMap((file) =>
    links(file).map((l) => ({ ...l, key: `${relative(SRC, file)} :: ${l.href}` })),
  );

  it("finds the links it is sweeping", () => {
    expect(all.length).toBeGreaterThan(30);
  });

  it("carries a reporter in every Link, or names why it needs none", () => {
    expect(all.filter((l) => !l.reports && !(l.key in EXEMPT)).map((l) => l.key)).toEqual([]);
  });

  it("names no exemption that has gone stale", () => {
    const keys = new Set(all.filter((l) => !l.reports).map((l) => l.key));
    expect(Object.keys(EXEMPT).filter((k) => !keys.has(k))).toEqual([]);
  });
});
