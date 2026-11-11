## Addendum A3 (2026-11-11): the hero at tablet widths

Hugh's brief: the hero has no board between the phone and desktop layouts. From 768 the hero is two columns, a 500px
words column and the shot (a 560 × 560 box: the phone and three drifting cards). The shot column is 560px wide only from
about 1296, so between 768 and 1279 the phone spills; engineering's #2849 clips it there (`md:max-xl:overflow-x-clip`).
At 768 the phone frame sits wholly outside its 32px column and only parts of the three cards show, over the launch
panel; at 1024 about three quarters of the phone shows.

A3 draws the real layout for that range. Every board is the shipped `TopBar` and `Hero` (`src/components/landing/`)
rendered at the width with the shipped CSS and fonts, with only the classes below changed. The commander reads are
stand-ins (the catalog holds the real ones). Phone (below 768) and desktop (1280 and up) are unchanged; copy is
unchanged.

| Board | What |
|---|---|
| `A3-Calls.dc.html` | The call, the class table, and the hero at 390, 900, 1180, 1279 and 1300 |
| `A3-Hero-768.dc.html` | 768: today, A stack (recommended), B scale |
| `A3-Hero-1024.dc.html` | 1024: today, B scale (recommended), A stack |
| `A3-Themes.dc.html` | The recommended hero at 768 and 1024 in all six themes |

### The call: stack below 1024, scale from 1024 to 1279

| Width | Layout | Shot |
|---|---|---|
| below 768 | Phone, as shipped | Phone hero with its two side cards |
| 768 to 1023 | **One column.** Words, launch panel and theme switch as today (500px cap) | The desktop box unchanged (560 × 560, phone 300 × 560 at −2°, Jace 9°, Y'shtola −11°, Tam 4°, same drift), centred, 44px under the theme switch |
| 1024 to 1199 | **Two columns.** Gap 56 → 40px, right padding 90 → 40px (left stays 90) | The whole box centred in column 2 at `zoom` 0.62 (phone 198px wide) |
| 1200 to 1279 | Two columns, as above | The whole box at `zoom` 0.8 (phone 255px) |
| 1280 and up | Desktop, as shipped | Full size |

- **Why stack at 768:** the shot column is 32px. Even with the gap and right padding at 40px it is 98px, so a phone that
  fits would be about 50px wide (board B at 768 shows 0.62, still clipped).
- **Why scale at 1024:** stacking there leaves the right half empty beside the words and puts the shot below the fold on
  a 1024 × 768 tablet (board A at 1024).
- **Floating cards consistent with desktop:** both modes draw the desktop box itself; stacking draws it at full size and
  scaling shrinks the whole box, so every card keeps its place, size and angle relative to the phone.
- **Why `zoom`:** the phone's screen already uses `zoom` (0.72 / 0.86), and `zoom` keeps layout size and painted size
  equal, so the scaled box takes only the room it paints (a `transform` would leave a 560px box behind).
- **Height:** at 768 the hero grows from 793px to 1,397px; the words and the launch panel stay above the fold and the
  shot scrolls in with the shipped `.anim-gentle-in`.

### Classes (on the shipped elements)

- `Hero` section: `md:max-lg:grid-cols-[minmax(0,1fr)] lg:max-xl:gap-x-[40px] lg:max-xl:pr-[40px]`
- Words column: `md:max-lg:max-w-[500px]` (the theme switch's row is already capped by its content)
- Shot wrapper: `md:max-lg:col-start-1 md:max-lg:row-start-3 md:max-lg:row-span-1 md:max-lg:mt-[44px]`
- `HeroShot` box (takes a class, or the classes go on it directly): `md:max-xl:mx-auto lg:max-[1200px]:[zoom:0.62] min-[1200px]:max-xl:[zoom:0.8]`.
  Note the order: Tailwind sorts `min-[1200px]` before `lg`, so the 0.62 step must be bounded with `max-[1200px]` or
  0.62 wins at 1200 to 1279.
- Keep `md:max-xl:overflow-x-clip` on the section as a guard.

Measured in the render: document overflow 0 and the whole phone frame inside the section at 768, 900, 1023, 1024,
1199, 1200 and 1279; at 390 and 1300 the hero renders the same as today (390 pixel-identical; 1300 differs only by a few anti-aliased pixels).

### Strings

None. No new copy, token or component.
