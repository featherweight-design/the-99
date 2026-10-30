# About · launch-end batch, six entries (addendum)

Account 2, 2026-10-21. Status: **approved by Hugh, 2026-10-21** (R1b: the card-scan halo centred on the +; desktop keeps the phone picture). Brief:
`docs/superpowers/design-briefs/2026-10-18-about-launch-entries.md` (#2072). Canvas (account 2):
https://claude.ai/artifact/9LxtYGxzDzb6zPtudXpB5p

Six About entries that ship together with one `ABOUT_VERSION` bump, 14 to 16. Named apart from the v10
`addendum-launch-entries/`. Every picture on the boards is a real capture from main
(`public/about/shots/<theme>/<screen>.webp`, the #2083 recapture with the ?, the tour and Rule 0 on), windowed and
haloed exactly as `EntryFrame`/`frameWindow` draw it. Each entry is drawn opened in the shipped Reference tab at 1300
and 390 (Neon Rain), with its picture in all six themes below. The words are `/copy-review`'s drafts, unchanged.

| Board | Entry | Id | Chapter, after | Screen | Halo (the box on the frame) | Switch |
|---|---|---|---|---|---|---|
| `E1-Getting-help.dc.html` | Getting help on any screen | `getting-help` | 04, after `commitments` | **home** (moved from account) | the header **?** | HELP_PANEL_ENABLED |
| `E2-About-rebuilt.dc.html` | About, rebuilt | `about-rebuilt` | 04, after `themes` | account | the **About The 99** row, `reaches` | none (the bump announces it) |
| `E3-Rule-zero.dc.html` | Checking tonight’s table | `rule-zero` | 04, after `invites` | friends | the pod card’s **Rule 0 check** row | RULE_ZERO_ENABLED |
| `E4-Invites.dc.html` | Inviting someone new | `invites` | 04, after `friends` | friends | the **Add a friend** press with its count line, one box | SOCIAL_INVITES_ENABLED |
| `E5-Card-search.dc.html` | Looking up any card | `card-search` | 01, after `card-detail` | **collection** | the header **search icon** | CARD_SEARCH_ENABLED |
| `E6-Card-scan.dc.html` | Scanning your cards | `card-scan` | 01, after `collection-add` | collection | the **+** (Add cards), `reaches` | CARD_SCAN_ENABLED |

`Main.dc.html` holds the calls, the locator table for engineering and the gaps. `about · launch end batch.ts` holds
the six entry objects (all `since: 16`), the `friends` caption edit and the suggested locators.

## The calls

1. **`getting-help`: the ? itself, on Home.** The entry is about the ?, and since #2083 every frame shows it. On the
   account frame it sits under the menu sheet's scrim and outside the dialog the account locators start from, so it
   cannot be haloed there. The `Take the tour` candidate was rejected: it teaches the caption's last paragraph only, and
   the row is drawn only with `FIRST_RUN_TOUR_ENABLED`, which the entry does not follow, so a reader with the ? and no
   tour would be shown a row they don't have. Moving the entry to `home` also makes Home's ? offer it (`account` never
   resolves from a path). Key 1 already says "in the header on a phone".
2. **`about-rebuilt`: the About The 99 row, as the candidate stands.** On every reader's frame (no switch, like the
   entry), and the way into the page it describes, so `reaches: true`. **Tools is not drawn as context**: an opened
   entry draws one picture, its screen's frame, and the Reference never shows a second one.
3. **`rule-zero`: the Rule 0 check row, as the candidate stands.** No screen of its own for the table page: that would
   need a capture fixture with an open table, and `screenForPath` already maps `/friends/table/[id]` to `friends`.
4. **`invites`: the Add a friend press and the count line under it, as one box.** It differs from the `friends`
   entry's halo (the press alone) and points at what is new (key 4). The count line is not on today's frame (captured
   with invites off); the boards draw the box over the press, and the recapture grows it. The `friends` caption's
   sentence 2 edit is drawn on E4, gated by the reader's `SOCIAL_INVITES_ENABLED`.
5. **`card-search`: the header search icon on the `collection` frame.** Chapter 01, listed under Collection · Cards
   beside *Finding a card in your Collection*, whose halo is the page's own "Search your cards" field just below; the
   two halos side by side show the difference. The icon is on the current frames, at rest.
6. **`card-scan`: the + with `reaches: true`.** No frame opens Add cards, and the locator rule already covers a
   control behind a press (three Collection entries use the same +). No new screen or capture. *Alternative*: a new
   `add-cards` screen (/collection with the sheet open at 390, captured with `CARD_SCAN_ENABLED` and
   `COLLECTION_EDIT_ENABLED` on) if the Scan press itself should be on the picture.
7. **Home's banner line: not drawn.** The shipped line (`arrivals-banner.tsx`) already names a returning reader's
   unseen entries in About's order, four in full or three and "N more". With every switch on at the bump:
   *6 new in About: Scanning your cards, Looking up any card, Inviting someone new, and 3 more.*
8. **The template's slots.** Drop `width`, specimen, fixture props and phone reduction (no reader; the 390 Reference
   draws the entry at full width). Replace them with what the reshape reads: `screen`, the locator (with `reaches` and
   a note) and the frame's capture needs. Keep id, title, route, opens, chapter and position, switch, caption with its
   line switches, up to four keys with their switches, and `since`.

