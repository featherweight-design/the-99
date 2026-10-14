# CHROME — the fifth nav item

`src/components/shell/nav.tsx:21-26` ships four items. Discover makes five. The brief flags the
390px fit as a real constraint; this is the measurement.

## Order

    Home · Collection · Commanders · Discover · Decks

Discover sits **after** Commanders: owned before unowned, and the two read as one shelf. It is not
last (Decks is the destination the app is for) and not next to Collection (Collection is cards,
these two are commanders).

Both are `lockable: true` in `nav.tsx`'s sense — an empty collection locks Discover with the rest,
because a lane of 3,301 commanders you can't yet score against is a catalogue, not a tool.

## The tab bar, measured

Container is `px-[6px]` shipped; the refresh draws `8px`. Measured on the refresh's 8px, IBM Plex
Mono 9px, average advance 0.6em → 5.4px/char.

| | 390pt | 375pt | 360pt | 320pt |
|---|---|---|---|---|
| Bar minus padding | 374 | 359 | 344 | 304 |
| Per item ÷ 5 | 74.8 | 71.8 | 68.8 | 60.8 |
| `Commanders` at 9px (10 chars + 0.04em) | 54.0 | 54.0 | 54.0 | 54.0 |
| Clearance each side | **10.4** | 8.9 | 7.4 | **3.4** |
| At 8.5px, tracking 0 | 51.0 | 51.0 | 51.0 | 51.0 |
| Clearance each side | 11.9 | 10.4 | 8.9 | **4.9** |

**390 fits at the shipped 9px** with 10.4px of air each side, and every target is 74.8 × 52 — well
over 44. The five-item bar needs no new construct at 390.

**Below 360px the label drops to 8.5px and loses its 0.04em tracking**, which buys 3px per label and
takes 320 from 3.4px to 4.9px of clearance. One media query, one declaration.

## What is rejected

- **Truncation** (`Command…`) — a nav item whose label is cut has to be learned twice, and
  `Commanders` and `Collection` share a prefix, which is exactly the pair truncation confuses.
- **Icon-only below some width** — removes the only thing distinguishing four stroke glyphs at 19px.
- **A scrolling or overflow tab bar** — a primary destination behind a gesture is not a primary
  destination.
- **Folding Discover into Commanders as a segment at the top of the list** — that is the toggle
  locked decision 1 rejects, arriving through the nav instead of the rack.
- **Dropping Collection to keep four** — it is the surface everything else reads from.

## What this costs `nav.tsx`

1. One entry in `ITEMS` (`/discover`, `Discover`, `lockable: true`), and `NavItem['href']` gains
   `"/discover"`.
2. **Adjudication #1 is retired** — the refresh already replaced `RailDiamond`/`TabDiamond` with the
   19px stroke icons; Discover's is a 6.8r circle with a 3.2r diamond inside, 1.5px, same as its
   four siblings. `CHROME-rail-and-tabs.md` in the refresh package is the record; this handoff only
   adds the fifth glyph.
3. `isActive` is unchanged and already correct: `/discover` prefix-matches its own children.
4. The rail label caption and locked treatment are unchanged.
