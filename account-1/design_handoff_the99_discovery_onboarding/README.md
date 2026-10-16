# The 99: Discovery and onboarding · R1, the moments (design handoff)

`design_handoff_the99_discovery_onboarding/` · 2026-10-16 · account 1 · mirrors `design_handoff_the99_upcoming_precons/`

**Status: R1, for Hugh's audit.** Source of truth: `docs/superpowers/design-briefs/2026-10-16-discovery-and-onboarding.md`
(main, #1914). R1 is the brief's round 1: the quiet form of a moment, all 16 moments placed over their shipped screens at
1280 and 390, the collision rule, and the Friends Home card. R2 (the showcase and the "?" reference) and R3 (the tour, and
the tools where the need is) follow the brief's split.

Canvas: `The 99 - Discovery R1 · Moments` (Design artifact, account 1). Files: `Main.dc.html` (the calls), `Deck-Page`,
`Deck-Rows`, `Card-Details`, `Games`, `Pages`, `Home-Friends`, `States`, and the parts every board mounts (`Moment`,
`Rail`, `MobileHeader`, `TabBar`, `DeckDesk`/`DeckPhone`, `CardDesk`/`CardPhone`, `GamesDesk`/`GamesPhone`,
`PageDesk`/`PagePhone`, `HomeDesk`/`HomePhone`). Kaldheim throughout.

## Brief locks, held

| Lock | How R1 holds it |
|---|---|
| 1. Five layers, in this order | R1 is layer 1 alone. Nothing here draws the showcase, the reference, the tour or a new entry point. |
| 2. The 16 moments, triggers and tools | Each is drawn as the table has it. No moment is added, merged or re-triggered. Two anchors needed a call because the tool has no control on the moment's screen (G1, G2); the trigger and the screen are unchanged. |
| 3. Own data, first time, one per visit, dismissed is gone | Spent once shown, whatever closed it. One per visit, across every screen. S1 draws the dismissed state. |
| 4. Follows its tool's switch | Off for that reader: no control, no moment, nothing recorded (S2). |
| 5. Per account, storage is engineering's | READINESS E1. |
| 6. Spotlights in the tour only; quiet; no stacked cards | No dim, no overlay, no spotlight. The bubble is a top-layer popover and moves nothing. The one card is the Friends Home card the brief itself names. |
| 7. Showcase uses real screenshots | Not this round (R2). |
| 8. About entries stay; the banner is the channel | No About change. On Home the banner wins the visit (Q2). |
| 9. Tour | Not this round (R3). |
| 10. Friends gets two moments | M11 after the first logged game; M16 the Home card once a deck exists. |
| Credit tools never pressed | Every anchor is a door (a tab, a tile's shortcut, a door button). No moment's control is a run press. |
| Copy goes to /copy-review | Every moment line and the Friends card's title and line are placeholders in `discovery · copy strings.ts`. |
| Deck page: nothing added | M1–M4 point at controls the page already draws; the halo is a shadow. |

## The calls

### Q1 · The quiet form (§Open 1)

**A small bubble anchored to the control that opens the tool.** The brief's likely shape, kept.

- **Shape.** Up to 300px wide at desktop. At 390 it is the screen's width less 16px a side, at most 358.
  - Surface: `--elevated`, 1px `--border-strong`, radius 10, shadow `0 12 30` at 45%.
  - Leads with a 6px `--accent` diamond. The tool's name is in `--fg` semibold and the line in `--fg-body`, 13px (13.5 at 390) / 1.45, wrapping to three lines at most.
  - Ends with a bare ✕, 28px (a 44px hit at 390), named `Dismiss`.
  - A 10px nib points at the control's centre.
  - It is the FactTooltip and InfoTip surface with the account menu's diamond, so it reads as part of the app.
- **The halo.** The control gets `0 0 0 2px accent/60%, 0 0 0 6px accent/16%` for as long as the bubble shows. It is a box shadow, so nothing moves. The halo is decoration.
- **Layer and placement.** A top-layer popover, absolute in page coordinates: it scrolls with the page, and is never in the flow and never fixed.
  - It sits below the control, 8px from it. It flips above when below would leave the viewport or cross the phone's tab bar.
  - It is clamped 16px from the screen's edges, with the nib kept on the control.
  - It never covers its own control.
  - A rail slot has no room below, so there it sits to the right with a left nib (M12).
- **Arrival.** It arrives the first time the condition holds and the control is on screen, once the page has settled plus 600ms.
  - It never arrives while anything is open over the page: a sheet, dialog, menu, toast, or the Home banner on Home. A control inside the open sheet or dialog is the exception (M8, M9).
  - A control below the fold waits for the player to scroll to it on that visit.
  - Motion: a fade and a 4px rise over 200ms on `--motion-ease-out`. Under reduced motion, the fade only.
- **What a tap does.** The text is not a button. **The control is the action:** pressing it opens the tool as it always does, and the bubble goes.
  - ✕ closes it. So do Esc, a press elsewhere, scrolling the control out of view, and leaving the page.
  - There is no "Show me" beside the control it would press (Hugh's rule: one control per action).
- **Leaving.** A 140ms fade (`--motion-exit-quick`), instant under reduced motion.
- **Spent.** Spent once it has been on screen, however it closed. It never returns.
- **Screen readers.** A labelled, non-modal note. While it shows, the control's `aria-describedby` points at it. It is spoken once through a polite live region. Focus never moves; ✕ follows the control in tab order.

### Q2 · Which moment wins (§Open 2)

**The first moment whose control comes on screen takes the visit. When two controls are on screen on the same load, a fixed order decides.**

- **A visit** is one app session: from opening The 99 until it has been left for 30 minutes. That allows one moment across every screen (G4).
- **The loser waits.** It isn't spent; it fires on a later visit when its condition still holds. A one-visit trigger carries forward: Suggested changes' "first open at 100" becomes the first visit at 100 that a moment is free to use. Mana Balance then takes a visit after that one, so the two still never share.
- **Fixed order for ties.** This is the order a deck is made:
  1. Precons
  2. Help me choose
  3. Top off
  4. Proposed cuts
  5. Suggested changes
  6. Mana Balance
  7. Card assignments
  8. Cheaper stand-ins
  9. Friends' spares
  10. Find a deck
  11. Wishlist
  12. Collection Sync
  13. Lineup
  14. Matchups
  15. Friends (after a game)
  16. Friends on Home
- **Why not the newest condition, or the cheaper tool first.** "Newest" needs a timestamp per condition that the data doesn't keep. "Cheaper first" still ties between two free tools. A fixed order is one list and can be tested.
- **Home.** The banner wins Home. The Friends card waits for a load without it (M16b).
- **The brief's case is S3.** At 99 / 99 with a row over the limit, the Analysis tab is on screen on load, so Suggested changes takes the visit. Cheaper stand-ins waits for a later visit.

### Q8 · The Friends Home card (§Open 8)

- **Where it sits.** Under Commitments in Home's 316 right column at desktop. Last at 390, after Commitments.
- **Shape.** It is a Home card: radius 14, `--surface-inset`, `--border`, with the mono section label `FRIENDS`.
  - **The table.** Its top is a small table: a dashed oval with your seat filled by your Friends commander's art, and three dashed empty seats. This is Social R1's pod table: art is a player's face, dashed is "not yet". With no commander set, your seat shows your initials, as the account button does.
  - **The words.** A title and one line, both placeholders for `/copy-review`.
  - **The press and the ✕.** One press, `Add a friend` (the /friends page's own word), opens /friends. A ✕ in the corner ends the card for good.
- **When it shows.** Once a deck exists, with `SOCIAL_FRIENDS_ENABLED` on, and never to a player who has a friend. It doesn't show while the banner is up.

## Where each moment points

| # | Moment | Control | Placement |
|---|---|---|---|
| M1 | Top off | `Choose the last 12 ↓` (the strip's door) | below; at 390, full width under the 44px door |
| M2 | Suggested changes | the Analysis tab | below the tab |
| M3 | Proposed cuts | `Proposed cuts →` under the over count | below; at 390 it has its own 44px line |
| M4 | Mana Balance | `balance mana →` in the Lands cell (`balance →` at 390) | below, right-clamped |
| M5 | Cheaper stand-ins | the over row's ⇄ press | above the row, right-clamped |
| M6 | Friends' spares | the row's other-ways press holding the spare glyph | above the row, right-clamped |
| M7 | Card assignments | the row's availability marker (`none free`; the glyph and count at 390) | below, right-clamped |
| M8 | Find a deck | `◇◇ Find a deck for it →` | below the door, clear of the Mana Pool link above |
| M9 | Wishlist | `Add to wishlist` | below |
| M10 | Matchups | the `Split by` switch | below |
| M11 | Friends, after a game | the account button: the rail foot at 1280, the header corner at 390 | above at 1280, below at 390 |
| M12 | Help me choose | Discover in the rail (1280) or the tab bar (390) | right of the slot with a left nib; above the tab bar |
| M13 | Lineup | the `Stats` segment | below |
| M14 | Precons | `Browse precons →` | below |
| M15 | Collection Sync | the `Sync my collection` card | below at 1280; above the card at 390, clear of the foot |
| M16 | Friends, on Home | the card itself | right column / last |

## About

No entry and no `ABOUT_VERSION` bump. This follows the brief: a moment is the introduction itself, and the line changes how About is reached rather than adding a feature.

## Gaps for Hugh and the plan

- **G1 · Help me choose has no control on /commanders.** Its doors are on /discover's result line and on /decks/new. The moment still fires on /commanders as locked, and points at Discover in the rail and the tab bar. Alternative for R3 (tools where the need is): add a Help me choose door to /commanders' guided banner, where a player with no decks already stands, and point M12 at it. Hugh's call.
- **G2 · The tuning tools live on the Analysis tab.**
  - M2 points at the tab. M3 and M4 point at the page's existing shortcuts into the hub.
  - M4 assumes the Lands cell draws `balance mana →` whenever the hub is on. Where a strip doesn't, M4 falls back to the Analysis tab.
  - With the Tuning hub off, the tools mount on the Analysis tab directly. The anchors are the same.
- **G3 · Card assignments has no About entry, and no chooser on the deck page.** The chooser lives on the import summary, `/decks/[id]/changes` and the I got it receipt. The moment explains the marker and says where the choice is made. Whether it gets an entry is Hugh's call (brief note).
- **G4 · A visit is 30 minutes away.** A constant, not a lock.
- **G5 · "On screen" for spent.** Proposed: the bubble has been visible for at least 1 second. A bubble torn down by an instant navigation is then not spent.
- **G6 · Find a deck's door shows more widely than the moment.** The door is drawn for any commander-legal card when the player has decks. M8 fires only for an owned card in no deck, as locked.
- **G7 · Friends card words.** The title and line are placeholders. `Add a friend` is shipped copy.
- **G8 · Copy.** Every moment line is a placeholder for `/copy-review`. Each is drawn from the tool's own About entry or shipped strings, so it promises nothing the tool doesn't do. The brief's two quoted lines are kept as their lead-ins:
  - M11: "Playing with friends? Add them"
  - M14: "Start from a precon you own"
- **G9 · Phone rows.** Drawn as shipped today: one 34px line at every width (AGENTS.md, 2026-10-16). Older phone frames in `card_rows/addendum-one-line` still show the retired two-line rows.

- **G10 · Folder name.** The brief names `design/design_handoff_the99_discovery/`, but that folder is the shipped Commander discovery handoff
  (2026-09-06, #293–#327). This round is `design_handoff_the99_discovery_onboarding/` so the two never mix. Rename on approval if Hugh
  prefers another name.

## Not done this round

- R2: the showcase, "Try it on your deck", About's new shape, the per-screen "?", search.
- R3: the tour, its spotlight and theme step, each empty state and nudge.
- Amonkhet and the other four themes aren't reviewed. The bubble uses only tokens every theme declares.
