# Design table: Find a deck for it, with a read (R2)

Mobile = 390. Desktop = 900, from `md` up (the dialog is `md:w-[820px] md:h-[620px]`, as shipped). Tokens only; no new tokens, no new dependency. Mono = `--font-mono`. Display = the theme’s `--display`.

## Geometry

| Property | Mobile | Desktop |
|---|---|---|
| Where the view lives | the card sheet itself, from 0; art band and details unmounted from view (kept mounted, `inert`, scroll kept) | the right pane of the dialog (498 wide); the 322 art column stays |
| Enter / leave | details out −16px x + fade, view in from +16px + fade, 180ms `cubic-bezier(.2,.7,.2,1)`; leave reverses in 160ms; reduced motion: no motion | same |
| View head | padding 12 16 14; border-bottom `--border` | padding 22 22 16 30 |
| Head row (R2) | title left, `← {card}` right, one row, min-h 44 | same |
| Back pill `← {card}` (R2) | in the ✕’s slot, top-right; h44, radius 999, `--elevated`, 1px `--border-strong`, 12.5/600 `--fg`; max-w 200, name truncates | h36, max-w 260 |
| ✕ (R2) | none in the view | none in the view |
| Title | display 19 / 1.2 | display 22 / 1.2 |
| Identity · copies | mono 10.5 `--fg-muted`; copies `--fg-body`, `--fg-muted` at none free | same |
| Body | padding 16 16 28, gap 16 | padding 18 30 30, gap 16; scrolls; 56px fade to `--surface-rail` at the foot |
| Footer / Prev·Next | hidden in the view | hidden in the view |
| Band (offer, failed) | radius 10, `--surface`, 1px `--border`, padding 14 16, gap 11 | same |
| Band (running) | 1px `--accent`; 7px `--accent` dot | same |
| Press | filled `--accent`, ink `--bg`, h44, full width, radius 8, 13/600; segment after a 1px rule (`--bg` 35%), mono 11 `◆ 1 credit` | h38, auto width |
| Press, spent / paused | 50% opacity, disabled, segment dropped | same |
| Read again / Try again | outline `--accent`, same segment, rule `--accent` | same |
| Standing line | mono 10.5 `--fg-faint` | same |
| Skeleton rows | 3, `--surface-sunken`, bars `--elevated` 10 / `--surface-raised` 8, still (no shimmer) | same |
| Result head | 14/600 `--fg` + mono 10.5 `--fg-faint`, baseline row, wraps | same |
| Row | radius 9, `--surface-sunken`, 1px `--border` (`--accent` when swapped), padding 12, gap 9 | padding 12 14 |
| Row: deck | 13.5/600 `--fg`, underline `--border-strong`, opens the deck | same |
| Row: commander · plan source | mono 10.5 `--fg-faint` | same |
| Row: sentence | 13 / 1.6 `--fg-body`, `text-wrap: pretty`; card marks `--fg` + 1px dotted `--accent`, open the card (stacked) | same |
| Row: cut line | rule `--border` above, padding-top 8; CUT mono 9.5 / 0.12em `--fg-locked`; card 12.5/600 mark; note mono 10.5 `--fg-faint`; wraps | same |
| Row: actions (R2) | the row’s foot, 2-col grid 1:1, gap 8, h44, radius 8, 13 | the row’s foot, flex gap 8, h32, radius 7, 12.5; the add note fills the rest of the line, 12 `--fg-muted` |
| Add only (R2) | quiet outline 1px `--border-strong`, `--fg-body` 500 · pressed: filled `--fg-body`, ink `--bg`, 600 · off: `--fg-locked` 60% | same |
| Add note (R2) | own line under the actions, 12 / 1.45 `--fg-muted` | inline after the buttons |
| Row: plan source (addendum) | last segment of the commander line, mono 10.5 `--fg-faint` | same |
| Row: source note (addendum) | older / none only: 12 / 1.5 `--fg-muted`, then the link 12 `--accent`, underline `--accent-shadow`, nowrap; wraps as a pair, gap 4 8; between the cut line and the actions | same |
| Row: new overview (addendum) | tag `new overview` in the changed-row pill; source note hidden | same |
| No fit, kept (R2) | the no-fit box; at 0.72 under a P6c note | same |
| Credits link (R2) | after the standing line, ` · ` then `What uses credits?` `--accent`, underline `--accent-shadow` | same |
| Swap in states | outline `--accent` · to buy: outline `--border-strong`, `--fg-muted`, 500 · swapped: filled `--accent`, ink `--bg` · off: `--fg-locked`, 60% | same |
| Changed row | opacity 0.72; tag mono 9.5 uppercase `--fg-muted`, 1px dashed `--border-dashed`, pill | same |
| Thin / stale notes | 1px dashed `--border-dashed`, radius 9–10 | same |
| Fold row | min-h 44, rules `--border` top (and bottom when shut); 13 `--fg-body`, count mono 11 `--fg-muted`, ▸ / ▾ 10 | min-h 38 |
| Free list | today’s `FitsRows` / `FitsHolds`, unchanged | same |

