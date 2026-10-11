# READINESS: Deck notes, audit, 2026-10-11

Audited against `docs/superpowers/design-briefs/2026-10-11-deck-notes.md` (Hugh's seven rulings, engineering's
eight locks, the eight open questions, the Fixtures) and against `origin/main` at `bbf0594fe`.

## Verdict: GREEN

R4 is current. Hugh confirmed the ruling 5 placement on 2026-10-11 (F1). Everything else is eng-resolvable
below. Nothing goes back to Design.

## Current round and history

**Current: R4.** Build from these files only:

| File | Role |
|---|---|
| `The 99 - Deck Notes (R4).dc.html` | The canvas. C0 calls plus 18 frames (N0, E1-E3, A1-A2, K1-K2, W1-W2, MD, ED, DL, C1-C2, M1-M2, RF) and AB, each at 900 and 390 |
| `Notes R4.dc.html` | The frame component the R4 canvas draws |
| `STATES-deck-notes.md` | Read the R4 deltas first, then R3, R2, R1 where R4 is silent |
| `design-tables/deck-notes.md` | R4 rows, then R3 |
| `notes-copy.ts` | Proposed `deckNotesCopy` (to `/copy-review`) |
| `about-notes.ts` | The About entry and the `DECK_NOTES_ENABLED` switch |
| `README.md`, `READINESS.md` | Design's summary and gaps |

**History, superseded, kept for the record:**

- R1 (the round when the feature was called **Jottings**): `The 99 - Deck Notes (R1).dc.html`, `Jottings.dc.html`,
  `STATES-jottings.md`, `design-tables/jottings.md`, `jottings · copy strings.ts`, `about · jottings.ts`.
- R2 (a closed strip above the segment): `The 99 - Deck Notes (R2).dc.html`, `Notes.dc.html`.
- R3 (Notes became a panel beside Stats): `The 99 - Deck Notes (R3).dc.html`, `Notes R3.dc.html`.

**The name is Notes.** Design proposed Jottings in R1. Per Design's R2 note, Hugh's R1 feedback restored Notes.
In code it is `deck_notes`, `deckNotesCopy` and `DECK_NOTES_ENABLED`, so nothing collides with `decks.notes`,
`deck_games.note` or `deck_versions.note`. The UI label `Notes` sits next to Suggested changes' `Additional notes`;
that is Hugh's own call, so this audit does not reopen it.

## Against the rulings and locks

| Item | Result |
|---|---|
| R1 one line, auto-dated | Yes. No date field; `created_at`, absolute mono date |
| R2 done, `Done (N)` | Yes. Closed by default; select or unselect, never "tick" |
| R3 edit and delete | Yes. Edit in place; delete uses the shipped `DeleteConfirm` (`ui/delete-confirm.tsx`) |
| R4 `[[` tags | Yes. Deck's cards first (local), then any card; held is solid, not held or departed is dashed, unresolvable is plain; a tag opens `useCardDetail().open` |
| R5 under the description | A fourth segment cell beside Stats, confirmed by Hugh 2026-10-11 (F1) |
| R6 no reminders, due dates, sharing | Yes, and Must-nots ban ageing, progress, `3 of 5 done`, green and strikethrough |
| R7 simple | One table, four actions, one `DeckPanel` value, no new tokens |
| Drafts | Yes. E1/A1/A2 are drawn on Gishath, a draft; notes key on the deck |
| Locks 1-8 | Consistent, with F5 and F6 below on how locks 2 and 3 are met |
| Lock 7, the list cache | Holds. Notes are read on the deck page only; Home and `/decks` do not read them, the deck page is not stamp-cached, and no tile mark is drawn. No `user_data_touch` trigger is needed |
| At-cap, many, refused | C1, C2, M1, M2, RF, plus refused done, edit and delete in STATES |
| 900 and 390 | Every frame |
| About entry | AB frame plus `about-notes.ts`, chapter 03 after Deck stats; `ABOUT_VERSION` bump in the build PR |
| Open questions 1-8 | All answered in C0: Q1 the segment cell; Q2 140 rendered; Q3 newest first, `done 9 Oct`; Q4 date stays, no `edited`; Q5 no bulk delete; Q6 100 per deck, done included; Q7 no mark on the card; Q8 any game card, including not legal |

## Findings