## For engineering

| Entry | Screen | Locator (suggested) | Scope | Frame needs |
|---|---|---|---|---|
| `getting-help` | home | `header [data-help-button='header']` | new: header | HELP_PANEL_ENABLED (on since #2083) |
| `about-rebuilt` | account | `[role='dialog'] a[href='/about'], [role='menu'] a[href='/about']`, `reaches` | dialog | none |
| `rule-zero` | friends | `[data-testid='pod-rule-zero']` | main | RULE_ZERO_ENABLED (on since #2083) |
| `invites` | friends | the Add a friend press plus `[data-invite-count]`, one box | main | SOCIAL_INVITES_ENABLED (**recapture**) |
| `card-search` | collection | `header button[aria-label='Search all cards']` | new: header | CARD_SEARCH_ENABLED (on in the frames) |
| `card-scan` | collection | `[data-testid='collection-add-phone']`, `reaches` | main | none beyond today's |

## Gaps

- G1 · The locator rule's SCOPE gains a third exception, the shell's phone `header`, for the ? and the search icon.
- G2 · `invites`: the boards show today's frame without the count line; the box grows on recapture.
- G3 · `getting-help` on `home` changes its Reference group (Home) and makes Home's ? offer it. Chapter stays 04.
- G4 · Copy lane, not drawn: Home's first-run line still says About is "on one page" (`arrivals.ts`
  `aboutFirstRunRest`), which *About, rebuilt* contradicts.
- G5 · Already fixed on main: `screenForPath` maps `/friends/table/[id]` to `friends` (Draft vs code 9).
- G7 · R1b: the `card-scan` halo is a 36 square centred on the + glyph. The shipped 44 box (`collection-add-phone`)
  runs to the frame's right edge, so its halo clips and the + reads off-centre; inset the measured box to the visible
  press (this also fixes the three entries that share it).
- G8 · Desktop shows the phone frame too (one 390 capture per screen, Decided 6), though some controls differ on
  desktop ("+ Add cards", the ? at the rail's foot, the rail's search field). **Ruled by Hugh 2026-10-21: keep the
  phone picture at both widths.** A desktop capture set would be its own round, for every entry.
- G6 · Words are the drafts as quoted, for `/copy-review`; `card-scan`'s are stale per Draft vs code 13.

## Reading the boards

Exports are committed unchanged. Images are canvas assets (`/_blob/…`), so they show on the canvas and not when a
`.dc.html` is opened from disk. `scratch-gen/` holds the generator (`la.py`, `boards.py`; `render.py` checks every
board renders whole).
