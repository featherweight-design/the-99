# The 99 · Move a copy · Addendum: several picks (R1, awaiting Hugh)

Account 2, 2026-11-21. Amends this handoff and `design_handoff_the99_card_assignments` (decision 3b, `assign.ts`'s one-reservation rule).
Canvas: https://claude.ai/artifact/PXKbecyqx4VGUr9FwZxn2Q (Version 10), boards `SP-Main`, `SP-Chooser` (P1–P5), `SP-Surfaces` (C1–C3, H1–H2, L2), `SP-Desktop` (D1–D6). Frames in `art/sp/`.
Every frame is the shipped component SSR'd from main with shipped CSS (Amonkhet), with `scratch-gen/proposal-several-picks.diff` applied (`scratch-gen/render-several-picks.tsx`).
Card details frames are scrolled to the receipt: no Fabled Passage image is reachable (Scryfall is blocked), so the card header is out of frame rather than broken.

## Problem (Hugh)
5 Fabled Passage, 6 decks in commit order: HD - Zombies, HD Tune - Prismari Artistry, HD - Urza, HD - Gishath, Multiverse Reforged, HD Tune - Mutant Menace.
One pick per card exists, so moving the copy from Gishath to Mutant Menace is impossible: picking Mutant Menace takes the copy from Multiverse Reforged,
and picking Gishath, which already has its copy, lights it up and does nothing.

## Ruling (Hugh)
Picks up to the number of copies owned. Each select adds a pick. Picked decks get a copy, the oldest unpicked decks fill the rest, the newest unpicked deck goes without.

## Calls
1. **Picked vs commit order.** A picked deck: accent square mark, accent border (shipped), outcome `your pick · gets it` (`your pick` in `--accent-text`).
   A deck with its copy by commit order: neutral mark, `v5 · Oct 1 gets it`. Words carry authorship, so hue is never the only signal (restores the
   word carrier the retired footer had).
2. **A select on an unpicked deck adds a pick** while picks < copies. On a deck that buys it: it gets a copy and the deck marked `gives it up first`
   flips to `buys it` on the same select. On a deck that already gets it: it is pinned (keeps its copy whatever is picked later); the hint moves to the
   next newest unpicked holder. Order never changes.
3. **Untick = select a picked deck again.** Its copy goes back to commit order: the oldest deck going without gets it back (P4). No Clear all
   (one control per action); `Back to first committed` stays retired.
4. **Every copy picked** (2+ copies): cap `5 of 5 picked`, and under the rows `All 5 copies are picked. Untick one to give another deck a copy.`
   (`--fg-body`, 11.5px, the refusal slot's spacing, no rule). Shown as soon as the last pick lands, before anyone tries. A select on an unpicked deck
   writes nothing; it moves focus to that line and announces it. Picks beat commit order: with five picked, the oldest deck can be the one that buys it (P5).
5. **Who goes without, before and after.** Before: the newest unpicked deck holding a copy reads `gets it · gives it up first` (`gives it up first`
   in `--fg-muted`). Only while someone buys it and picks < copies. After: that row flips to `buys it` and the hint moves up (P1 → P2 → P3).
6. **Heading cap** `N of M picked` once any pick stands; with none, the shipped `M of M given`.
7. **One copy unchanged.** Round mark, single-select, a select on another deck moves the pick. An Other decks pick (R1b) is a pick and counts toward the cap.

## Same states on the other surfaces
- **Card details, In your decks (C1–C3, D4):** picked deck `holds 1 · your pick` (`your pick` in `--accent-text`), replacing `gets it` (a pick always gets
  a copy; keeps phone names from truncating). Commit-order rows unchanged (`holds 1 · gets it` / `holds 1 · buys it`). Change unchanged.
- **History's `Went to` line (H1–H2, D5):** record never rewritten. `Now X has it.` only when a deck the record named holds no copy now; X = only the decks a
  pick put a copy in (holders now minus holders under commit order alone). Today `nowHolderNames` returns every holder, which on a 5-copy card names five decks.
  H2: `Went to HD - Gishath. Now HD Tune - Mutant Menace has it.`
- **A large entry's Can move tab (L2, D6):** same rule on each card row's own line; Change opens the same chooser. (Read "the draft's Can move tab" as the
  History entry's `Can move · N` tab, the only Can move tab shipped.)

## Copy (final)
| Where | String |
|---|---|
| Cap, picks standing | `{n} of {copies} picked` |
| Picked row outcome | `your pick · gets it` |
| Next to give up a copy | `gets it · gives it up first` |
| All copies picked | `All {copies} copies are picked. Untick one to give another deck a copy.` |
| Card details, picked deck | `holds {n} · your pick` |
| History | `Went to {A}. Now {B} has it.` (shipped string, new rule for B) |
| a11y, picked option | `{deck}, your pick, gets it. Select again to untick.` (replaces `a11ySelected`) |
| Announced, pick | `{deck} gets {card}. {displaced} buys it.` (shipped `announcedPick`) |
| Announced, untick | `{deck} unticked. {regained} gets it back.` |
| Announced, full | the All-copies line, verbatim |

## Gaps (engineering)
- G1 `assignCopyIn` deletes before every insert (one authored reservation per card). Toggle must ADD while granted < giveable, delete on the same deck,
  and refuse a new `all-picked` cause at the cap (2+ copies). One copy keeps the move. `previewAllocation` takes a set of picks.
- G2 `allocate` already honors several `granted` rows; verify the order is picks first, then commit order, so a pick on the oldest deck never double-counts.
- G3 History live read (`history-live.ts`) needs the commit-order-only allocation to compute `gained`.
- G4 A removal that leaves more picks than copies: which pick drops? Proposed: the newest pick (by `created_at`), the removal chooser's own pick aside. Needs Hugh's word if he disagrees.
- G5 Receipt Undo (I got it) reverses its own pick only; with several picks it must drop exactly that row (`createdAt` already carried).
- G6 Strings for /copy-review: none new beyond the table above.
