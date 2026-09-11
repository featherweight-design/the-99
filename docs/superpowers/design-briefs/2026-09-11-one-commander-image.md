# Design Brief — One commander image

**Workshop:** 2026-09-11, Hugh + agent. No ticket — scoped from a direct request. This brief is the
source of truth the Claude Design handoff prompt points at.

**Verified against `origin/main` at `a461112` on 2026-09-11.** Every `file:line` below was read on
that commit, not recalled.

Hugh's words: *"right now we render the 'commander' image differently in several places and it
doesn't look uniform."* He is right, and the count is **fifteen renders across twelve files**.

**The unit is a render, not a surface.** Earlier drafts counted "surfaces" and could not keep the
number stable, because a route, a component and a breakpoint variant are three different things and
this brief needs the one Design actually draws: a distinct image box in the code, with its own size
and treatment. Two renders in one file at two breakpoints are two rows here. Where the pipeline
status or a downstream brief cites a total, it cites this one.

---

## §1 Every render of a commander's image

| # | Render | Strategy | Treatment today |
|---|---|---|---|
| 1 | `home/hero-commander.tsx:58` | `cover` | Large cover band |
| 2 | `home/resume-decks.tsx:99` | `left-portrait` | Portrait at the band's own height |
| 3 | `home/deck-rail.tsx:131` | **none** | A `26×36` span (w×h, `:127`) with its own background, inside a `min-h-[56px]` touch row (`:115`). Phone only — desktop draws no art |
| 4 | `commanders/detail.tsx:249` | `cover` | Art header band, inside `sm:hidden` (`:236`) |
| 5 | `commanders/detail.tsx:469` | **none** | A full 63/88 card face from `c.imageUri` in a sticky desktop column, with its own drop shadow |
| 6 | `commanders/discovery-row.tsx:349` | `left-portrait` | Row-height band |
| 7 | `commanders/rec-card.tsx:147` | `left-portrait` | Band at a hard `height: 148` |
| 8 | `decks/deck-card.tsx:153` | `cover` | Cover band |
| 9 | `decks/spine-mobile.tsx:128` | `cover` | Cover band |
| 10 | `decks/spine-desktop.tsx:116` | `left-portrait` | Portrait band |
| 11 | `decks/create-picker.tsx:524` | **none** | Candidate row thumb, `34×48` mobile / `40×56` desktop |
| 12 | `decks/create-picker.tsx:644` | **none** | Selected-summary art, `44×62` |
| 13 | `decks/create-pre-filled.tsx:138` | **none** | `58×81` thumb inside `md:hidden` (`:129`) |
| 14 | `decks/create-pre-filled.tsx:167` | **none** | `220px` 63/88 card with a drop shadow, inside `hidden md:block` (`:162`) |
| 15 | `decks/partner-slot.tsx:96` | **none** | The partner commander, `center top/cover` over `--elevated` |

**How this list was built, and the four ways we first got it wrong.** It is a case-insensitive
sweep of every `url(...)` and `cssUrl(...)` background over `src/components` and `src/app`, filtered
by hand to the ones showing a *commander* rather than an arbitrary card. The failures are recorded
because each was a plausible method: enumerating `ArtWash`'s consumers cannot by construction see a
render that draws commander art *without* the wash; keying on `c.imageUri` missed the pre-filled
create flow, which names the value bare; a case-sensitive sweep for `imageUri` missed
`deck-rail.tsx`, whose field is `commanderImageUri`; and every pass before this one missed renders that are not
the first in their file — there are three such files, holding rows 4–5, 11–12 and 13–14.

**Excluded deliberately** — these draw *a card*, not *a commander*: `collection/grid-view.tsx:60`,
`decks/hover-preview.tsx:172`, `decks/deck-card-tile.tsx:159`, `decks/suggestion-tile.tsx:251`,
`decks/card-search-row.tsx:115`, `cards/card-modal.tsx:1026`, `cards/printing-region.tsx:459`.
`ui/art-wash.tsx` is the shared primitive the table's strategies refer to, not a render of its own.

**Seven of the fifteen draw no wash at all** — nearly half. They are rows 3, 5, 11, 12, 13, 14 and
15, and the pattern in that list is the finding: **every deck-creation surface is among them.** The
picker's candidate thumb, the picker's selected summary, both halves of the pre-filled flow and the
partner slot are the screens where a player chooses and commits to a commander, and not one of them
has been through the wash system at all. Commander detail's desktop column and the deck rail's phone
span are the other two.

**The deck spine renders a different strategy on each breakpoint** — `cover` at row 9,
`left-portrait` at row 10. These are two components, `SpineMobile` and `SpineDesktop`, both mounted
unconditionally by `builder-spine.tsx:252-253` and separated by CSS, so the amendment has to land in
both files rather than in one branch. That is the single
clearest instance of the problem this brief exists to fix, and it is not the only one. Home stacks a
`cover` hero directly above a `left-portrait` resume row in the same column — `HeroCommander` renders
inside `ReadyToBuild`, and `dashboard.tsx:111-115` places `ResumeDecks` beneath it — so the two
treatments meet vertically, with nothing between them to explain why they differ. Commander detail
switches between a washed band and a bare card face across a single breakpoint.

