# Project instructions — The 99

## Missing files: stop, don't improvise
If a prompt references a file (brief, spec, source module) that isn't in this project, **stop and
ask — do not proceed without it.** Building around an absent source wastes a design turn, tokens,
time and money.

**Check the linked GitHub repo first.** Briefs, specs and all `src/` source live on `main` in the
repo recorded in `github.md` (`HartiganHM/the-99`), not in this project's tree. Read them there
with the GitHub tools before concluding a file is missing. Only if it is absent from the repo too
is it genuinely missing — then stop.

## About entries live in the feature's handoff
A round that owes an About entry puts it **inside that feature's own handoff folder**:
`The 99 - About · <Feature> Entry.dc.html` (the §G per-entry template from
`design_handoff_the99_about/`, at 760 and 390) plus `about · <feature>.ts`, with an "About entry"
section in the feature README. Do not create addendum folders under `design_handoff_the99_about/`.
