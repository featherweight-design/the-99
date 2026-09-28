# READINESS — Deck tuning suggestions, five surfaces (R2)

## Addendum r2, 2026-09-23: placement + panel revision (Hugh: LGTM)

**Self-assessed: 🟢 Green for build planning; 🟡 on three open items below.** Canonical canvas:
`The 99 - Deck Tuning · Placement Addendum v2.dc.html`. Decision and full change table: `README.md`
§Addendum and §Addendum r2. **Where r2 and anything below this section disagree, r2 wins.**

**What r2 supersedes below:** locked ruling 1's pre-tap consequence line and post-apply verdict /
shopping clause (the availability marks carry it); ruling 3's `×1 owned` / `not owned` atom (now the
app's dot, diamonds and `buy` chip); called item 2 (games no longer gate; state 1 retires); called
item 12 (five, not three); `Not this one` → `Reject`; the Games-tab placement.

**Engineering list, in dependency order**
1. **Shared credit allowance** (sub-project 6): per player per day, spent by a tuning run and by a
   synopsis rewrite; exposes `left / total / resetsAt`. The number is a fixture (5) until measured.
2. **Suggestion set keyed to a version**: a commit retires the set; in a draft, a deterministic
   check marks a swap `no longer applies` when its cut has left the list or its add is already in it.
3. **Run request**: asks for five; the validator drops failures; zero games is valid (list, mix,
   collection, intent). New `mix` citation source.
4. **Panel on the Analysis tab**, full width after the mix, mounted with the grid. Games tab gets one
   pointer line (`setView('analysis')`).
5. **Card-open on both names and thumbnails**: `HoverPreviewProvider` on the tab (shared with finding
   9); `CardModal` with `[cut, add]` as its list and `backLabel` *Suggested changes*.
6. **Add-side marks** from the shipped availability + buy-chip components; own row on phone.
7. **Loading mark**: `CardFanMark` gains an animated variant (`fan-shuffle`, 2.4s, reduced-motion
   static).
8. **Copy** (all new lines, for `/copy-review`, no em dash): credit notes ×3, results / fewer / all
   answered / retired / no-games leads, `Shuffling through your deck…`, `no longer applies` line,
   manifest labels (*Notes on your games*, *Your games · none logged*), Games pointer, `readBack`.

**Settled 2026-09-23** (`READINESS-addendum-audit.md`): failed or stopped runs are refunded;
Re-analyze states its credit before the press (synopsis round); credits roll over 24 hours.

**r3 (section E):** bracket flag drawn at both widths, intent line placed, the two missing phone
frames, Ready with unmarked games. See README §Addendum r3.

**Open**
- C (lifecycle) is approved pending engineering feedback on the version tie and the draft check.

---

## R2 (original)

**Self-assessed: 🟡 Green with one open item.** Both open calls are called, nothing is blocked on a
dependency and no redraw is pending — but **§6's four failure-class labels are Design's inference**,
because the spec is not in this design project. That is the one thing the audit must confirm or
correct, and it is a copy edit either way.

## The open item, stated plainly

