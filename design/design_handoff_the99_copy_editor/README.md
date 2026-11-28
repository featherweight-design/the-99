# The 99 — On-page copy editor (design handoff)

An admin-only, staging-only mode laid over every app page: the admin clicks any visible text, edits it in
place, and a batch of edits becomes one pull request. Stateful UI over existing pages; the pages themselves
don't change. Approved by Hugh 2026-11-24 (R1).

Boards (canvas, pan/zoom): `Main.dc.html` (locked points, calls, questions), `Phone.dc.html` and
`Desktop.dc.html` (all 12 states each). Drawn over `/commanders/choose` rendered from main; every colour is an
app token (`--accent`, `--warning`, `--danger`, `--success`, `--surface-raised`, `--border-strong`, `--fg-*`).
`scratch-gen/` holds how the art was made (`HOW.md`, `overlay.js` is the whole overlay as drawn).

## Source of truth

No brief file: Hugh's design prompt (2026-11-24) is the brief. Its five locked points:

| # | Locked | Where the design meets it |
|---|---|---|
| 1 | Admins only, staging only | Door and mode render only when the viewer is an admin and `adminEnvironment()` reads `staging`. Players and production get nothing, not even the script. The bar says `staging`. |
| 2 | Visible text only | Only on-screen text is outlined and clickable. No search and no hidden-string list; screen-reader labels, alt text and placeholders are left to the review after submit. |
| 3 | Tray, one Submit, one PR; staging unchanged until merge | Edits collect in the tray across pages. Open pull request makes one branch and one PR. Submitted says staging changes on merge, and the page returns to today's staging text. |
| 4 | Current wording, locked fill-in chips, variations together, live rule errors | Every editor shows Now above New. `{fill-ins}` are chips that drag, and can be removed and inserted (see ADDENDUM-insert-fill.md). A line's variations edit together, labelled by when each shows. The copy sheet's refusals run as you type. |
| 5 | Read-only text visibly not editable, with a reason | Dotted grey outline, a lock in the editor, one-line reason: data not copy (theme names, card names in demo decks), or `edit in code` naming the helper that builds it. |

## States delivered (phone 390 and desktop 1300)

See `STATES.md`. Off, on, targeted; editor plain, with fill-ins, with variations, rule error, read-only;
tray with edits; submitting, submitted, failed.

## Decisions (all LOCKED by Hugh's approval of R1)

### C1. Marking editable text
- Each editable text: `outline: 1px dashed color-mix(var(--accent) 60%, transparent)`, `outline-offset: 2px`,
  radius 3px. Outline sits outside the box model: no reflow, wrap or scrollbar change.
- Read-only: `1px dotted` `--fg-faint`, `cursor: not-allowed`.
- Edited: `1px solid --accent` plus a 12% accent wash; the new words preview in place (local only).
- Targeted (desktop hover, phone first tap): `2px solid --accent`, offset 3px, 14% wash, and a tag above the
  line: `file · key` in mono plus "Click to edit" (desktop) or "Tap again to edit" (phone). A phone's second
  tap opens the editor, so a scroll never opens one.
- While the mode is on, a click targets text instead of following links or pressing buttons. Done gives the page back. With edits still unsent, Done leaves a notice and the door keeps the count: see `ADDENDUM-done-unsent.md`.

### C2. The toggle
- Desktop: a floating pill, bottom right 24px: `✎ Edit copy` + amber staging dot (`--warning`, the admin
  head's staging chip colour). On, it grows into the bar: dot, `Editing copy`, mono `staging`, then
  `Click any text` or the `N edits ›` count, and `Done`. With unsent edits the pill also carries `N edits waiting`
  (`ADDENDUM-done-unsent.md`).
- Phone: a 40px pencil button in the mobile header, left of search, with the staging dot. On, a 46px bar pins
  under the header (`top` = header bottom), over the page, without reflowing it. With unsent edits the pencil
  carries a count badge (`ADDENDUM-done-unsent.md`).

### C3. Editor: popover (desktop), bottom sheet (phone)
- Desktop popover: 420px, radius 14px, anchored 14px under the line with a caret; flips above when there is
  no room below. Phone: bottom sheet, radius 20px top, under a `rgba(8,6,4,.55)` scrim.
- Head: `file · key` (mono 12px) and a kind line (mono 10.5px caps): `title · up to 8 words`, `caption`,
  `2 variations · chip`, `🔒 read only`. Close ✕.
- `Now`: today's text with chips, `--fg-muted`. `New`: the field (focus ring accent; error ring danger).
- Chip: mono 12px, accent text on 16% accent, 1px 55% accent border, radius 6px, grip `⠿`. Moves, removes (✕) and inserts per ADDENDUM-insert-fill.md.
- Variations: one field per variation, labelled `When n is 1 · now "{n} pick"` / `Otherwise · now "{n} picks"`.
- Rule line under the field, live: count against the cap (`3 of 8 words`), a fill-in note, a `Preview:` line;
  errors in `--danger`, each its own line, the offending characters marked in the field. `Add to edits` is
  disabled while any error stands.
- Read-only: no field. Lock, today's text, the reason box, `Copy key` and `Close`.
- Footer: `Cancel`, `Add to edits` (primary). Reopened from the tray: `Update edit` and `Remove edit`.

### C4. Tray
- Opened from the bar's `N edits ›`. Desktop: a 420px panel 84px above the bottom (over the bar's corner).
  Phone: bottom sheet.
- Head `Copy edits · N`, sub "One pull request for all of them. Staging doesn't change until it merges."
- Row: key (mono 11px faint), old (13px faint, struck through), new (14px); `Edit · Remove`.
- Footer: `Clear all` text button, `Open pull request` primary.

### C5. After Submit
- Submitting: rows dim to 55% and lock; button spinner `Opening pull request…`; left line "Checking the rules,
  then pushing a branch".
- Submitted: success check, `Pull request #N opened`, branch name, "Staging shows the new wording once it
  merges; until then this page keeps today's text." `Open on GitHub ↗`, `Done`. The bar shows `PR #N open`
  (success colour) until it merges.
- Failed: danger banner "No pull request opened. One edit is out of date; your edits are kept." The edit at
  fault gets a danger border, its reason, and `Redo`. `Try again` resubmits. A rule refusal and a GitHub or
  network failure use the same banner with their own line.

### Open questions, settled as recommended (A)
- Q1 Same words under two keys: the editor lists both keys and asks which one this is.
- Q2 The tray keeps edits in this browser until submitted or cleared, across pages and reloads.
- Q3 While on, a click targets text; Done to use the page.
- Q4 Edits preview on the page, marked solid.

## For engineering (suggested, the plan PR decides)
- Submit is the copy sheet import run on the server: the same validate and land code in
  `scripts/lib/copy-sheet/` (see `docs/agents/copy-sheet.md`, "What the import refuses"), one branch
  `copy-edit-<utc>`, one PR with the old to new table. The editor runs the same validator client-side.
- Finding the key: staging ships the export's rows (key, kind, current text, placeholders); the overlay
  matches visible text nodes against them, templates as patterns. No new attributes in the pages.
- Staleness: each edit carries the current text it was made against; the import's stale-sheet refusal is the
  Failed state's reason.
- Copy is in `copy strings.ts`, for `src/lib/copy/`.
