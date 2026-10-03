# Readiness audit: desktop nav labels (H3)

**Verdict: 🟠 Orange, on one question.** R2 is buildable everywhere it is drawn. One state it
creates is not drawn: the 88px touch rail on a touch screen that is wide enough for the rail but
short, which includes most phones held in landscape. The touch rail's column no longer fits there, and
what gives is a layout call. Everything else below is engineering's to settle, and the decisions
are written out so the build does not wait on them.

This audit was run against `origin/main` at `812be6006` (#1158). It reads the handoff as R2, the
README's "R2 (current)" section and the canvas's H2, T2, F3, F4 and E2. Where R1's sections
disagree with R2, R2 governs (finding E3).

## Rulings (Hugh, 2026-10-02)

1. **B1 goes to Design.** The verdict stays 🟠 Orange until Design answers the prompt at the foot
   of this audit.
2. **About entry: none.** The change is cosmetic, like card captions: no new entry and no
   `ABOUT_VERSION` bump. The About item below is resolved.
3. **The engineering-resolvable list (E1 to E12) is ratified as proposed.**

## Does it answer the brief

| Brief requirement | Where the handoff answers it |
|---|---|
| Every destination nameable on desktop | Pointer: H2 and T2 (a drawn label on hover and focus). Touch: R1's S1 (labels printed). |
| Pick a shape and say why | Canvas intro and README R2: Hugh's shape 2 for a pointer, R1's labelled rail for touch, so pointer layouts keep their width. |
| If on hover: delay, placement, following | T2 (400ms open, 0ms follow, 300ms grace, 100ms close) and H2 `place` (rail edge + 8, centred on the slot). |
| The native `title` tooltip must not also show | H2 `a11y` and E2: `title` goes, `aria-label` stays. |
| Focus reveals the same label | T2 `focus`: `:focus-visible` opens it at once; a mouse click's focus does not. |
| Touch-capable desktops | README and E2: `(hover: none)` gets R1's 88px rail. |
| Active, pending and locked states kept | H2's four cells and S1. Locked: E2 gives a locked slot no label on the pointer rail; L1 and the lock specs cover the touch rail. |
| A locked label must not read as an invitation | Pointer: no label at all. Touch: `--fg-locked`, no fill, inside the sunken well (lock specs, "no invitation"). |
| Same five words, nothing new | H2 `text` and R1 `label`: the words from `ITEMS`. |
| Phone tab bar out of scope | E2 `Phone`: untouched. |

Nothing the brief asks for is missing. The canvas still carries R1's argument against shape 2
(D1 `1b`: "you still have to point at an icon to learn what it is... it's the same finding"),
and R2 now ships that shape for every pointer. That is a choice Hugh made available in the brief,
not a defect, but it is the trade he is approving: on a mouse, the name is one hover away, not on
screen.

## What checks out

- **Where it lives.** `ITEMS` (`nav.tsx:39-45`), `NavSlot` with `title={name}` and
  `aria-label={name}` (`nav.tsx:443-455`), `NavRail` at `w-[62px]` (`nav.tsx:470`), live slots at
  38 × 38, radius 10, 4px apart (`nav.tsx:489`, `:501`), `pipBottom={2}` on the rail and `1` on the
  tab bar (`nav.tsx:498`, `:546`), and the active and pending fills (`nav.tsx:502-504`) are all as
  the handoff describes them.
- **The lock.** `RailLock` draws a 48px well, radius 12, padding 4/9, with 38px slots in
  `--fg-locked` and no fill (`nav.tsx:225`, `:248`). Locked slots are buttons, not `NavSlot`s, so
  "locked slots never report to the label" needs nothing taken out of `NavSlot`. Their accessible
  name is `"Collection, locked"` (`refresh.ts:256`) and they carry no `title` today
  (`nav.test.tsx:429`). The note opens on pointer enter, focus or click (`nav.tsx:243-245`) and is
  placed by `railPlace` at the rail's measured right edge + 12 (`nav.tsx:189-193`), so L1's "moves
  with the rail, no code change" holds.
- **Layer.** The aside is `sticky z-30` and its comment puts the tab bar, the menu backdrop and the
  modals at 40 or above (`nav.tsx:463-470`). The lock note is `fixed z-10` inside it
  (`nav.tsx:263`). A label built "like the lock note" lands at the same rank. `sticky` does not
  make a containing block for `fixed`, so the label is placed against the viewport, as
  `railPlace` already assumes.
- **Tokens.** `--tabbar-h: 74px` sits on `html` in `globals.css:495`, with the "geometry, not
  theme" note the handoff asks `--rail-w` to repeat. The focus ring is the global 2px `--accent`
  outline at 2px offset (`globals.css:572-575`). Reduced motion is a per-class list
  (`globals.css:784`), and the pip already has its own step rule there (`globals.css:822-823`).
- **The pip.** `PendingPip` is centred with `left-1/2 -translate-x-1/2` (`pending-pip.tsx:20`).
  The handoff's "H5, drawn centred here" is consistent with the code. Engineering measured it
  centred in Chromium and WebKit at 1300 and 390 and could not reproduce H5, so the handoff's
  framing of H5 as an open bug is not a fact about the code; nothing here needs building for it.
- **No page subtracts the rail.** `main` is a `flex-1` sibling of the rail (`shell.tsx:59-62`).
  A sweep of `src/` finds no `62`, `calc()` or width literal standing for the rail, and the only
  JS that reads the rail's box is `railPlace`, which measures it. `pending-overlay.tsx:32-39`
  measures `main` rather than assuming a rail width. So a `--rail-w` switched by media query
  agrees with every reader, and the "column arithmetic" the commanders, decks and deck-page
  handoffs do in prose has no counterpart in code to repoint (but see E6).
- **Breakpoints.** 1180 is Home's split (`dashboard.tsx:130`, `:157`; `resume-decks.tsx:364`).
  1000 is the resume rows' inset (`resume-decks.tsx:167`) and `CHASSIS_WIDE_MIN_PX`
  (`filter-chassis.tsx:171`). Both are viewport queries, as W1 says.

## Arithmetic, recomputed

- **Label width.** IBM Plex Mono advances 0.6em, so a 9px glyph is 5.4px, plus 0.54px of tracking.
  "Commanders" and "Collection" are 10 glyphs: 10 × 5.94 = 59.4px. (72 − 59.4) / 2 = 6.3px
  either side. Both hold. (The tab bar's own comment at `nav.tsx:553-558` says 10.4px of air in a
  74.8px slot, which is the figure without tracking; with it, 7.7px. Comment only.)
- **Rail width.** Preflight makes the aside border-box, so 62 includes the 1px border and the 38px
  slot has 11.5px either side. 72 + 2 × 7.5 + 1 = 88. Holds. The 2px ring at 2px offset needs 4px
  and gets 7.5.
- **Content column.** 1300 − 62 = 1238, − 88 = 1212. 768 − 62 = 706, − 88 = 680. Hold.
- **Home.** At 1300, 1238 − 52 padding − 316 − 20 gap = 850, and 824 on touch; hero cards
  (850 − 14) / 2 = 418, and 405. At 1180, 730 and 704; heroes 358 and 345. At 768, one column with
  16px padding: 674 and 648; heroes 330 and 317. All match W1, F1 and F2.
- **F2's nav column.** 14 + 39 + 20 = 73 to the first slot, then 5 × 52 + 4 × 4 = 276: 349. Holds.
- **The tag.** "About 96px" for "Commanders" at Plex Sans 12.5/500 plus 20px of padding and a
  2px border: plausible, not measured.
- **The 262px filter column** (W1's one check, 444 → 418) is arithmetically right and describes a
  column that no longer exists: `decks-view.tsx` mounts the shared `FilterChassis`, which "returns
  its 262px to the deck grid" (`deck-filters.test.tsx:6-8`, `decks-view.test.tsx:206-209`). The
  check is moot.

## Blocking (needs Design)

**B1. The touch rail on a short touch screen.** `md` is the default 768px and the rail is
`h-screen sticky` with no overflow handling (`nav.tsx:470`). Most current phones held in landscape are
wider than 768 (844 to 932) and report `(hover: none)`, so R2 gives them the 88px rail. Summed from the classes
(not measured): the unlocked rail is 14 + 39 + 20 + 276 + 30 (account) + 14 = **393px** tall
against today's 323, and the locked rail, with R1's 72 × 52 slots in an 80px well, about
**447px** against today's ~377. A landscape phone's visible height is about 390px or less (not
measured on a device). When the column overflows, `mt-auto` resolves to 0 and the account control
falls below the fold of a sticky element, where no scroll reaches it. The canvas draws widths
(768, 1300) and never a height, and K1's reflow row covers zoom only. What the touch rail does
when its column does not fit is a layout decision.

## Engineering-resolvable (ratified as proposed, Hugh 2026-10-02)

- **E1. Keyboard activation closes the label.** T2 closes on `pointerdown`, which Enter on a
  focused link never fires, so a label opened by focus stays up through the navigation and over
  the page that lands. It would also sit under the loading fallback, which is `fixed z-[35]`
  against the rail's 30 (`pending-overlay.tsx:62`). Decision: close on the link's `click` (which
  covers pointer and Enter) and on a pathname change, as well as `pointerdown`. This is T2's own
  reason ("the label doesn't sit over a page that's about to change") applied to the keyboard.
- **E2. One rail popover at a time in first run.** A lock note does not close when the pointer
  leaves its slot (`nav.tsx:206-210`, deliberately, for WCAG 1.4.13). So hovering Collection, then
  Home, leaves the note open and opens Home's label 400ms later. By the slot positions the note's
  top edge and the label's foot meet within about a pixel. H2 says "only one ever shows" and E2
  cites D1's collision as the reason locked slots get none. Decision: the label does not open
  while a lock note is open. The note keeps priority, because it carries Go to step 1; the label
  works again once the note closes by Escape, an outside press or blur.
- **E3. R2 governs accessibility.** R1's E1 ("drop the `name` prop and with it `title=` and
  `aria-label=`") and K1 ("live slots drop aria-label... the visible label becomes the name")
  contradict R2's E2 ("aria-label stays and title goes"; the touch label span is "aria-hidden either
  way"). Decision: R2. Both rails keep `aria-label`, the touch rail's visible span is `aria-hidden`,
  and the name is heard once. Label-in-name holds because the two strings are identical.
  `nav.test.tsx:67-68` asserts `title` on every rail link and flips to asserting none.
- **E4. `pipBottom` cannot switch by media query.** It is an inline `style={{ bottom }}`
  (`pending-pip.tsx:21`), and E2 wants 2 on the pointer rail and 1 on the touch rail. Decision:
  a class (`bottom-[2px] [@media(hover:none)]:bottom-[1px]`) or a CSS variable set by the slot;
  the tab bar keeps its 1.
- **E5. Touch-rail classes go on the rail's slot only.** `NavSlot` is shared with the tab bar
  (`nav.tsx:535-563`), and every phone is `(hover: none)`. The `[@media(hover:none)]` variants
  belong in `NavRail`'s `className`, never in `NavSlot`'s base, or they would land on the tab bar
  too. Removing `title` from `NavSlot` is harmless there: the tab bar already passes
  `name={undefined}`.
- **E6. Two viewport thresholds were measured against a 62px rail.** W1's "breakpoints hold" is
  true of the query, not of what fits beside it on touch, where `main` is 26px narrower at the same
  viewport:
  - Home's 1180 split. `resume-decks.tsx:342-350` derives it as "~706 for a pair... 1106px of
    viewport", a sum that leaves the nav rail out entirely; with it, the need is ~1168 on a pointer
    and ~1194 on touch. At 1180 on touch each resume row gets (704 − 12) / 2 = 346px against the
    ~347 the comment says a row needs before its stamp clips. That is inside the comment's own
    approximations, so it is a measurement, not a known failure.
  - `CHASSIS_WIDE_MIN_PX = 1000`, "measured" as where the control row stops fitting
    (`filter-chassis.tsx:155-171`). Row 1 never wraps and search is its only shrinking child
    (`filter-chassis.tsx:260-264`). On touch at 1000–1026 that row is 26px narrower than it was
    when the threshold was measured.

  Decision: walk both under emulated `(hover: none)` at 1180–1200 and 1000–1030 (`probe:home` for
  the stamp). If either fails, move that threshold under `(hover: none)`; both are measured
  numbers, not drawn ones. F1's "nothing wraps or truncates that didn't before" is the claim being
  checked.
- **E7. Hybrid input.** A touch laptop reports `(hover: hover)` and gets the pointer rail, as E2
  intends, but a tap fires `pointerenter` too. Decision: the label listens to `pointerType` mouse
  and pen only, and `pointerdown` cancels a pending open timer as well as closing an open label.
  The iPad-with-trackpad reflow claim is not verified.
- **E8. Mounting.** Read `(hover: hover)` through `useSyncExternalStore` with a `false` server
  snapshot, as `use-min-width.ts:26-29` does, and subscribe, so a change of primary input mounts or
  unmounts the label. The width is pure CSS, so there is no hydration shift.
- **E9. Escape.** Follow `useLockNotes`'s rule (`nav.tsx:142-147`): act only when focus is on a
  rail slot or nowhere, and respect `defaultPrevented`, so the label never takes a key a dialog
  owns.
- **E10. Reduced motion.** The 100ms fade's class joins the per-class list at `globals.css:784`.
  The 400ms open delay is a timer, not motion, and stays.
- **E11. A press on the tag.** The tag is hoverable (T2 `leave`) and sits over page content.
  `pointerdown` on it closes it and does nothing else, as T2 says; it is not a second link.
- **E12. Probing `(hover: none)`.** jsdom applies no media queries, so the touch rail's visible
  label and the pointer rail's hidden one are the same DOM in a unit test; assert classes there,
  and walk the rail in a browser with `(hover: none)` emulated. Which Playwright setting emulates
  it (`isMobile` in Chromium is the likely one) is not verified.

## Copy

No new strings. The rail's labels are `ITEMS`' five words, the locked foot is the existing
`Locked` (`refresh.ts:265`), and the note is unchanged. Nothing goes to /copy-review. The ITEMS
comment E2 asks to rewrite is a code comment.

## Notes

- **N1.** The README's main body is still R1's case against a hover label ("The call: a third
  shape"). Read it as describing the touch rail only, as R2's header says.
- **N2.** T2 says the 100ms close "covers the 8px gap". The pointer's path from a slot to the tag
  is 11.5px of rail plus the 8px gap. 100ms still covers it.
- **N3.** The open delay is 400ms; the card hover preview opens at 240ms. They are different
  objects, so no change, but it is two hover delays in the app.

## About entry (resolved: none owed, Hugh 2026-10-02)

The handoff draws none. My read is that this is **cosmetic**: it names five destinations every
account already uses and adds nothing the app can do, the same class as card captions (ruled to
owe no entry, 2026-09-15). No existing entry covers the nav rail, so there is nothing to edit
either. Hugh ruled on 2026-10-02 that it owes no entry and no version bump.

## Phone

Untouched. The rail is `hidden md:flex` (`nav.tsx:470`) and the tab bar `md:hidden`
(`nav.tsx:576`). `--rail-w` is new and does not touch `--tabbar-h`. E5 is the one place the build
could reach the tab bar by accident.

## Prompt for Design

**Context.** R2 of the desktop nav labels is audited and buildable everywhere it is drawn
(`design/design_handoff_the99_desktop_nav_labels/READINESS-audit.md`). One state is not drawn.

**What to change.** Draw the touch rail (`(hover: none)`, 88px) on a viewport that is at least
768px wide but short. Most phones held in landscape are one (about 844 to 932 wide, about 390 or
less tall). Summed from today's classes, the 88px rail's column is 393px tall unlocked and about
447px in first run, against 323 and 377 today. The rail is a sticky, full-height column with the
account control pinned to its foot; when the column overflows, that control falls below the fold
and nothing scrolls it back.

**Constraints.** The account control must stay reachable. No new copy. The phone tab bar stays as
it is. The pointer rail is not involved. No About entry is owed: Hugh ruled the change cosmetic, so
draw none.

**Questions.**
1. Below what height does the touch rail change, and into what? For example: the labels stay and
   the slots tighten; the labels drop and today's 62px rail returns; or the nav column scrolls
   between the mark and the account control.
2. Does the first-run well follow the same rule, or does it need its own?

**Deliverables.** One section on the existing canvas drawing the touch rail at 852 × 393, unlocked
and in first run, with the height threshold stated.

**Out of scope.** Everything else in R2, which stands as written; the engineering decisions in
this audit; H5.