`docs/superpowers/specs/2026-09-07-deck-tuning-suggestions-design.md` is not present here (it is
merging on PR #392; this project carries only `docs/superpowers/design-tables/appshell.md`). The
five surfaces, the three locked rulings and the counting constraint are drawn **from the brief,
verbatim**. §6's failure classes are not in the brief, so Design named them:

| # | Label | Class |
|---|---|---|
| 6a | `unavailable` | the provider could not be reached |
| 6b | `timed out` | the run exceeded its budget |
| 6c | `unusable answer` | the response could not be parsed |
| 6d | `nothing held up` | every candidate failed validation |

**The count is four and the shape is one** — same three slots, a `--danger` tag, one sentence, a
line saying what survived, one `Try again`. If §6 names or splits them differently, it is a string
change in `deck-tuning · copy strings.ts` and **no layout, geometry or state changes**.

Two smaller instances of the same gap, both flagged on the canvas:

- **`src/components/decks/*` is not in this project.** Panel, form, history and pill geometry are
  traced from `design_handoff_the99_game_log/The 99 - Game Log.dc.html`. **If the components
  disagree, they win** and the component table in `README.md` is what to correct.
- **No price atom was locatable.** The brief says one ships on the add panel's rows; the ownership
  atom was found (`×{qty} owned` / `not owned`) and is used unchanged. The `$1.20` figure is drawn
  in that atom's shape — mono, tabular, `--fg-body`, only when unowned — and eng should substitute
  the real formatter.

## The two open calls, both called

| # | Question | Called |
|---|---|---|
| 1 | Where deck intent lives on the deck page | **Under the deck name once it exists; the ask lives in the tuning panel. No empty state in the header.** Four states drawn, including the app-seeded one with its `from the build` chip. |
| 2 | How the panel's six states share one container | **Three fixed slots — heading, body, action row. Only the body changes shape.** Six states, one layout, one primary position. |

## The locked rulings, drawn as written

1. **Apply-plus-verdict.** Applying does the swap and states what it cost, in the card, in place:
   the deck's post-swap count and status in the shipped status wording, then the shopping
   consequence in one clause. **The consequence also prints before the tap**, in the mono line
   beside the buttons. No toast, no navigation, no silent success.
2. **Manual generation only.** Nothing generates on load, on save, or on the Nth game. No automatic
   retry after any of the four failures. No badge and no notification, because there is nothing
   waiting until a player asks. Re-running is the same primary in the same corner, relabelled.
3. **Ownership is a label, not a filter.** `×1 owned` / `not owned · $1.20` disclosed on the card.
   It never filters, ranks, sorts, or suppresses a suggestion. The best card for the deck does not
   become the second-best because it has not been bought.
4. **#9's presentation rules carried over whole.** No percentage and no net anywhere, every count
   with its denominator in the same element, `PATTERN_MIN` as one imported constant, the eight axis
   keys and labels untouched, Fix above Keep, losing never `--danger`, nothing unmounts mid-write,
   a refusal preserves what was typed, one live-region message per settle.

## Called, not asked — flagged for the record

1. **The counting rule is enforced on the model's output by a validator, not by a prompt.** A
   rationale containing a percentage, a net, or a count without its denominator **is not shown** —
   it counts as a rejected candidate, and if all candidates are rejected the panel lands in failure
   class 6d. Design is not asking for a politely-worded prompt. Nine mechanical checks are listed
   on the canvas and in `README.md`.
2. **#10 gates where #9 refused to.** §5 forbids a minimum-games gate on the *summary*; this panel
   does gate its *suggestions* at `PATTERN_MIN`, because a swap proposed off one game costs real
   cards. Same constant, different kind of thing, and the panel says which number it wants and how
   far off you are — once, in the mono note, never as a progress meter.
3. **The generating state is a manifest and it is load-bearing.** Four rows with counts, ticking on
   real completion. It is the honest disclosure of what a model was handed, and it is the only
   place in the app where a wait is expected. A spinner would hide the one thing the player is
   entitled to know.
4. **`Stop` exists**, because the wait costs money and time. A cancel returns to the ready state
   with no error and no tag.
5. **The note is an input capped at 140, never a textarea, and never required.** Not on a loss, not
   ever. It is quoted verbatim to the model, cited by name and date, and **never parsed for axis
   marks** — inferring marks from prose would corrupt an aggregate the player believes they control.
6. **Deck intent has no empty state in the header.** Absent means absent. The ask lives where the
   payoff is.
7. **Seeded intent is labelled and the label is removed on first edit.** Attribution is the whole
   difference between a seed and a guess, which is why seeding intent from the decklist is refused.
8. **Neither card action removes the card.** Applied keeps the pair and gains a stamp; dismissed
   collapses to a one-line row in the same slot. The list never reorders or shortens under the
   player's cursor — the failure the shipped suggestion tile keeps its slot to avoid.
9. **`Put it back` is a real inverse mutation with no time limit** — the undo #9 wanted and could
   not have, possible here only because the thing being undone is still on screen. Its cost is
   flagged as gap 5.
10. **Dismissing asks nothing.** No thumbs, no reason picker, no "why not?". Nothing in this
    release would read the answer, and a feedback prompt on a rejected suggestion charges the
    player for the app's mistake.
11. **`--danger` appears in exactly one place on these five surfaces:** the failure tag. Not the
    heading, not the border, not the button, and nowhere at all in the nothing-has-changed state,
    which is a successful run with an honest answer.
12. **Three suggestions, not ten.** Ten swaps is a rebuild. Fewer than three is a legitimate result
    and the panel simply renders fewer cards — flagged as gap 3.

## Not blocking, and worth reading before estimating

13. **Two nullable single-line text columns are the whole schema ask** — `deck_games.note` (≤140)
    and `decks.intent` (≤120). Everything else composes existing boxes.
14. **The apply mutation must return the post-swap verdict** (count, status, shopping delta). The
    card prints it; the client does not compute it.
15. **Suggestion state persists** per suggestion per run — open / applied / dismissed — so a reload
    does not resurrect a swap already made or refused.
16. **Revalidation is `deckSurfaces()`**, as the log and the delete already do. Applying a swap
    moves the deck list, the home page and the shopping list.
17. **The aggregate panel, the tab pill, the history row's first line, the delete confirm and the
    empty state are all unchanged from #9.** #10 reads the aggregate; it does not redraw it. The
    pill still counts games, not suggestions.
18. **Copy adds only.** `src/lib/copy/deck-tuning.ts` imports `PATTERN_MIN` and `axisCopy` from
    `game-log.ts` and redefines neither. The two new strings on #9's surfaces (`note` label and the
    amended optional line) are in the new block and marked as amendments.

