# UI Button Primitive — Migration Inventory

Generated mechanically by the `no-restricted-syntax` rule added in
`eslint.config.mjs` (Task 2 of
`2026-07-25-ui-button-primitives.md`). Regenerate with:

```bash
npx eslint --format json src | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const R="no-restricted-syntax";for(const r of JSON.parse(s)){const ls=r.messages.filter(m=>m.ruleId===R).map(m=>m.line);if(!ls.length)continue;const p=r.filePath.replace(process.cwd()+"/","");console.log(`| ${p} | ${[...new Set(ls)].join(", ")} | ${new Set(ls).size} |`)}})'
```

Two hand-audits of this surface disagreed with each other, so the list below is
the authoritative one: it is derived from the AST, not from reading.

## Scope of the rule

The selector fires only on `button` / `a` / `Link` opening elements. An inline
style can only kill a `hover:` utility on an element that has a hover state;
inline colour on a static `div` is a separate and much larger concern (905
findings across 58 files when the selector is unscoped) and is out of scope.

Two counts appear below and they are not the same number. The rule reports one
warning per offending property, so a single element carrying `background`,
`border` and `color` produces three: **225 warnings across 38 files**. The
`Sites` column counts distinct elements — **182** of them. Warnings are what
`pnpm lint` totals; sites are what gets migrated.

## Offenders

| Surface | File | Offending lines | Sites |
|---|---|---|---|
| collection | `src/app/collection/page.tsx` | 45, 85, 93, 94, 95 | 5 |
| collection | `src/app/collection/replace/page.tsx` | 21, 25 | 2 |
| commanders | `src/app/commanders/page.tsx` | 148, 149, 150, 162, 163, 164, 178, 179, 180 | 9 |
| collection | `src/components/collection/card-modal.tsx` | 159, 200, 201, 272, 285 | 5 |
| collection | `src/components/collection/chip-row.tsx` | 98, 156 | 2 |
| collection | `src/components/collection/color-pip.tsx` | 30 | 1 |
| collection | `src/components/collection/confirm-modal.tsx` | 172, 173, 195, 196, 197 | 5 |
| collection | `src/components/collection/grid-view.tsx` | 32, 33, 77, 78, 79 | 5 |
| collection | `src/components/collection/issue-inspector.tsx` | 255, 256, 336, 337, 338, 465, 466, 467, 519, 520, 521 | 11 |
| collection | `src/components/collection/no-results.tsx` | 112, 121 | 2 |
| collection | `src/components/collection/review-screen.tsx` | 47, 229, 230, 231, 276, 284 | 6 |
| collection | `src/components/collection/rows-view.tsx` | 37, 38, 88, 89, 90 | 5 |
| collection | `src/components/collection/upload-entry.tsx` | 218, 227, 242 | 3 |
| commanders | `src/components/commanders/commanders-view.tsx` | 160, 195, 208, 222, 223, 224, 283, 326, 337 | 9 |
| commanders | `src/components/commanders/degraded-banner.tsx` | 43, 102, 103, 104 | 4 |
| commanders | `src/components/commanders/detail.tsx` | 473, 475, 745, 746, 747, 780, 926, 927, 928, 945, 946, 947 | 12 |
| commanders | `src/components/commanders/filtered-empty.tsx` | 140, 141, 142 | 3 |
| commanders | `src/components/commanders/full-card-trigger.tsx` | 35, 37 | 2 |
| commanders | `src/components/commanders/lightbox.tsx` | 131, 132, 133 | 3 |
| commanders | `src/components/commanders/rec-card.tsx` | 156, 323 | 2 |
| decks | `src/components/decks/add-panel.tsx` | 89, 91, 93, 109 | 4 |
| decks | `src/components/decks/builder-shell.tsx` | 166, 167, 168, 199, 200, 201 | 6 |
| decks | `src/components/decks/builder-spine.tsx` | 113, 196, 197, 198, 213, 214, 215, 243, 244, 245 | 10 |
| decks | `src/components/decks/create-picker.tsx` | 152, 153, 317, 318, 319, 412, 413, 414 | 8 |
| decks | `src/components/decks/create-pre-filled.tsx` | 73, 86, 308, 309, 310, 321 | 6 |
| decks | `src/components/decks/deck-card-overflow.tsx` | 67, 68, 69, 93, 102 | 5 |
| decks | `src/components/decks/deck-card.tsx` | 194, 195, 196 | 3 |
| decks | `src/components/decks/decklist-row.tsx` | 72 | 1 |
| decks | `src/components/decks/degraded-banner.tsx` | 56, 66, 67, 68 | 4 |
| decks | `src/components/decks/export-copy-button.tsx` | 72, 73, 74 | 3 |
| decks | `src/components/decks/export-dialog.tsx` | 213, 227, 228, 229, 256, 257, 258, 273, 274, 275, 499, 500, 501 | 13 |
| decks | `src/components/decks/group-toggle.tsx` | 35, 36, 49, 50, 80, 81, 98, 99 | 8 |
| decks | `src/components/decks/new-deck-button.tsx` | 17, 18, 19 | 3 |
| decks | `src/components/decks/rename-form.tsx` | 69, 70, 71, 83, 84, 85 | 6 |
| decks | `src/components/decks/role-counter-cell.tsx` | 42, 43 | 2 |
| decks | `src/components/decks/search-result-row.tsx` | 73 | 1 |
| decks | `src/components/decks/suggestion-card.tsx` | 90 | 1 |
| app-shell / home | `src/components/home/dashboard.tsx` | 123, 159 | 2 |

## Classification

Each site is one of:

- **PRIMARY** — brass fill CTA, migrates to `PrimaryButton`
- **GHOST** — bordered secondary CTA, migrates to `GhostButton`
- **EXEMPT-DYNAMIC** — colour is computed at runtime (mana pips, colour
  identity); keeps its inline style with a rule disable and a reason
- **EXEMPT-PATTERN** — belongs to a different shared pattern: a two-state
  toggle pill, a selectable card row, or a plain text action whose text is
  brass rather than `var(--fg)`

An earlier draft of this document drew the line at "overrides 3 or more of the
7 properties the primitives own." That test was wrong and has been dropped: it
measures deviation from `PrimaryButton`, so it flags a two-state toggle as
bespoke even though every toggle in the app is identical to every other one.
Uniqueness, not deviation, is what makes a site exempt.

Most of the 182 sites are card wrappers, list rows, chips and toggles rather
than CTAs, and land in the two EXEMPT buckets. No call site is migrated in this
PR — the primitives land first, and each surface follows in its own PR. The
three surface branches prepared against this inventory classify 29 sites as
true CTAs and the remainder as a different pattern; those numbers are final
only once each surface PR merges.
