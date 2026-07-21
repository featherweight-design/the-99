# Handoff: The 99 — Visual Richness Pass (issue #51)

## Overview
A system pass that adds character on top of the locked brand base (Palette A · Table
Candlelight, Cinzel + IBM Plex, brass accent, crown motif). Nothing in the base is
re-opened. Hi-fi reference: `The 99 - Richness Pass.dc.html` (project root).

## The one big idea: the crab
The 99 has a mascot — a small, plain crab who is the **calm, competent, slightly snarky
adult in the room** (Bob Belcher energy) amid colossal chaos. The joke and the metaphor
are the same thing: the crab is tiny and unbothered; the *kaiju* beside it is the sprawl
the app tames — a 1,200-card collection, a 100-card pile that isn't a deck yet.
The crab is the Kitchen Table voice with a face.

- **Crab construction** (`crab.svg`): brass line-art on the base tone. Wide rounded
  carapace, eyes sitting on top with deadpan half-lids, flat mouth, two big folded
  pincers in front, three segmented legs per side. Stroke #C9A24B 3px on 160×110 viewBox;
  shell fill = surface token #1E1A15.
- **Kaiju construction** (`kaiju.svg`): chubby monster-movie silhouette — round-bellied,
  smug half-lid eye, small teeth, tiny arm, wavy dorsal fins filled with a soft brass
  glow (rgba(201,162,75,0.16)), a tiny brass diamond on the tail (crown nod). Body fill
  #0B0907 with a 2px brass rim at 0.30 alpha. No neon, no tech palette — shadow + brass
  + candle glow only. Faces LEFT; compose it looming from the right, gazing down at the crab.
- **Register split:** crab = line-art, human-scale, calm. Kaiju = large silhouette,
  reserved for rare wins and the biggest chaos so the reveal stays special.
- Originated in-house; channels colossal-monster *register* only — reproduce no WotC art.

## Where character lives (surface map)
Working surfaces stay quiet; the crab earns the quiet moments so the big beats land.
- **Empty states + first-run** — crab is the host. Small crab + straight-faced quip.
- **Loading / waiting** — crab + three brass dots. Primary home for motion.
- **Celebrations / big beats** — deck finished, big import landed: crab stays tiny; the
  kaiju looms behind. Scale-reveal reserved for rare wins.
- **Non-safety-critical errors** — crab may appear; copy gets the wink. Destructive or
  data-loss warnings stay straight — no crab, no jokes.

## Density
- **Browsing surfaces loosen** (primary): deck view, commander recs, collection browse.
- Light global loosening allowed where it doesn't hurt scanning.
- **Working surfaces stay tight**: import review, issue inspector, in-place editing.

## Animation posture
North star: **breathe, not chaos** (a little chaos welcome — he is fighting monsters).
- Motion concentrates on the crab, loading, celebrations. Gentle hover life on browse.
- Reference keyframes in the DC: bob 4.5s, glow pulse, breathe 9-10s, dots 1.2s.
- Respect `prefers-reduced-motion`; app fully usable static.

## Texture — a whisper of material
- Candle-glow radial vignettes + warm light pooling behind hero/celebration moments.
- Barely-there grain on large empty areas only. Never on dense data surfaces.

## Contrast & engagement (named constraint — not a palette re-open)
Palette hues stay locked. This pass must audit text/UI contrast and lift small text
below WCAG AA (e.g. the shell's dimmed nav/locked-state #6A6152 fails on #1A160F — lift
to the faint token #8E8269 minimum). "Fun" comes from character and motion, not louder color.

## Voice snapshot (locked — verbatim)
Voice: Kitchen Table — friend-at-the-table energy, Discord × kitchen-table Magic. Uniform
across chrome and data UI (words carry personality even where visuals stay quiet).
Reference density: expressive moments (empty states, first-run, celebrations,
non-safety-critical errors) get the wink treatment; utility copy stays straight. Banned
patterns: corporate-service-speak, motivational drift, fake urgency, SaaS onboarding
phrasing.

## Locked — do not re-open
- Palette base (Palette A · Table Candlelight), Cinzel + IBM Plex, brass accent, crown motif.
- Voice (above).

## Merges into
The existing surface property tables (appshell, collection, commanders, decks) as new
baseline — merge changes, don't replace wholesale.

## Files (all in this folder — open the .dc.html files directly in a browser)
- `crab.svg` / `kaiju.svg` — canonical marks (rebuild as components; keep geometry).
- `The 99 - Richness Pass.dc.html` — hi-fi system reference (crab, kaiju, moments, dials).
- `The 99 - App Shell v2.dc.html` — the pass applied to the shell: home warmth, first-run
  crab, global loading + 404 (both new states), contrast lifts.
- `The 99 - Surfaces v2.dc.html` — the per-surface moments: Collection no-results,
  Commanders filtered-to-zero (+ degraded-stays-straight counter-example), Decks builder
  empty + the 99/99 kaiju completion reveal, plus each surface's density deltas.