## §2 Decisions locked in the workshop

1. **One treatment, every surface.** Not commander cards alone. The inconsistency is the complaint.
2. **Text moves to the bottom edge.** `labelEdge: "bottom"` becomes the app's answer.
3. **The image box gets taller everywhere**, deck tiles explicitly included — Hugh: *"the deck tiles
   specifically can go taller, we have the room."*
4. **Design picks a fixed height**, the way `rec-card.tsx:143` names 148 today. Not an aspect ratio,
   not a desktop-only lift.
5. **The top scrim goes.** `COVER_SCRIM_STOPS.top` (`art-wash.tsx:26`) exists to protect ink drawn
   over art at the top edge.
6. **Everything still standing at the top edge plates itself.** The workshop discussed the menu
   button, but it is not the only tenant up there: commander detail draws `IdentityPips` absolutely
   at `top: 14, right: 16` (`detail.tsx:253-256`), deck cards carry an overflow control, and
   `spine-mobile.tsx:133` mounts a `FullCardTrigger` at `top: 13, right: 16`. The
   locked decision is the principle — a local plate per control, chosen over leaving glyphs
   unprotected and over a lighter scrim, because a plate is local and a scrim taxes the whole crop.
   **Design must enumerate every element at the top edge of every surface in §1 and say what carries
   each one**, or the scrim's removal is not fully specified. Unplated pips over a pale crop is the
   same bug the scrim existed to prevent.
7. **Redundant information comes out; necessary information condenses.** More art means less room for
   chrome, and the surfaces currently repeat themselves — the resume row, the rail and the deck card
   each state deck status in their own shape.

## §3 What Design is being asked to call — open

- **§3.1 The height, and whether one number serves all fifteen renders.** A single fixed height across a
  home hero, a 26px-wide rail span, a 34px picker thumb and a 220px 63/88 card face is unlikely. Design should name the smallest set of sizes that still
  reads as one treatment, and say what governs which surface gets which.
- **§3.2 The label block at the bottom edge, per surface.** What survives the condense at each size:
  which surfaces state the deck's status, which state a count, which state only a name.
- **§3.3 The deck rail's desktop gap.** `deck-rail.tsx:95` records that the desktop frame draws
  neither art nor a count. Under "render these things consistently" that is now an anomaly. Design
  calls whether desktop gains the art or the rail changes shape.
- **§3.4 The plate's size and weight** against a 0.8-opacity cover crop (`COVER_ART_OPACITY`,
  `art-wash.tsx:69`), in all six themes. **Two different plates exist today and they are not
  interchangeable**: `OVER_ART_PLATE` (`art-wash.tsx:79`) is `72` — a percentage of `--bg` measured
  for the `⛶ Card details` pill and verified across all six themes in `src/lib/theme/wash-contrast.test.ts` (`:189` asserts `THEMES.size === 6`, under a test named at `:188`), **and not consumed at runtime**: `full-card-trigger.tsx:61` hard-codes the matching `72%`
  into a Tailwind class because an interpolated class cannot compile, and the constant exists so the
  tests can hold the two in step. Changing the constant does not change the UI. The deck overflow button is a different treatment
  entirely: a 26px `rounded-[7px]` square on desktop with an opaque `var(--bg)` and a
  `--border-strong` hairline (`decks/deck-card-overflow.tsx:96-104`, its own decision 3). Design
  calls whether these converge or stay distinct, and names which one each top-edge element uses.

- **§3.5 Whether both strategies survive.** `cover` and `left-portrait` are two answers to one
  question, and the deck spine currently picks between them by breakpoint. Design calls whether the
  app keeps both (and says which render earns which, on grounds other than viewport), or converges
  on one.
  **This does not reopen decision 1.** "One treatment" means one visual language — where the text
  sits, how tall the box is, how the top edge is protected, what the scrim does — and those rules
  hold whichever strategy a render uses. `cover` and `left-portrait` are crops, not treatments. What
  decision 1 forbids is two renders answering the same question differently for no stated reason,
  which is exactly what rows 9 and 10 do today.
---

## §4 Constraint — this reopens shipped rulings, deliberately

The scrim stops in `art-wash.tsx` are not arbitrary; they are the residue of several audited rounds
(R6 ruling 1 and decision 3 are both cited in the file's own comments, `:85` and `:91`). The top
scrim's removal and the bottom ramp's new `labelAt` are **amendments to ratified property tables**,
not fresh drawings on a blank surface.

Design should treat `design/design_handoff_the99_art_wash/` and
`design/design_handoff_the99_deck_details_wash/` as the tables being amended, and state the
amendments explicitly so the audit can check them one by one rather than re-deriving the whole wash.

---

## §5 Dependency — the home handoff waits on this one

The home redesign (Group D of the same workshop: "Pick up where you left off" reshaped to 3–4 decks,
the Your Decks rail removed, a stats block added on both frames) renders commander images in three of
the fifteen renders above. It is briefed **after** this lands so it draws the new treatment rather than
the one being replaced.
