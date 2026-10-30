# Gap report — Small items 6, item 5 (TaggedBox states)

Verified against `docs/superpowers/design-tables/small-items-6-tag-states.md`.

| Row | Result |
|---|---|
| a · over the cap focused: 2px red, no outer ring | MATCH: `focus-within:shadow-[inset_0_0_0_1px_var(--danger)]` over the 1px danger border; the ring class is no longer given to a danger frame |
| b · dashed focused goes solid accent | MATCH: `focus-within:border-solid` with the accent edge |
| c · describing in place, accent on focus only | MATCH: `tuning-panel.tsx` drops `accent="always"`, so its ring goes too |
| d · ⓘ 8px, row to frame 6, frame to help 6 | MATCH: shipped `TagHelpRow` / `labelRow` (`gap-[8px]`, column `gap-[6px]`); unmarked on the board |
| e · locked intake: foot whole, key disabled | MATCH: `keyDisabled={submitting}`; `data-lock-hide` off the key |
| f · key focus-visible ring | MATCH: the app's `:focus-visible` (globals.css) |
| f · key disabled: `--border`, `--fg-locked`, not-allowed | MATCH: `disabled:` classes on the key |

Callers checked: deck-description-field, tuning-panel, tuning-notes-field, intake-form, game-log-form, spine-desktop, spine-mobile, note-field. Only intake and tuning-panel change props.

VERDICT: 0 visual gaps, 0 state gaps.
