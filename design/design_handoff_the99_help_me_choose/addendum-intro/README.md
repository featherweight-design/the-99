# Help me choose · intro (addendum R1 · approved 2026-11-24)

Hugh, 2026-11-24: "Help me choose needs a bit more exposition/imagery at the top of the page about what the tool does
and how it helps. Maybe a bit about what's free and what costs." Approved on the canvas the same day; a copy-review pass
with engineering follows (every string is in `help-me-choose-intro · copy strings.ts`).

## What changes

The form view of `/commanders/choose` (`src/app/commanders/(list)/choose/page.tsx`, no `v`) gains one panel,
`ChooseIntro`, between `ChooseHeader` and `IntakeForm`, inside the form's 680 column. Results, History, the form and the
loading screen are unchanged.

- **Look.** Home's search panel (`home-search-panel.tsx`): 12px radius, accent edge
  `color-mix(var(--accent) 55%, var(--border))`, accent wash fading to `--surface` at 60%. Padding 16 phone, 20/22 desktop.
- **What it does.** Kicker `How it works` (mono 10, accent), title (display 18 phone / 21 desktop), lead (13.5 / 14, muted).
- **How it helps: an example result.** Ghalta's art crop (64 phone / 88 desktop tall) over the shipped results row's
  facts: rank, name, `91% of its decks are Dinosaurs` (figure in accent mono), `you own 79 of its 99 · about $135 to buy`.
  Captioned `Example · Dinosaurs · under $150`. Desktop only: ranks 2 and 3 fade beneath it as thumbnail + bar.
  248px column on desktop, full width on phone. A fixed example for everyone (Q2 A): no read, never empty.
- **Three steps.** Numbered accent rings, title + one line. Desktop: under the lead, left column. Phone: under the example.
- **Free vs 1 credit.** Two tiles on `--bg` (stacked on phone, side by side from `md`). Free: success tick,
  `Free, every time`. Paid: the shipped `1 credit` pill style, `Anything else?`, its line, then the daily line from the
  reader's own daily limit (`dailyLimitFor`, the same number the press's credit line uses) and
  `Go to Anything else? ↓`, an in-page link to the words box (focus it on arrival).
- **Hide / folded.** `Hide` (mono 10.5, top right, 44px target on phone) folds the panel. Folded it is one 44px button:
  `?` ring, `How Help me choose works`, `Free unless you write in Anything else?`, `›`; pressing it opens the panel
  (`aria-expanded`).

## Folding (Q1 A)

Open on every visit until the reader's first **Find commanders**; folded from then on, opened again by its own line.
History lists only runs that read words, so it cannot tell: the fold needs a per-account mark (G1), set on the first
submit of any kind and on Hide. Decide it on the server so the page never flashes the open panel.

## Open gaps for engineering

- **G1** The per-account "seen the intro" mark (column or `user_prefs` key) and where the submit sets it.
- **G2** The example art: Ghalta's crop from the catalog (`artCropUri`) rather than a bundled file; `design/` art is
  reference only.
- **G3** `Go to Anything else? ↓` scrolls to and focuses the words box; on phone it must land above the fixed dock.
- **G4** Copy-review pass with engineering (Hugh, 2026-11-24). Never the words AI, model or LLM.

## Settled

Q1 A (fold after the first run), Q2 A (one fixed example), Q3 A (the header's sub line stays): drawn as recommended,
approved with the canvas.

## Files

- `Main.dc.html` (the calls), `Phone.dc.html`, `Desktop.dc.html` (shipped / first visit / after the first run).
- `art/hmc-*.webp`: rendered from a scratch copy of main with the proposed component.
- `help-me-choose-intro · copy strings.ts`, `STATES.md`, `READINESS.md`, `canvas.json`, `support.js`.

No About entry this round.
