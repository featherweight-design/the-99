# READINESS — Small polish (R1)

**🟡 Waiting on Hugh's audit against the brief.** Nothing here goes to main until it passes.

## Locks held

| Lock | How R1 holds it |
|---|---|
| Lock glyphs are decorative; state in words | `Lock` is `aria-hidden` at every site; no words removed. |
| Tone rules (`Padlock` takes its surface's ink; LockMark `--fg-body` closed, `--fg-faint` open) | Kept. The one ink change is the first-run card (`--border-strong` → `--fg-locked`), the question the brief asked. |
| Placeholder distinguishable from entered text and labels | 2.3–3.1:1 from `--fg`, a step under `--fg-muted`. |
| `--fg-locked` 3:1 rule untouched | Untouched. |
| Leave every other `--fg-faint` use unchanged, or list each it moves | 0 of 878 move; the 9 placeholder class sites are listed (README §2). |
| Hover, press and menus open with no delay | Every answer row has 0 delay. |
| Reduced motion policy | Every new class joins the list; fades 100ms no wait (README §3). |
| Exits ≈ ⅔ of entrances; drag never transitioned; ambient loops exempt | Held. |
| Loading never holds content back or changes the loaded layout | Real header, chassis at its real height, list's own grid class. |
| Skeletons breathe on the shared loop | `.anim-skeleton`. |
| Token presses, labels, 44px phone targets | Unchanged; `I have one` moves into the fold (G1). |
| Art opens card details; no warning color or verdict on ownership | Held. |
| No About entry | None drawn; no bump. |

## Open questions, called

1. Lock: one glyph, solid body, bracket stays 9×11 with no keyhole, first-run card to `--fg-locked`.
2. Placeholder: `--fg-placeholder`, lifted in Kamigawa and Phyrexia only.
3. Motion: answer / arrival / kept, one row each; E7 art brighten, E8 two families, E9 40ms × 12.
4. Precon skeleton: tiles (or rows by stored view), shared `TileSkeleton`, `Loading precons` for screen readers only.
5. Token tile: a two-line foot inside the frame; `I have one` in the fold; tiles stretch.

## For the audit

G1 (`I have one` one press deeper) and the arrival delay on sheets are the two calls most worth checking. Full gap
report in README.
