# Design Brief: First-run onboarding fixes

**Date:** 2026-09-28 · **Branch:** `docs/first-run-onboarding-brief`
**Rulings:** Hugh, 2026-09-28, from his walk of production's first run on an empty account (§3).
**Verified against `origin/main` at `962e9ad6`.** Every path below exists on that commit
(`git cat-file -e`); line numbers were read there.

---

## §1 Goal

A player with an empty account reaches a read collection, and then a first deck, without a
dead end, a locked control that does not say why, or a confirmation that treats a reversible
step as a disaster.

## §2 Surfaces

| Surface | Files |
|---|---|
| First-run checklist (Home when the collection is unread) | `src/components/home/first-run.tsx` (step 1 mounts `ReplaceFlow ... embedded` at `:153`; locked steps 2 and 3 at `:157-158`; the import escape hatch at `:160-172`), mounted from `src/app/page.tsx:194` |
| First-run copy | `src/lib/copy/refresh.ts:233-253` (`firstRun.*`: `step2Title`, `step2Locked`, `importPrompt`, `lockedItemAria`) |
| Locked rail (desktop) | `src/components/shell/nav.tsx`: `NavRail` `:137`, the divider and `LockGlyph` drawn once under the items at `:206-215`, `LockGlyph` at `:58` |
| Locked tab bar (phone) | `src/components/shell/nav.tsx`: `TabBar` `:234`; locked slots are dimmed to `--fg-locked` and inert, nothing more (`:274`) |
| Lock state | `src/components/shell/shell.tsx:35` (`locked = stats.uniqueCards === 0`) |
| Review screen | `src/components/collection/review-screen.tsx` (phone header with the `‹` chevron `:51-58`; desktop-only Cancel `:307-314`) |
| Replace flow | `src/components/collection/replace-flow.tsx` (hides its own title when `embedded`, `:57`; does not hide the review's phone header) |
| Replace confirm modal | `src/components/collection/confirm-modal.tsx` (warning-icon header, `--danger` input and button, type `REPLACE` to arm) |
| Replace warning banner (step 1) | `src/components/collection/upload-entry.tsx:194-209` (amber `⚠` banner, `--warning` left rule) |
| Issue Inspector | `src/components/collection/issue-inspector.tsx` (desktop 660x640 modal, phone full-screen at `:111`, `:131`), list in `issue-inspector-list.tsx` |
| The filters' bottom sheet | `src/components/ui/sheet.tsx` (`Sheet` `:100`: scrim, panel, drag handle with 80px dismissal), as used by `src/components/collection/filter-sheet.tsx` (22px radius, `--surface-inset`, `max-h-[86vh]`, `:179`) and `src/components/decks/deck-filter-sheet.tsx` |
| Design table | `docs/superpowers/design-tables/collection.md:2062` (`Desktop cancel` row, no phone counterpart) |

## §3 Locked rulings (Hugh, 2026-09-28)

1. **Step 1 is the collection only.** Remove "Already have a deck elsewhere?" and the
   "Import a deck" button from the first-run checklist. The collection always comes first.
   This deliberately overrides `refresh.ts:247-249` ("arriving with a decklist and no CSV must
   not be a dead end") and the refresh handoff's decision 6
   (`design/design_handoff_the99_refresh/README.md:52-57`).
2. **Step 2 offers two paths:** "Pick a commander" OR "Import a deck". Both are viable once a
   collection is read. Today step 2 is "Pick a commander" alone.
3. **Locked navigation must explain itself.** Until a collection is uploaded, Collection,
   Commanders, Discover and Decks are locked. Hugh: "This isn't intuitive." It must be clear,
   at both widths, that they unlock once a collection is uploaded.
4. **Import issues on the phone use the bottom sheet the filters use** (the "pop-up shelf").
   This overrides the issue-inspector handoff's locked decision 2, full-screen rather than
   half-sheet (`design/design_handoff_the99_issue_inspector/README.md:52-56`).
5. **The replace confirmation is calmer (5b).** A first import loses its confirm (engineering,
   §5). Replacing an EXISTING collection keeps one, but Hugh: "Users can go back from here by
   replacing their collection, so we shouldn't treat this so harshly." Design owns the
   treatment; the words go through `/copy-review` afterwards.
6. **The phone has an exit after a CSV is processed** (item 8). The handoff never drew a phone
   Cancel, and the phone header sits inside the step-1 card in first run.

## §4 Open for Design

**4.1 Step 2, two paths (ruling 2).** Draw step 2 in both states at 390 and 1300:
- *Before the collection is read:* locked, as step 2 is today, but naming both paths. Does the
  locked card name both, or keep one title with the reason?
- *After it is read:* live, with "Pick a commander" and "Import a deck" as peers or as a
  primary and a secondary. Design calls which, and where each lands (`/commanders`,
  `/decks/import`). Say what happens to step 3 ("Build the 99", "Unlocks with a commander")
  when the player takes the import path, since an imported deck already has one.
- The checklist without its foot (ruling 1): does the card column close up, or does the space
  go to step 1?

**4.2 Locked navigation (ruling 3).** Draw at 390 and 1300, every theme's `--fg-locked`:
- *Desktop rail:* today one 14x16 padlock under a 34px divider, once
  (`CHROME-rail-and-tabs.md:111-121`). The reason lives only in the accessible name. Make the
  reason visible: a label, a tooltip, a note in the rail, or a pointer to step 1. The rail is
  narrow, so say what fits.
- *Phone tab bar:* four dimmed items and nothing else. Draw what a player sees before tapping,
  and what happens when they do tap a locked item (today: nothing).
- *The moment it unlocks:* whether the rail and bar mark the change once the collection is read,
  or simply come alive.

**4.3 Import issues sheet on the phone (ruling 4).** Draw the Issue Inspector inside the
`Sheet` chrome (handle, scrim, drag-to-dismiss) at 390: header, the Unmatched and Parse errors
tabs, the filter field, and a long list (200+ rows, the handoff's worst case). The handoff
rejected a half-sheet for its nested scroll inside a draggable sheet; resolve that (height, and
whether the drag lives on the handle alone). Pick the sheet vocabulary it takes: the collection
filter sheet's (22px, `--surface-inset`, 86vh) or the shared default (16px, `--surface-rail`,
78vh). Desktop's modal is unchanged unless Design says otherwise.

**4.4 The calm replace confirm (ruling 5).** Replace only; a first import has no confirm. Today
it is a danger modal: warning icon, `--danger` border on the input and button, type `REPLACE`
to arm, and "It can't be undone" in bold. Design decides the whole treatment: whether typing a
token survives, the ink (neutral or `--warning` rather than `--danger`), the icon, the button's
count label, and whether the step-1 amber banner (`upload-entry.tsx:194`) comes down to match.
Draw 390 and 1300. Placeholder copy is fine; `/copy-review` sets the words.

**4.5 The phone exit (ruling 6).** Two parts, at 390:
- *The exit itself:* a phone Cancel beside or under "Continue to import →" / "Continue to
  replace →", or another shape. The `‹` chevron beside "Review import" reads as confusing next
  to the action; say whether it stays.
- *Where the header sits in first run:* embedded mode hides the page title but not the phone
  header, so the "Review import" row and its chevron render mid-card inside step 1. Draw the
  review as it should sit inside the step-1 card, and outside it on `/collection/replace`.

**States to draw, in sum:** step 2 locked and live (390, 1300); locked rail (1300) and locked
tab bar with a tapped item (390); the phone issues sheet, short list and 200+; the calm replace
confirm (390, 1300); the phone review with its exit, embedded in first run and on
`/collection/replace`.

**About entry.** Design and Hugh decide whether this owes one. The step 2 import path and the
explained lock are closest to a capability; the rest is treatment.

## §5 Already handled by engineering, not Design's

Being fixed in a separate lane; listed so they are not drawn twice.
- **Item 3:** top alignment of the first-run page.
- **Item 4:** the filled card fan.
- **Item 5a:** the first import skips its confirm (only a replace confirms, §4.4).
- **Item 9:** left-aligned issue headings.
- **Item 10:** a full-width paste box.

## §6 Existing handoffs to mirror

- `design/design_handoff_the99_refresh/`: drew first run (Home's checklist, locked rail and tab
  bar). `CHROME-rail-and-tabs.md:111` (locked chrome), `README.md:96` (zero states, R2),
  `refresh · copy strings.ts`. **Closest folder.**
- `design/design_handoff_the99_collection/`: upload, review and type-to-confirm replace
  (`README.md:16-18`, `:69-81`).
- `design/design_handoff_the99_issue_inspector/`: the Inspector; decision 2 is the one ruling 4
  reverses.
- `design/design_handoff_the99_collection_filter/`: the bottom sheet the Inspector moves into
  (`README.md:39`).

**Suggested target:** `design/design_handoff_the99_first_run_onboarding/`.
