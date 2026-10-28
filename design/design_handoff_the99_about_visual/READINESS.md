# Readiness — About as six visual pages

**Verdict: Green.** R3 approved by Hugh on 2026-10-28. He ruled that the two missing screenshots are engineering's to
take during development. No open item blocks the build, and every open item already has a drawn default.

## For Hugh

1. **Copy.** Every label, rule and page string is still a draft and needs `/copy-review`. All of them are in
   `copy-strings.ts`, written to the voice rules in `docs/superpowers/about-visual/walk-rulings-2026-10-27.md`.
2. **Launch rule.** Stays discretionary, as you ruled in the workshop.

## For engineering

1. **Captures (G1, G2).** Every section needs a capture at 390x844 and one at 1300x900, in all six themes, and each
   capture must hold every one of its section's label regions. When one capture cannot hold them all, take a second
   shot of the same screen; the boards show this on the phone deck top, Analysis Tuning and Home, and on the desktop
   deck top and list, Describe and the precon Versions. Desktop captures also need a tool-card crop for each tool.
   `capture:about` shoots 390 only today. Two regions had no data on the audit account, so the boards flag them:
   phone Analysis "What is in this deck", which needs a stored analysis, and desktop Friends "Rule 0 check", which
   needs a pod. The capture fixtures must create both. The audit account's About was marked seen during the design
   captures (`about_version_seen` 16).
2. **Anchors (G3).** Each label names a region, through `data-about-region` or today's locator in
   `about-locators.mjs`, and the region is measured per capture into `shots.generated.ts`. A label that is visible
   but has no box fails readiness.
3. **Pins (G6).** A pin is a 24px accent disc placed 14px inside its region's top-left corner. Numbers run in reading
   order across a screen's shots. A picture holds five pins at most; past that, the screen gets another shot. When two
   pins sit closer than 28px, the later one slides right along its region's top edge. Two regions that overlap fully
   are one label.
4. **The picture matches the device.** A phone reader sees phone captures and a desktop reader sees desktop captures,
   never the other width. That covers the tool card pictures, the index tiles and the banner crop. Each desktop
   section is three blocks in this order: the labelled screen with its labels beside it, Good to know as a grid of
   three, then Try it.
5. **Seen and launches (G4).** The unit that gets announced becomes the label or the rule (audit option B), each with
   its switch and `since`. Legacy seen ids are translated so nobody is told about something twice.
6. **Tool cards (G5).** "How it works ›" becomes "Show me ›", aimed at a label id. The press on the card is still
   Try it. Before that, the cut entry ids that the showcase hangs on need new targets.
7. **The ?** opens its area's page scrolled to its screen, with a "‹ Back to {screen}" bar held at the top. The ?
   panel and its search retire.
8. **States.** When a feature is off for the reader, its label disappears entirely (pin, line and rule card) and the
   remaining numbers close up; nothing is greyed out. While a capture loads, the frame keeps the capture's known size
   and shows a quiet skeleton with no pins. A screen with no rules gets no Good to know heading.

## Not drawn

Light themes beyond the dark reference. The boards draw one theme, and the captures for the other five follow G2.
