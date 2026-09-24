# Gap report — Deck notices: the Notices sheet and the header's tag (PR 6)

Table: `docs/superpowers/design-tables/deck-notices-sheet.md` (Agent 1, from the design files alone).

## Agent 2 (verify): 30 visual gaps, 3 state gaps

Fixed (confirmed by Agent 3):
- **Header tag, phone ground** (#25, #36, #44): the data and read faces take a `--bg` plate below `md`. The legal face's tint is mixed into `--bg`, which makes it opaque over the art band.
- **Group and row rhythm** (#97, #100, #101, #115, #121, #123, #126, #128, #129, #136, #137, #140, #142, #143): flex column with a 4px gap, an 8px head gap with a 20px minimum, 10/12px row gaps, 20px line boxes, the right-aligned nowrap date, 6px tail gaps at 1.5, and pretty-wrapped rule text.
- **Legality pips** (#147–#149): flat 10px swatches, 2px radius, `var(--w|u|b|r|g)` fill and an inset hairline.
- **Legality foot line** (#152–#155): drawn under the LAST legality group, in mono 10.5px/1.5 `--fg-faint`, with a 2px top margin.
- **Foot** (#156–#166, #172, #175, #182–#186): flex-wrap with 12/16px gaps, the drawn paddings and sentence flex bases, 13px/1.55 text, Re-analyze at 14/13px with 16px desktop padding, and the Analysis tab link in mono 11px, inline-flex and 44px tall, with the dotted underline on its words only.
- **#195, the failed foot**: the sentence BECOMES the failure line, beside Try again.
- **State 1**: an open sheet takes the new read after the foot's Re-analyze. `probe:notices-sheet` asserts this, and removing it fails.

Ruled not gaps:
- **#67, #71, #79, #86** (box shadow, head height, title size, aside size): these are the shared `ModalChrome`, which every analysis sheet uses (the receipt, How we decide, What would have to go). The sheet keeps the shared chrome rather than one drawn for it alone.
- **#27 and state gaps 2–3** (the foot's note slot): the check note lands in PR 7 with its copy key, so no key ships without a caller. D12 rules out a credit note on this press, because the foot never writes an overview.

## Agent 3 (confirm)

VERDICT: 0 gaps remain.

## Copy for /copy-review (not gaps)

- The hard-coded joiners `and`, `, ` and `colorless`.
- The `→` concatenated beside `sheet.foot.toTab`.
- `sheet.foot.failed`, which the handoff does not draw.
- The failed button's reuse of `deckAnalysisCopy.banner.tryAgain`.
