import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The accent drawn as TEXT reads --accent-text, never --accent (text inks addendum R1,
// design/design_handoff_the99_text_inks/). The two are the same ink in five themes; in Phyrexia --accent stays dark
// for fills, the focus ring and the fit bar, and only --accent-text reads 4.5:1 on its surfaces. A text site left on
// --accent therefore looks right in five themes and fails AA in the sixth, which no screenshot in the default theme
// shows. Fills, borders, rings, underline and caret colors stay on --accent and are not counted.

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SRC = join(ROOT, "src");

const IN_CODE = [
  /text-\[color:var\(--accent\)\]/g, // the arbitrary-value class, under any variant
  /text-\[var\(--accent\)\]/g, // the same class without the type hint
  /(?<![\w-])\[color:var\(--accent\)\]/g, // the arbitrary property, `[color:...]`
  /\btext-accent\b(?!-)/g, // the @theme utility; text-accent-text and text-accent-hover are other tokens
  /(?<![\w[-])color:(?:[^,;}"'`[]|"[^"\n]*"|'[^'\n]*'){0,200}?["']var\(--accent\)["']/g, // an inline style, plain or in a ternary, over lines
];
const IN_CSS = /(?<![\w-])color:\s*var\(--accent\)(?![\w-])/g;

function sites(file: string, text: string): number {
  if (file.endsWith(".css")) return (text.match(IN_CSS) ?? []).length;
  return IN_CODE.reduce((n, pattern) => n + (text.match(pattern) ?? []).length, 0);
}

function count(): Map<string, number> {
  const found = new Map<string, number>();
  for (const entry of readdirSync(SRC, { recursive: true, encoding: "utf8" })) {
    if (!/\.(tsx?|css)$/.test(entry) || /\.test\./.test(entry)) continue;
    const file = relative(ROOT, join(SRC, entry)).split("\\").join("/");
    const n = sites(file, readFileSync(join(SRC, entry), "utf8"));
    if (n > 0) found.set(file, n);
  }
  return found;
}

// A RATCHET, not a list of exceptions. These are the accent text sites on main when the token landed, grouped by the
// sweep PR that moves them (READINESS.md in the handoff names the boundaries). A sweep deletes its group's entries; a
// file may hold fewer sites than its entry but never more, and a new file holds none. An entry left over after another
// change took its file's last site does not fail, so no other lane's CI breaks on this list; the sweep deletes it. The
// last sweep empties this object, and the guard is then absolute.
const ALLOWANCE: Record<string, number> = {
  // S4 (18 files)
  "src/components/decks/precons/precon-pick-view.tsx": 1,
  "src/components/decks/precons/precon-suggestion.tsx": 2,
  "src/components/decks/precons/precon-tile.tsx": 1,
  "src/components/decks/provenance-line.tsx": 4,
  "src/components/decks/provenance-panel.tsx": 2,
  "src/components/decks/pull-control.tsx": 2,
  "src/components/decks/put-back-control.tsx": 1,
  "src/components/decks/quick-add-bar.tsx": 3,
  "src/components/decks/receipt-modal.tsx": 1,
  "src/components/decks/resolution-expander.tsx": 3,
  "src/components/decks/role-counter-cell.tsx": 3,
  "src/components/decks/role-counter-strip.tsx": 1,
  "src/components/decks/spine-desktop.tsx": 1,
  "src/components/decks/spine-mobile.tsx": 2,
  "src/components/decks/stand-in-door.tsx": 1,
  "src/components/decks/stand-in-limit.tsx": 1,
  "src/components/decks/stand-ins-sheet.tsx": 5,
  "src/components/decks/strip-rationale.tsx": 2,

  // S5 (20 files)
  "src/components/decks/suggestion-card.tsx": 3,
  "src/components/decks/suggestion-line.tsx": 2,
  "src/components/decks/suggestion-lists.tsx": 1,
  "src/components/decks/swap-receipt.tsx": 1,
  "src/components/decks/synopsis-overview.tsx": 2,
  "src/components/decks/synopsis-version.tsx": 1,
  "src/components/decks/token-card-line.tsx": 2,
  "src/components/decks/token-deck-box.tsx": 1,
  "src/components/decks/token-row.tsx": 1,
  "src/components/decks/tokens-group.tsx": 1,
  "src/components/decks/top-off-list.tsx": 3,
  "src/components/decks/tuning-history.tsx": 5,
  "src/components/decks/tuning-hub.tsx": 2,
  "src/components/decks/tuning-panel.tsx": 2,
  "src/components/decks/unresolved-banner.tsx": 1,
  "src/components/decks/unresolved-row.tsx": 1,
  "src/components/decks/update-diff-row.tsx": 1,
  "src/components/decks/update-diff.tsx": 2,
  "src/components/decks/version-diff.tsx": 1,
  "src/components/decks/version-history.tsx": 4,

  // S6 (21 files)
  "src/components/collection/add-cards-sheet.tsx": 5,
  "src/components/collection/add-line.tsx": 2,
  "src/components/collection/added-receipt.tsx": 1,
  "src/components/collection/arrivals-summary.tsx": 3,
  "src/components/collection/collection-empty-doors.tsx": 1,
  "src/components/collection/collection-place-head.tsx": 2,
  "src/components/collection/edit-toast.tsx": 1,
  "src/components/collection/history-list.tsx": 6,
  "src/components/collection/issue-inspector.tsx": 1,
  "src/components/collection/replace-flow.tsx": 2,
  "src/components/collection/replace-review-detail.tsx": 1,
  "src/components/collection/revert-confirm.tsx": 1,
  "src/components/collection/review-parts.tsx": 1,
  "src/components/collection/review-screen.tsx": 1,
  "src/components/collection/rows-view.tsx": 1,
  "src/components/collection/scan/photo-list.tsx": 1,
  "src/components/collection/scan/scanner-view.tsx": 4,
  "src/components/collection/short-deck-warning.tsx": 1,
  "src/components/collection/sync-review.tsx": 2,
  "src/components/collection/upload-choice.tsx": 1,
  "src/components/collection/upload-entry.tsx": 3,

  // S7 (20 files)
  "src/components/admin/account-page.tsx": 2,
  "src/components/admin/accounts-list.tsx": 3,
  "src/components/admin/admin-head.tsx": 1,
  "src/components/admin/blocked-list.tsx": 1,
  "src/components/admin/group-editor.tsx": 1,
  "src/components/admin/group-page.tsx": 1,
  "src/components/admin/groups-list.tsx": 1,
  "src/components/admin/invite-tree.tsx": 1,
  "src/components/admin/invites-section.tsx": 1,
  "src/components/admin/override-controls.tsx": 2,
  "src/components/admin/setting-dialog.tsx": 1,
  "src/components/admin/show-button.tsx": 2,
  "src/components/admin/switch-page.tsx": 2,
  "src/components/admin/switches-list.tsx": 2,
  "src/components/help/help-panel.tsx": 5,
  "src/components/legal/legal-header.tsx": 1,
  "src/components/public/card-page.tsx": 3,
  "src/components/public/commander-page.tsx": 3,
  "src/components/public/printings.tsx": 1,
  "src/components/public/top-bar.tsx": 1,

  // S8 (24 files)
  "src/components/cards/card-modal-shared.ts": 1,
  "src/components/cards/card-modal.tsx": 8,
  "src/components/cards/combo-partners-detail.tsx": 1,
  "src/components/cards/fits-door.tsx": 1,
  "src/components/cards/fits-picker.tsx": 3,
  "src/components/cards/fits-view.tsx": 1,
  "src/components/cards/price-tag.tsx": 1,
  "src/components/cards/printing-region.tsx": 6,
  "src/components/cards/read-row.tsx": 2,
  "src/components/commanders/commander-row.tsx": 1,
  "src/components/commanders/coverage-chip.tsx": 2,
  "src/components/commanders/coverage-section.tsx": 2,
  "src/components/commanders/coverage-sort.tsx": 2,
  "src/components/commanders/excluded-match.tsx": 1,
  "src/components/commanders/fit-legend.tsx": 1,
  "src/components/commanders/guided-banner.tsx": 3,
  "src/components/commanders/rack/filter-sheet.tsx": 1,
  "src/components/commanders/rack/select.tsx": 1,
  "src/components/commanders/retry-submit.tsx": 1,
  "src/components/commanders/reveal-control.tsx": 2,
  "src/components/commanders/synergy-panel.tsx": 3,
  "src/components/commanders/synergy-row.tsx": 3,
  "src/components/commanders/synergy-selection.tsx": 1,
  "src/components/commanders/why-section.tsx": 1,

  // S9 (20 files)
  "src/components/intake/choose-history.tsx": 3,
  "src/components/intake/choose-results.tsx": 1,
  "src/components/intake/choose-row.tsx": 4,
  "src/components/intake/hand-off-answers.tsx": 1,
  "src/components/intake/help-me-choose-door.tsx": 4,
  "src/components/intake/history-link.tsx": 1,
  "src/components/intake/narrow-note.tsx": 2,
  "src/components/intake/past-run.tsx": 2,
  "src/components/intake/read-as-bar.tsx": 1,
  "src/components/intake/read-panel.tsx": 2,
  "src/components/social/commander-picker.tsx": 1,
  "src/components/social/friend-card.tsx": 3,
  "src/components/social/friend-landing.tsx": 1,
  "src/components/social/friends-head.tsx": 2,
  "src/components/social/invite-count-line.tsx": 1,
  "src/components/social/invite-new.tsx": 1,
  "src/components/social/invite-qr.tsx": 2,
  "src/components/social/open-links.tsx": 1,
  "src/components/social/pods-pane.tsx": 1,
  "src/components/social/social-toast.tsx": 1,

  // S10 (19 files)
  "src/components/about/how-rows.tsx": 1,
  "src/components/about/reference/reference-tab.tsx": 6,
  "src/components/about/tools/about-tabs.tsx": 2,
  "src/components/about/tools/tool-card.tsx": 2,
  "src/components/about/tools/tools-tab.tsx": 3,
  "src/components/credits/history.tsx": 1,
  "src/components/credits/offer-art.tsx": 1,
  "src/components/credits/plan-card.tsx": 2,
  "src/components/rule-zero/change-deck.tsx": 1,
  "src/components/rule-zero/home-table-card.tsx": 1,
  "src/components/rule-zero/pod-row.tsx": 1,
  "src/components/rule-zero/read-card.tsx": 1,
  "src/components/rule-zero/setup-sheet.tsx": 3,
  "src/components/rule-zero/table-seat.tsx": 2,
  "src/components/ui/credit-button.tsx": 1,
  "src/components/ui/credits-text.tsx": 2,
  "src/components/ui/filter-panel.tsx": 1,
  "src/components/ui/provenance-disc.tsx": 1,
  "src/components/ui/sheet-group.tsx": 1,

  // S11 (19 files)
  "src/app/commanders/page.tsx": 2,
  "src/app/page.tsx": 1,
  "src/components/card-search/search-layer.tsx": 2,
  "src/components/card-search/search-row.tsx": 2,
  "src/components/discovery/first-run-tour.tsx": 2,
  "src/components/home/first-run.tsx": 1,
  "src/components/home/hero-commander.tsx": 1,
  "src/components/home/precon-pick-receipt.tsx": 1,
  "src/components/join/join-flow.tsx": 2,
  "src/components/join/newcomer-column.tsx": 1,
  "src/components/scan-lab/scan-controls.tsx": 1,
  "src/components/sets/cost-strip.tsx": 2,
  "src/components/sets/delta-strip.tsx": 1,
  "src/components/sets/set-grid-view.tsx": 2,
  "src/components/shell/account-menu.tsx": 2,
  "src/components/shell/credit-chip.tsx": 1,
  "src/components/shell/nav.tsx": 1,
  "src/components/wishlist/card-wishlist.tsx": 1,
  "src/components/wishlist/wishlist-search.tsx": 1,
};

describe("the accent as text", () => {
  const found = count();

  it("counts every form a text site takes, and nothing that is not one", () => {
    const text = [
      'className="text-[color:var(--accent)]"',
      'className="hover:text-[color:var(--accent)]"',
      'className="text-[var(--accent)]"',
      'className="[border:1px_solid_var(--accent)] [color:var(--accent)]"',
      'className="text-accent"',
      'style={{ color: "var(--accent)" }}',
      "style={{ color: 'var(--accent)' }}",
      'style={{ color: current ? "var(--accent)" : "var(--fg-body)" }}',
      `style={{\n  color:\n    selected\n      ? "var(--accent)"\n      : "var(--fg-faint)",\n}}`,
      `style={{ color: selected\n  ? "var(--accent)" : "var(--fg-faint)" }}`,
    ];
    for (const sample of text) expect(sites("a.tsx", sample), sample).toBe(1);
    const notText = [
      'className="text-[color:var(--accent-text)] text-accent-text text-accent-hover"',
      'className="bg-[color:var(--accent)] border-[color:var(--accent)] decoration-[color:var(--accent)]"',
      'className="border-[var(--accent)] outline-[color:var(--accent)]"',
      'style={{ backgroundColor: "var(--accent)", borderColor: "var(--accent)" }}',
      'style={{ color: "var(--fg)", border: "1px solid var(--accent)" }}',
      // a [color:...] class on one line must not run on into the next line's borderColor
      `className="[color:var(--fg)]"\n      style={{ borderColor: on ? "var(--accent)" : "var(--border)" }}`,
    ];
    for (const sample of notText) expect(sites("a.tsx", sample), sample).toBe(0);
    expect(sites("a.css", ".x { color: var(--accent); border-color: var(--accent); }")).toBe(1);
  });

  it("draws no new text in --accent (use --accent-text)", () => {
    const over = [...found]
      .filter(([file, n]) => n > (ALLOWANCE[file] ?? 0))
      .map(([file, n]) => `${file}: ${n} site(s), allowed ${ALLOWANCE[file] ?? 0}`);
    expect(over).toEqual([]);
  });
});
