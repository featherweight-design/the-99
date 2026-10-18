# States — public card and commander pages (R1)

Every state in the brief's §Every state to draw, with its artboard. All boards are at 1300 and 390 unless noted.

| # | State | Artboard (1300 / 390) | Fixture |
|---|---|---|---|
| A1 | Card, single-faced, one printing | `Main.dc.html` / `card-single-390.dc.html` | Rootha, Mastering the Moment (SOC 8) |
| A2 | Card, double-faced | `card-dfc-1300.dc.html` / `card-dfc-390.dc.html` | Valki, God of Lies // Tibalt, Cosmic Impostor — face scans are canvas placeholders |
| A3 | Card, several printings | `card-printings-1300.dc.html` / `card-printings-390.dc.html` | Ghalta, Primal Hunger (21) — 390 collapses to 8 + `Show all 21` |
| A4 | Card, no image (and printings at the 40 cap) | `card-noimage-1300.dc.html` / `card-noimage-390.dc.html` | Sol Ring — colourless identity gradient, no caption, `first 40` + `More on Scryfall ↗` |
| B1 | Commander, support data and prose | `cmd-full-1300.dc.html` / `cmd-full-390.dc.html` | Zimone, Infinite Analyst — EDHREC figures as of 2026-10-17, sample sentence |
| B2 | Commander, data, no prose | `cmd-noprose-1300.dc.html` / `cmd-noprose-390.dc.html` | Sai, Master Thopterist — the prose section unmounts; On EDHREC leads |
| B3 | Commander, EDHREC does not index it (`absent`) | `cmd-absent-1300.dc.html` / `cmd-absent-390.dc.html` | Ashling, the Limitless (fixture state) — grey note, nothing else in the right column |
| B4 | Commander, support read failed (`degraded`) | `cmd-degraded-1300.dc.html` / `cmd-degraded-390.dc.html` | Dina, Essence Brewer (fixture state) — warning note: "not available right now" |
| C1 | The signed-out block | `signed-out-block.dc.html` | both widths side by side |
| C2 | Link previews, one per page | `link-previews.dc.html` | unfurl + the og tag table |
| C3 | Unknown address | `not-found-1300.dc.html` / `not-found-390.dc.html` | the shipped not-found with `View decks` removed (it leads behind sign-in) |
| C4 | Fragments | `fragments.dc.html` | Bracket facts (Rhystic Study, game changer) · not Commander-legal (Mana Crypt) · rank blank · both figures blank |

## Rules per state

- **No image** — the card box keeps 63/88 and fills with `identityGradient(colorIdentity)`; the wash behind it at 390 is the
  same gradient at 18%. No printing caption under it (nothing is pictured). The ◇ printing note says "the catalog's main
  printing" instead of "the one pictured".
- **Not Commander-legal** — the facts row reads `Not legal`. No reason, no tooltip, no colour change.
- **Rank blank** — the Rank figure drops and Decks stands alone. **Both blank** — the On EDHREC card unmounts and Themes
  moves up. Neither prints `—`.
- **No prose** — the `Why this commander` section unmounts entirely (there are no per-user sentences to keep the heading).
- **absent** — one grey note (the signed-in synergy note's chrome: `--elevated-hover`, 2px `--fg-faint` left rule). Copy:
  "No deck data for {name} — EDHREC doesn't track this commander, so there's no rank, no themes and no cards to list here.
  The card is still all here."
- **degraded** — one warning note (the signed-in coverage note's chrome: `--surface-sunken`, 3px `--warning` left rule).
  Copy: "Deck figures aren't available right now. They come from EDHREC, which didn't answer the last time this page was
  built. They return with the next refresh." No Retry: the page is the same cached HTML for everyone, so a visitor has
  nothing to retry.
- **Unknown address** — top bar (with the Scryfall link), `404`, the shipped heading and caption, one `Back home` button.
  No suggestions, nothing that would need a search.
