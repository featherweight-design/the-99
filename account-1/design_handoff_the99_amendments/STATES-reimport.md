# STATES — update a deck by re-import

Twenty-four states across the five steps, at both widths. Canonical numbers throughout: deck at
**91** built + 2 unresolved; paste of **106** lines → 103 matched + 3 unnamed; **84** unchanged,
**19** in, **7** out of which 1 is kept; lands at **104 / 99**.

## Step 1 — entry

| # | State | Desktop | Phone | Notes |
|---|---|---|---|---|
| 1 | Deck card `⋯` open, `Update from a list` first | ✓ canvas B1 | ✓ | **R2:** the overflow menu ships at 390px (PR #289, 44px target), so the item appears at both widths. Same position, same string. |
| 2 | Spine control at rest, beside Export | ✓ canvas B2 | ✓ canvas B2 | Ghost against Export's brass. 44px on phone. Kept at both widths alongside the menu item. |
| 3 | Empty deck (`built === 0`) | control **absent** | control **absent** | Nothing to diff. The empty builder's own entrances stand. |

## Step 2 — the list

| # | State | Desktop | Phone | Notes |
|---|---|---|---|---|
| 4 | Paste mode, empty | ✓ canvas C1 | ✓ canvas C1 | Submit disabled while the field is empty; **no name field** to gate on. |
| 5 | Paste mode, populated | ✓ canvas C1 | ✓ canvas C1 | Submit reads `Compare with this deck`. |
| 6 | File mode | shipped dropzone | shipped dropzone | Unchanged, including drag-over and the 2 MB cap. |
| 7 | Failures 8 / 9 / 10 (file rejected, nothing matched, parsed empty) | shipped banner | shipped banner | Unchanged copy and actions. State 9's *"nothing matched"* is reachable here and means the same thing. |
| 8 | Parsing | shipped `ParsingBlock` | shipped | Unchanged. |

## Step 3 — the diff

| # | State | Desktop | Phone | Notes |
|---|---|---|---|---|
| 9 | **The diff, at rest** — 7 out / 19 in / 3 unnamed / 84 unchanged | ✓ canvas D1 | ✓ canvas E1 | Groups in that order. Each capped at 4 rows + a disclosure. |
| 10 | A removal kept | ✓ D1 (Smothering Tithe), D3 | ✓ E1 | Row fill `--elevated-hover`, border `--accent-shadow`, `Kept ✓`. CTA and summary recount. |
| 11 | `Keep all 7` used | — | — | Every row kept; the CTA becomes `19 in, 0 out` and the group's sentence stays. **The apply button is still enabled** — 19 additions is a real update. |
| 12 | Nothing changed | ✓ canvas F1 | ✓ (same construct, centred in the tab-bar reserve) | Crown at its faintest. Two ways out. Also fires when every difference is an unresolved line the deck already carries. |
| 13 | Commander conflict | ✓ canvas F2 | ✓ (stacked, both CTAs full-width 44px) | Only when the list **declares** a commander that is not this deck's. |
| 14 | Everything out (removals > 75% of the deck) | ✓ canvas F3 | ✓ | One extra line, one extra exit. **Nothing is blocked.** |
| 15 | Nothing in, only removals | — | — | Legal and drawn by state 9's construct: the `in` group renders **no empty block** — it unmounts, as the last-31 strip does at zero. The CTA reads `0 in, 7 out`. |
| 16 | Group expanded (`Show the other 3` / `the 84 that do not change`) | — | — | Plain overflow, no cap on the expanded list, no windowing. Gap 6. |

## Step 4 — apply

| # | State | Desktop | Phone | Notes |
|---|---|---|---|---|
| 17 | In flight | ✓ canvas F4 | ✓ | Shipped dots. The button keeps its label and goes `aria-busy` — never `disabled`, which would blur the focused control. |
| 18 | Refused write | ✓ canvas F4 | ✓ | Shipped banner: *"Your deck is exactly as it was."* True by the transaction, which is what makes the sentence sayable. |

## Step 5 — arrival

| # | State | Desktop | Phone | Notes |
|---|---|---|---|---|
| 19 | Update strip, with counts | ✓ canvas G1 | ✓ canvas G1 | `?updated=19-6`. Kept clause included when > 0. |
| 20 | Update strip, param unparseable | — | — | Falls back to a countless *"Updated from your list."* Never prints garbage, never renders `NaN`. |
| 21 | Landed at 99 | — | ✓ canvas G2 | `Complete`/`Playable`, and **no celebration**. |
| 22 | Landed over 99 | — | ✓ canvas G3 | Amendment 3's `Over` pill, two-segment bar, trim line. **Hard dependency.** |
| 23 | Landed under 99 | — | — | `Building`. Nothing special. |
| 24 | Second update on the same deck | — | — | The strip **shows again** — its dismissal is not persisted, unlike a first import's. This is the state that rules out reusing `arrivalDismissKey`. |

## Cross-cutting

| case | behaviour |
|---|---|
| **Back-navigation from the diff** | Lands on the list step with the paste intact (browser back; the text is component state on the same route tree). Nothing has been written, so there is nothing to warn about. |
| **Leaving the diff entirely** | No confirm, no beforeunload. Nothing has been written. |
| **Two Apply clicks in one tick** | The shipped synchronous-ref guard. Without it, two updates apply. |
| **The list names the deck's commander in the 99** | Deduped silently, exactly as `buildDeckImport` already does — an export artifact, not intent. |
| **The list declares a Partner pair** | The extra commander is noted and kept out of the 99, exactly as the importer already does. It is **not** a conflict (state 13) unless the *first* declared commander differs. |
| **Quantity > 1 on a non-basic** | Clamped to 1 with a note, as the importer already does. The note surfaces in the diff's provenance line. |
| **A basic land's quantity changes** | Lands in `unchanged` and is reconciled silently. Gap 2 — the diff will not tell you your Islands went 12 → 9. |
| **A kept card that the app placed (`auto`)** | Left exactly as it was, `auto` included. The sweep can still take it. |
| **`Clear all auto` after an update** | Cannot delete anything the list named — Apply cleared those flags. |
| **Sideboard / maybeboard in the paste** | Skipped with a note, as the importer already does. Those lines are not removals. |

## What is NOT a state

- No merge mode, no "add only" mode, no per-addition refusal.
- No commander swap.
- No rename.
- No undo after Apply. Gap 1.
- No auto-sync, no polling, no stored source, no import history.
- No toast anywhere.
- No modal anywhere — the diff is a page.
- No `--danger` anywhere in the flow, including the deletions.
