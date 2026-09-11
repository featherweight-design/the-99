# Design Brief — One commander image

**Workshop:** 2026-09-11, Hugh + agent. No ticket — scoped from a direct request. This brief is the
source of truth the Claude Design handoff prompt points at.

**Verified against `origin/main` at `a461112` on 2026-09-11.** Every `file:line` below was read on
that commit, not recalled.

Hugh's words: *"right now we render the 'commander' image differently in several places and it
doesn't look uniform."* He is right, and the count is nine.

---

## §1 Every surface that draws a commander image

`ArtWash` (`src/components/ui/art-wash.tsx:254`) offers two strategies, and the surfaces split
across them almost evenly:

| Surface | File | Strategy | Treatment today |
|---|---|---|---|
| Home hero | `home/hero-commander.tsx:56` | `cover` | Large cover band |
| Commander detail | `commanders/detail.tsx:241` | `cover` | Page hero |
| Deck card | `decks/deck-card.tsx:151` | `cover` | Cover band |
| Deck spine — **mobile** | `decks/spine-mobile.tsx:122` | `cover` | Cover band |
| Deck spine — **desktop** | `decks/spine-desktop.tsx:114` | `left-portrait` | Portrait band |
| Commander rec card | `commanders/rec-card.tsx:145` | `left-portrait` | Band at a hard `height: 148` |
| Discovery row | `commanders/discovery-row.tsx:347` | `left-portrait` | Row-height band |
| Home resume row | `home/resume-decks.tsx:97` | `left-portrait` | Portrait at the band's own height |
| Home deck rail | `home/deck-rail.tsx:122` | **neither** | Draws its own 56px background, phone only; desktop draws no art at all |

**The deck spine renders a different strategy on each breakpoint** — `cover` on mobile,
`left-portrait` on desktop. One surface, two treatments, decided by viewport. That is the single
clearest instance of the problem this brief exists to fix, and it is not the only one: the home hero
covers while the home resume row beside it portraits.

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
   over art at the top edge. With text at the bottom, the only thing left up there is the menu
   button.
6. **The menu button gets its own plate.** `OVER_ART_PLATE` (`art-wash.tsx:79`) is the existing
   pattern — a grounded disc behind the glyph. This was chosen over leaving the glyph unprotected and
   over a lighter scrim, because a plate is local and a scrim taxes the whole crop.
7. **Redundant information comes out; necessary information condenses.** More art means less room for
   chrome, and the surfaces currently repeat themselves — the resume row, the rail and the deck card
   each state deck status in their own shape.

## §3 What Design is being asked to call — open

- **§3.1 The height, and whether one number serves all nine.** A single fixed height across a home
  hero and a 56px rail spine is unlikely. Design should name the smallest set of sizes that still
  reads as one treatment, and say what governs which surface gets which.
- **§3.2 The label block at the bottom edge, per surface.** What survives the condense at each size:
  which surfaces state the deck's status, which state a count, which state only a name.
- **§3.3 The deck rail's desktop gap.** `deck-rail.tsx:95` records that the desktop frame draws
  neither art nor a count. Under "render these things consistently" that is now an anomaly. Design
  calls whether desktop gains the art or the rail changes shape.
- **§3.5 Whether both strategies survive.** `cover` and `left-portrait` are two answers to one
  question, and the deck spine currently picks between them by breakpoint. Design calls whether the
  app keeps both (and says which surface earns which, on grounds other than viewport), or converges
  on one.
- **§3.4 The plate's size and weight** against a 0.8-opacity cover crop (`COVER_ART_OPACITY`,
  `art-wash.tsx:69`), in all six themes.

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
the nine surfaces above. It is briefed **after** this lands so it draws the new treatment rather than
the one being replaced.
