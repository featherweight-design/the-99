# Design Brief — One commander image

**Workshop:** 2026-09-11, Hugh + agent. No ticket — scoped from a direct request. This brief is the
source of truth the Claude Design handoff prompt points at.

**Verified against `origin/main` at `a461112` on 2026-09-11.** Every `file:line` below was read on
that commit, not recalled.

Hugh's words: *"right now we render the 'commander' image differently in several places and it
doesn't look uniform."* He is right, and the count is thirteen renders across eleven surfaces.

**This inventory was built by sweeping every `url(...)` and `cssUrl(...)` background across
`src/components` and `src/app`, not by listing `ArtWash`'s consumers and not by matching a
particular variable name.** Three passes were needed to get here and each failure is worth knowing:
enumerating `ArtWash` consumers cannot by construction see a surface that draws commander art
*without* the wash, and a follow-up sweep keyed on `commanderImageUri`/`c.imageUri` still missed the
pre-filled create flow, which names the same value bare as `imageUri`.

Two surfaces are deliberately excluded because they draw *a card*, not *a commander*: the collection
grid (`collection/grid-view.tsx:60`), which tiles everything you own, and the decklist hover preview
(`decks/hover-preview.tsx:172`), which previews whichever row is under the cursor.

---

## §1 Every surface that draws a commander image

`ArtWash` (`src/components/ui/art-wash.tsx:254`) offers two strategies, and the surfaces split
across them almost evenly:

| Surface | File | Strategy | Treatment today |
|---|---|---|---|
| Home hero | `home/hero-commander.tsx:56` | `cover` | Large cover band |
| Commander detail — **mobile** | `commanders/detail.tsx:241` | `cover` | Art header band, inside `sm:hidden` (`:236`) |
| Commander detail — **desktop** | `commanders/detail.tsx:458-475` | **neither** | A full 63/88 card image from `c.imageUri`, in a sticky column — no wash, its own shadow |
| Deck card | `decks/deck-card.tsx:151` | `cover` | Cover band |
| Deck spine — **mobile** | `decks/spine-mobile.tsx:122` | `cover` | Cover band |
| Deck spine — **desktop** | `decks/spine-desktop.tsx:114` | `left-portrait` | Portrait band |
| Commander rec card | `commanders/rec-card.tsx:145` | `left-portrait` | Band at a hard `height: 148` |
| Discovery row | `commanders/discovery-row.tsx:347` | `left-portrait` | Row-height band |
| Home resume row | `home/resume-decks.tsx:97` | `left-portrait` | Portrait at the band's own height |
| Home deck rail | `home/deck-rail.tsx:131` | **neither** | A `36×26` span carrying its own background, inside a `min-h-[56px]` touch row (`:115`). Phone only — desktop draws no art at all |
| Deck create picker | `decks/create-picker.tsx:524` | **neither** | A `34×48` thumb on mobile, `40×56` on desktop, with an inset hairline and the shared gradient fallback |
| Pre-filled create — **mobile** | `decks/create-pre-filled.tsx:138` | **neither** | A `58×81` thumb inside an `md:hidden` block (`:129`) |
| Pre-filled create — **desktop** | `decks/create-pre-filled.tsx:167` | **neither** | A `220px` 63/88 card with a drop shadow, inside `hidden md:block` (`:162`) |

**Five of the thirteen renders draw no wash at all** — the deck rail's phone spine, the create
picker's thumb, both halves of the pre-filled create flow, and the commander detail page's desktop
column, which renders a full card face rather than a cropped band. All five are in scope: the
complaint is that a commander's image looks different from place to place, and these are five of the
places. **Both deck-creation entry points are among them**, which means the surface where a player
first commits to a commander is currently the least designed. The picker's thumb and the rail's span
are the two smallest images in the app, the useful low end for §3.1.

**The deck spine renders a different strategy on each breakpoint** — `cover` on mobile,
`left-portrait` on desktop. One surface, two treatments, decided by viewport. That is the single
clearest instance of the problem this brief exists to fix, and it is not the only one: the home hero
covers while the home resume row beside it portraits, and commander detail switches between a washed
band and a bare card face across the same breakpoint.

The wash itself is already parameterised for most of what is being asked: `LabelEdge` is
`"top" | "bottom"` (`art-wash.tsx:227-248`), and `bottomScrimStops(labelAt)` (`:55`) ramps from
wherever the label block starts. The system can express the target; the surfaces just do not agree
on what to ask it for.

---

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
   at `top: 14, right: 16` (`detail.tsx:253-256`), and deck cards carry an overflow control. The
   locked decision is the principle — a local plate per control, chosen over leaving glyphs
   unprotected and over a lighter scrim, because a plate is local and a scrim taxes the whole crop.
   **Design must enumerate every element at the top edge of every surface in §1 and say what carries
   each one**, or the scrim's removal is not fully specified. Unplated pips over a pale crop is the
   same bug the scrim existed to prevent.
7. **Redundant information comes out; necessary information condenses.** More art means less room for
   chrome, and the surfaces currently repeat themselves — the resume row, the rail and the deck card
   each state deck status in their own shape.

## §3 What Design is being asked to call — open

- **§3.1 The height, and whether one number serves all thirteen renders.** A single fixed height across a
  home hero, a 36px rail span, a 34px picker thumb and a 220px 63/88 card face is unlikely. Design should name the smallest set of sizes that still
  reads as one treatment, and say what governs which surface gets which.
- **§3.2 The label block at the bottom edge, per surface.** What survives the condense at each size:
  which surfaces state the deck's status, which state a count, which state only a name.
- **§3.3 The deck rail's desktop gap.** `deck-rail.tsx:95` records that the desktop frame draws
  neither art nor a count. Under "render these things consistently" that is now an anomaly. Design
  calls whether desktop gains the art or the rail changes shape.
- **§3.4 The plate's size and weight** against a 0.8-opacity cover crop (`COVER_ART_OPACITY`,
  `art-wash.tsx:69`), in all six themes. **Two different plates exist today and they are not
  interchangeable**: `OVER_ART_PLATE` (`art-wash.tsx:79`) is `72` — a percentage of `--bg` measured
  for the `⛶ Card details` pill and verified across all six themes in `src/lib/theme/wash-contrast.test.ts` (`:188` asserts `THEMES.size === 6`), consumed
  only by `commanders/full-card-trigger.tsx`. The deck overflow button is a different treatment
  entirely: a 26px `rounded-[7px]` square on desktop with an opaque `var(--bg)` and a
  `--border-strong` hairline (`decks/deck-card-overflow.tsx:96-104`, its own decision 3). Design
  calls whether these converge or stay distinct, and names which one each top-edge element uses.

- **§3.5 Whether both strategies survive.** `cover` and `left-portrait` are two answers to one
  question, and the deck spine currently picks between them by breakpoint. Design calls whether the
  app keeps both (and says which surface earns which, on grounds other than viewport), or converges
  on one.
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
the thirteen renders above. It is briefed **after** this lands so it draws the new treatment rather than
the one being replaced.
