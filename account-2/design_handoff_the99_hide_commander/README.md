# The 99 · Hide a commander (account 2, 2026-10-31)

Canvas: https://claude.ai/artifact/RZp8zfcHeG3GYcEr8Bs1ps
Status: **R1, awaiting Hugh's audit.**

Brief: `docs/superpowers/design-briefs/2026-10-31-hide-a-commander.md`. Hugh's rulings hold throughout: a hidden commander stays hidden until the player undoes it, with a Hidden list to restore from; it drops out of For you, Discover and Help me choose (Help me choose says nothing); its own page still opens, says it is hidden and offers Unhide.

Every state is drawn at 390 and 1300 over the shipped captures (`public/about/pages/amonkhet`, phone at 2x, desktop at 1.5x) and the shipped components named below. Chrome that does not change (phone header, page head and rack, tab bar, desktop rail) is the capture itself; rows, strips and everything this round changes are drawn at the shipped values. Strings marked DRAFT go through `/copy-review`. Dashed accent outlines mark what is new.

To view a board, open `Main.dc.html` or the board's own page; each needs `support.js` and `art/` beside it. `scratch-gen/` holds the generator: `lib.py` plus one `b*.py` per board; `python3 build.py <out> b1:Rows …`, then `node render.js <abs out> Rows …` sets each board's preview size and reports broken images and overflow. `canvas.py` swaps `art/` for the canvas's `/_blob/` urls (`blobs.json`).

Sources read: main @7bf3c89 and the files each section names.

| Board | States |
|---|---|
| `Main.dc.html` | Every call and the open questions |
| `Rows.dc.html` | 1 · the control on a For you row (rest, pressed, hover) · 2 · on a Discover row · the plate's four states |
| `Undo.dc.html` | 3 · undo in place (one, two, Discover, desktop) · 12 · hide failed, undo failed |
| `Hidden.dc.html` | 4 · the Hidden list · 5 · empty · 6 · unhiding and the row's return · 12 · unhide failed |
| `Page.dc.html` | 7 · reached from the lists' search, the page when hidden · 8 · the page when not hidden, with Hide |
| `Edges.dc.html` | 9 · Help me choose, unchanged · 10 · a pair · 11 · a list left short or empty |

## 1 · The control (`Rows`)

- **On the row, top right of the band**, at both widths: the band's one empty corner. Not a menu (the row has none, and one action needs no menu), not a swipe (undiscoverable, and nothing else swipes), not page-only.
- Drawn as **the plate** every control over art draws (`full-card-trigger.tsx` `PLATE`): 26px, opaque `--bg`, one `--border-strong` hairline, radius 7, centred in a 44px target, inset so the band never clips it. Glyph: eye with a slash, `--fg-muted`. Always drawn, not hover-only.
- States: hover (fine pointer) `--elevated-hover`, glyph `--fg`; pressed `--elevated` with an accent edge; focus the app's 2px accent ring.
- It sits above the row's stretched link (`z-[2]`), so a press never opens the page. `aria-label` and `title`: *Hide {name}*.
- Same control in For you and Discover. Nothing else on the row changes.

## 2 · Confirmation and undo (`Undo`)

- **No confirm step.** The Hidden list is the safety net, and undo is one press.
- **The row turns into the deck builder's shipped Undo row** (`decklist-row.tsx` `UndoRow`; decision 5 of the add-panel addendum): `--surface-sunken`, dashed `--border-strong`, mono *{name} hidden*, **Undo** (`undo.action`). No toast, no timer. It stays until the reader leaves the tab; each hide keeps its own row. Undo is optimistic: the row is back at once.
- Rows below keep their numbers while the Undo row stands; the next load ranks without it.
- The Hidden tab's count moves with each hide.
- **Hide refused:** the row comes back where it was; shared toast (`ToastFrame` centre, role alert), *We couldn't hide {name}. Try again.* (DRAFT) with Try again.
- **Undo refused:** as the builder's: the button goes and one line under the row says *Couldn't bring that back. Unhide it from Hidden.* (DRAFT).

## 3 · Where Hidden lives (`Hidden`)

