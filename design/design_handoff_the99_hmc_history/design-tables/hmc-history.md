## Help me choose history (R1, 2026-10-15)

Handoff: `design/design_handoff_the99_hmc_history/`.

| Element | Phone (390) | Desktop |
|---|---|---|
| `ChooseHistory` placement | View of `/decks/new/choose` (`?view=history`), back `‹ Help me choose`. | `aside` 380px (320 under 1100px) right of the form, gap 40, sticky; `--surface-sunken`, 1px `--border`, radius 12, padding 18×20. |
| Entry link | `History` on the form's back line, right, 44px, accent 12.5px/500, 14px history glyph `aria-hidden`. | Hidden. |
| Heading | `History` display 24px + `your past runs · newest first` mono 10.5px `--fg-faint` (`your past runs` when empty). | Display 19px, same sub. |
| List landmark | `nav aria-label="Past runs"`. | Same, inside the aside; scroll region past 560px with the History mask fade. |
| Month heading | `historyMonth`, mono 10px uppercase `.14em` `--fg-faint`. | Same, sticky in the region. |
| Row | Link; `--surface`, `--border`, radius 9, padding 11×12, min-height 60; words / thumbs / tail / date / `›`. | Padding 10×12, no `›`; hover/focus border `--border-strong`. |
| Row thumbs | 3 × 22×30, radius 3, gap 3. | 3 × 18×25. |
| Pending row | Border `--accent`; tag `reading` mono 9.5px uppercase, accent on accent 14%, dot 6px; date `now`. | Same. |
| Empty | Dashed `--border-dashed` box, radius 10, padding 18×16: `No runs yet` 13.5px/600 `--fg-body`, body 12.5px `--fg-faint`. | Same, padding 16. |
| Loading | 3 row shapes: bar `--elevated`, thumbs and date bars `--surface-raised`, `.anim-skeleton`; sr-only `role="status"`. | Same. |
| Failed | `FailureMark` 18 `--danger` (label `Couldn’t load`) + 13.5px `--fg-body` + `Try again` outline accent, 44px. | 40px press. |
| Show more | `Show 20 more` accent 12.5px/500, 44px. | 30px. |
| Foot | `Kept on your account. Opening a run uses no credit.` mono 10.5px `--fg-faint`, top hairline. | Same. |
| Past run meta | `Oct 13 · 9:40 PM · a past run`, mono 10.5px `--fg-faint`, under the title. | Beside the title, 11px. |
| Past run note | Dashed `--border-dashed`, radius 9, padding 9×12, 12.5px `--fg-faint`. Replaces the read panel. | Max-width 760. |
| Back link | `‹ History` replaces `‹ Your answers`. | Same. |
| Gone group | Mono heading `NOT OPEN TO YOU NOW · N`; rows min 44, 1px `--border`, radius 9: thumb 24×34 at 55%, name 13px `--fg-body` dotted underline (opens the card), reason mono 10.5px `--fg-faint`, `Open deck` accent 12px when built. | Two columns, max 820. |
| Undrawn reason | `Its line named a deck you’ve since deleted.` 12.5px `--fg-faint` in the reason slot. | Same. |
| Won't open | `FailureMark` + `This run didn’t load. Try again from History.` + `Back to History` outline accent. | Same. |
| New deck door link | `Your past runs ›` own 44px line under the press, 12.5px/500 `--fg-muted`; only with ≥1 listed run. | Closes the door's sentence, underlined `--border-dashed`. |
