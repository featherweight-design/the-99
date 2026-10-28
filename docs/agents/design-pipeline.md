# Design pipeline (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **A launch gets an About label only at Hugh's discretion.** Ruled in the About visual workshop,
  2026-10-27 (ruling 6, `docs/superpowers/about-visual/workshop-2026-10-27.md`). About is six visual
  pages, one per area, each screen a labelled real capture with Good to know rules and Try it tool
  cards (`design/design_handoff_the99_about_visual/`).
  - **A launch Hugh picks** adds one label to its screen's section and re-takes that screen's
    capture (`pnpm capture:about`). It adds a Good to know rule only for a rule the screen cannot
    show.
  - **A cosmetic change** only re-takes the capture. It owes no label.
  - **Hugh decides** which launches get a label. A plan names the label as a task when he has
    picked one, and says nothing when he has not; the close-out checks only what the plan named.
  - **A label follows its feature's switch**, so it never reaches production before the feature
    does. The banner announces a label once, when a reader can first see it.

  **Why it changed.** The rule it replaces, "No FEATURE launches without an About entry, in the
  same round that ships it", plus the 2026-09-21 rule that a multi-round line batches its entries
  into one `ABOUT_VERSION` bump at the end, grew About to 83 text entries that read like technical
  documentation no player reads (workshop, 2026-10-27). The entry-per-feature rule was the cause.
  Both rules, their history and the cases on record (the post-import summary, #639 and #643; card
  captions, ruled no entry on 2026-09-15) are in this file's git history before the About visual
  build's PR 1.
