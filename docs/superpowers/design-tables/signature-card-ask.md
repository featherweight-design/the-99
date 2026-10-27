# Design Property Table — Signature card, asked once (handoff 20, Onboarding.dc.html O1–O4, D1–D2)

Copy is recorded as KEYS; wording goes to `/copy-review`.

## First-run row (`SignatureRow`)

| Property | Mobile | Desktop |
|---|---|---|
| position | after step 3, before Add your friends, unnumbered | same |
| box | flex, center, gap 12, min-h 56, radius 14, padding 12px 15px, bg var(--surface-rail) (the Choose your news row's box) | same |
| border (todo) | 1px var(--border-strong) | same |
| border (done) | 1px var(--border) | same |
| slot (todo) | 22×22, radius 6, 1.5px dashed var(--border-dashed); card glyph 9×12, radius 2, 1.4px solid var(--fg-muted) | same |
| title | font-display 600 15px; todo var(--fg) key signature.choose; done var(--fg-body) key signature.title | same |
| sub | 12px var(--fg-muted); todo signature.rowSub; done signature.doneLine(card) | same |
| Skip (todo) | sans 500 13px var(--fg-muted), min-h 44, padding 0 6px, no border or bg; between the text and › | same |
| chevron | › var(--fg-faint) | same |
| done mark | bare ✓, 600 14px var(--success), in a 22px column | same |
| done trail | gap 10, 12.5px var(--fg-body): Face 30 (radius 8, 1px var(--border-strong), var(--surface-raised)), then › | same |
| press | todo and done open the picker over Home; Skip removes the row for good | same |

## Home strip (`SignatureStrip`)

| Property | Mobile | Desktop |
|---|---|---|
| placement | dashboard Home only, first block of the left column, above the lead | same |
| box | flex, center, gap 12, min-h 52, padding 7px 4px 7px 12px, radius 12, 1px var(--accent-dim), bg var(--surface) | same |
| text | 13.5px / 1.45 var(--fg-body); key signature.stripLead then the link | same |
| mark | 30×30, radius 8, 1.5px dashed var(--border-dashed), initials mono 500 10px var(--fg-muted) | same |
| link | var(--fg), 600, underline accent 55%, offset 3, nowrap; key signature.choose; opens the picker | same |
| ✕ | 44×44, 13px var(--fg-faint), aria key signature.stripDismiss | 32×32, mr 4 (the welcome strip's) |

Note: the board's `.fsw .x` has no desktop rule and draws 44 at both widths. The strip is "the welcome strip's shape" (README call 5), and the welcome strip's ✕ is 32 from `sm`. The table takes the welcome strip's, ruled 2026-10-27.

## State coverage

| State | Trigger | Rendered |
|---|---|---|
| O1 row todo | first run, switch on, friends read ok, no face, `face_prompt_done_at` null | SignatureRow todo |
| O2 row done | first run, a face | SignatureRow done |
| O3 skipped | first run, no face, flag set | no row |
| O4 strip | dashboard, no face, flag null | SignatureStrip |
| picked | a pick from either | the flag is set in the pick's transaction; Home redraws |
