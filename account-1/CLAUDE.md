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
Exception on record: the Social line's four entries were approved by Hugh as
`design_handoff_the99_about/addendum-social-line/` (account 2, #1873, 2026-10-15) because they span
three handoffs. Treat it as a one-off; ask Hugh before doing the same for a new feature.

## Two accounts, one repo (from account 2's handover, 2026-10-16)
Hugh alternates Design accounts around the Friday usage reset. `design-assets` on GitHub is the
only shared state; the other account starts from whatever was pushed.

1. Before designing, pull `design-assets` and read `account-2/` (account 2's newest work) and
   `account-1/` (this account's exports). For anything already built or approved, main's
   `design/design_handoff_the99_*` is the source of truth.
2. Never re-import `account-2/` `.dc.html` files as Design projects. Use repo files as reference
   and rebuild canvases.
3. Commit Design exports unchanged to `design-assets` under `account-1/` only. Never write to
   `account-2/`. No restructuring, renaming or deduping.
4. Never merge `design-assets` into main and never open a PR from it.
5. Commit messages name the account, the date and what changed:
   `account-1 2026-10-17: deck notes R1 for Hugh's audit`.
6. When Hugh approves a round, open a normal PR to main adding `design/design_handoff_the99_<name>/`
   (or an `addendum-*` folder inside an existing handoff). Don't touch main's `design/` any other way.
7. Push at the end of every session.
8. Canvases can't load Scryfall images: upload images as canvas assets and reference them by their
   `/_blob` URL. Relative `art/` paths render broken.

Merged from account 2 (PRs #1747–#1903): basic_lands_stepper, upcoming_precons (+ addendum
announced-collapse), small_polish, hmc_history, collection_sync, foil_treatment (R1, R2, addendum
foil-mark), no_collection_entry, proposed_cuts_about, social_r1, social_r2, social_r3, about/
addendum-social-line, card_rows/addendum-one-line, card_scan.

## Hugh's standing design rules
- Draw boards over the real shipped pages, not a simplified app frame. Match shipped UI, and extend
  shipped surfaces (e.g. a section in the shipped stand-ins modal) instead of inventing new ones.
- Prefer an inline option on the existing flow (like the precon "I own this" checkbox) over a
  follow-up banner or extra step.
- Minimalist controls: one control per action, never split controls. Close is a bare ✕, no
  "Dismiss" text.
- Settings live in one place, no duplicate fields. Don't add rows to the user menu; prefer a tab on
  an existing page.
- Personality: card art, flips, subtle tilt. Plain screens read as unfinished.
- Never show broken images; use crops from the design folder. No board may be cut off: check every
  board renders fully before handing over.
- Show cards at card size and shape, not the picture-frame crop used for user images. No stamps
  that don't fit the design system.
- Dense rows (like Shopping) stay uncrowded with large mobile hit boxes: a small marker explained
  in the key, opening a modal on desktop or a drawer on phone, like existing UIs.
- Don't draw states or screens with no real trigger. Transient errors use the shared toast
  (`ToastFrame`).
- Friend names in fixtures: Colin, Peter, Max, Chris.
- Hugh sometimes opens option cards just to view mocks. That isn't a pick; wait for his words.

## How a round runs
Hugh posts a request → read references and brief from the repo → build canvases → commit to
`account-1/` → take Hugh's audit notes as R2, R3… → on approval, open the handoff PR to main →
once merged, Hugh hands it to Claude Code CLI to build.
