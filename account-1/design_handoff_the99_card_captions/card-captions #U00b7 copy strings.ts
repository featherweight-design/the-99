// card-captions · copy strings
//
// Handoff: design_handoff_the99_card_captions (R1).
// Brief: docs/superpowers/design-briefs/2026-09-14-modifiers-below-the-card.md
//        (design/card-view-captions, PR #635).
//
// THE SHORT VERSION: this handoff moves marks, it does not write copy. Two new
// strings exist, both for the draft pair the card view has never had. Everything
// else below is a reuse manifest naming the module that already owns the string,
// so eng can see at a glance that nothing is being re-typed at a second call
// site — which is the failure mode a caption rewrite invites.

/* ─────────────────────────────────────────────────────────────────────────────
   NEW — the draft pair on a tile (§4, call B)

   The list view prints its pair inline in the name's place. The tile prints it
   on the meta line, in the position `×N` vacates. Two forms, because a card the
   draft ADDED has no count to move — the list view has no shape for that case
   and needed none, since a row that did not exist was not there to draw.

   Drawn AND spoken. An accent edge is a colour, and the figure is the fact.
   ───────────────────────────────────────────────────────────────────────────── */

export const cardCaptionCopy = {
  draft: {
    /** A count that moved between two non-zero values. Matches the list view's
     *  own form exactly — do not re-punctuate it here. */
    recounted: (from: number, to: number) => `${from} → ${to}`,
    /** A card the draft added. Signed, because it is a delta and not a count:
     *  `1` alone would be indistinguishable from the `×1` the tile suppresses. */
    added: (n: number) => `+${n}`,

    /** Spoken forms. The tile's marks are inert and unlabelled, so these ride
     *  the caption's reading order as sr-only siblings of the drawn figure. */
    recountedAria: (name: string, from: number, to: number) =>
      `${name}, ${from} to ${to} in this draft`,
    addedAria: (name: string, n: number) =>
      n === 1 ? `${name}, added in this draft` : `${name}, ${n} added in this draft`,
  },
} as const;

/* ─────────────────────────────────────────────────────────────────────────────
   REUSED — nothing below is new, and nothing below should be retyped

   The point of this block is the second column. A caption rewrite is exactly
   where a `×{n}` or a `no art` gets re-inlined "just for the tile", and then
   the two surfaces drift.
   ───────────────────────────────────────────────────────────────────────────── */

// | Drawn                  | Owner                                          |
// |------------------------|------------------------------------------------|
// | `×N` count             | addPanelCopy.row.quantity                      |
// | `no art`               | addPanelCopy.tile.noArt                        |
// | `✕` glyph + both aria  | addPanelCopy.row.remove / removeAria /         |
// |                        | removeCopyAria                                 |
// | `none free`, `short N`,| availabilityCopy.marker (+ markerAria for the  |
// | `N free`               | spoken prose; chip density forces count-only)  |
// | `$` and its full aria  | BuyTag density="collapsed" — glyph is the      |
// |                        | component's, name keeps word + price in full   |
// | `P`                    | ProxyTag — skin A, one density                 |
// | `P proxy`, `$ to buy`  | MarkKey — the LIST's glosses. Card view's key      |
// |                        | says `$ not owned` — see the addendum below      |
// | `//` + "two-faced card"| twoFacedCopy.mark / markAria                   |
// | printed front name     | printedFaceName; full name printedNameOf       |
// | `SET · rarity`         | grid-view.tsx composes from primarySetCode /   |
// |                        | rarity — unchanged, phone drops the rarity     |
// | modal trigger aria     | cardDetailCopy.triggerAria + cardTileCopy      |
// |                        | .copiesAria                                    |

/* ─────────────────────────────────────────────────────────────────────────────
   DELETED — ruling 2

   `CostPips` leaves the card view entirely. Its `sr-only` cost string
   (manaCopy.costAria) has no card-view call site after this change. The string
   and the mapper stay where they are — the decklist row and the search row are
   still their callers — but nothing in either tile speaks a cost any more.

   NOT DELETED, and worth stating so nobody tidies it: the card face prints its
   own cost, which is the ruling's whole reason. The fact is still on the tile;
   it is just drawn by Wizards.
   ───────────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────────
   NO NEW VISIBLE WORDS ON EITHER TILE

   Count them: the caption gains a figure (`+1` / `1 → 2`) and a letter (`P`,
   which already ships one route over). No label, no legend inside the tile, no
   hover string, no `title`. The only prose added anywhere is the two aria forms
   above — and, per the addendum, one region label for the key ABOVE the grid,
   which is not on the tile.

   And one thing this handoff ASKED FOR rather than wrote — now settled, and
   with one string after all. R1 asked for MarkKey above the card grid "on the
   same terms it renders above the list"; erratum 7 disproved it. The row draws
   `$` on unowned AND spoken-for cards, the tile on unowned only, and a
   spoken-for card IS owned — so no one word is true of both sets.

   CALLED: same component, same slot, one differing word. Card view's key reads
   `$ not owned` · `P proxy`, and the buy entry's word is the tile's own shipped
   string, cardTileCopy.slotUnownedAria — the key prints the word the tile
   already speaks. `key.buy` is untouched; the list still has the shop.

   ONE NEW STRING, beside key.buy / key.proxy:

     key.regionAriaCards: "What the marks on these cards mean"

   Because key.regionAria says "...on these rows" and cannot sit over tiles. It
   is NOT edited — the list still has rows. "Cards" and not "tiles": the reader
   is looking at cards, and nothing in this app names an internal noun.

   See ADDENDUM-the-key.md for the entries, the placement at both widths, and
   the 9a–9d ledger.
   ───────────────────────────────────────────────────────────────────────────── */
