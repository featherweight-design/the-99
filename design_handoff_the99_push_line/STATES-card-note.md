# States — the card note, the trigger, and the verdict

Three sets that do not share a namespace: the note (`n*`), the trigger (`t*`), the verdict
(`v*`).

## §A The card note — `n1`–`n9`

**The note never states the deck's standing.** Every row below is a card claim, a rules claim, or
a count over the current list.

| # | Card fact | Declared? | Drawn |
|---|---|---|---|
| n1 | Game Changer | yes | *A game changer, and your 4th. \<Declared\> allows 3.* |
| n2 | Game Changer | no | *A game changer, and your 4th.* |
| n3 | Mass land denial | yes | *We read this as mass land denial, which no bracket with limits allows — including the \<Declared\> you declared.* |
| n4 | Mass land denial | no | *We read this as mass land denial, which no bracket with limits allows.* |
| n5 | Extra turns | yes | *We read this as an extra-turn card, your 3rd. \<Declared\>'s rule is about chaining them, which a list can't show, so we count them and stop there.* |
| n6 | Extra turns | no | *We read this as an extra-turn card, your 3rd.* |
| n7 | Tutor | either | *A tutor, and your 6th. No bracket limits how many you play.* |
| n8 | Completes a combo already in the list | either | *This completes \<A\> + \<B\>, a two-card infinite.* |
| n9 | No fact | either | **nothing renders.** No slot, no rule, no reserved height. |

**Registers.** n1/n2/n7/n8 are flat — list membership, a count, and a pair of cards that are both
in the list are all determinate. n3–n6 are attributed (*we read this as*), because the detection
is a reading of oracle text. **The rules clause is flat in every row**, including n3–n6: what is
uncertain is whether the card is that kind of card, never what the bracket allows.

**Multiple facts:** the note prints **one sentence per fact**, in the table's order, capped at two
on a row and one on a tile. Marks are unaffected — a card wears every mark true of it.

**Extra turns at a declared bracket 4 or 5** takes the n6 form: brackets 4 and 5 state no
extra-turn rule, so there is no clause to quote.

## §B The analyze trigger — `t1`–`t5`

| # | Condition | Control | Tab dot |
|---|---|---|---|
| t1 | never determined | **filled `--accent`**, *Analyse this deck* + *about two seconds* | **yes** |
| t2 | determined, no edits since | outlined secondary, *Analyse again* | no |
| t3 | determined, edits since | **filled `--accent`**, *Analyse again* | **yes** |
| t4 | running | the control disabled, label *Reading all 99…*, block holds its previous content | unchanged |
| t5 | committed version being viewed | **no control** — a version's verdict is a record and cannot be re-determined | no |

**The control's position is identical in t1–t4.** The dot is 6px `--accent` after the tab label,
carries no number, and **clears on determination, not on visit**.

## §C The verdict — `v1`–`v5`

| # | State | Head | Provenance |
|---|---|---|---|
| v1 | never determined | the invitation line, no bracket mark | — |
| v2 | asked, current | *Your cards permit \<range\>* | *determined against all 99 · 2 minutes ago* |
| v3 | committed | *Your cards permit \<range\>* | *determined for v4 · all 99 · 21 Sept* |
| v4 | asked, stale | ***permitted***, mark and sentence at `.55`, `out of date` tag | *determined against 95 of these 99 · 4 cards have changed since* + the changed cards |
| v5 | running | v1–v4's previous content held, control disabled | unchanged until it settles |

**v2 and v3 are the same sentence.** Only the provenance differs, and **v3 can never become v4.**

**Everything below the head — receipts, upgrade path — is as old as the verdict and demotes with
it in v4.** The block keeps its border and its contrast floor: **stale is not disabled.**

**Never tagged stale:** the mix strip, any count taken from the list, and **every card note**.
Only determined things can go stale.

## §D Interaction and announcement

- The note is **not interactive**. Card names inside it carry the dotted underline and open the
  card, as everywhere else.
- The note is part of the row's accessible description — never announced on hover or focus.
- **On settle, the existing live region announces once:** *Analysis ready. Your cards permit
  Upgraded.* (Round 0's string, unchanged.)
- The tab dot is decorative; its meaning is carried in the tab's accessible name
  (*Analysis, not up to date*).
