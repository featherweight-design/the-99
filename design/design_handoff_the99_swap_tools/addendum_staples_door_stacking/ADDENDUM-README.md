# Swap tools addendum: the staple read, the door, and card → sheet → card (2026-09-24)

This amends `../` (the swap tools handoff, #929). It replaces nothing else in it. The canvas is `Swap Tools Addendum.dc.html`, drawn at 1300 and 390, with the Fits picker at 560. The child DCs here are copies of the parent's, extended with new props: `Card Details` (door, stacked, Plateau, Karplusan, Canyon), `Fits Your Decks` (staple, staplenorole) and `Stand-ins Sheet` (staple, `from="card"`).

## 1 · The staple read (audit F1)
- **Predicate.** One predicate, `isUniversalStaple`, from the shared definition. Nothing hard-codes names.
- **Fits your decks.**
  - The commander chip keeps its slot and label, but its value becomes `staple · any commander`, in italic `--fg-body`. The percentage is never drawn.
  - The need chip is unchanged. For a staple with no role it's omitted, as for any card with no role.
  - A dashed, neutral note under the card plate explains the chip once: `staple` + one sentence.
  - The row order stays by name.
- **Stand-ins.**
  - A staple's fact line ends `staple, any commander` instead of `in N% of {cmdr} decks`.
  - A staple to buy moves to its own group, `to buy · staples, cheapest first`. It sits between `yours, free` and `to buy · by {cmdr} decks`.
  - A free staple stays in `yours, free` with the same clause.
  - **This ordering is Design's reading, and Hugh may overrule it.**

## 2 · The door on the shipped modal
This supersedes the parent's R2 placement under a buy tag, and READINESS amendment 3(b).
- **Desktop:** in the art column, under the shipped price tag. A mono limit line, then `⇄ See cheaper stand-ins →` (13px, accent).
- **Phone:** a 44px strip directly under the art header, on `--bg`. The limit line is on the left and the link, with a 44px target, on the right.
- **Over-limit color:** the limit line carries it. `over your $10 limit` is in `--warning`; `under your $10 limit` is in `--fg-faint`. The price tag is already `--warning`-outlined for every card, so the tag itself can't mark "over".
- **When it shows:** only when the modal was opened from a Shopping row, as before.

## 3 · Card → sheet → card
- **The original card:** it stays mounted under the sheet, dimmed, with its scroll kept.
  - The sheet's × becomes a `← {card}` pill on desktop.
  - On the phone it stays a × labelled `Back to {card}`, matching the Find a deck picker.
- **What a stand-in stacks over:** the sheet, exactly as on the Shopping path (stacked CardModal, `← Cheaper stand-ins`, Take footer). The stacked footer replaces Buy and Find a deck, so the cap is `page · card · sheet · card`.
- **Phone offsets:** the card at 52, the sheet at 96, the stand-in at 140. That's the Shopping path's 44px step.
- **Escape, one layer each:**
  - stand-in → sheet, focus on the stand-in's name;
  - sheet → card, focus on the door;
  - card → Shopping, focus on the row.
  - A tap on the scrim works the same as Escape.
- **After Take:**
  - The stand-in closes and the sheet shows the taken row.
  - Escape returns to the original card, where the door is replaced by `swapped out · {stand-in} is in` (`--success`, not a control).
  - Escape again lands on the Shopping receipt.
  - Undo swap stays in the sheet row and on the receipt only.

## Copy (owed to /copy-review)
- `staple · any commander`
- `staple, any commander`
- `to buy · staples, cheapest first`
- The staple note (two variants, in `Fits Your Decks.dc.html`)
- `swapped out · {card} is in`
- `Back to {card}`
