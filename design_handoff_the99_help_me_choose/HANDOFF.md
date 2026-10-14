# Help me choose — handoff package (R1 · approved 2026-09-24)

> **Status: approved by Hugh (2026-09-24).** R1 was revised through three review passes (R1.1–R1.3, noted inline); the text below is final.

**Canvas:** `The 99 - Help Me Choose.dc.html` (pan/zoom; `theme` in Tweaks). It mounts `Help Me Choose.dc.html`
(`scene`, `phone`, optional `screen`), `Hand-off.dc.html` (`state`, `phone`) and `Doors.dc.html` (`door`, `phone`).
**Brief:** `docs/superpowers/design-briefs/2026-09-24-intake-to-deck.md` on `docs/intake-brief` (PR #933). The §2
rulings and §5 are taken as locked. The §3.0 readings are drawn as written. This package answers §4's seven calls.
**Aligned with, read at `main`:** `decks/create-picker.tsx`, `decks/create-pre-filled.tsx`, `app/decks/new/page.tsx`,
`lib/commanders/lane-params.ts`, `ui/availability-marker.tsx`, `decks/buy-tag.tsx`, `decks/tuning-panel.tsx`,
`lib/copy/credits.ts`, `lib/model/allowance-rule.ts`. **Where a component and this handoff disagree, the component
wins.**

> **Addendum (2026-09-26):** `addendum-three-answers/` adds themes as any of, a set answer, and build from what I own. It extends §2–§5 and changes nothing else here.

---

## 1 · The doors (§3.5, ruling 9)

**/decks/new.** One new element, the **door**, is the first child of the picker's list column, above the search.
Desktop: `--surface-sunken`, a 1px `--border-strong` border, radius 11, padding 15 18, a row. On the left, *Not sure
what to build?* (display 600 16) over one line at 13 `--fg-body`. On the right, **Help me choose →**, outlined in
accent, 38 tall. Phone: the same box stacked (radius 10, padding 13 14), with the button full width at 44. It sits
**above the name field and never in the dock** (the dock's height rule, `create-picker.tsx` B1). The picker's rows,
sidebar, dock and copy don't change. The desktop sub becomes *Pick a commander from your collection, or let us
help.* (placeholder: `addPanelCopy.createPicker.sub` isn't quoted here).

**Discover.** The link sits on the rack's **result line**: at its right end on desktop (`margin-left:auto`), and on
its own 44px line under the count on a phone. *Not sure what you want?* at 12.5 `--fg-muted`, then **Help me
choose →** in accent with a 50% underline. It **carries `c` and `m`** into the intake, so the colors lit on
Discover are lit there. Nothing else moves from Discover, including search, order and scope. The rack's height is
unchanged on desktop. On a phone the line grows by one row, below the row that holds the controls.

Route: `/decks/new/choose` (eng's call). It uses `lane-params`' `c`/`m` encoding for colors, so a Discover URL's
colors parse as-is.

## 2 · The intake (§3.1, §4.1: a form, then results) — R1.1

**It's a submission, not a filter** (Hugh, R1 review). The flow is **set answers → Find commanders → results →
Change answers / Start over**. The form draws **no commanders and no counts** until it is submitted. A live count
would make it read as a filter, and it would say the same thing Discover already says.

- Desktop 1300: header and form **centered** in one 680 column (`‹ New deck`, *Help me choose* display 700 28,
  sub 14 `--fg-muted`), then the form. It's a `--surface-rail` panel, radius 12, padding 24 26, gap 22.
- Phone 390: the same form, with the submit in the dock.
- **Submit**: **Find commanders**, bone, 44 (48 on the dock), after a `--border` rule. It has no note beside it.
- Submitting runs the search once. Changing the form afterwards changes nothing until the next submit.

Inputs, in order:
1. **In your own words.** A textarea, min 84 (96), placeholder *e.g. Dinosaurs that go big, under $150, bracket 2,
   built around Regisaur Alpha*, and caption *Themes, cards, a budget or a bracket, in any words.* Nothing is
   matched while the player types.
2. **Colors.** The lane control: five pips (28 / 36), lit with a 2px `--bg` + 1.5px `--fg` ring, unlit at 0.34.
   **Any / Exactly** is greyed while no pip is lit, and it keeps its value, as on the rack. The caption says what it
   admits: *No preference: every identity, five-color included.* / *Any identity that includes Red and Green.* /
   *Exactly Red and Green, nothing more.*
3. **Theme.** A field holding the picked tags as chips (`--elevated`, 26, ✕), then an input. It opens a list of
   tags that clear the vocabulary floor, each with its commander count, multi-select, with a checkbox mark.
4. **Budget.** A `$` field whose placeholder is *No cap*. Caption: *The most you would spend on cards you don't
   own. It caps the fill and never ranks.*
5. **Bracket.** Six segments: **Any** (wider) · 1 · 2 · 3 · 4 · 5, at 34 / 44. The caption gives the name
   (`2 · Core`), or *No preference: every bracket.*

**Words and controls** are independent in the form. At submit, if the words and a control disagree on a budget or a
bracket, **the control wins**, and the word match is listed under Not used. Themes combine. Colors are never read
from words (§3.0).

## 3 · The reading, and a deeper look (§3.2, §4.2, §4.3) — R1.3

**Nothing is interpreted in the form.** The words box is plain text, captioned *Themes, cards, a budget or a
bracket, in any words.*

**On submit, a free match** reads the words: theme names against the EDHREC vocabulary, card names against the
card index, a dollar figure, and `bracket N`. It is deterministic, runs on the server in the same request as the
search (the card index is too big to ship to the client), and costs no credit.

**The results bar: We read this as.** The bar holds:
- read-only chips for the controls' answers and the words' matches;
- a **Not used** line of quoted phrases;
- **Change answers** and **Start over**, which are the only way to edit.

| Kind | Edge | Value | Trailing |
|---|---|---|---|
| matched | 1px `--border-strong` | 12.5 `--fg-body` | — |
| card | same | 12.5 / 600 `--fg`, dotted accent underline, opens `CardModal` | owned dot · `BuyTag variant="row"` · `buy · no price` |
| from the deeper look | **1px dashed `--accent`** | as its kind | mono 9 **deeper** in accent |
| not used | none, and not a chip | “quoted” 13 `--fg-muted` | — |

**The deeper look** is framed as *more depth*, never as a correction: the first results weren't wrong. It sits in
the same bar as its own panel: radius 10, `accent 6%` over `--surface-sunken`, a 1px `accent 28%` border. It's
shown only when the submit had words.
- Left side:
  - **Want a closer fit?**, display 600 15.5;
  - one sentence at 13 `--fg-body`: *A deeper look weighs everything you wrote, not just the names we matched, and
    searches again.*
- Right side: the button, then the standing line in mono 10.5 `--fg-faint` under it.
- **The button** is a 38 (44) pill with an accent fill. Inside, **a `1 credit` pill comes first** (mono 10.5 / 600,
  `--bg` 22% tint), then **Look deeper**. The accessible name is *1 credit. Look deeper.*
- It returns more answers from the same vocabularies. It never names a commander. The search runs again with them.

| State | Title / lead | Button | Line | List |
|---|---|---|---|---|
| offer | Want a closer fit? / lead | `1 credit` · Look deeper | `{standing}` | first results |
| looking | Looking deeper… / *These results stay until the new ones are ready.* | hairline, `--fg-muted`, Looking… + **Stop** | *Stopping gives the credit back.* | first results at 0.45 |
| done | Deeper look + `DONE` tag / *Answers marked deeper came from it…* | — | *1 credit used · {standing}* | new results |
| failed | + `DIDN'T FINISH` / *…your credit came back. These are still your first results.* | `1 credit` · Try again | standing | first results |
| nothing to add | Deeper look / *It found nothing to add… your credit came back.* | — | standing | first results |
| no credits | lead | `0 left` · Look deeper, disabled | *Next credit at {reopensAt}…* | first results |
| paused | lead | `Paused` · Look deeper, disabled | `creditsCopy.paused` | first results |

It's offered once per set of words, and no motion is used anywhere.

**Wording rule:** the UI never says *AI*, *model*, *LLM* or similar. The feature is **a deeper look**. Internal code
names are eng's.

## 4 · The results (§3.3, §4.4, §4.7)

**Their own screen at both widths.** The title is *Commanders for you*, and the sub is *Suggested from your answers,
best fit first.* It opens with the We read this as bar (§3), then the order line (display 600 18 / 15) with one
sentence under it. **No total is printed.**

**Why the answer it fits least sets the rank (§4.4).** With several answers, each commander has several figures
in one unit (% of its decks). Ranking by the lowest means a commander has to be good at *everything you asked* to
rank high. Gishath is 91% Dinosaurs, but only 64% of its decks run Regisaur Alpha, so 64 is its rank. An average
would let a huge Dinosaurs figure hide a poor Regisaur figure; a single lead answer would ignore the rest. The
line reads *Ordered by fit to everything you asked*, and the sub gives a worked example. On the row, the limiting
figure is lit and tagged **SETS RANK**, and the rest are dimmed. With one answer there's no tag.

**Best fits.** When there are **4 or more** results and no too-narrow bar, the top three are cards under a mono
accent **Best fits** label.
- Desktop: a 3-column grid, gap 14. Each card is radius 12, `--surface-rail` with an `accent 30%` border, and holds:
  - 132px of commander art (`CommanderThumb` art crop), with a **rank disc** (26, mono 12 accent on `--bg`) at the top left;
  - the name, display 600 17, which opens the card, with pips;
  - every figure (mono 15 / 600 + 12.5 sentence, same lit / dim / SETS RANK rules);
  - a rule, then the ownership line.
- Phone: the same cards stacked, as rows, with 88px of art at left.

The rest follow under **More commanders** as today's rows.

**Row, desktop** (results max 1080): a grid of `40px · minmax(0,1fr) · 340px · 14px`, gap 16, padding 12 15, radius 11,
on `--surface-rail`. It holds the thumb, the name (display 600 16, which opens the card) with pips, and the
ownership line in mono 11: a mark, then `you own N of its 99 · about $X to buy[, inside $cap]`. The mark is
`OwnershipDot` *owned · free*, `AvailabilityGlyph hard` *none free — in {deck}*, or `BuyTag variant="row"`. Then
the figures column, then `›`. **Phone:** the figures go under the name in mono 10.5.

**Orders:**
- **theme:** *Ordered by Dinosaurs*. *Each figure is the share of that commander's decks on EDHREC tagged
  Dinosaurs.*
- **card:** *Ordered by Regisaur Alpha*. *…It goes in the deck whichever you pick.*
- **several:** *Ordered by fit to everything you asked* (above).
- **no theme or card:** *Ordered by cards you already have*. Commanders owned or not; the figure is the
  support-card overlap.

**How many:** 12, then **Show 12 more**, with *The next 12 count what you own as they load.* Trial fills only run
for rows on screen. **Unpriced build-around card:** each row adds *{card}: no price on record, placed anyway*.

## 5 · Too narrow, errors, loading (§3.3, §4.5)

An answer is never loosened silently. Each **option** is one press that drops or widens one answer and searches
again. It's a row (44 / 48): label 13.5 / 600, an optional reason line 11.5 `--fg-faint`, the count in mono 11
(*24 commanders*), and `→`. The first option (the one that brings back the most) has an `--elevated` fill and an
`accent 55%` border. The rest are hairline. Two or three options at most.

- **None fit:** the results area becomes a centered empty state (dashed `--border-strong`, radius 14, padding 52):
  - *No commander fits all of that* (display 600 19);
  - *Each of these would bring some back. Pick one and we'll search again.*;
  - the options, max 440 wide;
  - *Or change your answers yourself.*, as a link.

  When a rule is the reason (for example a Game Changer against bracket 2), it's the option's reason line.
- **A few fit (< 4):** a slim bar above the results (`--surface-sunken`, radius 11) with *Only one commander fits
  all of that* on the left and the options inline on the right. There are no best-fit cards.
- **The search failed:** the same empty-state frame, with a `!` disc in `--warning`, *We couldn't find commanders
  just now*, and *Something went wrong on our side. Your answers are kept, and no credit was used.* Then **Try
  again** (bone) and **Change answers** (hairline).
- **Searching:** the results screen opens at once, with the bar, *Finding commanders…* and five skeleton rows
  (no shimmer).
- **Row loading:** *Counting what you own…* with a bar. A failed row reads *Couldn't count what you own.*
  **Retry**. Neither moves the row.

## 6 · The hand-off (§3.4, §4.6) — matches today's UI

**A press → `CreatePreFilled`**, read at `main`, with the answers in the URL. Everything that ships stays as-is:
- the header, and the mobile `‹` chevron row with *Commander selected*;
- the full card with its name and type line;
- **Legal · validated**, and the **desktop Color identity row** (22px pips + `colorLabel`, e.g. *Naya*). Phone has
  no identity row today, and none is added;
- the Deck name field, the button pair, and the helper line.

**What changes:**
- The desktop back link reads `‹ Help me choose · results`. The ghost **Change commander** becomes **Back to
  results**.
- The desktop sub reads *Name your deck. It will be built from your answers.* The phone sub reads *From your
  answers*.
- **One new block**, *Built from your answers* + **Change**, sits between the identity row (the Legal strip on a
  phone) and Deck name, mb 24. Rows have a mono key, the value at 13.5 / 600, and one consequence line.
- **Creating:** as today (*Creating…*, 0.4).

**Landed (6c):** today's deck page, with no new component. The answers go into the **seeded intent line**
(`DeckIntentLine`, the ⓘ disc + `from the build` + edit), which today reads `seededBrief`: *Built around {X},
from the cards you own.* For this flow it reads *Built around {commander}: {theme}, with {card}, under {$cap},
bracket {n}.*, listing only the answers given. It's editable, and it drops the chip once edited, as today. The
`ProvenanceLedger`, the tabs, the list and the dock are all unchanged. There is no arrival strip.

**Fill failed (6d):** today's `FillFailedBanner`, copy unchanged (*The deck is here, the cards aren't.* / *We made
the deck but couldn't fill it. Nothing is lost.* / **Try filling again**). The only change is that the retry
calls `fillDeck` **with the stored answers** (budget, bracket, card). The intent line is seeded either way.

## 7 · What engineering builds

1. The `HelpMeChoose` route: a form, then a results screen, run on submit only. Change answers keeps the form's
   state, and Start over clears it.
2. The door in `create-picker.tsx` (create mode only, never import), and the link on Discover's result line.
3. `ReadAsBar` on results: read-only chips, the Not used line, Change answers / Start over, and `DeeperLook`
   (pill button + `creditsCopy` line) with its seven states.
4. `ChooseRow`: figures column, ownership line, and per-row trial-fill states.
5. `NarrowNote`, with a single drop action.
6. `CreatePreFilled` accepts answers: the block, the back target, and passing budget, bracket and card to
   `createDeck`.
7. The seeded intent line's answers variant, and `fillDeck` accepting the answers so the FillFailedBanner retry carries them.
8. `BestFits` (top three cards) and `NarrowState` / `SearchFailed` empty states.

## 8 · Most likely to break in build

0. **Results or counts before submit.** The form never shows a commander, a count or a live preview.
1. **Spending on anything but the ticket.** Submitting and the free match never cost anything, and never show a
   credit line. The credit line appears only on the results.
2. **The cost after the action.** The `1 credit` pill comes first, in reading order and in the accessible name:
   *1 credit. Look deeper.* The UI never says AI or model.
3. **Sorting by an average, or showing only the lowest figure.** Sort on the lowest figure, and show every figure.
4. **Ownership leaking into the fit order,** including as a tie-break before name. Ties break by name.
5. **"Loosening" a too-narrow list.** Always the note and a press, never a quieter list.
6. **A new arrival UI on the deck page.** There isn't one: the answers live in the seeded intent line, which
   already exists.
7. **Mocking existing screens from memory.** 6a–6d are drawn from `create-pre-filled.tsx`, `deck-intent-line.tsx`
   and `provenance-line.tsx` at `main`, plus Hugh's screenshots. Where they disagree, the code wins.