## Not blocking

- No new token, no new hex, no new motion class, no new empty-state construct, no modal, no toast,
  no tray, no tooltip, no skeleton, no shimmer, no typewriter, no badge, no notification.
- Every count on every one of the five surfaces carries its denominator in the same element:
  `7 of 9`, `11 of 99`, `2 of 2`, `3 of 4 read`, `78 / 140`, `1 of 3 applied`,
  `0 of 4 suggestions survived checking`, `99 / 99`. **No percentage and no net figure appears
  anywhere, including in model output.**
- Every figure on the canvas is arithmetically consistent with the nine Gisa games it claims:
  `5–4 across 9` · `card_flow` marked against in 7 of 9 · two notes (26 Aug, 19 Aug) · 11 of 99
  cards at four mana or more · 4 of 99 that draw a card.
- Contrast: every figure and label is full-opacity ink. The note in history is `--fg-muted`
  (6.19:1) rather than `--fg-locked` (2.84:1) — it is the least machine-readable thing on the
  surface and the most personal. Citation chip values are `--fg-muted`; only the source names are
  `--fg-locked`, and they are repeated in the aria description.
- Colour is never the only carrier: ownership is a word, the applied state is a stamp with a glyph,
  the failure class is a named tag, the cut is struck through as well as dimmed, and a done
  manifest row has a ✓ and a brighter label ink (`--fg`), with no fill. *Amended 2026-09-28 by
  the manifest-affordance addendum (`addendum-manifest-affordance/`): the manifest is a
  disclosure, and a row is a ruled line led by a dot pending and a ✓ read.*
- Targets: 46px note field desktop / 48px phone; the manifest's ONLY target is `Log a game →`, at
  44px phone / 38px desktop (its read rows are not targets: 32px desktop / 36px phone, amended
  2026-09-28); **32px apply and
  dismiss on desktop, 44px on phone**; 56px action row in all six states; 44px phone primaries.
  Apply is never adjacent to a destructive control.
- **R2 density pass (suggestion card only).** Four rows at 9px padding, 22×31 thumbnails, no column
  headings, no rule above the rationale, no type line on the cut, rationale 12.5px at 1.5, chips
  9.5px. The floors held: 12.5px body ink and 9.5px mono are already this product's smallest, no
  tap target shrank on phone, and no evidence moved behind a tap — the phone card carries a shorter
  first clause from the model rather than a truncated rationale. **That last point is a new ask on
  the model's output** and is the only thing R2 adds to the engineering list: a suggestion returns a
  short rationale as well as a full one, and both obey the counting rules.
- Focus: global `:focus-visible`, 2px brass at +2px, not overridden. Pressing the primary keeps
  focus on it as it becomes `Reading…` in place; on results, focus moves to the panel heading —
  which is exactly why the heading never changes rank.
