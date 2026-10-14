## Small polish (R1, 2026-10-14)

Handoff: `design/design_handoff_the99_small_polish/`.

| Element | Phone (390) | Desktop |
|---|---|---|
| `Lock` component | One SVG, sizes `sm` 9×11 / `md` 11×13 / `lg` 12×14, `open` on md and lg, `ink` prop. Solid body, round-capped shackle (1.3 sm, 1.6 md/lg), keyhole cut out (md dot, lg dot + slot, sm none). Replaces `Padlock` and `LockMark`. `aria-hidden`. | Same. |
| Tab-bar bracket lock | `Lock sm`, `--fg-locked`. | — |
| Rail well foot lock | — | `Lock lg`, `--fg-locked`. |
| First-run card lock | `Lock lg`, `--fg-locked` (was `--border-strong`). | Same. |
| First-run page line lock | — | `Lock lg`, `--fg-locked`. |
| Deck lock (rows, tile, toolbar, upgrade path, legend) | `Lock md`; LockMark's tone rules unchanged. | Same. |
| `--fg-placeholder` | New token in all six themes: Amonkhet `#8B8270`, Kamigawa `#7D8294`, Ixalan `#808C7C`, Phyrexia `#827E88`, Eldraine `#898395`, Kaldheim `#7C8A8C`. Read by FIELD_CHROME and the 8 hand-set placeholder classes only. | Same. |
| Placeholder text | `--fg-placeholder` (was `--fg-faint`). | Same. |
| `--motion-ease-out` | New token, `cubic-bezier(0.2, 0.7, 0.2, 1)`. | Same. |
| Motion classes | Per README §3 table: answers 0 + 200 `--motion-ease`; arrivals 100 + 320 `--motion-ease`; card turn, carousel, sheet snap on `--motion-ease-out`. | Same. |
| Tile hover (E7) | n/a (no hover). | Art `brightness(1.06)`, 200ms, `hover: hover`. Deck tile, card tile, precon tile, set cell. |
| Count-up (E8) | Home counts, deck stats count totals. 100 + 320, `tabular-nums`, ≥ 10 only, final value in text. | Same. |
| Show more (E9) | `100 + 40 × min(n, 11)` ms, 200ms opacity. | Same. |
| Precon skeleton | Own pending entry. Real back link and title, count bar, still chassis, year bar, 6 `TileSkeleton`s 2-up (gap 10), or 6 row shapes when the stored view is rows. Breathes on `.anim-skeleton`. `role="status"` `Loading precons`. | List grid class, 2 rows of `TileSkeleton`. |
| `TileSkeleton` | `ui/`, from `TILE_SHELL`, `TILE_ART_RATIO`, `TILE_ART_CLIP`: art `--surface-raised`, caption bars `--surface-raised` / name `--elevated`, shell `--surface` with `--border`. | Same. |
| Token tile foot | Inside the frame under a 1px `--border` hairline. State line 44px: join press full width (32 tall, 44 hit) / `✓ In Shopping` / `in your collection` / `✓ I have one`. Makers line 44px. Fold opens inside the frame with `I have one` first (unowned and joined only). | State line 30px (24px press), makers line 28px. |
| Token tile rules text | Inside the frame under the caption, mono 10.5px `--fg-muted`, max 3 lines. | Same. |
| Tokens grid | `items-stretch` (was `items-start`); spacer above the foot. | Same. |
