# STATES: Where an added copy goes (R1)

Every frame is drawn at 900 and 390. `scene` is the prop on `Added Copy.dc.html`. `variant` is the prop on `Copy Chooser.dc.html`. Staging: Sol Ring 17 owned, 17 committed × 1, brews Kratos, Gishath, Thorin. "Hyp" means a hand-built shortage on HD - Brago (16 owned before).

## The line (shared)

| Id | Destination | Long form (Add Cards) | Short form (summary row) | Action |
|---|---|---|---|---|
| L1 | one held deck | `{card} goes to {deck}, which needs one` | `goes to {deck}` | Change |
| L2 | several held decks, one card | `{n} copies of {card} go to {a} and {b}, one each` | `goes to {a} and {b}, one each` | Change |
| L3 | a reservation filled | `… goes to {deck}, which you picked earlier` | same | Change |
| L4 | a pick made now | `… goes to {deck}, as you picked` | same | Done (open) / Change |
| L5 | one brew, soft | `{card} is free for {brew}, a brew that needs one` | `is free for {brew}, a brew` | Change |
| L6 | several brews, soft | `{card} is free for the {n} brews that need it` | same | Change |
| L7 | kept free | `{card} is kept free. No deck counts it.` | `kept free, so {deck} still bills it` | Change |
| L8 | capped | — | `You were keeping {was} free. You own {now} now, so {now} is kept free.` | Change |
| L9 | nobody | foot: `No deck needed {card}, so it's free.` / `No deck needed these, so they're free.` | no row | none |

## Add Cards (saved state)

| Id | Scene | Fixture | Block | Foot |
|---|---|---|---|---|
| AC1 | `ac-one` | hyp | `Where it went` · L1 Brago | — |
| AC2 | `ac-many` | hyp | `Where they went` · L2 Brago+Eldrazi · L1 Avatar Aang · L3 Thorin | L9 Lightning Greaves |
| AC3 | `ac-brews` | staging, 18th copy | L6 (3 brews) | — |
| AC4 | `ac-brew1` | hyp | L5 Thorin | — |
| AC5 | `ac-none` | — | none | L9 plural |
| AC6 | `ac-change` | hyp | L1 · action `Done` · chooser `one` inline | — |
| AC7 | `ac-kept` | hyp | L7 | — |

## I got it (receipt body; title, detail, History, Undo as shipped)

| Id | Scene | From | Body | Change | Row |
|---|---|---|---|---|---|
| IG1 | `ig-other` | HD - Eldrazi (hyp) | shipped `claimed(Brago, 1)` | yes | stays, buy tag |
| IG2 | `ig-brews` | HD -Thorin (staging) | `softSelf(others)` | yes | held slot |
| IG3 | `ig-self` | HD - Brago (hyp) | `self` | yes | held slot |
| IG4 | `ig-none` | HD - Brago, add anyway | `nobody` | **no** | — |
| IG5 | `ig-change` | HD -Thorin | IG2 under the scrim, held | modal / sheet · chooser `brews` · `Done` | held slot |
| IG6 | (no frame) | `claimedMany` | `claimedMany` + Change; the chooser lists every deck | yes | stays |

## Upload summary (`No longer to buy` rows)

| Id | Scene | Rows |
|---|---|---|
| US1 | `us-one` | Sol Ring · L1 short |
| US2 | `us-many` | Sol Ring L2 · Arcane Signet L1 · Command Tower L3 |
| US3 | `us-brews` | Sol Ring L6 · Command Tower L5 |
| US4 | `us-none` | shipped `ledeNothingToReport`, no section |
| US5 | `us-change` | Sol Ring L4 · `Done` · chooser `picked` inline |
| US6 | `us-kept` | Sol Ring L7 · Arcane Signet L8 |
| US7 | (no frame) | a contested row: the shipped ContestedCardRow, with the Keep it free row added |

## Keep it free

| Id | Scene / variant | What shows |
|---|---|---|
| KF1 | `kf-single` / `singleKept` | only Brago needs it. Two options, Keep it free selected (`--accent`), Brago `buys it`. Deselect → Brago `gets it` |
| KF2 | `kf-count` / `count` | 2 copies, square marks, cap `1 given · 1 kept free`, stepper 1 |
| KF3 | `kf-deck` | Your deck row: marker slot → `1 kept free` · Change |
| KF4 | `kf-shop` | Shopping row: `you own 18 · 17 in other decks · 1 kept free` · Change · buy tag |
| KF5 | (no frame) | card detail split: `17 in use · 1 kept free` |
| KF6 | (no frame) | the cart line: `you own 18 · all 17 others in other decks · 1 kept free` |

## Chooser variants

| Variant | Supply · heading | Options (commit order, brews last) | Keep |
|---|---|---|---|
| `one` | `1 new copy · 20 decks need it` · `Give the new copy to` | fold(16) · Brago `gets it` · 3 brews `buys it` | off |
| `picked` | same | Thorin picked `gets it` · Brago `buys it` | off |
| `kept` | same | Brago `buys it` | on |
| `single` / `singleKept` | `1 new copy · 1 deck needs it` | Brago | off / on |
| `count` | `2 new copies` · cap `1 given · 1 kept free` | fold(15) · Brago `gets it` · Eldrazi `buys it` · brews | stepper 1 |
| `brews` | `1 new copy · 20 decks need it` | fold(17) · 3 brews `can use it` (Thorin tagged `this deck`) | off |
| `brewsPicked` | same | Thorin picked `gets it` · Kratos, Gishath `buys it` | off |

## Must-nots
- No verdict word (`short`, `held up`, `taken`, `blocked`) and no `--warning` / `--danger` on a kept-free copy. This applies to all of KF3, KF4, L7, L8 and the chooser's keep row.
- Keep it free is never a switch or a toggle chip. It's a count, with select/deselect only. Copy never says "tick".
- `goes to` never names a brew that only holds a soft share.
- Change is a button, never a link to another page.
- Promoting `this deck` in the chooser's order is not allowed. The order is the explanation.
- Change on the receipt never replaces Undo, and Undo never moves a copy.
