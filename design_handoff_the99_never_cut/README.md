# The 99 — Locked cards / never cut (design handoff, R2 · Hugh: LGTM 2026-09-24)

**Canonical:** `The 99 - Never Cut v2.dc.html`. Read it with `STATES-never-cut.md` (every state),
`READINESS.md` (the engineering list, what's settled and what's open) and `never-cut · copy strings.ts` (production copy, R2).
This folder lands at `design/design_handoff_the99_never_cut/` in the repo.

## Files
- `The 99 - Never Cut v2.dc.html`: **the canonical canvas**, sections §, 2a–2e.
- `Deck Rows v2.dc.html`, `Deck Tiles.dc.html`, `Tuning Panel.dc.html` (states `v2*`): its child frames.
- `The 99 - Never Cut.dc.html`, `Deck Rows.dc.html`, `Card View.dc.html`: R1, kept as history. R1 1d holds the climb sheet drawing.
- `STATES-never-cut.md`, `READINESS.md`, `never-cut · copy strings.ts`: R2.
- `brand/`, `support.js`: copied in for self-containment. `support.js` is the reference runtime, not production code.

## The lock glyph (`LockMark`)
The glyph is 11×13 and drawn in CSS.
- **Arch:** 7 wide, with a `1.6px` stroke and no bottom edge, radius 3.5 3.5 0 0, placed at left 2.
- **Body:** 11×6.5 at top 6.5, radius 2, filled.
- **Keyhole:** a 2px circle at (4.5, 8.75) in `--bg`.
- **Closed:** the arch is 7.5 tall, so both legs meet the body.
- **Open:** the arch is 4.5 tall, with a 1.6×3.5 left leg running from y 3.5 into the body. The right leg stops short.
- **Inks:** at rest, `--fg-body` for closed and `--fg-faint` for open (hover). In the mode, `--accent` for closed and `--fg-muted` for open.

## R2, after Hugh's feedback (2026-09-24) — overrides R1 wherever they differ

Canvas: `The 99 - Never Cut v2.dc.html` (children: `Deck Rows v2`, `Deck Tiles`, `Tuning Panel` v2 states).
R1's canvas is kept as history.

