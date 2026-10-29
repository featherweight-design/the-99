# Brief: About pages, Hugh's feedback after the build (R4)

**For:** Claude Design, as R4 of `design/design_handoff_the99_about_visual/` (an addendum folder inside it on approval,
per the two-account sync rules). **Source:** Hugh's feedback in the project chat, 2026-10-29, on the shipped pages
(About visual PRs 3 to 6a, and Small items 2's "N more below", #2355).
**Shipped code to draw over:** `src/components/about/pages/` (`labelled-screen.tsx`, `try-it.tsx`, `rule-card.tsx`,
`area-page.tsx`) and `src/components/about/tools/tool-card.tsx`. Where a shipped component and a board disagree, the
component wins; draw over it, at 390 and 1300, from fresh captures (`pnpm capture:about`).

## Already handled by engineering (no board needed)

Two of Hugh's seven points were engineering defects and ship in the PR that carries this brief:

- **A tapped number on a phone seemed to do nothing.** The region lit, but its words sit under a capture taller than
  the screen. A pin press now also scrolls its line into view, as little as it takes (`reveal`, `nearest`, a jump
  under reduced motion).
- **Some highlight boxes were cut off.** A region on the capture's edge drew its ring outside the frame, which clips
  it. The lit box now sits 8px inside the frame, so the whole ring shows. If Hugh meant a region measured too tight
  around its control instead, name the label and engineering re-measures it.

## What Design owes (five calls)

### 1 · The numbered pins cover what they describe

Today (call 1, G6) a pin's centre sits 14px inside its region's top-left corner, so on small regions (a button, a tab)
the 24px disc sits on the very control it names. **Ask:** place the pin so it never covers its region. Options to
weigh: on the region's corner, outside it (needs a rule for regions on the picture's edge, where outside is off the
picture); a gutter round the capture that pins live in, with a short leader; or a pin on the lit halo's edge. Keep: five
pins a picture, reading-order numbers, the 28px crowding gap, numbers matching the list.

### 2 · The Try it heading looks like a button

The heading's mark is an accent ring with an arrow, the same shape as each tool card's press (the "→" disc in the
card's footer), so it reads as a control. **Ask:** a heading mark that cannot be mistaken for a press, in the same family
as Good to know's diamond kicker. No control in the heading.

### 3 · The tool card has no clear way in

Hugh: between **Show me ›** and the card's own "See your decks on Stats →" press it is unclear what to click; the
cropped picture reads as clickable; the picture and the words describing it bleed together. Today the whole card is the
press (Try it), Show me is a second link in the footer that lights the tool's label on this page, and the crop runs
edge to edge into the body. **Ask:** one obvious primary action per card, Show me clearly subordinate (or moved off the
card, if the label it lights is better reached another way), and a picture framed apart from the text (a border, an
inset, a caption line, a background change), so the crop reads as an illustration rather than the app itself. Draw the
lit card (a Show me landing) too.

### 4 · Good to know and Try it blend together

Each screen block is the labelled screen, then Good to know, then Try it, and the two headings share one treatment
(R3: a ruled line, Cinzel 18, a mark, a muted sub-line), so the sections run into each other and into the next screen.
**Ask:** make each section recognisable at a glance and the boundary between screens unmistakable, on a phone and on
desktop. Room to move: a container or surface change per section, a stronger screen header, spacing between screens
larger than spacing within one. Keep the order and the On this page chips' targets.

### 5 · "N more below" is too quiet on a phone

Today it is 10px mono in faint ink under the first card, so readers miss that more tools exist. **Ask:** a control a
reader cannot miss, still one control (it opens the rest in place, Show fewer folds them back, as Small items 2 ruled).
Ideas: a full-width secondary button with the count, or a peek of the next card's edge. Keep the 44px hit box.

## Constraints

- Hugh's standing design rules apply (draw over the shipped pages, one control per action, no board cut off, never a
  broken image).
- Every string is a draft for `/copy-review`; no em-dashes in copy.
- Both widths, and a light and a dark theme, on every board where the change shows.
- Out of scope: the six pages' content, the labels' and rules' text, the index, the banner and the ? landings.
