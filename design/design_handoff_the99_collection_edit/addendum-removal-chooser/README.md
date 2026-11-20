# Collection edit addendum: pick which deck goes short (R1)

Issues: #2983 (choose which deck loses a copy on removal), #2982 (warning deck links leave the installed app).
Account 2, drawn 2026-11-18. Canvas: https://claude.ai/artifact/YM3ASry2C6VmmtJWho4cSy
Status: **R1 APPROVED by Hugh 2026-11-17. R2 APPROVED 2026-11-20 (section below).** Build prompt: `build-prompts/removal-chooser.md` (project files).

Extends `design_handoff_the99_collection_edit` §E (short-deck warning, `short-deck-warning.tsx`)
and borrows the chooser grammar from `design_handoff_the99_card_assignments` (rows are the control,
round mark at one copy / square above it, neutral = default, accent = your pick, footer sentence
carries authorship, `Back to first committed`).

## Boards
| Board | What it shows |
|---|---|
| Main | Calls and open questions |
| P1 | Phone. Removing 1 Counterspell, 2 decks list it. Default marked: Mutant Menace (committed it last) goes short |
| P2 | Phone. You picked Atraxa Counters instead: accent mark, row tint, footer names your pick, `Back to first committed` |
| P3 | Phone. Lowering 3 to 1, three decks list it: square marks, `2 of 2 picked`; tapping a third when full says `2 decks are already going short. Untick one first.` |
| P4 | Phone. Only one deck lists it: no chooser, shipped warning with the link removed and the row's facts inline (#2982) |
| D1 | Desktop. The 400px dialog over the Collection page |
| Warning | The component, playable (scene tweak: default, picked, many, single) |

## Calls
1. **Rows are the control.** No new button. Marked row = the deck that goes short.
2. **Default pre-marked.** Seniority: the deck that committed the card last goes short. Neutral mark until the player picks; a pick is accent plus footer sentence.
3. **No links out (#2982).** Deck name is plain text in all seven hosts. The row carries `lists N · committed it <date>` (the date `contested-card-row` already stamps) so there is nothing to open. Multi-card rows (Sync, Replace, Revert) still expand onto their cards as shipped; the whole row toggles, not a link.
4. **What a pick writes.** Reservations for the keeping decks (`assignCopyFor`), inside the removal's transaction, then `revalidateClaims`. No list or version change. Undo restores the previous reservations.
5. **Count = copies going.** Pick exactly as many decks as copies leave. Full + tap another = an inline reason, never a disabled row.
6. **Where it shows.** Edit copies removal and lowering, with 2+ committed decks listing the card **and exactly one copy left after the removal** (one keeper, so one reservation stores the pick; readiness Gap 1, option a, ruled by Hugh 2026-11-20). Two or more copies left, or anywhere else: today's warning minus the link.

Outcome words: `short 1` (shipped figure, `--danger`) on picked rows, `keeps it` (`--fg-faint`) on the rest.

## Copy (new strings, for /copy-review)
- body: `{k} decks list {card} and {left} will be left. Pick the one that goes short. Its list stays the same, and {card} goes on its shopping list.` (plural form: `Pick the {n} that go short. Their lists stay the same, and {card} goes on their shopping lists.`)
- heading: `Which deck goes short` / `Which {n} decks go short`; tally `{p} of {n} picked`
- row sub: `lists {n} · committed it {date}`; outcome `short 1` / `keeps it`
- footer default: `{short} goes short because {keepers} committed it first. Pick another deck to change that.`
- footer picked: `You picked {short} to go short. {keepers} keeps its copy.` + `Back to first committed`
- footer incomplete: `Pick {m} more to go short.`
- refusal: `{n} decks are already going short. Untick one first.`
- Title and confirm unchanged: `Removing {card} leaves {k} deck(s) short`, `Remove anyway`.

## States
| State | Trigger |
|---|---|
| Default | Removal answers `short` and 2+ committed decks list the card |
| Picked | Player taps a non-default row |
| Incomplete (many) | Player unticks a row. Confirm is off until the count is met, and the footer says how many more (not drawn on a board; playable in Warning) |
| Full + extra tap | Player taps an unpicked row when the count is met |
| No choice | One deck lists the card, or a non-removal host |
| Changed | Shipped `notice` redraw; picks reset to the new default |

## Gaps
- G1 A deck listing 2+ copies is one row taking one copy in R1 (open question B).
- G2 Removal write accepts `{ keep: deckId[] }` (server).
- G3 Undo of the removal restores the prior `card_assignments` rows.
- G4 Guard test: no internal href with `target="_blank"` under `src/components`.

## Open for Hugh
A. Marked = goes short (drawn) vs marked = keeps it (matches contested chooser's `gets it`).
B. Multi-copy decks (G1).

---

# R2: every case of the chooser (#2983 + #2982 re-issued, 2026-11-20)

Hugh's call, 2026-11-20 (decision card): **keep the one-copy-left rule** (a card holds one authored
reservation, `assignCopyFor` in `src/lib/decks/assign.ts`). R2 draws the rest of the state matrix on
the same canvas; R1's calls stand. **R2 APPROVED by Hugh 2026-11-20.**

## Boards (R2)
| Board | What it shows |
|---|---|
| Main-R2 | R2 calls and the seven hosts |
| P5 / D4 | Lowering 3 to 2, three decks list it. Two copies left, so no chooser: Mutant Menace goes short, and a reason line names the keepers and points to Change under In your decks (shipped Move a copy) |
| P6 / D5 | I got it receipt's Undo (`source="undo"`), read-only: the short deck with its facts line and the reason line. Backdrop: shipped deck Shopping |
| P7 / D6 | Replace confirm with several cards: the whole deck row opens inline (chevron), each card carries `lists N · committed it <date>` |
| D2 | One deck, desktop (P4's pair) |
| D3 | Three decks, one copy left, desktop (P3's pair) |
| Warning | Playable; new scenes `twoleft`, `undo`, `replace` |

## Calls (R2)
1. Rule kept: chooser only on Edit copies removal or lowering, 2+ committed decks, exactly one copy left. No per-deck count steppers.
2. Row tap never navigates (#2982 option b): one-card rows show their facts with no tap; in the chooser a tap picks; several-card rows expand inline, whole row the toggle, per-card facts.
3. Three or more decks: one copy left = square-mark chooser (P3, D3); two or more left = no chooser + reason line (P5, D4).
4. Counts: the row figure (`short N`, capped by what the deck lists) is the count. G1 unchanged.
5. Receipt: read-only, reason line (P6, D5).
6. Undo of the removal restores prior `card_assignments` rows; no new UI.

## Hosts
| Host | Reads as |
|---|---|
| Edit copies, removal or lowering | Chooser when call 1 holds, else plain rows + reason line |
| Edit copies, saving | Plain rows with facts |
| Confirm modal (Replace) | Plain rows, several-card rows open inline |
| Replace review detail | Same rows, embedded |
| Sync review | Same rows, embedded |
| Revert confirm | Same rows |
| I got it receipt, Undo | Read-only rows + reason line |

## Copy (new, for /copy-review)
- reason, two or more left: `{keepers} committed it first, so they keep the {left} copies left. To give one to {short} instead, tap Change under In your decks on {card} afterwards.`
- reason, Undo: `{short} goes short because it committed {card} after {keeper}. To change that, tap Change under In your decks on {card} afterwards.`
- several-card row card line: `lists {n} · committed it {date}`; deck row sub `committed {date}`

## Settled (R2)
A. The reason line stays in the no-choice cases (Hugh, 2026-11-20: "the better, more clear user experience").
