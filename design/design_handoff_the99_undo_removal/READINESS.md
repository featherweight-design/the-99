# READINESS — Undo a removal (R3)

**Self-assessed: 🟢 Green.** No ruling outstanding, no open question, nothing to redraw, and no code
claim left unverified. The audit's own green condition — *one always-succeeding link, one edited
string and the focus ruling* — is what this package contains.

## Every question this feature ever raised, closed

| Round | Question | Closed by |
|---|---|---|
| R1 | Ship both positions, or `Going out` alone? | **The audit:** the struck-row half already ships as #185. `Going out` ships alone. |
| R1 | May the restore depart from rule 4? | **Withdrawn, not granted.** The write cannot be refused, so no exemption is needed. |
| R2 | Does the money block count every `BuyTag` row? | **The audit:** it is scoped to `draftDiff.adds` — and the case cannot arise anyway. A restored card enters neither list. |
| R2 | Both refusal states | **Deleted as unreachable.** |

## What R3 costs

**One link, one edited string, one focus ruling.** No new mutation, no refusal enum, no client
state, no new storage, no new token, no new hex, no new vocabulary, no disabled state, no guard
branch — and **no change to any shipped control**, including `Pull it`, `decklist-row.tsx` and
`deck-card-undo-tile.tsx`.

**Eight things R2 charged for that R3 does not:** both refusal states, the `claimed` tag word, the
commander empty-control variant, the 32px shared slot, the `Pull it → Pull` demotion, the
refusal-into-pull framing, the money case, and the in-flight state.

## Closed by construction

- **The restore cannot be refused.** `DeckAddRejection`'s three values are all closed for a row
  under `Going out`: it was in this deck's committed list, so legality and identity already passed,
  and a commander is not a `deck_cards` row. **The claim gates were never open** — `addCardToDeck`
  does not read availability.
- **No row is two-line at any width, and no row grows.** One label, no variant, nothing added beside
  it. This now holds **by construction rather than by measurement** — R2 needed two review rounds of
  alignment work; R3 has nothing to align.
- **No money moves on any restore.** The card returns to *no change* and enters neither list.
- **The two views cannot disagree**, because R3 touches neither.
- **No new storage.** `Going out` is `draftDiff.removes`.

## Called, not asked

1. **`Put back` always succeeds** — one variant, no guard, no tag, no disabled state.
2. **Optimistic**, and this is the one change the audit did not ask for. R2 held the row for a
   refusal to land on; with no refusal, the argument retires with the states it protected, and a
   disabled control on an action that cannot fail is the ceremony R1 was criticised for. See README.
3. **A transport failure is not a refusal** and keeps its shipped `MutationError` treatment.
4. **No change to any shipped control.** `Pull it` keeps its border and its pronoun.
5. **`Put back` survives the finding as the right word** — the pool's vocabulary and `Pull`'s
   mirror. It describes *asking*, not *doubt*.
6. **The dot informs; it never gates.** A card another deck holds still restores.
7. **The restored row leaves the list**, because the list is derived.
8. **Focus goes to the group heading the row left** — never the next row's control. The one ruling
   carried intact through all three rounds.
9. **No bulk restore, no selection, no "restore all".**
10. **No motion, no expiry warning, nothing blocks on the cap.**
11. **Discard is untouched and must not be re-sold** as safer.
12. **Targets:** 34px link, 44px square target at 390px, right-aligned at both widths (never centred
    — centring leaves a label inboard and the trailing edge goes ragged).
13. **Contrast:** full-opacity ink throughout. No hue is load-bearing — the only new element is a
    text label.
14. **Arithmetic:** +19 / −17 = 36, 99 − 17 + 19 = 101, and a single restore moves out 17 → 16,
    changes 36 → 35, cards 101 → 102. **No figure in the money block moves, in any case.**

## Gap report

Six items in README §Gap report. The two worth an engineer's eye:

1. **`Going out` still has no windowing** (versioning's gap 2), and every row now carries an
   interactive control: a 300-row paste goes from slow to slow with 300 handlers.
2. **The optimistic apply is the one place a player could out-run the server** — tap `Put back` and
   commit within the same round trip. The commit path's own draft read settles it; nothing in this
   feature guards it, which is correct but worth checking.

And one for the ticket: **two undo vocabularies stay live on adjacent surfaces** (`Undo` and
`Put back`). Both correct, the seam defensible, but a player who uses both in one session meets two
words for one intention.

## Not blocking

- Nothing in this feature blocks anything. **The cap is a status, not a refusal.**
- No count of nought is ever drawn.
- `--danger` appears nowhere in R3. A cut card is not an error and a removal is never red.
- Card-row parity holds by construction — see README §Card-row compatibility.