## Every string (placeholders, owed to /copy-review)

New, in `findADeckReadCopy` (to land as `swapToolsCopy.fits.read`):

| Key | String |
|---|---|
| press | “Which deck needs it most?” |
| pressAria | “Which deck needs {card} most? Uses 1 credit.” |
| pressAriaSpent | “Which deck needs it most? No credits left.” |
| credit | “1 credit” (after the drawn ◆) |
| offerLead | “A closer read of the {n} decks that can take {card}: the few it really helps, how it helps each one in that deck’s own cards, and what it would replace.” |
| offerLeadOne | “A closer read of {deck}, the one deck that can take {card}: how it would help, in that deck’s own cards, and what it would replace.” |
| running | “Reading {n} decks for {card}” · one: “Reading one deck for {card}” |
| runningSub | “each deck’s plan and list, against the card’s text” (+ “ · {elapsed}”) |
| runningKeep | “The list below stays as it is. You can leave this view; the read keeps going and waits here.” |
| announceStarted | “Reading your decks.” |
| doorReading | “reading your decks…” |
| resultHead | “Where it helps most” |
| resultSubNow | “read just now · {shown} of {n} decks” |
| resultSubNowOne | “read just now · the one deck” |
| resultSubStored | “read {when} · {shown} of {n} decks” |
| resultSubStale | “read {when} · out of date” |
| resultFootSpent | “Used a credit” (+ “ · {standing}”) |
| resultFootStored | “Free to reopen while your decks stay as they are.” |
| onlyOne | “{deck} is the only deck that can take {card}” |
| cutLabel | “cut” (drawn uppercase) |
| cutNote | “goes out when you swap it in” |
| cutNoteSwapped | “out of the draft · press Swapped in to put it back” |
| cutNoteChanged | “this deck has changed, so the cut may not hold” |
| swapIn | “Swap in” |
| swapInToBuy | “Swap in to buy” |
| swapped | “Swapped in” |
| swapInAria | “Swap {card} into {deck}, cutting {cut}” |
| swappedAria | “{card} is in {deck} and {cut} is out. Press to put {cut} back.” |
| swapRefused | “We couldn’t make that swap. The deck is unchanged.” |
| undoRefused | “We couldn’t undo that swap. The deck is unchanged.” |
| announceReady | “The read found {n} decks.” · one: “The read found one deck.” |
| announceSwapped | “Swapped. {card} is in the draft and {cut} is out.” |
| announceUndone | “Swap undone. {cut} is back and {card} is out.” |
| thin | “Only one deck held up, so the credit came back.” · “Only {kept} decks held up, so the credit came back.” |
| thinSub | “The other decks it named didn’t check out against their lists” (+ “ · {standing}”) |
| noFitHead | “None of these decks is a real fit” |
| noFitBody | “The read went through the {n} decks that can take {card} and found none whose plan it really helps. The credit came back.” |
| noFitBodyOne | “The read went through {deck}, the one deck that can take {card}, and found it isn’t a real fit. The credit came back.” |
| announceNoFit | “No real fit. The credit came back.” |
| failedTag | “Didn’t finish” (FailMark aria-label) |
| failedHead | “The read didn’t come back” |
| failedBody | “The credit came back, and the list below is as it was. It isn’t something you did.” |
| retry | “Try again” |
| announceFailed | “The read didn’t come back. The credit came back.” |
| staleOne | “{deck} has changed since this read on {when}, so the read may not hold any more.” |
| staleMany | “{n} of your decks have changed since this read on {when}, so the read may not hold any more.” |
| staleSet | “Your decks that can take this card aren’t the same ones as at this read on {when}, so the read may not hold any more.” |
| changedTag | “changed since” |
| readAgain | “Read again” |
| again | “Replaces this read and uses a credit. {standing}.” |
| fold | “Every deck that could take it” |
| addOnly (R2) | “Add only” · to buy: “Add only, to buy” |
| added (R2) | “Added” · to buy: “Added, to buy” |
| addOnlyAria (R2) | “Add {card} to {deck} without cutting anything” |
| addedAria (R2) | “{card} is in the {deck} draft, with nothing cut. Press to take it out.” |
| addedNote (R2) | “In the draft, which is now at 100. Cut a card of your choice from {deck}.” |
| cutNoteAdded (R2) | “still in · cut it or anything else” |
| noFitBodyStored (R2) | “The read went through the {n} decks that can take {card} and found none whose plan it really helps.” |
| noFitFootNow (R2) | “read just now · kept until your decks change, so there’s nothing to press again” |
| noFitFootStored (R2) | “read {when} · kept until your decks change” |
| noFitChanged (R2) | “{deck} has changed since this read on {when}, so it’s worth asking again.” |
| creditsLink (R2) | “What uses credits?” (links to About `credits`) |
| planFrom.v2 (addendum) | “from its overview” |
| planFrom.older (addendum) | “from an older overview” |
| planFrom.none (addendum) | “from commander and themes” |
| srcNoteOlder (addendum) | “Read from an overview written the older way.” |
| srcLinkOlder (addendum) | “Update it on the deck page →” |
| srcNoteNone (addendum) | “No overview yet, so this read went on {commander} and the deck’s top themes.” |
| srcLinkNone (addendum) | “Write one on the deck page →” |
| staleOverview (addendum) | “{deck} has a new overview since this read on {when}. Read again to use it.” |
| changedTagOverview (addendum) | “new overview” |
| foldAria | “Show every deck that could take it, {n}” · “Hide every deck that could take it, {n}” |

Changed in `creditsCopy` (R2, Hugh’s decision, app-wide: link, never list):

| Key | String |
|---|---|
| spent | “{left} of {total} left · reset at {time}” + “ · ” + creditsLink |
| pausedReason | “The app has reached its monthly limit for credits. Nothing you did caused this.” + “ · ” + creditsLink |

Reused verbatim: `swapToolsCopy.fits.pickerTitle` “Find a deck for it”, `callout` “Find a deck for it”, `identity` “{colors} · legal in Commander”, `copies` “×{owned} · {free} free” / “×{owned} · none free”, `groupJoin` “could take it”, `orderReasons` “combos first, then themes”, `groupHolds` “already holds it”, `addUsesFree` “Add”, `addToBuy` “Add to buy”, `reasonTheme`, `needLabel` “this deck”, `need`, `allHold`, `noneByColors(One)`; `swapToolsCopy.sheet.backToCardAria` “Back to {card}”; `creditsCopy.standing` “{left} of {total} left · reset at {time}”, `paused`, `ownerShare`.

Retired inside the view (switch on): the stacked `ModalChrome` at 560 and the phone sheet from 96 for this picker, and `FitsPlate` (the head carries the card and its copies). `FitsPlate` stays exported for the About figure E1.