| Area | Now |
|---|---|
| **Word** | *Locked* (key `locked`, title `Lock` / `Locked`). "Never cut" survives only in engineering names. |
| **Card modal** | **Nothing added.** The R1 switch is gone. A locked card opened from Shopping loses *See cheaper stand-ins →*, with no line in its place. |
| **Row, desktop** | A 22px slot just left of the ✕, reserved on every row so hovering doesn't shift the pips. Locked: solid lock, press to unlock. Hover: open lock, title *Lock*, press to lock. It's a pointer shortcut. |
| **Row, 390** | Locked rows show the lock as a mark (14px wide) left of the 44px ✕. No standing control: one would cost 44px of name on every row (option A, drawn). Left of the name was also drawn and rejected (option B): it moves names or reserves the left edge. |
| **Tile** | At rest, the lock goes on the caption's meta line after the dot and slot, before the fact marks. There's no hover shortcut, because the ✕ column is the tile's only removal and stays whole. |
| **Lock cards mode** | A toolbar button in both views and at both widths, which reads *Done* in accent while active. One line: *Locked cards are never suggested as cuts. {n} locked.* Every row's ✕ slot and every tile's ✕ column becomes an `aria-pressed` lock toggle (44px phone; 26×22 row / 32px tile column on desktop). Unlocked: an **open** lock in `--fg-muted` on a `--border-strong` box. The shackle is raised 2.5px and shifted 2.5px right so its right leg clears the body. The same glyph is used for the desktop hover shortcut. Locked: a solid lock in `--accent` on a `1px --accent` box with a 14% accent fill, matching *Done*. Accent is used only inside the mode; at rest, the mark stays `--fg-body`. The ✕ returns on *Done*. This is the keyboard and screen-reader path, and the phone's only way to set a lock. |
| **Suggested changes** | **Implicit.** No manifest row, no read-line clause, no lead clause. A validator drop for a locked cut isn't counted in *did not hold up*. The one trace is `no longer applies · You locked {card}.` when a lock lands on an open suggestion's cut. The all-locked Ready state stays (primary disabled, no credit used). |
| **Climb, stand-ins, cap** | As R1: the climb lists locked cards last and counts them; stand-ins skip them; no cap (Hugh's call). |

Copy changes for `/copy-review`: `mark.key` → `locked`; `row.titleOff` → `Lock`, `row.titleOn` → `Locked · press to unlock`;
new `mode.button` *Lock cards* / *Done*, `mode.line(n)`; `tuning.cutMarked` → `You locked {card}.`;
`tuning.allMarked` → *Every card but {commander} is locked, so there is nothing we could suggest cutting. Unlock a card and suggestions can run again.*;
`climb.listedLast` → *You locked {card}, so it is listed last. It still counts.* Removed: `control.*`, `standIns.none`, `tuning.manifest*`, `tuning.readLine`, `tuning.dropped*`.

---

# R1 (history)

Brief: Hugh, 2026-09-24. The tuning harness had Suggested changes cutting Lotus Petal and Ornithopter
from a Yuriko ninjutsu deck, cards the deck is built around. The overview can't know that, but the
player does. So a player can mark a card in a deck as **never cut**, and no tool will offer to remove it.

Canvas: `The 99 - Never Cut.dc.html` (pan/zoom), with three child DCs: `Deck Rows`, `Card View` and
`Tuning Panel`. Read from `main`: `decklist-row.tsx`, `suggestion-card.tsx`, `proxy-control.tsx`,
`proxy-tag.tsx`, `card-modal.tsx` (props + the `deckId && deckHolds` block), `card-detail-surfaces.test.tsx`,
`lib/copy/proxies.ts`, `lib/tuning/prompt.ts` and `lib/tuning/validate.ts`. This folder lands at
`design/design_handoff_the99_never_cut/` in the repo.

**Constraints, held:** the mark is only ever the player's choice. Nothing infers it, suggests it or
seeds it, and *Reject* never sets it. There's no score and no About entry (it batches at the analysis launch).

## The calls

| # | Call | Answer |
|---|---|---|
| 1 | The mark | **A lock, in `--fg-body`, after the name / count / fact marks.** It spends no colour, for the reason ProxyTag gives: every hue is booked. It's not in the tag slot, because a kept card can also be a proxy or a card to buy. It's not an inset edge, because those already mean pass / draft / over. The word reaches the reader three ways: the key, the title and the row's description. |
| 2 | Setting it on the row | **Desktop: a pointer shortcut.** An outline lock on hover, pressed to set; the solid lock is pressed to clear. It reserves no width, and it's `tabIndex -1` + `aria-hidden`, like the suggestion card's thumbnails. **Phone: a mark, not a control.** A third 44px box would cost 44px of name on every row. Tapping the row opens the card, where the switch is. |
| 3 | Setting it in the card view | **A second switch in ProxyControl's *In this deck* block**, under the proxy switch and a hairline, in the same square-tick skin. It's deck-scoped and absent without a deck. This is the full control (keyboard, screen reader, phone). |
| 4 | How Suggested changes shows it respected the marks | A 5th **manifest row** that names the kept cards; the read line gains **`· n never cut`**; the prompt **tags** kept cards and the **validator drops** any kept cut (`neverCut`, after `cutInDeck`); a neverCut drop is **named in the lead**; an open card whose cut gets marked becomes **`no longer applies`** at once. |
| 5a | Open: cheaper stand-ins | **Protected.** Offering a stand-in is offering to cut, so a kept Shopping row has no ⇄, and the card view says *No stand-ins: you marked it never cut* in place of the link. It still counts as over the limit, because price is a fact. |
| 5b | Open: the climb's *what would have to go* | **Listed, never hidden.** The sheet is arithmetic, not an offer ("which cards go is yours"). A kept candidate sorts last with its lock, and one sentence says so. If the marks alone exceed the lower bracket's allowance, the sheet says that bracket can't be reached while they're marked. |
| 6 | Open: a cap | **No cap. Hugh's call.** A cap is a number the app puts on how much a player may care about their own deck. The tools already cope: fewer swaps, said in the lead. The one real limit is logical: if every card but the commander is marked, Ready says there's nothing to cut, the primary action is disabled, and no credit is used. |
| 7 | No marks | **Nothing new drawn.** No key entry, lock, manifest row or clauses, and no reserved width. The only new pixels are the unticked switch in the card view and the lock on desktop hover. |

## Why each surface looks the way it does

- **One mark in one place.** The lock always sits right after the name: on the decklist, on Shopping, in the
  manifest label, in the `no longer applies` row and in the climb sheet. A player learns it once.
- **The switch copy uses *suggest*, not *cut*.** *Never suggest cutting it from HD Yuriko* is exact: the ✕
  still works on a kept card. The mark only binds the tools. Removing the card drops the mark,
  and `Put back` restores both.
- **The dropped cut is named, and other drops aren't.** *One more would have cut Lotus Petal, which you
  marked never cut, so we dropped it.* is the receipt that the mark was read. Other drops keep *did not hold up
  to checking*: naming why a model's guess failed is noise, but naming that the player's own rule held is the point.
- **Marking mid-set is the harness case.** A player looking at *Ornithopter → Faerie Seer* opens Ornithopter
  from the cut name, ticks the switch and closes the card. The suggestion is already a `no longer applies` row.
  That's two taps, and nothing extra gets drawn on the suggestion card.
- **Not drawn, suggested for later:** a *Never cut {card}* action on a rejected row. It would be explicit
  and so allowed, but the brief puts setting on the row and in the card view only.

## Component notes

Hexes live only in `globals.css`. No new token, hex, motion class, modal, toast or tooltip component.

| Component | Spec |
|---|---|
| **Lock mark** | 9×11. Shackle 6×7 with a 1.5px border and no bottom, radius 3/3/0/0. Body 9×6, radius 1.5. Solid = `--fg-body` fill; outline = 1.5px `--fg-faint` border. `aria-hidden`. A primitive (`NeverCutMark`, `state: "on" \| "off"`); a CSS shape, not an icon font. |
| **Row shortcut (desktop)** | `<button tabIndex={-1} aria-hidden>` holding the mark, 22×22 hit box with −6px margins so the 34px row does not grow, radius 5, hover tint `color-mix(--fg 7%)`. Rendered when `marked \|\| rowHovered`. The row's `openFromRow` already skips buttons. Optimistic; serialised like ProxyControl. |
| **Row mark (phone)** | The mark alone, `flex-none` after the name in the name line. The name truncates first. |
| **Row description** | `neverCutCopy.mark.a11y`, added to `describedBy` after availability and before the pass mark. |
| **Key entry** | The shipped mark key takes it as data (`key: "never cut"`), only when the view holds a kept row. |
| **Switch** | A copy of ProxyControl's button: `role="switch"`, 16px tick (18 phone), `--fg-body` fill when on, 44px row. Label, then the mark (state follows the tick). *marked* line 13px `--fg-body` when on; note mono 11px `--fg-faint`. A 1px `--border` hairline, 14px above and 6px below, separates it from the proxy half. |
| **Manifest row** | The shipped row. Label + mark; names on a second line at 12px `--fg-muted`; count mono 11px `n of 99`. Absent at zero. |
| **No-longer-applies row** | The shipped `AnsweredRow tone="broken"`. The mark goes before `cutMarked(card)`. |
| **Stand-ins line** | Mono 11px `--fg-faint`, in the link's slot (44px min-height on phone). |
| **Climb candidate** | The shipped row. Mark + mono 10.5px `never cut` on desktop (the mark alone on phone); sorted last. |

## Notes for engineering

1. **Schema:** `deck_cards.never_cut boolean not null default false`, per deck × oracle id. It is not
   versioned: it takes effect at once, like a proxy, and a commit doesn't touch it. It's removed with the card.
2. **Action:** `setCardNeverCut(deckId, oracleId, on)`, with the same membership test and refusal as
   `setCardProxied`. It revalidates the deck page and the tuning set.
3. **Evidence pack:** `cards[].neverCut`. `prompt.ts` adds `never cut` to the decklist tags and extends the
   commander system line (`neverCutCopy.tuning.promptRule`). Bump `prompt-version`.
4. **Validator:** a `neverCut` rule in `firstFailure`, straight after `cutInDeck`. It's counted in `drops`
   so the lead can name it, and it joins `suggestionRules` so the prompt and the checklist stay one text.
5. **Set check:** `applies` becomes false when the cut is marked (third reason, `cutMarked`). It's
   recomputed on read, so clearing the mark reopens the card.
6. **Swap tools:** the stand-ins query and the ⇄ slot skip kept cards; the card view swaps the link for the line.
7. **Climb:** candidate order puts kept cards last. The `unreachable` sentence shows when
   `kept candidates > allowance`. The count is never changed.
8. **Live region:** one message per settle, `announceMarked` / `announceUnmarked`.

## Files
- `The 99 - Never Cut.dc.html`: the canvas, sections §, 1a–1e.
- `Deck Rows.dc.html`, `Card View.dc.html`, `Tuning Panel.dc.html`: child frames.
- `STATES-never-cut.md`: every state, both widths.
- `never-cut · copy strings.ts`: the copy block, for `/copy-review`.
- `READINESS.md`: readiness and open items.
- `brand/`, `support.js`: copied in for self-containment.
