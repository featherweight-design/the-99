# Home — blocks, sort and empty cases

Four blocks, both widths, one order: **CTAs → Ready to build → Pick up where you left off →
Commitments.** Nothing else is on home.

## A · Block parity

| Block | Desktop | 390px | Notes |
|---|---|---|---|
| Header (kicker + `Welcome back`) | ✓ | ✓ | Kicker is `{cards} cards · read {when}`, both figures always. |
| `Update collection` + `New deck` | ✓ inline, right of header | ✓ 2-up grid under header | Phone leads with `New deck`; it is the primary at both widths. |
| Ready to build | 2 cards, side by side | 2 cards, stacked | 300px crop desktop, 270px phone. |
| `{n} more scored {score} or better` + `All commanders` | ✓ | ✓ | |
| Pick up where you left off | 4 rows, 2×2 | 4 rows, stacked | Sorted by last touched. |
| `{n} more decks` + `All 17 decks` | ✓ | ✓ | Replaces the deleted block's `All decks`. |
| Commitments | right rail | last block | Same three figures, same control. |
| ~~Your decks~~ | **deleted** | **deleted** | Including its heading, count and footer link. |

## B · The sort

`greatest(last_edited_at, last_committed_at, last_game_logged_at) desc, name asc`, limit 4.

| Winning event | Stamp reads |
|---|---|
| Edit to the draft | `edited {t} ago` |
| Commit | `committed {t} ago` |
| Logged game | `played {t} ago` / `played yesterday` |

Not in the sort key: `last_opened_at` (a glance is not work), deck creation (a new empty deck is
not a deck you left off in — it arrives as an edit the moment anything is in it).

## C · Empty and short cases

| Case | Resume block | Footer line | Commitments |
|---|---|---|---|
| **0 decks** | **Absent — heading and all.** The two CTAs carry the empty case; an empty box under a heading that says "pick up where you left off" is the app asserting a history the player has not got. *(Assumption — ratification needed.)* | absent | Drawn with zeroes; `To buy, all decks` reads `0 · $0.00`. |
| **1–4 decks** | All of them, same sort | absent (`{n} more` is nought) | normal |
| **5+ decks** | 4 | `{n} more decks` + `All {total} decks` | normal |
| **Untouched decks only** (imported, never edited) | The import is a touch. Rows show `imported {t} ago`. | normal | normal |
| **0 buildable commanders** | unaffected | unaffected | unaffected — Ready to build is a separate block's empty case, not this handoff's. |

## D · Row states

The status rule and chip are the six shipped statuses, unchanged: `Complete` (green), `To buy`
(brass), `Unresolved` (amber), `Over` (red), `Building`, `Draft`. The stamp is independent of
status — a `Complete` deck can be the most recently touched, and usually is.

## E · What no state does

- No sort control, no dropdown, no `Sort · last touched`. One order, printed as a caption.
- No second line on any row, at any width, in any state.
- No count of nought anywhere: a block whose figure is nought is absent, not zeroed — except
  Commitments, whose whole job is printing figures that may be nought.
- No skeleton rows beyond the count the query will return, so the block never shrinks after load.
