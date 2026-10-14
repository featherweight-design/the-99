# Deck printings — states (R3)

Both widths. Card details opened from a deck.

| State | Draws | Must not |
|---|---|---|
| Nothing picked | shipped Set field · `N printings you own ▾` | Add copy |
| Open, nothing picked | intro `You own N of these. Pick the one this deck uses.` · owned tiles · `Shown now` on the deck's fallback | Preselect · render the shipped `regionIntro` |
| Picked | `◆ For this deck · of N ▾` · intro `Your pick shows in this deck only.` · `Your pick` tile · art, price tag and Set field move together | Render `regionIntroPicked` ("…in your collection") · write the art preference |
| Save failed | tiles revert · `! Didn't save. Try again.` | Red |
| One or no owned printings | shipped plain MetaField | Draw a disclosure |
| Overflow | intro · shipped search and chips | — |
| Pick leaves the Collection | falls to the Collection's pick, then the default · pick cleared | Dormant tile · notice |
| Commander | same Set field, in its details | A separate control |

## Buy tag with a pick (D2) — deck row and Shopping, both widths

Applies to a spoken-for card (owned, every copy claimed): the only kind with both a pick and a buy tag.

| State | Tag | Must not |
|---|---|---|
| Pick in stock | `buy · $1.10` (the pick's figure) | Price the cheapest instead |
| Pick sold out, another printing in stock | `buy · $0.70`, the cheapest in-stock figure (today's price), drawn as on `main` | New tag style · new copy |
| No printing in stock | shipped `buy · sold out` | — |
| Over the limit | ring measures the figure shown, fallback included | — |
| I got it | presets the printing behind the figure | Write the pick |
| Card details art tag | the picked printing's own price, `no stock` if none | Show the fallback figure under the picked art |

## Elsewhere

| State | Draws | Must not |
|---|---|---|
| Rows / tiles / Shopping (owned, covered) | `main` · art follows | Any mark |
| Import | strip gains the printing clause | List lines that fell back |
| Export | names the printing the deck shows | Mark lines |
| After a pick | no pending banner, Commit or History line | Stale analysis |
| Switch off | `main` · picks kept | Delete picks |