- **A fourth tab on the Commanders strip**, `/commanders/hidden`: For you · Discover · Help me choose · **Hidden**. It sits beside the lists it takes from and is there before anything is hidden, so the reader can find it and its empty state is real. It carries the strip's shipped count (`tab.count`) once something is hidden. Four tabs fit 390 without the strip's compact spacing.
- Not Settings and not the user menu.
- Page: the shipped `PageHeader` (*Hidden* / *commanders you hid*), a count line (*3 hidden · newest first*), no rack.
- **The row** is Help me choose's result row (`choose-row.tsx`: 40px card face, name, pips, `--surface-rail`) with *Hidden Oct 31* under the name and **Unhide** (the builder's accent text button, 44px) where the figures were. Newest first. The row opens the commander's page; Unhide is its only other control. Desktop: Help me choose's 720 column.
- **Empty:** the shared zero state, *Nothing hidden*, one sentence that draws the plate it names (DRAFT). No button. No count on the tab.
- **Unhide:** the row turns into the same Undo row, saying where it went, *back in For you* or *back in Discover*; Undo hides it again. The commander returns to its list at whatever rank it scores now, with no mark.
- **Unhide refused:** the row stays; shared toast, *We couldn't unhide {name}. Try again.* (DRAFT).

## 4 · The commander's page (`Page`)

- **"From search" is the lists' own search.** Card search opens card details, not `/commanders/[slug]`. A hidden commander is out of the list, so typing its name lands on Discover's shipped **held** state (`excluded-report.ts`, the zero state that says a filter is holding a match back), with a new cause: heading *{name} is here. You hid it*, body *It matches, but you hid it, so it stays out of your lists. Its page still opens.* (both DRAFT), primary **Open its page**, aside *1 match, 0 shown*. Above a live list the same cause is one sentence in the shipped aside (`excluded-match.tsx`). For you's search gains the held state too.
- **Hidden:** the hero's shipped note shape (the synergy note: `--elevated-hover`, `--border-strong`, 2px `--fg-faint` left edge) leads the body (phone) or the right column (desktop): eye glyph, *Hidden. It stays out of For you, Discover and Help me choose until you bring it back.* (DRAFT), **Unhide**. The phone band's kicker reads *Hidden* in place of the rank; the hero's rank clause reads *Not ranked while hidden*. Fit, Build and everything else stay.
- **Not hidden, the page offers Hide:** phone, the plate in the band's top-right corner (Card details keeps the bottom right); desktop, a muted *Hide from my lists* line (DRAFT) under the build note. Pressing it turns the page into the hidden state at once.
- Never on the public `/commander/[slug]` page.

## 5 · Help me choose, pairs, short lists (`Edges`)

- **Help me choose** reads the hidden list in the candidates' own statement, before the read picks and before the rest are ordered. A hidden commander is never a best fit, never in More commanders, never named, never counted. Nothing is drawn.
- **Pairs:** Hide acts on the card the row draws. A two-faced commander is one card, named by both faces as the row names it. Partners are two cards and two rows: hiding one leaves the other in the lists. A deck either already leads is untouched. *Aang and Katara* is a different card from *Aang, Swift Savior*: hiding one Aang never hides another.
- **Short list:** fewer rows; the count line counts what is left; no "N hidden" line (the tab says it).
- **All hidden:** the shared zero state, *Everything here is hidden* / *You hid all 3 commanders you own and haven't built. Bring one back from Hidden, or find one to build in Discover.* (DRAFT), **See hidden**.
- Counts (`loadCommanderCounts` title line, the count line) leave hidden commanders out; the title line drops its own count at 0, as shipped.

## Name

**Hide**, **Hidden**, **Unhide**: one family for the control, the tab and the way back. "Not interested" reads as a verdict on the commander, which the ruling says it is not.

## Open for Hugh

1. **Where Hidden lives:** the fourth tab (drawn), or no tab and a *3 hidden* link at the end of the count line (not drawn; its empty state would have no way in).
2. **The tab's count:** drawn with the strip's shipped count. Drop it if it reads as a nag.
3. **A Help me choose run in History** from before a hide: recommended, drop the hidden row silently there too, rather than keep it as a record.
4. **Desktop Hide on the page:** the text line (drawn), or the plate on the card face's top right, over the mana cost.
