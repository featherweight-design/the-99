# Readiness · Wizards announcements

**Verdict: Green.** R1 and R1b approved by Hugh 2026-10-29 ("This all LGTM, let's open a PR"), every recommended
option taken. Nothing below blocks the build; each open item has a drawn default. Checked against main at `c6909b9`.

## For Hugh

1. **Copy** is placeholder throughout, for `/copy-review`: the three kind names, their Settings lines and kickers,
   the column heads "In app" and "Push", the section name "Notifications", the offer line, the early band's words,
   "early list", "Not in our catalog yet".
2. **About.** Hugh decides whether the announcements, the Settings rework or the early lists owe an About entry.

## For engineering

1. **Kinds.** `secret-lair`, `commander-decklists`, `wizards-other` join `src/lib/feed/kinds.ts` as catalog-family
   kinds and join `DEFAULT_ON_KINDS`. `LEAD_PRIORITY` becomes spare-request, trade-match, combo, price-drop,
   commander-decklists, new-precon, new-set, secret-lair; `wizards-other` never leads (update `kinds.test.ts`).
2. **Home row.** Shipped `FeedItemRow` with the hero cropped into the 46x64 slot (radius 4, `object-fit: cover`,
   no card shadow); the post-glyph plate on a missing or failed hero. Decklists rows carry two presses: one action
   line on a phone, stacked and right-aligned from `md`. Lead story hero per call 2.
3. **The offer** (`alsoOn`, `src/lib/feed/home.ts`): shown while the reader has never chosen, as the last line of What's
   new, whatever is in the window. ✕ saves an empty choice.
4. **Settings (R1b-1).** Rework `news-section.tsx`: section "Notifications", column heads In app and Push over two
   52px cells per row, each the shared `Checkbox` in its own 44px press with an `ariaLabel`; the row text no longer
   toggles; the device row moves to its own band above the heads. Applies to every kind. Update
   `news-section.test.tsx` and `news-section.push.test.tsx`.
5. **The `new` mark (R1b-2).** Retire `NEW_TAG` in the Announced group: "new" in `--accent-text` leads the mono meta
   line in `announced-parts.tsx` and `announced-row.tsx`, and reads "· new" after the count in
   `announced-group.tsx`'s head. Update `announced-group.test.tsx`.
6. **Link-out icon (R1b-3).** One `LinkOutIcon` in `src/components/ui/`, `aria-hidden`, replacing every ↗: in
   `ExternalLink`, `FeedPress`, credits, public pages, the Fan Content notice, and the copy strings that embed it
   (`deck-analysis` source, `decks-builder` detailHint, `mana-balance` buyLink, the brackets sheet). The spoken
   "(opens in a new tab)" stays. Tests matching "↗" in text update. Purely visual: no switch.
7. **Early lists** under `UPCOMING_PRECONS_ENABLED`: tiles in the set block, their own page and route (G4), the
   `early:<code>` seen key (G2), unmatched lines (G3), replaced when MTGJSON lists the box.
8. **Kind switched off** leaves Precons unaffected.
9. **Quiet line** (G1): an inline name per kind instead of lowercasing.
10. **Mobile and desktop** ship together in each PR.

### Engineering audit of item 6, the link-out icon (2026-10-30, UI PR 1, against origin/main)

**Verdict: Green.** Item 6's claims hold, with two corrections to its list:

- Every ↗ named is real and replaced: `ExternalLink`, the feed press, credits (history, plan card, return band), the
  public printings and top bar, the Fan Content notice, and the copy strings in `deck-analysis` (`provenance.source`,
  used by the all-brackets sheet, provenance panel, lean line and combo receipt), and `mana-balance` (`buyLink`).
- `decks-builder` `detailHint` had no consumer on main: it is deleted, not given an icon.
- Not in the list: Mana Balance's TCGplayer citation drew its own arrow-only SVG (`mana-evidence.tsx` `LinkOut`, no
  glyph, so a search for ↗ misses it). It now draws `LinkOutIcon` too.
- Left as they are: `short-deck-warning`, `cost-strip`, `precon-pick-view` and `receipt-link` open new tabs but drew no
  arrow before, so the icon's "replaces every ↗" does not reach them.
- After the change `grep -rn '↗' src scripts` matches only the three scraped announcement fixtures.

### Engineering audit of item 4, Settings' Notifications (2026-10-30, UI PR 2, against origin/main)

**Verdict: Green.** Item 4's claims hold, with four notes on how it reads against the code:

- Every claim is real and built: the section is "Notifications"; mono heads In app and Push sit over two 52px cells
  per row, each the shared 18px `Checkbox` in its own press at least 44px tall, named "In app: <kind>" and
  "Push: <kind>" (`Push:` was already shipped); the name and line sit outside every label, so the row's text
  toggles nothing; the device row is a sunken band above the heads, its box at the band's right over the Push
  column. It applies to every kind through one row, so any `FEED_KINDS` entry draws the same way.
- "Applies to every kind" draws six rows today, not nine: the three announcement kinds join `FEED_KINDS` and
  `DEFAULT_ON_KINDS` in their own PR, and their names and lines join `feedCopy.news.kinds` then. The boards draw
  them with the same name-and-line shape as the shipped kinds (no kicker in Settings), so the row needed no new shape.
- "Push unavailable" is two cases in the code, and the boards draw one. A device that cannot push
  (`deviceState` "cant") is drawn: the band says so with no box, In app keeps its head, the foot loses its push
  clause. Push switched off for the reader (`PUSH_ENABLED`, no `push` prop) is not drawn: it takes the same
  column, head and foot, and no band, since the band is about push on this device.
- The foot's old split (a Home clause, a push clause, a separate can't-push foot) becomes one foot: bold In app, its
  clause, then bold Push and its clause while the column stands, then "No email, ever." The retired keys
  (`feedCopy.news.foot` as a string, `pushSettingsCopy.footCant`) had no other reader.
- No switch: the rework is layout only and ships unswitched, as item 4 implies (it names none).