**F1 · resolved by Hugh, 2026-10-11 · ruling 5, placement.** Ruling 5 said "in `Your deck`, under the description". The brief's
open question 1 allowed "beside the other panels there", and R4 puts Notes in a fourth cell, `All · Shopping |
Stats · Notes`. The cost: notes are one press away rather than on screen when the tab opens; the cell's open
count is what keeps them in view. **Hugh, 2026-10-11: accepted.** Notes is a fourth view beside Stats,
`All · Shopping | Stats · Notes`, and with Stats off `All · Shopping | Notes` (F2). That is the reading of
"under the description".

**F2 · eng-resolvable · Notes with Stats off.** The segment group exists only when `DECK_STATS_ENABLED` is on
(`group-toggle.tsx`, the `stats` prop); with it off, the toolbar is the old one and has nowhere to draw Notes.
Decision: the hairline group draws when either switch is on, and with Stats off it reads `All · Shopping | Notes`,
which is N0 less the Stats cell. No new layout.

**F3 · eng-resolvable · `the99:deck-panel` is no longer stored.** R3's Place row and READINESS G9 say the panel
is stored in `localStorage`. `deck-panel.ts` holds it in the builder for one visit and never stores it. Notes joins
that state as `"notes"`. There is no stored value to fall back from.

**F4 · eng-resolvable · "the deck's Add control, as from Consider" does not exist.** STATES R3 (a not-held tag)
says card details open with an Add control. The card modal has no add-to-deck control. A not-held tag opens the
shipped sheet as any card the deck does not hold does (`deckOracleIds` already hides the proxy control). Drop
the claim.

**F5 · eng-resolvable · the picker mode (G5).** `searchCards` filters `cards.commanderLegal` and returns no
legality field. The picker needs a mode without that filter that also returns `commanderLegal`, so K6 can say
`not legal in Commander`. `isGameCardWhere()` stays.

**F6 · eng-resolvable · counting the caps (G4).** 140 is counted on the rendered text, and a tag is stored as an
oracle id plus the name it had then (lock 2), so the stored body is longer than what is counted. Decision: the
action enforces 140 rendered code points; the check constraint caps the raw body loosely (for example 1,000)
with `char_length`, as lock 3 requires a constraint. C0 says the 100-per-deck cap is "one check constraint"; a
row count cannot be a check constraint. It is enforced in the add action under a lock on the deck row, with N6's
refusal for the race.

**F7 · eng-resolvable · phone focus hides the shell.** A1/N2 hide the sticky add-card bar and the bottom tab bar
while a note has focus. Nothing in the shell does this today. It needs a small focus signal from the Notes input
to the shell's tab bar and the builder's add bar.

**F8 · eng-resolvable · stale annotations.** The R4 canvas's E1 note still describes R3's mark (a card behind a
slip, `[[ ]]` in display type) and the removed tag paragraph. The drawn frame, the C0 "Empty" call and STATES R4
are right; build from those. STATES' R1 base tables still say `JOTTINGS` and `oldest first`, superseded by R2-R4.

**F9 · copy-review.** `notes-copy.ts` carries strings R4 withdrew (`empty.tagLead`/`tagAfter`/`tagExample`/
`tagClose`, `help.button`/`aria`/`title`/`body`/`held`/`notHeld`/`foot`, `legacyHead`); drop them at build.
`add.atCap` and `atCapRefused` hard-code 100; interpolate `NOTES_PER_DECK`. `It's still in the box` in RF can read
as the select box. The About caption goes through `/prose-pass`, and the strings go through `/copy-review`.

**F10 · eng-resolvable · lock 6.** Two existing "notes" sit near the tuning path, and deck notes join neither.
`tuningFingerprint` (`src/lib/tuning/fingerprint.ts`) hashes each logged game's `note` (`deck_games.note`), and
the schema comment on `deck_suggestion_runs.inputFingerprint` names that as "notes". Suggested changes'
`Additional notes` is a separate, per-run value (`pack.notes`) that only `renderPack` sends
(`src/lib/tuning/prompt.ts`, through `playerText`), and it is not in the fingerprint. Deck notes stay out of
the fingerprint, out of `pack`, and out of every prompt, as lock 6 says and the About key line promises.

## Checked and fine

- `deck-intent-line.tsx` draws the description in the header on every tab, so W2's "far below the tagline" holds.
- `InfoTip` (`ui/info-tip.tsx`, `lines` prop), `MutationError` (`decks/mutation-error.tsx`), `DeleteConfirm` and
  the hover preview (`decks/hover-preview.tsx`) all exist as drawn.
- The counter at `--warning` from 120 matches `game-log-form.tsx`.
- `decks.notes` stays unused; nothing in the handoff names it.
- "tick" appears only as an internal style key in `Notes R4.dc.html`, never in copy.
