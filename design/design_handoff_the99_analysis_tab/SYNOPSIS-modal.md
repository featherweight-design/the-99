# The full synopsis — ModalChrome's fourth body (addendum to R1)

**Canvas:** `The 99 - Analysis Tab.dc.html` §6 (6a–6e). **Body component:** `Synopsis Sheet.dc.html`
(`phone`, `unrolled`, `state`: present · partial · stale · version).
**Brief:** `docs/superpowers/design-briefs/2026-09-23-the-synopsis.md` (`docs/synopsis-brief`), read
from the upload — the branch was not visible to the repo tool. §2 and §5 are taken as locked; §4 is
called below. Audit this file on its own against §2 and §5.

## Chrome

`ModalChrome`, unchanged: title **Synopsis**, aside `{deck} · written {when}` (a version:
`version {n} · committed {date}`), close `Close synopsis`. **700 wide** (`wide`, the reasoning's).
**No glyph in the mark slot** (same as provenance; `mark` becomes optional). Phone: sheet from 52,
header pinned to 43. A card opened from inside stacks: card sheet from 96, synopsis behind on
`--surface-sunken`, header at 0.55. Depth stops at two.

**Entry point:** `View full synopsis →` under the tab's Overview, mono 11 `--accent` on a dotted
underline (44px at 390). Drawn on every analyzed frame in §2.

**Every card name opens that card**, in the modal and in the tab's Overview: bold `--fg` 600 on the
dotted `--accent` card-open underline (`CardDetailTrigger`), which also hosts the shipped hover preview.

## §4, called

1. **Order and hierarchy.** Overview → Primer → Key cards → Weaknesses, four **peers**: mono 10
   uppercase `--fg-faint` label, a `--border` hairline and 20 / 18px above each after the first.
   Primer's Core strategy, Mulligan and Key tips are **subsections**: sans 13.5 600 `--fg`.
2. **Budgets** (lines; 1300 = the 700 modal's ~656px measure, 390 = ~358px):

   | Section | Count | 1300 | 390 |
   |---|---|---|---|
   | Overview | 1 paragraph | ≤ 6 | ≤ 12 |
   | Core strategy | 3–5 numbered steps | ≤ 2 each | ≤ 3 each |
   | Mulligan | 2–3 Keep · 2–3 Send back | ≤ 2 each (half column) | ≤ 2 each |
   | Key tips | 2–4, each naming ≥ 2 cards in the list | ≤ 2 each | ≤ 4 each |
   | Key cards | 5–8 rows | job ≤ 1 | job ≤ 2 |
   | Weaknesses | 1–3, untiered | ≤ 2 each | ≤ 4 each |

   The Overview is **one string on two surfaces**: the tab draws the same paragraph (≤ 6 lines in
   the two-thirds column at 1300), so there is no second, shorter summary to keep in step.
3. **Partial refusal: show the passing sections; state the failed one in its own slot.** The label
   stays; under it `not written` (mono 9.5 uppercase `--danger` on 1px `--danger`, the only danger
   ink), *We wrote this section and it did not check out against your list, so we are not showing it.
   The rest did. Nothing about your deck changed.*, the per-section count (`2 of 7 cards failed
   checking`), and **Try again** (outlined, 34 / 44px). One press rewrites the synopsis in one call.
   If **every** section fails, the tab draws Round 0's refused state and no entry point. If the
   Overview alone fails, the tab draws the refused line in the Overview slot and keeps the entry point.
4. **A version's synopsis is read only in the modal**, opened from **Synopsis for this version →** (mono 11
   `--accent`, dotted, 44px at 390), directly under the note in the version's **expanded panel** in the
   Versions tab (6e). Only for a version committed with a synopsis; otherwise no link, no placeholder.
   Not on the collapsed row. One record line opens the
   body: *Written for version 3 when it was committed. It describes that list, not your deck as it
   is now.* No write control, never stale.
5. **Keep / Send back** are two peer panels on `--surface-sunken`, 1px `--border`, radius 9, side by
   side at 1300 and stacked at 390; mono labels, neutral `+` / `−` in `--fg-faint`. No success or
   warning ink: advice about a hand is not a status.

## States

- **Present** (6a, 6b). Never generated / not yet read: no modal, no entry point.
- **Refused, one section** (6c). **Refused, all**: no modal.
- **Stale** (6d): one banner first in the body — *Your deck has changes since this was written, so
  parts of it might not match your list.* + **Re-analyze** (bone), the tab's verb: one press re-reads
  the bracket and rewrites the synopsis. No tag, no demotion, matching
  the tab after touch-up 2. The old synopsis stays whole underneath.
- **Version** (6e): as above.

## §5 check

No bracket, score, number or strength word (the fixture was scrubbed: *efficient*, *brutal*,
*respectable* removed from the tab summaries). Weaknesses untiered and ≤ 3, with diamond bullets and
no numerals. Every tip names only cards in the list. No partial sentence, no reserved space. No
disclaimer line. `--danger` on the refused tag only; retry is a button.
