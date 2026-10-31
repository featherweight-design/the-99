# Brief: Hide a commander from recommendations

**For:** Claude Design. **Prompt:** to be written by the orchestrator from this brief.
**Source:** a friend with many Edge of Eternities cards does not want those commanders suggested to them.
**Existing handoffs to extend:** `design/design_handoff_the99_commanders/` and `design/design_handoff_the99_commander_row/`
(the For you list and its row), `design/design_handoff_the99_commanders_discover/` (Discover),
`design/design_handoff_the99_help_me_choose/` (Help me choose), `design/design_handoff_the99_card_search/` (how a reader
reaches a commander), `design/design_handoff_the99_public_pages/` (the public commander page, for reference only).
Where a shipped component and a handoff disagree, the component wins.

## Hugh's ruling (2026-10-31), which binds every screen here

1. **A hidden commander stays hidden until the player undoes it.** A Hidden list lets the player restore any of them.
2. **Hidden from three surfaces:** the Commanders recommendations (For you), Discover, and Help me choose. Help me choose
   excludes silently: it never says a commander was left out.
3. **The commander's own page still opens from search** and shows that the commander is hidden, with an Unhide.
4. **Same reason Home's recommended commanders were pulled:** players curate the list. A hidden commander is the
   player's own call, not a quality verdict from the app.

## What exists today

**The three recommending surfaces** all live in the Commanders place (`docs/agents/commanders-place.md`):
- **For you**, `/commanders` (`src/app/commanders/(list)/page.tsx`): ranked by `loadCommanderRankings`
  (`src/lib/commanders/rankings.ts`) from `commander_scores`. Rows are `CommanderRow`
  (`src/components/commanders/commander-row.tsx`).
- **Discover**, `/commanders/discover`: `loadDiscoveryPayload` (`src/lib/discovery/payload.ts`), shown by
  `discovery-view.tsx`.
- **Help me choose**, `/commanders/choose`: the intake form and its read and results (`src/lib/intake/`).
- `CommanderRow` is also drawn in the change-commander sheet and the seat picker, which are not recommendations and are
  out of scope unless Design says otherwise.
- Home no longer shows recommended commanders (its Ready to build band was removed because its job is For you's).

**The commander's own page.** `/commanders/[slug]` (`src/app/commanders/[slug]/page.tsx`, `components/commanders/detail.tsx`)
is per-reader and reached from rows and from card search. The public `/commander/[slug]` page is separate and not
per-reader. Hiding is per account and must never leak onto the public page.

**Precedents, none of which fit exactly.**
- The Home feed's dismiss (X) hides an item "for good" with no undo and no restore list (`feed_dismissals`,
  `docs/agents/social.md`).
- Undo removal (Put back, `design/design_handoff_the99_undo_removal/`) restores a deck card inside a Review until it is
  committed. It is not a preference.
- `decks.hidden_from_friends` is a per-deck toggle in the deck's menu; Settings holds the global friend-deck
  preferences. There is no Hidden or Dismissed list anywhere in the app today, and no such section in Settings.

## The situations to design for

1. **Reading For you or Discover**, the reader sees a commander they never want and wants it gone now, in place.
2. **Changed their mind**: the reader wants to see what they hid and bring one back.
3. **Reaching a hidden commander by search or a link**: the page opens, says it is hidden, and offers Unhide.
4. **A hidden commander is the reader's only good match**: the lists simply have fewer rows. No "N hidden" nag on
   Help me choose.

## Every state to draw

For both widths (390 and desktop):
1. The control on a row in For you, at rest and pressed.
2. The control on a row in Discover.
3. Confirmation or undo straight after hiding: the row leaves, and the reader can take it back.
4. The Hidden list with several commanders, each with an Unhide.
5. The Hidden list when empty.
6. Unhiding from the list, and the row's return to the lists (it may not return to the same rank).
7. The commander's own page when hidden, with Unhide, reached from search.
8. The commander's own page when not hidden: where the Hide control lives, if it lives there too.
9. Help me choose with hidden commanders: nothing different is drawn (state the rule, show the unchanged screen).
10. A reader who has hidden a commander that is partner or one of a pair: how the pair reads.
11. The Commanders list when hiding leaves it short or empty.
12. Failure to save the hide or the unhide.

## Open calls for Design

1. **The control.** On the row, on the row's menu, a swipe on the phone, or on the commander's page only. It must not
   crowd the row (`design/design_handoff_the99_commander_row/` governs the row) and must be reachable on touch.
2. **Where Hidden lives.** Candidates: a tab or entry in the Commanders place, a section in Settings next to the friend
   decks section, or the Me page. Design chooses and says how a reader finds it before they have hidden anything.
3. **Confirmation and undo.** An inline undo toast, an undo row in place of the hidden row, no confirmation at all (the
   Hidden list is the safety net), or a confirm step. Design picks and justifies against the "hidden until undone"
   rule.
4. **Hide from the commander's page.** Whether the page also offers Hide when the commander is not hidden.
5. **Name.** "Hide", "Not interested" or another word. `/copy-review` settles wording after Design proposes.
6. **Pairs and partners.** Whether hiding one half hides the pair or the commander as a card.

## Not in scope

- Any change to ranking, scoring or what gets recommended.
- Hiding cards, decks or friends.
- The public `/commander/[slug]` page.
- A hide that expires, or a count shown on Help me choose.
- A model call, or a credit.
- An About entry: Hugh decides at launch.

## What eng builds before the handoff lands

Backend only, behind a new switch off in production once Hugh approves one: a per-account hidden-commanders store,
the filter in the three loaders (all three read it in the same statement as the list), and the hide and unhide actions.
The UI waits on this handoff.
