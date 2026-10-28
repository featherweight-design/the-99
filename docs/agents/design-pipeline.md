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

## From AGENTS.md (moved 2026-10-28)

The rule-form bullets `AGENTS.md` carried for this area until 2026-10-28, verbatim. Where they and the text above differ in wording, both are current.

- UI work is gated on design handoffs in `design/design_handoff_the99_*` — no UI until the handoff exists and has a READINESS verdict. Backend/API/DB work may proceed without one.
- Every UI PR passes the design-review skill (property-table enumerate → verify → confirm) before `gh pr create`. Mobile + desktop parity ships in the same PR.
- Pipeline state lives in `docs/superpowers/design-pipeline-status.md`; plans in `docs/superpowers/plans/`; gap reports in `docs/superpowers/gap-report-*.md`.
- **A launch gets an About label only at Hugh's discretion** (workshop ruling 6, 2026-10-27; replaces "No FEATURE launches without an About entry" and the batching rule). About is six visual pages of labelled captures (`design/design_handoff_the99_about_visual/`). A launch Hugh picks adds ONE label to its screen's section and re-takes that screen's capture; it adds a Good to know rule only for a rule the screen cannot show. A cosmetic change only re-takes the capture. Not every feature owes a label: "everything gets an entry" is what bloated About to 83 entries. A label follows its feature's switch, so it never reaches production before the feature does.
- `design/` is **reference material, never shipped code**. It sits outside both `public/` and `src/`, so no route serves it and no module imports it. Each handoff's `support.js` is a generated runtime that evaluates code dynamically and loads React from a CDN — it is read by opening that bundle's `.dc.html` from disk, and by nothing else. Never import from `design/`, and never copy a handoff asset into `public/`.
