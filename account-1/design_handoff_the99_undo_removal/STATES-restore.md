# Putting a cut card back — states matrix (R3)

One always-succeeding link on one surface. The deck throughout is HD Tune — Mutant Menace: v2
committed 14 Mar 2026, a draft of +19 / −17 on top of it, 101 cards on screen.

State numbers continue `design_handoff_the99_deck_versioning/STATES-pending.md` where they touch it.

**R3 covers section B only.** The moment-of-removal receipt is #185's, ships today, and was ratified
as the boundary last round — see README. **Both of R2's refusal states are deleted as unreachable.**

---

## B · `Put back` under `Going out` — the whole of R3

| # | State | What the player sees |
|---|---|---|
| 59 | **At rest** | Every row under `Going out · 17` carries `Put back`. **One variant — no guard, no tag, no absent control.** Row anatomy otherwise unchanged: dot, name, cost track. |
| 60 | **Tapped** | **The row leaves immediately.** Optimistic: the list is derived and the card is no longer in `draftDiff.removes`. The `out` chip goes 17 → 16. Focus goes to the group heading the row left. Announced once. No motion. |
| 61 | **Tapped, and it was the last row in its type group** | The group heading goes too. The two columns do not align their groups, so nothing else moves. |
| 62 | **Tapped, and it was the last remove** | `Going out` is **absent** and `Coming in` takes the full width — matrix state 17, reached by a new route. |
| 63 | **Tapped, and it was the last change** | The draft equals v2 again. The banner, the caption and the review route all cease (state 12), and `/changes` **redirects to the deck page** (state 25). A restore is the only control in the feature that can delete the surface it sits on. |
| 64 | **A quantity move is restored** | `Swamp 9 → 7` puts both copies back and the row leaves. No per-copy restore. One of the cases #185's receipt cannot reach. |
| 65 | **Another deck holds the copy** | **It restores anyway, and no tag appears.** The deck is taking back a copy it already owns. Making this refuse would make a restore stricter than adding the same card from the deck page one route away. |
| 66 | **The card is another deck's commander** | **Not reachable.** A commander is not a `deck_cards` row, so it never appears under `Going out`. |
| 67 | **A second tap** | Not reachable. The row leaves on the first. |
| 68 | **Over the cap after a restore** | Nothing blocks and nothing warns; the shipped over-99 count moves. **The cap is a status, not a refusal.** |
| 69 | **Transport failure** | The row returns and `MutationError` states it — **shipped behaviour for every optimistic write, not a state this feature designs.** Not a refusal: nothing was decided, and trying again is the remedy. |
| 70 | **Reached after the draft was committed** | The route redirects to the deck page (state 25, unchanged). There is no restore on a committed version. |
| 71 | **An un-add** | **No row under `Going out` at all.** The card was never in v2, so nothing went out and `draftDiff` files it as no change. #185's receipt covers the tap. |

## C · What does NOT change

| Surface | Ruling |
|---|---|
| **`decklist-row.tsx`** | **Untouched.** |
| **`deck-card-undo-tile.tsx`** | **Untouched.** Card view keeps #185 exactly. |
| **`Pull it`** | **Untouched** — keeps its border and its pronoun. R2's demotion is withdrawn. |
| **The pending banner** | No control added. |
| **The adds column** | No restore. The reverse of an add is a removal, which the deck page does. |
| **Discard** | Unchanged: the confirm, the number, the version it lands on. Still unrecoverable. |
| **Version history** | Unchanged. **No restore, no revert, no rollback.** |
| **The commit sheet** | **Fully unchanged — no figure moves on any restore.** See README §6. |
| **The what-changed strip** | Unchanged in construct. Its counts move with a restore because they are derived. |

---

## The boundary, and the two clocks

| | Covers | Lives | Stored where |
|---|---|---|---|
| **#185's receipt** | the most recent removal, last copy only | until Undo, the next removal, or leaving the builder route | decklist client state (shipped) |
| **`Put back`** | every cut in the draft | until commit | **nowhere** — derived from `draftDiff.removes` |

**Nothing expires — only the shortcut does.** No surface shows a timer or a "restorable until" line.

---

## The rules the matrix is generated from

1. **A count of nought is never drawn.**
2. **A restore cannot be refused.** It is an add of a card this deck already owns, onto a row that
   already passed every gate an add has. Contention is priced elsewhere, never refused here.
3. **The dot informs; it never gates.**
4. **The restore is optimistic** — the row leaving *is* the success, so there is nothing an
   optimistic apply can destroy. #185's undo is the opposite for the same reason: its receipt is
   what must survive.
5. **A transport failure is not a refusal** and keeps its shipped treatment.
6. **The restored row is the only row that moves**, and it must, because the list is derived.
7. **An un-add is not a removal.** Nothing went out of anything.
8. **No money moves on a restore.** The card enters neither list — it returns to *no change*.
9. **Nothing R3 adds takes width from the name.** The action slot was reserved and empty.
10. **No row grows, and none is two-line, at any width** — by construction, not by measurement.
11. **No motion on any of it.**
12. **Nothing blocks.** Not the cap, not another deck's claim, not anything.

## Copy, per state

| State | String |
|---|---|
| `Going out` control | `Put back` |
| `Going out` control, accessible name | `Put {name} back in the deck` |
| `Going out` note (**edits a shipped string**) | `all {n} go back in the pool when you commit. Put one back and it never left.` |
| Taken, announced | `{name} is back in the deck. {cards} cards, {n} going out.` |
| Taken, last remove, announced | `{name} is back in the deck. {cards} cards, nothing going out.` |
| Taken, last change, announced | `{name} is back in the deck. This deck matches v{version} again.` |
| In flight | **no state, no string** |
| Refused | **no state, no string** |
| Transport failure | shipped `MutationError` — **not this feature's copy** |
| Pull control | `Pull it` — **shipped, unchanged** |
| #185's receipt | **not R3's** — `Removed {name}` / `Undo`, shipped |

## Announcements

One live-region message per settle, on the existing region.

| Event | Message |
|---|---|
| Taken | `Necrotic Ooze is back in the deck. 101 cards, 16 going out.` |
| Taken, last remove | `Necrotic Ooze is back in the deck. 101 cards, nothing going out.` |
| Taken, last change | `Necrotic Ooze is back in the deck. This deck matches v2 again.` |

**There is nothing else to announce.** No "restoring…", no refusal, no guard.
